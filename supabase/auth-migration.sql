-- Link Supabase Auth users to the public.users profile table.
-- Run once in the Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Optional: auto-create profile when a new auth user confirms (uses signUp metadata).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := NEW.raw_user_meta_data;
  chosen_role user_role := COALESCE((meta->>'role')::user_role, 'Player');
  chosen_team bigint := NULLIF(meta->>'team_id', '')::bigint;
BEGIN
  INSERT INTO public.users (auth_id, name, email, role, team_id)
  VALUES (
    NEW.id,
    COALESCE(meta->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    chosen_role,
    CASE WHEN chosen_role = 'Organizer' THEN NULL ELSE COALESCE(chosen_team, 1) END
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
