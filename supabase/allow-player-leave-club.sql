-- Allow players to leave a club (team_id → NULL) and switch clubs.
-- Run once in Supabase SQL Editor if Leave club fails silently or with
-- "You can only update your own display name."

-- Players without a club (organizers already use NULL)
ALTER TABLE public.users
  ALTER COLUMN team_id DROP NOT NULL;

-- Players may join, switch, or leave (change team_id only)
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
      IF OLD.role <> 'Player' THEN
        RAISE EXCEPTION 'Only players can join or leave a club.';
      END IF;
      IF NEW.team_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id) THEN
        RAISE EXCEPTION 'Invalid team selected.';
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
