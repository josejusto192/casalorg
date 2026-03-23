-- ============================================================
-- Allow unauthenticated household lookup by invite code
-- Uses SECURITY DEFINER to bypass RLS so a user can join
-- a household before their profile has a household_id.
-- ============================================================

CREATE OR REPLACE FUNCTION find_household_by_invite_code(code text)
RETURNS TABLE (
  id            uuid,
  name          text,
  invite_code   text,
  has_children  boolean,
  has_pets      boolean,
  created_at    timestamptz,
  updated_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, invite_code, has_children, has_pets, created_at, updated_at
  FROM households
  WHERE invite_code = upper(trim(code))
    AND auth.uid() IS NOT NULL;
$$;
