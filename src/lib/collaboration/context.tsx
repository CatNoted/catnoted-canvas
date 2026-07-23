"use client";

import React, { createContext, useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CollabContextValue } from "./types";

const RETRO_COLORS = [
  "#F2A93B", // amber
  "#7FA26A", // moss
  "#EDE6D6", // paper
  "#E06C75", // retro red/pink
  "#61AFEF", // retro blue
  "#D19A66", // retro orange
];

export const CollabContext = createContext<CollabContextValue | null>(null);

export function CollabProvider({
  boardId,
  children,
}: {
  boardId: string;
  children: React.ReactNode;
}) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [status, setStatus] = useState<"initializing" | "ready" | "error">("initializing");
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [userInfo, setUserInfo] = useState<{ id: string; name: string; color: string } | null>(null);

  useEffect(() => {
    const yDoc = new Y.Doc();
    const persistence = new IndexeddbPersistence(`board-${boardId}`, yDoc);

    persistence.on("synced", () => {
      setDoc(yDoc);
      setStatus("ready");
    });

    persistence.on("error", () => {
      setStatus("error");
    });

    return () => {
      persistence.destroy();
      yDoc.destroy();
    };
  }, [boardId]);

  useEffect(() => {
    if (status !== "ready" || !doc) return;

    const activeDoc = doc;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return;
    }

    const supabase = createClient();
    let active = true;
    let colChannel: RealtimeChannel | null = null;
    let handleDocUpdate: ((update: Uint8Array, origin: any) => void) | null = null;

    async function setup() {
      let uid = "guest-" + Math.random().toString(36).substring(2, 11);
      let uname = "Guest " + Math.floor(Math.random() * 1000);
      const ucolor = RETRO_COLORS[Math.floor(Math.random() * RETRO_COLORS.length)];

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && active) {
          uid = user.id;
          uname = user.email ? user.email.split("@")[0] : `User ${user.id.substring(0, 5)}`;
        }
      } catch (err) {
        console.warn("Failed to get auth user, falling back to guest:", err);
      }

      if (!active) return;
      setUserInfo({ id: uid, name: uname, color: ucolor });

      colChannel = supabase.channel(`board-collab:${boardId}`, {
        config: {
          presence: {
            key: uid,
          },
        },
      });

      colChannel
        .on("broadcast", { event: "sync-step-1" }, ({ payload }) => {
          if (!payload?.stateVector) return;
          try {
            const stateVector = new Uint8Array(payload.stateVector);
            const update = Y.encodeStateAsUpdate(activeDoc, stateVector);
            colChannel?.send({
              type: "broadcast",
              event: "sync-step-2",
              payload: { update: Array.from(update) },
            });
          } catch (err) {
            console.error("Error processing sync-step-1:", err);
          }
        })
        .on("broadcast", { event: "sync-step-2" }, ({ payload }) => {
          if (!payload?.update) return;
          try {
            const update = new Uint8Array(payload.update);
            Y.applyUpdate(activeDoc, update, "remote");
          } catch (err) {
            console.error("Error processing sync-step-2:", err);
          }
        })
        .on("broadcast", { event: "sync-update" }, ({ payload }) => {
          if (!payload?.update) return;
          try {
            const update = new Uint8Array(payload.update);
            Y.applyUpdate(activeDoc, update, "remote");
          } catch (err) {
            console.error("Error processing sync-update:", err);
          }
        });

      colChannel.subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED" && active) {
          const stateVector = Y.encodeStateVector(activeDoc);
          colChannel?.send({
            type: "broadcast",
            event: "sync-step-1",
            payload: { stateVector: Array.from(stateVector) },
          });

          colChannel?.track({
            userId: uid,
            userName: uname,
            color: ucolor,
            lastSeen: Date.now(),
          });
        }
      });

      setChannel(colChannel);

      handleDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin !== "remote") {
          colChannel?.send({
            type: "broadcast",
            event: "sync-update",
            payload: { update: Array.from(update) },
          });
        }
      };

      activeDoc.on("update", handleDocUpdate);
    }

    setup();

    return () => {
      active = false;
      if (handleDocUpdate) {
        activeDoc.off("update", handleDocUpdate);
      }
      if (colChannel) {
        colChannel.unsubscribe();
      }
    };
  }, [status, doc, boardId]);

  const value: CollabContextValue = {
    boardId,
    doc,
    status,
    channel,
    userId: userInfo?.id ?? null,
    userName: userInfo?.name ?? null,
    userColor: userInfo?.color ?? null,
  };

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}
