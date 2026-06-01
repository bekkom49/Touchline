-- Add 'Completed' to match_status enum (required for saving scorelines)
-- Run once in Supabase SQL Editor if you see:
--   invalid input value for enum match_status: "Completed"

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
