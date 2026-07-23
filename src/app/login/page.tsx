"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, LogoIcon } from "@/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to log in");
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
      <Link
        href="/"
        className="mb-8 flex w-fit items-center gap-2 text-sm text-paper/60 hover:text-amber transition-colors"
      >
        <ArrowLeftIcon width={16} height={16} />
        Back to boards
      </Link>

      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 text-amber">
          <LogoIcon width={40} height={40} />
        </span>
        <h1 className="text-2xl font-bold text-paper">Welcome back</h1>
        <p className="mt-2 text-sm text-paper/60">
          Sign in to your account
        </p>
      </div>

      <Card className="border-paper/15 bg-paper/[0.03] p-6 shadow-none">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-paper">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
              placeholder="••••••••"
              required
              className="border-paper/20 bg-void text-paper focus-visible:border-amber/60 focus-visible:ring-0"
            />
          </div>

          {error && (
            <div className="text-sm font-medium text-red-400 text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 bg-amber text-void hover:bg-amber/90 font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
