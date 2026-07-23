"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Editor } from "tldraw";
import { getBoard, markBoardOpened } from "@/lib/db";
import { CanvasCollabWrapper } from "@/components/canvas/CanvasCollabWrapper";
import { ArrowLeftIcon, ShareIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/ShareModal";
import AiSidebar from "@/components/AiSidebar";

const Canvas = dynamic(() => import("@/components/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-paper/40 font-mono">
      Loading canvas...
    </div>
  ),
});

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [board, setBoard] = useState<any | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const active = Boolean(supabaseUrl);
    setUseSupabase(active);

    if (active) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        setUser(currentUser);
      });
    }

    async function loadBoard() {
      if (active) {
        try {
          const res = await fetch(`/api/boards/${encodeURIComponent(id)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.board) {
              setBoard({
                id: json.board.id,
                name: json.board.name,
                createdBy: json.board.created_by,
              });
              return;
            }
          }
        } catch (e) {
          console.error("Failed to fetch board from Supabase:", e);
        }
      }

      // Fallback to local db
      const b = await getBoard(id);
      setBoard(b ?? undefined);
      if (b) {
        markBoardOpened(id).catch(console.error);
      }
    }

    loadBoard();
  }, [id]);

  return (
    <div className="flex h-screen flex-col bg-void text-paper">
      <header className="flex items-center gap-3 border-b border-paper/15 bg-void px-4 py-2">
        <Link
          href="/"
          aria-label="Back to boards"
          className="rounded-md p-1.5 text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          <ArrowLeftIcon width={20} height={20} />
        </Link>
        <span className="font-semibold text-paper">
          {board === null
            ? "Loading..."
            : board === undefined
              ? "Board not found"
              : board.name}
        </span>
        {useSupabase && board && board !== undefined && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={() => setIsShareOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-amber/40 bg-amber/10 text-amber hover:bg-amber/20 hover:text-amber"
            >
              <ShareIcon width={16} height={16} />
              Share
            </Button>
          </div>
        )}
      </header>
      <div className="relative flex-1">
        {board === undefined ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-paper/60">This board does not exist.</p>
            <Link
              href="/"
              className="rounded-md bg-amber px-4 py-2 text-sm font-semibold text-void"
            >
              Back to boards
            </Link>
          </div>
        ) : board === null ? null : (
          <CanvasCollabWrapper boardId={id}>
            <Canvas boardId={id} onEditorMount={setEditor} />
          </CanvasCollabWrapper>
        )}
        <AiSidebar editor={editor} />
      </div>

      {useSupabase && board && board !== undefined && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          boardId={id}
          isOwner={board.createdBy === user?.id}
        />
      )}
    </div>
  );
}
