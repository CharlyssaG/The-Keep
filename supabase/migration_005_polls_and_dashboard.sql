-- =========================================================================
-- THE KEEP · Migration 005
-- 1. Adds `polls` and `poll_responses` tables for the dashboard poll widget
-- 2. Updates profiles_theme_check to allow 'barbie'
--
-- HOW TO APPLY:
--   Supabase dashboard → SQL Editor → New query → paste this → Run
--
-- SAFE TO RUN MULTIPLE TIMES.
-- =========================================================================

-- ---- 1. Update theme constraint ------------------------------------------
alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles add constraint profiles_theme_check
  check (theme in (
    'neutral',
    'dnd', 'alien', 'horror', 'marquee', 'cozy',
    'space', 'oldwest',
    'nineties', 'underwater', 'station',
    'barbie'
  ));

-- ---- 2. Polls table ------------------------------------------------------
create table if not exists public.polls (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  question      text not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_polls_household_created
  on public.polls(household_id, created_at desc);

alter table public.polls enable row level security;

drop policy if exists "polls read"   on public.polls;
drop policy if exists "polls insert" on public.polls;
drop policy if exists "polls update" on public.polls;
drop policy if exists "polls delete" on public.polls;

create policy "polls read"   on public.polls for select
  using (household_id = public.current_household_id());
create policy "polls insert" on public.polls for insert
  with check (household_id = public.current_household_id());
create policy "polls update" on public.polls for update
  using (household_id = public.current_household_id());
create policy "polls delete" on public.polls for delete
  using (household_id = public.current_household_id());

-- ---- 3. Poll responses ---------------------------------------------------
create table if not exists public.poll_responses (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references public.polls(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  response     text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_poll_responses_poll on public.poll_responses(poll_id, created_at);
create index if not exists idx_poll_responses_profile on public.poll_responses(profile_id);

alter table public.poll_responses enable row level security;

-- Household-scoped access via the parent poll's household_id
drop policy if exists "poll responses read"   on public.poll_responses;
drop policy if exists "poll responses insert" on public.poll_responses;
drop policy if exists "poll responses update" on public.poll_responses;
drop policy if exists "poll responses delete" on public.poll_responses;

create policy "poll responses read" on public.poll_responses for select
  using (poll_id in (select id from public.polls where household_id = public.current_household_id()));
create policy "poll responses insert" on public.poll_responses for insert
  with check (poll_id in (select id from public.polls where household_id = public.current_household_id()));
create policy "poll responses update" on public.poll_responses for update
  using (profile_id = auth.uid());
create policy "poll responses delete" on public.poll_responses for delete
  using (profile_id = auth.uid());

-- ---- 4. Enable realtime for both tables ---------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'polls'
  ) then
    alter publication supabase_realtime add table public.polls;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'poll_responses'
  ) then
    alter publication supabase_realtime add table public.poll_responses;
  end if;
end $$;

-- ---- 5. Reload PostgREST schema cache ------------------------------------
notify pgrst, 'reload schema';
