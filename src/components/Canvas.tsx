"use client";

import { useCallback, useEffect, useRef, useState, useContext } from "react";
import dynamic from "next/dynamic";
import { getSnapshot, loadSnapshot, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { saveSnapshot, loadSnapshot as loadFromDB } from "@/lib/db";
import { CollabContext } from "@/lib/collaboration/context";

const Tldraw = dynamic(() => import("tldraw").then((mod) => mod.Tldraw), {
  ssr: false,
  loadableGenerated: { webpack: () => [1] },
});

interface CanvasProps {
  boardId: string;
  onDocReady?: (doc: unknown) => void;
  onEditorMount?: (editor: Editor) => void;
}

// Debounced local-first persistence of the tldraw store to IndexedDB.
export default function Canvas({ boardId, onDocReady, onEditorMount }: CanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  const collabCtx = useContext(CollabContext);

  const handleMount = useCallback(
    (editorInstance: Editor) => {
      editorRef.current = editorInstance;
      setEditor(editorInstance);

      if (typeof onEditorMount === "function") {
        onEditorMount(editorInstance);
      }

      // Load any saved snapshot for this board (async, fire and forget).
      loadFromDB(boardId)
        .then((saved) => {
          if (saved) {
            try {
              loadSnapshot(editorInstance.store, saved as never);
            } catch (err) {
              console.warn("Failed to load board snapshot", err);
            }
          }
        })
        .finally(() => setReady(true));

      if (typeof onDocReady === "function") {
        onDocReady(editorInstance.store);
      }

      // Persist on every document change, debounced.
      const unsub = editorInstance.store.listen(
        () => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            const snapshot = getSnapshot(editorInstance.store);
            saveSnapshot(boardId, snapshot as never).catch((err) =>
              console.warn("Failed to save board snapshot", err),
            );
          }, 500);
        },
        { source: "user", scope: "document" },
      );

      return () => {
        unsub();
      };
    },
    [boardId, onDocReady, onEditorMount],
  );

  // Yjs document bidirectional synchronization
  useEffect(() => {
    if (!collabCtx || collabCtx.status !== "ready" || !collabCtx.doc || !editor) return;

    const { doc } = collabCtx;
    const yStore = doc.getMap<any>("tldraw-store");

    // Helper to check if a record is document-scoped
    const isDocumentRecord = (record: any) => {
      const type = (editor.store.schema.types as any)[record.typeName];
      return type?.scope === "document";
    };

    // 1. Initial Sync: Populate local store from Yjs yStore or vice versa
    if (yStore.size > 0) {
      // Load remote records into editor.store
      const remoteRecords = Array.from(yStore.values());
      const localDocRecords = editor.store.allRecords().filter(isDocumentRecord);
      const remoteIds = new Set(remoteRecords.map((r) => r.id));

      const toRemove = localDocRecords
        .filter((r) => !remoteIds.has(r.id))
        .map((r) => r.id);

      editor.store.mergeRemoteChanges(() => {
        if (toRemove.length > 0) {
          editor.store.remove(toRemove);
        }
        if (remoteRecords.length > 0) {
          editor.store.put(remoteRecords);
        }
      });
    } else {
      // First time initialization: populate Yjs yStore from local store
      doc.transact(() => {
        const localRecords = editor.store.allRecords().filter(isDocumentRecord);
        for (const record of localRecords) {
          yStore.set(record.id, record);
        }
      }, "local");
    }

    // 2. Listen to local tldraw store changes and propagate to Yjs
    const unsubStore = editor.store.listen(
      ({ changes, source }) => {
        if (source !== "user") return;

        doc.transact(() => {
          // Process additions
          for (const [id, record] of Object.entries(changes.added)) {
            if (isDocumentRecord(record)) {
              yStore.set(id, record);
            }
          }
          // Process updates
          for (const [id, value] of Object.entries(changes.updated)) {
            const [_, toRecord] = value as [any, any];
            if (isDocumentRecord(toRecord)) {
              yStore.set(id, toRecord);
            }
          }
          // Process removals
          for (const [id, record] of Object.entries(changes.removed)) {
            if (isDocumentRecord(record)) {
              yStore.delete(id);
            }
          }
        }, "local");
      },
      { scope: "document" }
    );

    // 3. Listen to Yjs changes and propagate to tldraw
    const handleYStoreChange = (event: any) => {
      if (event.transaction.origin === "local") return;

      const toPut: any[] = [];
      const toRemove: any[] = [];

      event.changes.keys.forEach((change: any, key: string) => {
        switch (change.action) {
          case "add":
          case "update": {
            const record = yStore.get(key);
            if (record) {
              toPut.push(record);
            }
            break;
          }
          case "delete": {
            toRemove.push(key as any);
            break;
          }
        }
      });

      if (toPut.length > 0 || toRemove.length > 0) {
        editor.store.mergeRemoteChanges(() => {
          if (toPut.length > 0) {
            editor.store.put(toPut);
          }
          if (toRemove.length > 0) {
            editor.store.remove(toRemove);
          }
        });
      }
    };

    yStore.observe(handleYStoreChange);

    return () => {
      unsubStore();
      yStore.unobserve(handleYStoreChange);
    };
  }, [collabCtx, editor]);

  // 4. Send local cursor position over Supabase Realtime broadcast
  useEffect(() => {
    if (!editor || !collabCtx || !collabCtx.channel || !collabCtx.userId) return;

    const { channel, userId, userName, userColor } = collabCtx;

    let lastSent = 0;
    let lastX = 0;
    let lastY = 0;

    const interval = setInterval(() => {
      const point = editor.inputs.currentPagePoint;
      if (!point) return;

      const { x, y } = point;
      if (x !== lastX || y !== lastY) {
        const now = Date.now();
        if (now - lastSent > 50) {
          channel.send({
            type: "broadcast",
            event: "cursor",
            payload: {
              userId,
              userName,
              color: userColor,
              x,
              y,
              currentPageId: editor.getCurrentPageId(),
            },
          });
          lastSent = now;
          lastX = x;
          lastY = y;
        }
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [editor, collabCtx]);

  // 5. Receive peer cursor coordinates over Supabase Realtime broadcast
  useEffect(() => {
    if (!editor || !collabCtx || !collabCtx.channel || !collabCtx.userId) return;

    const { channel, userId: localUserId } = collabCtx;
    let active = true;

    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      if (!active || !payload) return;
      const { userId, userName, color, x, y, currentPageId } = payload;
      if (userId === localUserId) return;

      const peerPresenceId = `instance_presence:peer-${userId}` as any;
      const peerPresence = {
        id: peerPresenceId,
        typeName: "instance_presence" as const,
        userId,
        userName,
        color: color || "#F2A93B",
        currentPageId: currentPageId || editor.getCurrentPageId(),
        cursor: { x, y, type: "default", rotation: 0 },
        camera: { x: 0, y: 0, z: 1 },
        selectedShapeIds: [],
        brush: null,
        scribbles: [],
        screenBounds: { x: 0, y: 0, w: 100, h: 100 },
        chatMessage: "",
        meta: {},
        lastActivityTimestamp: Date.now(),
        followingUserId: null,
      };

      editor.store.mergeRemoteChanges(() => {
        editor.store.put([peerPresence as any]);
      });
    });

    return () => {
      active = false;
    };
  }, [editor, collabCtx]);

  // 6. Handle presence state sync to clean up offline peer cursors immediately
  useEffect(() => {
    if (!editor || !collabCtx || !collabCtx.channel) return;

    const { channel } = collabCtx;
    let active = true;

    channel.on("presence", { event: "sync" }, () => {
      if (!active) return;
      const state = channel.presenceState();
      const onlineUserIds = new Set(Object.keys(state));

      const offlinePeerIds: any[] = [];
      editor.store.allRecords().forEach((record) => {
        if (
          record.typeName === "instance_presence" &&
          record.id.startsWith("instance_presence:peer-")
        ) {
          const peerUserId = record.id.replace("instance_presence:peer-", "");
          if (!onlineUserIds.has(peerUserId)) {
            offlinePeerIds.push(record.id);
          }
        }
      });

      if (offlinePeerIds.length > 0) {
        editor.store.mergeRemoteChanges(() => {
          editor.store.remove(offlinePeerIds);
        });
      }
    });

    return () => {
      active = false;
    };
  }, [editor, collabCtx]);

  // 7. Periodic local cleanup of stale/inactive peer cursors
  useEffect(() => {
    if (!editor) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const staleIds: any[] = [];
      editor.store.allRecords().forEach((record) => {
        if (
          record.typeName === "instance_presence" &&
          record.id.startsWith("instance_presence:peer-")
        ) {
          const presence = record as any;
          if (now - presence.lastActivityTimestamp > 5000) {
            staleIds.push(record.id);
          }
        }
      });

      if (staleIds.length > 0) {
        editor.store.mergeRemoteChanges(() => {
          editor.store.remove(staleIds);
        });
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={handleMount} />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-paper/40">
          Loading canvas...
        </div>
      )}
    </div>
  );
}
