"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  listBoards,
  createBoard,
  deleteBoard,
  renameBoard,
  markBoardOpened,
  type BoardMeta,
} from "@/lib/db";
import {
  PlusIcon,
  TrashIcon,
  BoardIcon,
  LogoIcon,
  EditIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const useSupabase = Boolean(SUPABASE_URL);

export default function Home() {
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(useSupabase);

  const refresh = useCallback(async () => {
    if (useSupabase && user) {
      try {
        const res = await fetch("/api/boards");
        if (res.ok) {
          const json = (await res.json()) as BoardMeta[];
          setBoards(json);
        } else {
          setBoards(await listBoards());
        }
      } catch {
        setBoards(await listBoards());
      }
    } else {
      setBoards(await listBoards());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (useSupabase) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        setUser(currentUser);
        setAuthLoading(false);
      }).catch(() => {
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, refresh]);

  async function handleCreate() {
    let board: BoardMeta | undefined;
    if (useSupabase && user) {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { board?: BoardMeta; dataset?: { id?: string }; error?: string };
      if (!res.ok || !json.board) {
        setError(json.error || "Failed to create board");
        return;
      }
      board = json.board;
    } else {
      board = await createBoard(name);
    }
    setName("");
    setCreating(false);
    setError("");
    await refresh(user);
    window.location.href = `/board/${board.id}`;
  }

  async function handleDelete(id: string) {
    if (useSupabase && user) {
      const res = await fetch(`/api/boards/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to delete board");
        return;
      }
    } else {
      await deleteBoard(id);
    }
    await refresh(user);
  }

  async function handleRename(id: string) {
    if (editName.trim()) {
      if (useSupabase && user) {
        const res = await fetch(`/api/boards/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName }),
        });
        if (!res.ok) {
          setError("Failed to rename board");
          setEditingId((current) => (current === id ? null : current));
          return;
        }
      } else {
        await renameBoard(id, editName);
      }
      await refresh(user);
    }
    setEditingId((current) => (current === id ? null : current));
  }

  async function handleOpenBoard(id: string) {
    await markBoardOpened(id);
  }

  async function handleLogout() {
    if (useSupabase) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-amber">
            <LogoIcon width={28} height={28} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-paper">catnoted canvas</h1>
            <p className="text-sm text-paper/60">
              Local-first boards. Your data stays in your browser.
            </p>
          </div>
        </div>
        {useSupabase && !authLoading && (
          user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-paper/60 font-medium hidden sm:inline">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-paper/20 text-paper/70 hover:bg-paper/5"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <Button
                variant="outline"
                size="sm"
                className="border-amber/40 bg-amber/10 text-amber hover:bg-amber/20 hover:text-amber font-semibold"
              >
                Sign in
              </Button>
            </Link>
          )
        )}
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-paper/50">
          Boards
        </h2>
        {!creating && (
          <Button
            onClick={() => setCreating(true)}
            variant="outline"
            className="flex items-center gap-2 border-amber/40 bg-amber/10 text-amber hover:bg-amber/20 hover:text-amber"
          >
            <PlusIcon width={16} height={16} />
            New board
          </Button>
        )}
      </div>

      {creating && (
        <div className="mb-6 flex gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setName("");
              }
            }}
            placeholder="Board name"
            className="flex-1 border-paper/20 bg-void text-paper focus-visible:border-amber/60 focus-visible:ring-0"
          />
          <Button onClick={handleCreate} className="bg-amber text-void hover:bg-amber/90 font-semibold">
            Create
          </Button>
          <Button
            onClick={() => {
              setCreating(false);
              setName("");
            }}
            variant="outline"
            className="border-paper/20 text-paper/70 hover:bg-paper/5"
          >
            Cancel
          </Button>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-lg bg-paper/5" />
          ))}
        </ul>
      ) : boards.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-3 border-dashed border-paper/20 bg-transparent py-16 text-center shadow-none">
          <span className="text-paper/40">
            <BoardIcon width={40} height={40} />
          </span>
          <p className="text-paper/60">No boards yet.</p>
          <p className="text-sm text-paper/40">
            Create your first board to start drawing.
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <li key={board.id}>
              <Card className="group flex items-center justify-between border-paper/15 bg-paper/[0.03] p-4 transition-colors hover:border-moss/50 shadow-none">
                {editingId === board.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(board.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleRename(board.id)}
                      className="flex-1 rounded-md border border-amber/40 bg-void px-2 py-1 text-sm text-paper outline-none focus:border-amber/80"
                    />
                  </div>
                ) : (
                  <Link
                    href={`/board/${board.id}`}
                    onClick={() => handleOpenBoard(board.id)}
                    className="flex flex-1 items-center gap-3"
                  >
                    <span className="text-moss">
                      <BoardIcon width={22} height={22} />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold text-paper">
                        {board.name}
                      </span>
                      <span className="text-xs text-paper/40">
                        Updated {new Date(board.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                )}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {editingId !== board.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(board.id);
                        setEditName(board.name);
                      }}
                      aria-label={`Rename ${board.name}`}
                      className="h-8 w-8 text-paper/40 hover:bg-void hover:text-amber"
                    >
                      <EditIcon width={18} height={18} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBoardToDelete(board.id)}
                    aria-label={`Delete ${board.name}`}
                    className="h-8 w-8 text-paper/40 hover:bg-void hover:text-red-400"
                  >
                    <TrashIcon width={18} height={18} />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={boardToDelete !== null} onOpenChange={(isOpen) => !isOpen && setBoardToDelete(null)}>
        <AlertDialogContent className="border-paper/20 bg-void text-paper">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-paper">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-paper/60">
              This will permanently delete the board and remove it from your browser&apos;s local storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-paper/20 text-paper hover:bg-paper/5 hover:text-paper">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (boardToDelete) {
                  handleDelete(boardToDelete);
                  setBoardToDelete(null);
                }
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
