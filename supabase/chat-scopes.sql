-- Separate global league chat from club (team) chat
-- Run once in Supabase SQL Editor.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS team_id bigint REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_team_id ON public.messages(team_id);

-- Existing rows become global chat
UPDATE public.messages SET team_id = NULL WHERE team_id IS NULL;

DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_as_self" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_league_office" ON public.messages;

CREATE POLICY "messages_select_scoped"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL
    OR public.is_organizer()
    OR team_id = public.auth_user_team_id()
  );

CREATE POLICY "messages_insert_as_self"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_name = public.auth_user_name()
    AND char_length(trim(text)) > 0
    AND (
      team_id IS NULL
      OR team_id = public.auth_user_team_id()
    )
  );

CREATE POLICY "messages_insert_league_office"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_organizer()
    AND sender_name = 'League Office'
    AND team_id IS NULL
    AND char_length(trim(text)) > 0
  );
