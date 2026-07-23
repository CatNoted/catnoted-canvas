-- Phase 2: Board collaborator lookup and retrieval functions.

CREATE OR REPLACE FUNCTION public.get_user_id_by_email_or_username(identifier text)
RETURNS uuid AS $$
  SELECT id FROM auth.users
  WHERE email = identifier
     OR raw_user_meta_data->>'username' = identifier
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_board_members_with_profiles(target_board_id uuid)
RETURNS TABLE (
  member_id uuid,
  board_id uuid,
  user_id uuid,
  role text,
  email text,
  username text,
  created_at timestamptz
) AS $$
DECLARE
  owner_id uuid;
BEGIN
  -- Get the board's owner
  SELECT created_by INTO owner_id FROM public.boards WHERE id = target_board_id;

  IF owner_id IS NULL THEN
    RETURN;
  END IF;

  -- Security check: Is the calling user authorized?
  -- They are authorized if they are the owner or a member of the board.
  IF auth.uid() <> owner_id AND NOT EXISTS (
    SELECT 1 FROM public.board_members bm
    WHERE bm.board_id = target_board_id AND bm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  -- Return owner first
  RETURN QUERY
  SELECT
    NULL::uuid AS member_id,
    target_board_id AS board_id,
    owner_id AS user_id,
    'owner'::text AS role,
    u.email::text,
    (u.raw_user_meta_data->>'username')::text AS username,
    b.created_at
  FROM public.boards b
  JOIN auth.users u ON b.created_by = u.id
  WHERE b.id = target_board_id;

  -- Return other members
  RETURN QUERY
  SELECT
    bm.id AS member_id,
    bm.board_id,
    bm.user_id,
    bm.role,
    u.email::text,
    (u.raw_user_meta_data->>'username')::text AS username,
    bm.created_at
  FROM public.board_members bm
  JOIN auth.users u ON bm.user_id = u.id
  WHERE bm.board_id = target_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
