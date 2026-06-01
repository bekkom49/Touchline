-- Field address on scheduled matches (organizer-entered venue)
-- Run once in Supabase SQL Editor.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS field_address text;
