import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Y from "yjs";

// Mock the client supabase creator
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/client";

describe("Yjs and Supabase Realtime sync layer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("encodes and decodes state vectors and updates correctly", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const yMap1 = doc1.getMap("test");
    yMap1.set("key", "value1");

    // Get sync step 1 from doc2 (empty)
    const stateVector2 = Y.encodeStateVector(doc2);
    expect(stateVector2).toBeInstanceOf(Uint8Array);

    // Compute step 2 update from doc1 using doc2's state vector
    const update1 = Y.encodeStateAsUpdate(doc1, stateVector2);
    expect(update1).toBeInstanceOf(Uint8Array);

    // Apply update to doc2
    Y.applyUpdate(doc2, update1);

    const yMap2 = doc2.getMap("test");
    expect(yMap2.get("key")).toBe("value1");
  });

  it("handles incoming broadcast messages and applies updates to the Yjs document", () => {
    const doc = new Y.Doc();
    const yMap = doc.getMap("store");

    // Simulate receiving a sync-update message
    const remoteDoc = new Y.Doc();
    const remoteMap = remoteDoc.getMap("store");
    remoteMap.set("shape-123", { id: "shape-123", x: 100, y: 200 });

    const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);

    // Apply the remote update to our local doc
    Y.applyUpdate(doc, remoteUpdate, "remote");

    expect(yMap.get("shape-123")).toEqual({ id: "shape-123", x: 100, y: 200 });
  });

  it("subscribes to a mock Supabase Realtime channel and tracks presence", () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((cb) => {
        cb("SUBSCRIBED");
        return mockChannel;
      }),
      send: vi.fn().mockResolvedValue({}),
      track: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue({
      channel: vi.fn().mockReturnValue(mockChannel),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123", email: "user@test.com" } } }),
      },
    } as any);

    const supabase = createClient();
    const channel = supabase.channel("board-collab:test-board");

    expect(channel).toBe(mockChannel);

    channel.subscribe((status) => {
      expect(status).toBe("SUBSCRIBED");
    });

    channel.track({ userId: "user-123", userName: "user" });
    expect(mockChannel.track).toHaveBeenCalledWith({ userId: "user-123", userName: "user" });
  });
});
