import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

describe("login route", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("returns 400 when missing username", async () => {
    const req = new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ password: "x" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Username and password are required" });
  });

  it("returns 400 when missing password", async () => {
    const req = new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ username: "a" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Username and password are required" });
  });

  it("returns 400 on invalid username characters", async () => {
    const req = new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ username: "bad name", password: "123456" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Use letters, numbers, dots, underscores, or hyphens only." });
  });

  it("handles login failure", async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid credentials" } }) } } as any);
    const req = new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ username: "x", password: "wrong" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Invalid credentials" });
  });

  it("handles login success with synthetic email mapping", async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }) } } as any);
    const req = new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ username: "CoolCat.99", password: "123456" }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, user: { id: "u1" } });
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
