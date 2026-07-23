import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("handles missing code parameter", async () => {
    const req = new Request("http://localhost/api/auth/callback", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/?login_error=1");
  });

  it("handles failed token exchange", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("Invalid code") }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/callback?code=bad_code", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/?login_error=1");
  });

  it("redirects to home if successful and no next param", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/callback?code=good_code", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("redirects to relative next param if successful", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/callback?code=good_code&next=/board/123", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/board/123");
  });

  it("rejects malicious absolute urls in next param", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/callback?code=good_code&next=https://malicious.com/hack", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("accepts trusted absolute urls in next param", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const req = new Request("http://localhost/api/auth/callback?code=good_code&next=https://canvas.catnoted.app/board/123", {
      method: "GET",
    });
    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://canvas.catnoted.app/board/123");
  });
});
