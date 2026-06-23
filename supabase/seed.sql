-- Optional seed data matching the original mockData.js (run after schema + RLS policies)

INSERT INTO teams (id, name, primary_kit_color, away_kit_color) VALUES
  (1, 'Emerald City FC', 'Emerald Green', 'White'),
  (2, 'Harbor United', 'Navy Blue', 'Sky Blue'),
  (3, 'Riverside Rovers', 'Maroon', 'Gold'),
  (4, 'Summit Athletic', 'Black', 'Orange'),
  (5, 'Lakeside Lions', 'Teal', 'Cream'),
  (6, 'Metro Strikers', 'Purple', 'Silver'),
  (7, 'Canyon City SC', 'Forest Green', 'Yellow')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  PERFORM setval(pg_get_serial_sequence('public.teams', 'id'), (SELECT MAX(id) FROM public.teams));
END $$;

INSERT INTO users (id, name, email, role, team_id) VALUES
  (1, 'Alex Morgan', 'alex@touchline.local', 'Captain', 1),
  (2, 'Jordan Lee', 'jordan@touchline.local', 'Player', 1),
  (3, 'Sam Rivera', 'sam@touchline.local', 'Player', 1),
  (4, 'Casey Brooks', 'casey@touchline.local', 'Player', 1),
  (5, 'Riley Chen', 'riley@touchline.local', 'Player', 1),
  (6, 'Morgan Patel', 'morgan@touchline.local', 'Player', 1),
  (7, 'Taylor Kim', 'taylor@touchline.local', 'Organizer', NULL)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  PERFORM setval(pg_get_serial_sequence('public.users', 'id'), (SELECT MAX(id) FROM public.users));
END $$;

INSERT INTO matches (id, home_team_id, away_team_id, match_date, field_number, status, assigned_home_kit, assigned_away_kit) VALUES
  (1, 1, 2, '2026-06-07T10:00:00+00', 3, 'Scheduled', 'Emerald Green', 'Sky Blue'),
  (2, 3, 1, '2026-06-14T11:30:00+00', 5, 'Scheduled', 'Maroon', 'White')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  PERFORM setval(pg_get_serial_sequence('public.matches', 'id'), (SELECT MAX(id) FROM public.matches));
END $$;

INSERT INTO rsvps (id, match_id, user_id, status) VALUES
  (1, 1, 2, 'Going'),
  (2, 1, 3, 'Going'),
  (3, 1, 4, 'Out'),
  (4, 1, 5, 'No Response'),
  (5, 1, 6, 'Going'),
  (6, 2, 2, 'No Response'),
  (7, 2, 3, 'No Response'),
  (8, 2, 4, 'No Response'),
  (9, 2, 5, 'No Response'),
  (10, 2, 6, 'No Response')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  PERFORM setval(pg_get_serial_sequence('public.rsvps', 'id'), (SELECT MAX(id) FROM public.rsvps));
END $$;

INSERT INTO messages (id, text, sender_name, "timestamp") VALUES
  (1, 'Practice moved to Thursday — same time, Field 5.', 'Alex Morgan', '2026-05-28T18:30:00+00'),
  (2, 'Got it, see everyone there!', 'Jordan Lee', '2026-05-28T18:45:00+00'),
  (3, 'Harbor United is tough — we need full squad Saturday.', 'Alex Morgan', '2026-05-29T09:15:00+00')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  PERFORM setval(pg_get_serial_sequence('public.messages', 'id'), (SELECT MAX(id) FROM public.messages));
END $$;
