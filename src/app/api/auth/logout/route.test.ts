import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("logout route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST", () => {
    it("handles logout success", async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          signOut: mockSignOut,
        },
      } as any);

      const response = await POST();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ ok: true });
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("handles unexpected error", async () => {
      vi.mocked(createClient).mockRejectedValue(new Error("Unexpected"));

      const response = await POST();
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ ok: false, error: "Internal Server Error" });
    });
  });
});
