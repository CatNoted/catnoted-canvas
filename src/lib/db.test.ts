import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  createBoard,
  listBoards,
  getBoard,
  deleteBoard,
  renameBoard,
  saveSnapshot,
  loadSnapshot,
  markBoardOpened,
  resetDBForTests,
} from "@/lib/db";

// Reset IndexedDB and the memoized connection before each test for isolation.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDBForTests();
});

describe("local-first board persistence", () => {
  it("creates and lists a board", async () => {
    const board = await createBoard("My board");
    expect(board.id).toBeTruthy();
    expect(board.name).toBe("My board");

    const boards = await listBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(board.id);
  });

  it("falls back to a default name when blank", async () => {
    const board = await createBoard("   ");
    expect(board.name).toBe("Untitled board");
  });

  it("saves and loads a board snapshot", async () => {
    const board = await createBoard("Snapshot board");
    const snapshot = { shapes: { a: 1 }, meta: "hello" };
    await saveSnapshot(board.id, snapshot);

    const loaded = await loadSnapshot(board.id);
    expect(loaded).toEqual(snapshot);
  });

  it("renames a board", async () => {
    const board = await createBoard("Old name");
    await renameBoard(board.id, "New name");
    const updated = await getBoard(board.id);
    expect(updated?.name).toBe("New name");
  });

  it("deletes a board and its snapshot", async () => {
    const board = await createBoard("To delete");
    await saveSnapshot(board.id, { x: 1 });
    await deleteBoard(board.id);

    expect(await getBoard(board.id)).toBeUndefined();
    expect(await loadSnapshot(board.id)).toBeUndefined();
    expect(await listBoards()).toHaveLength(0);
  });

  it("orders boards by most recently updated", async () => {
    const a = await createBoard("A");
    await new Promise((r) => setTimeout(r, 5));
    const b = await createBoard("B");
    await new Promise((r) => setTimeout(r, 5));
    await saveSnapshot(a.id, { touched: true });

    const boards = await listBoards();
    expect(boards[0].id).toBe(a.id);
    expect(boards[1].id).toBe(b.id);
  });

  it("updates lastOpenedAt when a board is opened", async () => {
    const board = await createBoard("To open");
    expect(board.lastOpenedAt).toBeUndefined();

    await markBoardOpened(board.id);
    const updated = await getBoard(board.id);
    expect(updated?.lastOpenedAt).toBeDefined();
    expect(typeof updated?.lastOpenedAt).toBe("number");
  });

  it("orders boards by lastOpenedAt if present, then updatedAt", async () => {
    const a = await createBoard("A"); // oldest
    await new Promise((r) => setTimeout(r, 10));
    const b = await createBoard("B"); // middle
    await new Promise((r) => setTimeout(r, 10));
    const c = await createBoard("C"); // newest

    // Initially C > B > A (updatedAt)
    let boards = await listBoards();
    expect(boards.map(b => b.name)).toEqual(["C", "B", "A"]);

    // Open A
    await new Promise((r) => setTimeout(r, 10));
    await markBoardOpened(a.id);
    boards = await listBoards();
    // Now A > C > B
    expect(boards.map(b => b.name)).toEqual(["A", "C", "B"]);

    await new Promise((r) => setTimeout(r, 5));

    // Open B
    await markBoardOpened(b.id);
    boards = await listBoards();
    // Now B > A > C
    expect(boards.map(b => b.name)).toEqual(["B", "A", "C"]);
  });
});
