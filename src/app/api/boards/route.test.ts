import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("boards route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("returns empty array when unauthenticated", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual([]);
    });

    it("returns boards for authenticated user", async () => {
      const mockBoards = [{ id: "1", name: "Board 1" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockBoards, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
        },
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        }),
      } as any);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(mockBoards);
      expect(mockEq).toHaveBeenCalledWith("created_by", "user1");
    });

    it("handles database error", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
        },
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        }),
      } as any);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "DB Error" });
    });

    it("handles unexpected error", async () => {
      vi.mocked(createClient).mockRejectedValue(new Error("Unexpected"));

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ error: "Unexpected server error" });
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: "New Board" }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("creates a board for authenticated user", async () => {
      const mockBoard = { id: "1", name: "New Board", is_public: false };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: "New Board" }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json).toEqual({ board: mockBoard });
      expect(mockInsert).toHaveBeenCalledWith({
        name: "New Board",
        created_by: "user1",
        is_public: false,
      });
    });

    it("handles database error on create", async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Insert Error" } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: "New Board" }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Insert Error" });
    });

    it("handles unexpected error on create", async () => {
      vi.mocked(createClient).mockRejectedValue(new Error("Unexpected"));

      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: "New Board" }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({ error: "Unexpected server error" });
    });
  });
});
