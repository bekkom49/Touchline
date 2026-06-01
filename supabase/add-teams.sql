-- Add three league teams (safe to re-run)
INSERT INTO public.teams (id, name, primary_kit_color, away_kit_color) VALUES
  (5, 'Lakeside Lions', 'Teal', 'Cream'),
  (6, 'Metro Strikers', 'Purple', 'Silver'),
  (7, 'Canyon City SC', 'Forest Green', 'Yellow')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('teams', 'id'), (SELECT MAX(id) FROM teams));

-- Allow signup screen to list clubs before login
DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
DROP POLICY IF EXISTS "teams_select_public" ON public.teams;

CREATE POLICY "teams_select_public"
  ON public.teams FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.teams TO anon;

-- Players may join or leave a club (change team_id only)
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
