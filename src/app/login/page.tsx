"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, LogoIcon, SpinnerIcon } from "@/components/icons";

function toSyntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@catnoted.app`;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const route = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-sm text-paper/60 hover:text-amber transition-colors">
        <ArrowLeftIcon width={16} height={16} />
        Back to boards
      </Link>

      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 text-amber">
          <LogoIcon width={40} height={40} />
        </span>
        <h1 className="text-2xl font-bold text-paper">
          {mode === "signin" ? "SYS.AUTH.SIGNIN" : "SYS.AUTH.SIGNUP"}
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          {mode === "signin" ? "> Enter username to access cloud storage." : "> Register a new username identity."}
        </p>
      </div>

      <Card className="border-paper/15 bg-paper/[0.03] p-6 shadow-none">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-paper">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="coolcat99"
              required
              className="border-paper/20 bg-void text-paper focus-visible:border-amber/60 focus-visible:ring-0"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-paper">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 chars"
              required
              minLength={6}
              className="border-paper/20 bg-void text-paper focus-visible:border-amber/60 focus-visible:ring-0"
            />
          </div>

          {error ? <div className="text-sm font-medium text-red-400 text-center">&gt; Error: {error}</div> : null}

          <Button type="submit" disabled={loading} className="mt-2 bg-amber text-void hover:bg-amber/90 font-semibold disabled:opacity-50">
            {loading ? <SpinnerIcon className="h-4 w-4" /> : mode === "signin" ? "Authenticate" : "Register_Identity"}
          </Button>
        </form>

        <div className="mt-4 flex justify-between text-xs font-mono text-paper/50">
          <p>{mode === "signin" ? "> Mode: Authentication" : "> Mode: Registration"}</p>
          <button type="button" className="hover:text-amber" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </div>
      </Card>
    </main>
  );
}
