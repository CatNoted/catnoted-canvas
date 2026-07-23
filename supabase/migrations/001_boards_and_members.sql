-- Phase 2 foundation: boards and board_members with RLS.
-- This migration is NOT wired to any route or UI yet.
-- Enable extension first if needed: CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- RLS for boards
CREATE POLICY owner_select ON public.boards
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY owner_insert ON public.boards
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY owner_update ON public.boards
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY owner_delete ON public.boards
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY member_select ON public.boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
    )
  );

CREATE POLICY editor_update ON public.boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
        AND board_members.role IN ('owner','editor')
    )
  );

-- RLS for board_members
CREATE POLICY member_read ON public.board_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_members.board_id
        AND boards.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY owner_manage_members ON public.board_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_members.board_id
        AND boards.created_by = auth.uid()
    )
  );

CREATE POLICY self_insert_member ON public.board_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: update updated_at on boards
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
