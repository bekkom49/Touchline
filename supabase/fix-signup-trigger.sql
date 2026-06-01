-- Fix "Database error saving new user" on signup
-- Run this in Supabase SQL Editor, then try signing up again.

-- Default team required for Player/Captain profiles (FK on users.team_id)
INSERT INTO public.teams (id, name, primary_kit_color, away_kit_color)
VALUES (1, 'Emerald City FC', 'Emerald Green', 'White')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  chosen_role public.user_role := 'Player';
  chosen_team bigint := NULLIF(meta->>'team_id', '')::bigint;
  resolved_team bigint;
  profile_name text;
BEGIN
  -- Safe role parse (invalid metadata must not block auth signup)
  BEGIN
    chosen_role := COALESCE((meta->>'role')::public.user_role, 'Player');
  EXCEPTION
    WHEN invalid_text_representation THEN
      chosen_role := 'Player';
  END;

  profile_name := COALESCE(
    NULLIF(TRIM(COALESCE(meta->>'name', '')), ''),
    split_part(NEW.email, '@', 1)
  );

  resolved_team := CASE
    WHEN chosen_role = 'Organizer' THEN NULL
    ELSE COALESCE(chosen_team, 1)
  END;

  -- Link an existing seed/manual row with the same email
  UPDATE public.users
  SET
    auth_id = NEW.id,
    name = profile_name,
    role = chosen_role,
    team_id = resolved_team
  WHERE email = NEW.email
    AND auth_id IS NULL;

  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (auth_id, name, email, role, team_id)
  VALUES (NEW.id, profile_name, NEW.email, chosen_role, resolved_team)
  ON CONFLICT (auth_id) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role,
        team_id = EXCLUDED.team_id;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already tied to a different account
    RAISE EXCEPTION 'An account with this email already exists. Try signing in instead.';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Default team missing. Re-run this script to create team id 1.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile setup failed: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
