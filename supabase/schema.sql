-- ─────────────────────────────────────────────────────────────
-- kNoted schema (v2 — patterns / steps / yarn stash)
--
-- Run this whole file once in the Supabase SQL editor.
-- It DROPS the old v1 tables (projects, sections, rows) and all
-- their data, then creates the new tables with row-level security.
-- Safe to re-run: it drops the v2 objects too before recreating them.
-- ─────────────────────────────────────────────────────────────

-- 1. Remove the old schema ------------------------------------
drop table if exists public.rows cascade;
drop table if exists public.sections cascade;
drop table if exists public.projects cascade;

drop function if exists public.replace_pattern_steps(uuid, jsonb);
drop table if exists public.pattern_steps cascade;
drop table if exists public.patterns cascade;
drop table if exists public.yarns cascade;

-- 2. Yarn stash -----------------------------------------------
create table public.yarns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand       text not null,
  colour_name text not null,
  colour_hex  text not null default '#C1613F' check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  fiber       text,
  hook        text,
  skein       text,
  quantity    text,
  care        text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index yarns_user_id_idx on public.yarns (user_id);

-- 3. Patterns -------------------------------------------------
create table public.patterns (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  hook_size      text,
  yarn_summary   text,                       -- e.g. "cotton yarn"
  worked_in      text not null default 'rounds' check (worked_in in ('rounds', 'rows')),
  image_path     text,                       -- storage path in the "pattern-images" bucket (see 002_pattern_images.sql)
  -- tracker state (index into the expanded step list, see pattern_steps.times)
  current_step   integer not null default 0 check (current_step >= 0),
  current_stitch integer not null default 0 check (current_stitch >= 0),
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index patterns_user_id_idx on public.patterns (user_id);

-- 4. Pattern steps --------------------------------------------
-- One row per instruction. A plain numbered round has name = null
-- and is shown as "Round n" / "Row n". A named step (e.g. "Leaf",
-- "Finishing") has a name and is not numbered.
-- `times` repeats an identical round (e.g. R13–R21 = times 9).
-- An empty stitch_unit means the step has nothing to count.
create table public.pattern_steps (
  id           uuid primary key default gen_random_uuid(),
  pattern_id   uuid not null references public.patterns (id) on delete cascade,
  position     integer not null,
  name         text,
  note         text,
  yarn_id      uuid references public.yarns (id) on delete set null,
  stitch_unit  text[] not null default '{}'
               check (stitch_unit <@ array['sc','hdc','dc','tr','ch','slst','inc','dec']::text[]),
  repeat_count integer not null default 1 check (repeat_count >= 1),
  end_count    integer check (end_count is null or end_count >= 0),
  times        integer not null default 1 check (times >= 1),
  unique (pattern_id, position)
);

create index pattern_steps_pattern_id_idx on public.pattern_steps (pattern_id);

-- 5. Row-level security ---------------------------------------
alter table public.yarns enable row level security;
alter table public.patterns enable row level security;
alter table public.pattern_steps enable row level security;

create policy "Own yarns" on public.yarns
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Own patterns" on public.patterns
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Steps of own patterns" on public.pattern_steps
  for all
  using (exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = auth.uid()));

-- 6. Atomic "save all steps" used by the pattern editor ---------
-- Runs as the caller (security invoker), so RLS still applies.
create function public.replace_pattern_steps(p_pattern_id uuid, p_steps jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from patterns where id = p_pattern_id and user_id = auth.uid()) then
    raise exception 'Pattern not found';
  end if;

  delete from pattern_steps where pattern_id = p_pattern_id;

  insert into pattern_steps (pattern_id, position, name, note, yarn_id, stitch_unit, repeat_count, end_count, times)
  select
    p_pattern_id,
    (s.ord - 1)::int,
    nullif(trim(s.value->>'name'), ''),
    nullif(trim(s.value->>'note'), ''),
    nullif(s.value->>'yarn_id', '')::uuid,
    coalesce(array(select jsonb_array_elements_text(s.value->'stitch_unit')), '{}'),
    greatest(coalesce((s.value->>'repeat_count')::int, 1), 1),
    (s.value->>'end_count')::int,
    greatest(coalesce((s.value->>'times')::int, 1), 1)
  from jsonb_array_elements(p_steps) with ordinality as s(value, ord);

  update patterns set updated_at = now() where id = p_pattern_id;
end;
$$;

-- 7. Storage --------------------------------------------------
-- Pattern images use the "pattern-images" bucket, created by
-- 002_pattern_images.sql — run that file next.
-- The v1 "pattern-covers" bucket is no longer used; you can empty and
-- delete it from the dashboard (Storage → pattern-covers → Delete bucket).
