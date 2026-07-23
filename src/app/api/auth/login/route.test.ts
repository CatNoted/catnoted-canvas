import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("login route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST", () => {
    it("returns 400 when missing email", async () => {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: "pass" }),
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ ok: false, error: "Email and password are required" });
    });

    it("returns 400 when missing password", async () => {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ ok: false, error: "Email and password are required" });
    });

    it("handles login failure", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid credentials" } }),
        },
      } as any);

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ ok: false, error: "Invalid credentials" });
    });

    it("handles login success", async () => {
      const mockUser = { id: "user1", email: "test@example.com" };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "correct" }),
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ ok: true, user: mockUser });
    });

    it("handles unexpected error", async () => {
      vi.mocked(createClient).mockRejectedValue(new Error("Unexpected"));

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "correct" }),
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ ok: false, error: "Internal Server Error" });
    });
  });
});
