// Local-first persistence for catnoted-canvas using IndexedDB (via idb).
// No server, no telemetry. All board data lives in the user browser.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface BoardMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}

// tldraw store snapshot is a plain serializable object. We keep it loose here
// to avoid coupling to a specific tldraw internal type.
export type BoardSnapshot = Record<string, unknown>;

interface CanvasDB extends DBSchema {
  boards: {
    key: string;
    value: BoardMeta;
    indexes: { "by-updated": number };
  };
  snapshots: {
    key: string;
    value: { id: string; snapshot: BoardSnapshot };
  };
}

const DB_NAME = "catnoted-canvas";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CanvasDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CanvasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CanvasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const boards = db.createObjectStore("boards", { keyPath: "id" });
        boards.createIndex("by-updated", "updatedAt");
        db.createObjectStore("snapshots", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// For tests: reset the memoized connection so a fresh (fake) IndexedDB is used.
export function resetDBForTests() {
  dbPromise = null;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `board_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listBoards(): Promise<BoardMeta[]> {
  const db = await getDB();
  const all = await db.getAll("boards");
  return all.sort((a, b) => {
    const aTime = a.lastOpenedAt ?? a.updatedAt;
    const bTime = b.lastOpenedAt ?? b.updatedAt;
    return bTime - aTime;
  });
}

export async function createBoard(name: string): Promise<BoardMeta> {
  const db = await getDB();
  const now = Date.now();
  const meta: BoardMeta = {
    id: newId(),
    name: name.trim() || "Untitled board",
    createdAt: now,
    updatedAt: now,
  };
  await db.put("boards", meta);
  return meta;
}

export async function getBoard(id: string): Promise<BoardMeta | undefined> {
  const db = await getDB();
  return db.get("boards", id);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("boards", id);
  await db.delete("snapshots", id);
}

export async function renameBoard(id: string, name: string): Promise<void> {
  const db = await getDB();
  const meta = await db.get("boards", id);
  if (!meta) return;
  meta.name = name.trim() || meta.name;
  meta.updatedAt = Date.now();
  await db.put("boards", meta);
}

export async function saveSnapshot(
  id: string,
  snapshot: BoardSnapshot,
): Promise<void> {
  const db = await getDB();
  await db.put("snapshots", { id, snapshot });
  const meta = await db.get("boards", id);
  if (meta) {
    meta.updatedAt = Date.now();
    await db.put("boards", meta);
  }
}

export async function loadSnapshot(
  id: string,
): Promise<BoardSnapshot | undefined> {
  const db = await getDB();
  const row = await db.get("snapshots", id);
  return row?.snapshot;
}

export async function markBoardOpened(id: string): Promise<void> {
  const db = await getDB();
  const meta = await db.get("boards", id);
  if (!meta) return;
  meta.lastOpenedAt = Date.now();
  await db.put("boards", meta);
}
