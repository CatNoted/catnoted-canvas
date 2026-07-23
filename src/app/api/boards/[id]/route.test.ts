import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("board [id] route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("returns 404 when board not found", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({ error: "Board not found" });
    });

    it("returns board when found", async () => {
      const mockBoard = { id: "1", name: "Board 1" };
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ board: mockBoard });
      expect(mockEq).toHaveBeenCalledWith("id", "1");
    });

    it("handles database error", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "DB Error" });
    });
  });

  describe("PATCH", () => {
    it("returns 404 when board not found", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({ error: "Board not found" });
    });

    it("updates and returns board", async () => {
      const mockBoard = { id: "1", name: "Updated" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "1", name: "Old" }, error: null });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEqUpdate = vi.fn().mockReturnThis();
      const mockSelectUpdate = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
            select: mockSelectUpdate,
            single: mockSingle,
          })),
          update: mockUpdate,
        })),
      } as any);

      const req = new Request("http://localhost/api/boards/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ board: mockBoard });
      expect(mockUpdate).toHaveBeenCalledWith({ name: "Updated" });
    });

    it("handles database error on update", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "1", name: "Old" }, error: null });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEqUpdate = vi.fn().mockReturnThis();
      const mockSelectUpdate = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Update Error" } });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
            select: mockSelectUpdate,
            single: mockSingle,
          })),
          update: mockUpdate,
        })),
      } as any);

      const req = new Request("http://localhost/api/boards/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Update Error" });
    });
  });

  describe("DELETE", () => {
    it("returns 404 when board not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
          })),
          maybeSingle: mockMaybeSingle,
          delete: vi.fn().mockReturnThis(),
        })),
      } as any);

      const req = new Request("http://localhost/api/boards/1", { method: "DELETE" });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({ error: "Board not found" });
    });

    it("deletes board and returns ok", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "1", name: "Board" }, error: null });
      const mockDelete = vi.fn().mockReturnThis();
      const mockEqDelete = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((key, val) => {
            if (mockDelete.mock.calls.length > 0) return mockEqDelete();
            return { maybeSingle: mockMaybeSingle };
          }),
          maybeSingle: mockMaybeSingle,
          delete: mockDelete,
        })),
      } as any);

      const req = new Request("http://localhost/api/boards/1", { method: "DELETE" });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ ok: true });
    });

    it("handles database error on delete", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "1", name: "Board" }, error: null });
      const mockDelete = vi.fn().mockReturnThis();
      const mockEqDelete = vi.fn().mockResolvedValue({ error: { message: "Delete Error" } });

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((key, val) => {
            if (mockDelete.mock.calls.length > 0) return mockEqDelete();
            return { maybeSingle: mockMaybeSingle };
          }),
          maybeSingle: mockMaybeSingle,
          delete: mockDelete,
        })),
      } as any);

      const req = new Request("http://localhost/api/boards/1", { method: "DELETE" });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Delete Error" });
    });
  });
});
