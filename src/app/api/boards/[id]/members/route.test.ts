import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("board [id] members route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when user is not logged in", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns members list when authorized", async () => {
      const mockUser = { id: "user1" };
      const mockMembers = [
        { user_id: "user1", email: "user1@example.com", role: "owner" },
        { user_id: "user2", email: "user2@example.com", role: "editor" },
      ];

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        rpc: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      } as any);

      const req = new Request("http://localhost/api/boards/1/members");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ members: mockMembers });
    });

    it("handles database error on RPC call", async () => {
      const mockUser = { id: "user1" };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      } as any);

      const req = new Request("http://localhost/api/boards/1/members");
      const response = await GET(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Database error" });
    });
  });

  describe("POST", () => {
    it("returns 401 when user is not logged in", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 when identifier is missing", async () => {
      const mockUser = { id: "user1" };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Email or username is required" });
    });

    it("returns 400 when role is invalid", async () => {
      const mockUser = { id: "user1" };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", role: "invalid" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Invalid role. Must be 'editor' or 'viewer'" });
    });

    it("returns 404 when board not found", async () => {
      const mockUser = { id: "user1" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({ error: "Board not found" });
    });

    it("returns 403 when caller is not board owner", async () => {
      const mockUser = { id: "user2" };
      const mockBoard = { id: "1", created_by: "user1" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json).toEqual({ error: "Forbidden: Only board owners can manage members" });
    });

    it("returns 404 when target user to add does not exist", async () => {
      const mockUser = { id: "user1" };
      const mockBoard = { id: "1", created_by: "user1" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }), // User not found
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({ error: "User not found" });
    });

    it("returns 400 when trying to add owner as collaborator", async () => {
      const mockUser = { id: "user1" };
      const mockBoard = { id: "1", created_by: "user1" };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockBoard, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
        }),
        rpc: vi.fn().mockResolvedValue({ data: "user1", error: null }), // Target user is user1 (owner)
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "owner@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "Cannot add the owner as a collaborator" });
    });

    it("returns 400 when user is already a collaborator", async () => {
      const mockUser = { id: "user1" };
      const mockBoard = { id: "1", created_by: "user1" };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockImplementation((table) => {
          if (table === "boards") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBoard, error: null }),
            };
          }
          if (table === "board_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-member" }, error: null }),
              })),
            };
          }
          return {} as any;
        }),
        rpc: vi.fn().mockResolvedValue({ data: "user2", error: null }), // Target user is user2
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "user2@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "User is already a collaborator on this board" });
    });

    it("adds member successfully", async () => {
      const mockUser = { id: "user1" };
      const mockBoard = { id: "1", created_by: "user1" };
      const mockInsert = { id: "bm1", board_id: "1", user_id: "user2", role: "editor" };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockImplementation((table) => {
          if (table === "boards") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBoard, error: null }),
            };
          }
          if (table === "board_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // Not member yet
              })),
              insert: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockInsert, error: null }),
            };
          }
          return {} as any;
        }),
        rpc: vi.fn().mockResolvedValue({ data: "user2", error: null }), // Target user is user2
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "POST",
        body: JSON.stringify({ email: "user2@example.com", role: "editor" }),
      });
      const response = await POST(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json).toEqual({ member: mockInsert });
    });
  });

  describe("DELETE", () => {
    it("returns 401 when user is not logged in", async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "DELETE",
        body: JSON.stringify({ userId: "user2" }),
      });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 when userId is missing", async () => {
      const mockUser = { id: "user1" };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: "User ID is required" });
    });

    it("deletes collaborator successfully", async () => {
      const mockUser = { id: "user1" };
      const mockBoard = { id: "1", created_by: "user1" };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn().mockImplementation((table) => {
          if (table === "boards") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBoard, error: null }),
            };
          }
          if (table === "board_members") {
            return {
              delete: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          return {} as any;
        }),
      } as any);

      const req = new Request("http://localhost/api/boards/1/members", {
        method: "DELETE",
        body: JSON.stringify({ userId: "user2" }),
      });
      const response = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ ok: true });
    });
  });
});
