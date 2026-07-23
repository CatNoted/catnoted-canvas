export const ROLE = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export interface Board {
  id: string;
  name: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type BoardInsert = Omit<Board, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

export type BoardUpdate = Partial<BoardInsert> & { id: string };

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export type BoardMemberInsert = Omit<BoardMember, "id" | "created_at"> & {
  id?: string;
};
