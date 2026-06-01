-- ============================================================
-- Touchline — DEV ONLY (wide-open anon access)
-- ============================================================
-- For local mockups without auth. Do NOT use in production.
--
-- For production, run: supabase/rls-policies-production.sql
-- ============================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read teams" ON teams;
DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow public read matches" ON matches;
DROP POLICY IF EXISTS "Allow public read rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public read messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert users" ON users;
DROP POLICY IF EXISTS "Allow public update users" ON users;
DROP POLICY IF EXISTS "Allow public delete users" ON users;
DROP POLICY IF EXISTS "Allow public insert matches" ON matches;
DROP POLICY IF EXISTS "Allow public update matches" ON matches;
DROP POLICY IF EXISTS "Allow public insert rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public update rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public delete rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public insert messages" ON messages;

CREATE POLICY "Allow public read teams" ON teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read users" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read rsvps" ON rsvps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read messages" ON messages FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow public delete users" ON users FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert matches" ON matches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update matches" ON matches FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert rsvps" ON rsvps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update rsvps" ON rsvps FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow public delete rsvps" ON rsvps FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
