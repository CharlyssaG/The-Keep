-- =========================================================================
-- THE KEEP · Supabase schema
-- Run this in the Supabase SQL editor (SQL Editor > New query > paste > Run)
-- =========================================================================

-- ---- EXTENSIONS ----------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---- HOUSEHOLDS ----------------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'The Keep',
  created_at  timestamptz not null default now()
);

-- ---- PROFILES (one row per auth user) -----------------------------------
-- theme values: 'dnd' | 'alien' | 'horror' | 'marquee' | 'cozy'
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  display_name  text not null,
  theme         text not null default 'dnd'
                check (theme in ('dnd', 'alien', 'horror', 'marquee', 'cozy')),
  avatar_glyph  text default null,
  class_name    text default null,         -- "Half-Elf Sorceress" etc, shown in UI
  xp            integer not null default 0,
  gold          integer not null default 0,
  level         integer not null default 1,
  created_at    timestamptz not null default now()
);

-- ---- TASKS / QUESTS ------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  title         text not null,
  description   text default '',
  assignee_id   uuid references public.profiles(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  tier          text not null default 'common'
                check (tier in ('common', 'rare', 'epic', 'urgent')),
  xp_reward     integer not null default 0,
  gold_reward   numeric(8,2) not null default 0,
  due_at        timestamptz,
  completed_at  timestamptz,
  completed_by  uuid references public.profiles(id) on delete set null,
  recurring     text default null,         -- 'daily' | 'weekly' | 'monthly' | null
  created_at    timestamptz not null default now()
);
create index on public.tasks (household_id, completed_at);
create index on public.tasks (assignee_id);

-- ---- INVENTORY CATEGORIES ------------------------------------------------
create table public.inventory_categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0
);

-- ---- INVENTORY ITEMS -----------------------------------------------------
create table public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category_id   uuid references public.inventory_categories(id) on delete set null,
  name          text not null,
  quantity      numeric(8,2) not null default 0,
  unit          text default '',
  low_threshold numeric(8,2) not null default 1,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id) on delete set null
);
create index on public.inventory_items (household_id);

-- ---- RECIPES -------------------------------------------------------------
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  title         text not null,
  description   text default '',
  prep_minutes  integer default 0,
  cook_minutes  integer default 0,
  serves        integer default 2,
  difficulty    text default 'easy'
                check (difficulty in ('easy', 'medium', 'hard')),
  instructions  text default '',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---- RECIPE INGREDIENTS --------------------------------------------------
create table public.recipe_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  item_name   text not null,         -- matched against inventory_items.name
  quantity    numeric(8,2) default 1,
  unit        text default ''
);
create index on public.recipe_ingredients (recipe_id);

-- ---- NOTIFICATIONS -------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  recipient_id  uuid references public.profiles(id) on delete cascade,
                                              -- null = broadcast to household
  sender_id     uuid references public.profiles(id) on delete set null,
  title         text not null,
  body          text default '',
  kind          text not null default 'info'
                check (kind in ('info', 'task', 'inventory', 'reminder', 'achievement')),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.notifications (recipient_id, read_at);
create index on public.notifications (household_id, created_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Every member of a household can read/write household data. Personal profile
-- updates are scoped to self.
-- ===========================================================================

alter table public.households            enable row level security;
alter table public.profiles              enable row level security;
alter table public.tasks                 enable row level security;
alter table public.inventory_categories  enable row level security;
alter table public.inventory_items       enable row level security;
alter table public.recipes               enable row level security;
alter table public.recipe_ingredients    enable row level security;
alter table public.notifications         enable row level security;

-- Helper: which household does the current auth user belong to?
create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid() limit 1;
$$;

-- households: members can read their own household row
create policy "household members read household"
  on public.households for select
  using (id = public.current_household_id());

-- profiles: members can see all profiles in their household
create policy "household members read profiles"
  on public.profiles for select
  using (household_id = public.current_household_id());

create policy "user updates own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and household_id = public.current_household_id());

create policy "user inserts own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- tasks: household-scoped full access
create policy "household tasks read"   on public.tasks for select
  using (household_id = public.current_household_id());
create policy "household tasks insert" on public.tasks for insert
  with check (household_id = public.current_household_id());
create policy "household tasks update" on public.tasks for update
  using (household_id = public.current_household_id());
create policy "household tasks delete" on public.tasks for delete
  using (household_id = public.current_household_id());

-- inventory_categories
create policy "household cats read"   on public.inventory_categories for select
  using (household_id = public.current_household_id());
create policy "household cats insert" on public.inventory_categories for insert
  with check (household_id = public.current_household_id());
create policy "household cats update" on public.inventory_categories for update
  using (household_id = public.current_household_id());
create policy "household cats delete" on public.inventory_categories for delete
  using (household_id = public.current_household_id());

-- inventory_items
create policy "household items read"   on public.inventory_items for select
  using (household_id = public.current_household_id());
create policy "household items insert" on public.inventory_items for insert
  with check (household_id = public.current_household_id());
create policy "household items update" on public.inventory_items for update
  using (household_id = public.current_household_id());
create policy "household items delete" on public.inventory_items for delete
  using (household_id = public.current_household_id());

-- recipes
create policy "household recipes read"   on public.recipes for select
  using (household_id = public.current_household_id());
create policy "household recipes insert" on public.recipes for insert
  with check (household_id = public.current_household_id());
create policy "household recipes update" on public.recipes for update
  using (household_id = public.current_household_id());
create policy "household recipes delete" on public.recipes for delete
  using (household_id = public.current_household_id());

-- recipe_ingredients (inherit via parent recipe)
create policy "household ingredients read" on public.recipe_ingredients for select
  using (exists (select 1 from public.recipes r
                 where r.id = recipe_id
                 and r.household_id = public.current_household_id()));
create policy "household ingredients write" on public.recipe_ingredients for all
  using (exists (select 1 from public.recipes r
                 where r.id = recipe_id
                 and r.household_id = public.current_household_id()))
  with check (exists (select 1 from public.recipes r
                      where r.id = recipe_id
                      and r.household_id = public.current_household_id()));

-- notifications
create policy "household notif read"   on public.notifications for select
  using (household_id = public.current_household_id());
create policy "household notif insert" on public.notifications for insert
  with check (household_id = public.current_household_id());
create policy "user marks own notif read" on public.notifications for update
  using (recipient_id = auth.uid() or recipient_id is null);

-- ===========================================================================
-- REALTIME
-- Enable realtime on key tables so phones update instantly
-- ===========================================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;

-- ===========================================================================
-- SEED DATA
-- Creates the household and inventory categories. You still need to sign up
-- the five users via the app (or via Supabase auth dashboard), then run the
-- profile-linking block at the bottom.
-- ===========================================================================
insert into public.households (id, name)
values ('11111111-1111-1111-1111-111111111111', 'The Keep')
on conflict (id) do nothing;

insert into public.inventory_categories (household_id, name, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Produce',      1),
  ('11111111-1111-1111-1111-111111111111', 'Meat & Fish',  2),
  ('11111111-1111-1111-1111-111111111111', 'Dairy & Eggs', 3),
  ('11111111-1111-1111-1111-111111111111', 'Grains & Pasta', 4),
  ('11111111-1111-1111-1111-111111111111', 'Pantry',       5),
  ('11111111-1111-1111-1111-111111111111', 'Frozen',       6),
  ('11111111-1111-1111-1111-111111111111', 'Beverages',    7),
  ('11111111-1111-1111-1111-111111111111', 'Snacks',       8);

-- Seed some common items (quantity 0 so you can restock in-app)
do $$
declare
  hh uuid := '11111111-1111-1111-1111-111111111111';
  cat_produce uuid; cat_meat uuid; cat_dairy uuid; cat_grain uuid; cat_pantry uuid;
begin
  select id into cat_produce from public.inventory_categories where household_id=hh and name='Produce';
  select id into cat_meat    from public.inventory_categories where household_id=hh and name='Meat & Fish';
  select id into cat_dairy   from public.inventory_categories where household_id=hh and name='Dairy & Eggs';
  select id into cat_grain   from public.inventory_categories where household_id=hh and name='Grains & Pasta';
  select id into cat_pantry  from public.inventory_categories where household_id=hh and name='Pantry';

  insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
    (hh, cat_produce, 'Onions', 4, '', 2),
    (hh, cat_produce, 'Garlic', 8, 'cloves', 3),
    (hh, cat_produce, 'Spinach', 0, 'bag', 1),
    (hh, cat_produce, 'Tomatoes', 5, '', 2),
    (hh, cat_produce, 'Bell Peppers', 3, '', 2),
    (hh, cat_meat, 'Chicken Breasts', 6, '', 2),
    (hh, cat_meat, 'Ground Beef', 0, 'lb', 1),
    (hh, cat_meat, 'Salmon Fillet', 2, '', 1),
    (hh, cat_dairy, 'Butter', 1, 'stick', 2),
    (hh, cat_dairy, 'Whole Milk', 1, 'gallon', 1),
    (hh, cat_dairy, 'Eggs', 12, '', 6),
    (hh, cat_dairy, 'Sharp Cheddar', 1, 'block', 1),
    (hh, cat_dairy, 'Greek Yogurt', 3, 'cups', 2),
    (hh, cat_grain, 'Pasta', 4, 'boxes', 2),
    (hh, cat_grain, 'Rice', 3, 'cups', 2),
    (hh, cat_grain, 'Oats', 1, 'cup', 2),
    (hh, cat_grain, 'Bread', 2, 'loaves', 1),
    (hh, cat_pantry, 'Olive Oil', 1, 'bottle', 1),
    (hh, cat_pantry, 'Soy Sauce', 1, 'bottle', 1),
    (hh, cat_pantry, 'Honey', 1, 'jar', 1);
end $$;

-- Seed a couple of recipes
do $$
declare
  hh uuid := '11111111-1111-1111-1111-111111111111';
  r1 uuid; r2 uuid; r3 uuid;
begin
  insert into public.recipes (household_id, title, description, prep_minutes, cook_minutes, serves, difficulty, instructions)
  values (hh, 'Hearty Beef Stew', 'A warming one-pot stew. Comfort food classic.', 15, 45, 4, 'easy',
          '1. Brown beef with onions and garlic.\n2. Add tomatoes and broth.\n3. Simmer 40 min.\n4. Serve over rice.')
  returning id into r1;
  insert into public.recipe_ingredients (recipe_id, item_name, quantity, unit) values
    (r1, 'Ground Beef', 1, 'lb'),
    (r1, 'Onions', 1, ''),
    (r1, 'Garlic', 3, 'cloves'),
    (r1, 'Tomatoes', 3, ''),
    (r1, 'Rice', 1, 'cup');

  insert into public.recipes (household_id, title, description, prep_minutes, cook_minutes, serves, difficulty, instructions)
  values (hh, 'Garlic Spinach Pasta', 'Quick weeknight pasta with wilted greens.', 5, 20, 3, 'easy',
          '1. Boil pasta.\n2. Saute garlic in olive oil.\n3. Wilt spinach.\n4. Toss with pasta and cheese.')
  returning id into r2;
  insert into public.recipe_ingredients (recipe_id, item_name, quantity, unit) values
    (r2, 'Pasta', 1, 'box'),
    (r2, 'Spinach', 1, 'bag'),
    (r2, 'Garlic', 4, 'cloves'),
    (r2, 'Olive Oil', 0.25, 'cup'),
    (r2, 'Sharp Cheddar', 0.5, 'block');

  insert into public.recipes (household_id, title, description, prep_minutes, cook_minutes, serves, difficulty, instructions)
  values (hh, 'Honey Soy Salmon', 'Pan-seared salmon with a sticky honey-soy glaze.', 5, 15, 2, 'medium',
          '1. Whisk soy + honey + garlic.\n2. Sear salmon skin-side first.\n3. Glaze in last 2 min.\n4. Serve over rice.')
  returning id into r3;
  insert into public.recipe_ingredients (recipe_id, item_name, quantity, unit) values
    (r3, 'Salmon Fillet', 2, ''),
    (r3, 'Soy Sauce', 0.25, 'cup'),
    (r3, 'Honey', 2, 'tbsp'),
    (r3, 'Garlic', 2, 'cloves');
end $$;

-- ===========================================================================
-- PROFILE LINKING (run AFTER signing up the 5 users via the app)
-- ===========================================================================
-- After each of you signs up once, look up your user id in Auth > Users,
-- then run something like this:
--
-- insert into public.profiles (id, household_id, display_name, theme, class_name, avatar_glyph) values
--   ('<charlyssa-auth-id>', '11111111-1111-1111-1111-111111111111', 'Charlyssa', 'dnd',     'Half-Elf Sorceress',      'C'),
--   ('<jamie-auth-id>',     '11111111-1111-1111-1111-111111111111', 'Jamie',     'alien',   'Starborn Scout',          'J'),
--   ('<jalex-auth-id>',     '11111111-1111-1111-1111-111111111111', 'Jalex',     'horror',  'Shadow Necromancer',      'J'),
--   ('<kelly-auth-id>',     '11111111-1111-1111-1111-111111111111', 'Kelly',     'marquee', 'Bard of Spectacle',       'K'),
--   ('<janiya-auth-id>',    '11111111-1111-1111-1111-111111111111', 'Janiya',    'cozy',    'Druid of Soft Places',    'J');
