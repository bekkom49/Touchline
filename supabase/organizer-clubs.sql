-- Organizer club creation + invite codes + optional player signup (no club required)
-- Run once in Supabase SQL Editor.

ALTER TABLE public.users
  ALTER COLUMN team_id DROP NOT NULL;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS created_by bigint REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

-- Optional: backfill invite codes for existing teams
UPDATE public.teams
SET invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE invite_code IS NULL;

-- Player signup: club is optional (null if none chosen)
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
  INSERT INTO public.teams (id, name, primary_kit_color, away_kit_color)
  VALUES (1, 'Emerald City FC', 'Emerald Green', 'White')
  ON CONFLICT (id) DO NOTHING;

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
    WHEN chosen_team IS NOT NULL THEN chosen_team
    WHEN chosen_role = 'Player' THEN NULL
    ELSE 1
  END;

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
    RAISE EXCEPTION 'An account with this email already exists. Try signing in instead.';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Default team missing. Ensure team id 1 exists.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile setup failed: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Captains may create clubs (organizers schedule matches only)
DROP POLICY IF EXISTS "teams_insert_organizer" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_captain" ON public.teams;

CREATE POLICY "teams_insert_captain"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (public.is_captain());

-- Players may join/leave clubs (team_id changes)
CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.auth_id IS NULL AND NEW.auth_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  IF OLD.auth_id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
      RAISE EXCEPTION 'You cannot change role, email, or auth link.';
    END IF;

    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
      IF OLD.role = 'Player' THEN
        IF NEW.team_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id) THEN
          RAISE EXCEPTION 'Invalid team selected.';
        END IF;
      ELSIF OLD.role = 'Captain' THEN
        IF NEW.team_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id) THEN
          RAISE EXCEPTION 'Invalid team selected.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Only players and captains can change club.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_rules ON public.users;
CREATE TRIGGER enforce_profile_update_rules
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_rules();
