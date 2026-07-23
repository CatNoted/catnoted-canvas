"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UserPlusIcon } from "@/components/icons";

interface Member {
  member_id: string | null;
  board_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  email: string;
  username: string | null;
  created_at: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  isOwner: boolean;
}

export function ShareModal({ isOpen, onClose, boardId, isOwner }: ShareModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/members`);
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members || []);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to fetch collaborators");
      }
    } catch {
      setError("Failed to fetch collaborators");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setEmailOrUsername("");
      setRole("viewer");
      fetchMembers();
    }
  }, [isOpen, fetchMembers]);

  async function handleAddCollaborator(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: emailOrUsername.trim(),
          role,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to add collaborator");
        setSubmitting(false);
        return;
      }

      setSuccess(`Successfully added collaborator.`);
      setEmailOrUsername("");
      setRole("viewer");
      await fetchMembers();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!confirm("Are you sure you want to remove this collaborator?")) return;

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to remove collaborator");
        return;
      }

      setSuccess("Collaborator removed successfully.");
      await fetchMembers();
    } catch {
      setError("An unexpected error occurred");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-void/85 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Card Content */}
      <div className="relative w-full max-w-md rounded-lg border border-paper/15 bg-void p-6 shadow-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber">
              <UserPlusIcon width={22} height={22} />
            </span>
            <h2 className="text-lg font-bold text-paper">Collaborators</h2>
          </div>
          <button
            onClick={onClose}
            className="text-paper/40 hover:text-paper"
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>

        {isOwner ? (
          <form onSubmit={handleAddCollaborator} className="mb-6 flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-paper/50">Invite new collaborator</h3>
            <div className="flex gap-2">
              <Input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Email or username"
                required
                className="flex-1 border-paper/20 bg-void text-paper focus-visible:border-amber/60 focus-visible:ring-0"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                className="rounded-md border border-paper/20 bg-void px-3 py-2 text-sm text-paper outline-none focus:border-amber/60 focus:ring-0"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                type="submit"
                disabled={submitting || !emailOrUsername.trim()}
                className="bg-amber text-void hover:bg-amber/90 font-semibold disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mb-6 rounded-md border border-paper/10 bg-paper/[0.02] p-3 text-center text-sm text-paper/60">
            Only the board owner can manage collaborators.
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm font-medium text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-sm font-medium text-moss">
            {success}
          </div>
        )}

        <div className="flex flex-col">
          <h3 className="mb-2 text-xs uppercase tracking-wider text-paper/50">Current collaborators</h3>
          {loading ? (
            <div className="py-4 text-center text-sm text-paper/40">Loading collaborators...</div>
          ) : members.length === 0 ? (
            <div className="py-4 text-center text-sm text-paper/40">No collaborators added yet.</div>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y divide-paper/10">
              {members.map((member) => (
                <li key={member.user_id || member.email} className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col pr-4 overflow-hidden">
                    <span className="truncate text-sm font-medium text-paper">
                      {member.email || "Unknown user"}
                    </span>
                    {member.username && (
                      <span className="truncate text-xs text-paper/40">@{member.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded border font-mono select-none capitalize",
                      member.role === "owner" && "border-amber/30 text-amber bg-amber/5",
                      member.role === "editor" && "border-moss/30 text-moss bg-moss/5",
                      member.role === "viewer" && "border-paper/20 text-paper/60 bg-paper/5"
                    )}>
                      {member.role}
                    </span>
                    {isOwner && member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveCollaborator(member.user_id)}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline"
                        aria-label={`Remove collaborator ${member.email}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-paper/20 text-paper hover:bg-paper/5 hover:text-paper"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
