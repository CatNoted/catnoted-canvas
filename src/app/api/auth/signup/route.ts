import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as Record<string, string>;

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Username and password are required" }, { status: 400 });
    }

    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return NextResponse.json({ ok: false, error: "Use letters, numbers, dots, underscores, or hyphens only." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const email = `${trimmed.toLowerCase()}@catnoted.app`;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: trimmed } },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("user already registered")) {
        return NextResponse.json({ ok: false, error: "That username is taken. Try signing in instead." }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: data.user });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
