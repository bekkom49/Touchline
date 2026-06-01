-- Match scores + captains create clubs (organizers no longer insert teams)
-- Run once in Supabase SQL Editor.

-- App sets status to 'Completed' when a scoreline is saved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'match_status'
      AND e.enumlabel = 'Completed'
  ) THEN
    ALTER TYPE public.match_status ADD VALUE 'Completed';
  END IF;
END $$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_score integer,
  ADD COLUMN IF NOT EXISTS away_score integer;

DROP POLICY IF EXISTS "teams_insert_organizer" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_captain" ON public.teams;

CREATE POLICY "teams_insert_captain"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_captain());

-- Captains may assign themselves to a club they create or join
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
