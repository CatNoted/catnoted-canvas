"use client";

import { CollabProvider } from "@/lib/collaboration/context";

export function CanvasCollabWrapper({ boardId, children }: { boardId: string; children: React.ReactNode }) {
  return <CollabProvider boardId={boardId}>{children}</CollabProvider>;
}
