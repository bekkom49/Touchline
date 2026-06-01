-- ============================================================
-- Touchline — Production RLS (Supabase Auth)
-- ============================================================
-- Run this entire file in the Supabase SQL Editor (one paste).
-- It adds auth_id if missing, then installs production policies.
-- Safe to re-run.
-- ============================================================

-- ---------------------------------------------------------------------------
-- Step 1: Link auth.users → public.users (skip if already done)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

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

-- ---------------------------------------------------------------------------
-- Step 2: Helper functions (SECURITY DEFINER — read profile for auth.uid())
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_team_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'Organizer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_captain()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'Captain'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_player()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'Player'
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_team_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_name() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organizer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_captain() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_player() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_captain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player() TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Drop DEV / legacy policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow public read matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public read rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert users" ON public.users;
DROP POLICY IF EXISTS "Allow public update users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public update matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public insert rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public update rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public delete rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public insert messages" ON public.messages;

DROP POLICY IF EXISTS "Allow anon read teams" ON public.teams;
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
DROP POLICY IF EXISTS "Allow anon read matches" ON public.matches;
DROP POLICY IF EXISTS "Allow anon read rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow anon read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
DROP POLICY IF EXISTS "Allow anon update users" ON public.users;
DROP POLICY IF EXISTS "Allow anon delete users" ON public.users;
DROP POLICY IF EXISTS "Allow anon insert matches" ON public.matches;
DROP POLICY IF EXISTS "Allow anon update matches" ON public.matches;
DROP POLICY IF EXISTS "Allow anon insert rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow anon update rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow anon delete rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow anon insert messages" ON public.messages;

DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_insert_captain_roster" ON public.users;
DROP POLICY IF EXISTS "users_update_link_auth" ON public.users;
DROP POLICY IF EXISTS "users_delete_captain_roster" ON public.users;
DROP POLICY IF EXISTS "matches_select_authenticated" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_organizer" ON public.matches;
DROP POLICY IF EXISTS "matches_update_organizer" ON public.matches;
DROP POLICY IF EXISTS "rsvps_select_scoped" ON public.rsvps;
DROP POLICY IF EXISTS "rsvps_insert_own" ON public.rsvps;
DROP POLICY IF EXISTS "rsvps_update_own" ON public.rsvps;
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;

-- ---------------------------------------------------------------------------
-- TEAMS — league reference data, read-only for signed-in users
-- ---------------------------------------------------------------------------
CREATE POLICY "teams_select_authenticated"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- USERS — profiles linked to auth.users via auth_id
-- ---------------------------------------------------------------------------
CREATE POLICY "users_select_authenticated"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth_id = auth.uid()
    OR public.is_organizer()
    OR (
      public.auth_user_team_id() IS NOT NULL
      AND team_id = public.auth_user_team_id()
    )
  );

-- First login: create own profile row (signup trigger may already do this)
CREATE POLICY "users_insert_own_profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_id = auth.uid()
    AND email = (auth.jwt() ->> 'email')
  );

-- Captain: add roster-only players (no auth account yet)
CREATE POLICY "users_insert_captain_roster"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_captain()
    AND role = 'Player'
    AND team_id = public.auth_user_team_id()
    AND auth_id IS NULL
  );

-- Link legacy seed row to newly authenticated account by email
CREATE POLICY "users_update_link_auth"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    AND auth_id IS NULL
  )
  WITH CHECK (
    auth_id = auth.uid()
    AND email = (auth.jwt() ->> 'email')
  );

-- Captain: remove players from own team roster
CREATE POLICY "users_delete_captain_roster"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.is_captain()
    AND role = 'Player'
    AND team_id = public.auth_user_team_id()
    AND id <> public.auth_user_id()
  );

-- ---------------------------------------------------------------------------
-- MATCHES — organizers manage schedule; everyone signed in can view
-- ---------------------------------------------------------------------------
CREATE POLICY "matches_select_authenticated"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_insert_organizer"
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organizer());

CREATE POLICY "matches_update_organizer"
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

-- ---------------------------------------------------------------------------
-- RSVPs — players manage own; captains see team; organizers see all
-- ---------------------------------------------------------------------------
CREATE POLICY "rsvps_select_scoped"
  ON public.rsvps
  FOR SELECT
  TO authenticated
  USING (
    public.is_organizer()
    OR user_id = public.auth_user_id()
    OR (
      public.auth_user_team_id() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = rsvps.user_id
          AND u.team_id = public.auth_user_team_id()
      )
    )
  );

CREATE POLICY "rsvps_insert_own"
  ON public.rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_player()
    AND user_id = public.auth_user_id()
  );

CREATE POLICY "rsvps_update_own"
  ON public.rsvps
  FOR UPDATE
  TO authenticated
  USING (
    public.is_player()
    AND user_id = public.auth_user_id()
  )
  WITH CHECK (
    public.is_player()
    AND user_id = public.auth_user_id()
  );

-- ---------------------------------------------------------------------------
-- MESSAGES — team chat visible to all signed-in users
-- ---------------------------------------------------------------------------
CREATE POLICY "messages_select_authenticated"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "messages_insert_authenticated"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_name = public.auth_user_name()
    OR (public.is_organizer() AND sender_name = 'League Office')
  );

-- ---------------------------------------------------------------------------
-- Realtime (optional): enable replication for live chat / RSVPs
-- Dashboard → Database → Publications → supabase_realtime → add tables
-- ---------------------------------------------------------------------------
