-- ─────────────────────────────────────────────────────────────
-- kNoted migration 003 — double treble crochet (dtr)
--
-- Run once in the Supabase SQL editor (after 002_pattern_images.sql).
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────

-- Allow 'dtr' in a step's stitch unit.
alter table public.pattern_steps drop constraint if exists pattern_steps_stitch_unit_check;
alter table public.pattern_steps add constraint pattern_steps_stitch_unit_check
  check (stitch_unit <@ array['sc','hdc','dc','tr','dtr','ch','slst','inc','dec']::text[]);
