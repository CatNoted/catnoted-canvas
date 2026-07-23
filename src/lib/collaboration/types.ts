import type * as Y from "yjs";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface CollabContextValue {
  boardId: string;
  doc: Y.Doc | null;
  status: "initializing" | "ready" | "error";
  channel: RealtimeChannel | null;
  userId: string | null;
  userName: string | null;
  userColor: string | null;
}
