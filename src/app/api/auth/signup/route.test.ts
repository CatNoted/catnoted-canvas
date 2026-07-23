import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

describe("signup route", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("returns 400 when missing username", async () => {
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ password: "x" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Username and password are required" });
  });

  it("returns 400 when missing password", async () => {
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ username: "a" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Username and password are required" });
  });

  it("returns 400 on invalid username characters", async () => {
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ username: "bad name", password: "123456" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Use letters, numbers, dots, underscores, or hyphens only." });
  });

  it("returns 400 on short password", async () => {
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ username: "a", password: "123" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Password must be at least 6 characters." });
  });

  it("handles duplicate username", async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "User already registered" } }) } } as any);
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ username: "taken", password: "123456" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "That username is taken. Try signing in instead." });
  });

  it("handles successful signup", async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) } } as any);
    const req = new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify({ username: "newuser", password: "123456" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, user: { id: "u1" } });
  });
});
