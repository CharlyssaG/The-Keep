-- =========================================================================
-- THE KEEP · Migration 003
-- Adds storage_location to inventory_categories (fridge/freezer/pantry/other)
-- Backfills values for the existing 16 categories.
--
-- HOW TO APPLY:
--   Supabase dashboard → SQL Editor → New query → paste this → Run
--
-- SAFE TO RUN MULTIPLE TIMES.
-- =========================================================================

-- 1. Add the column (default 'other' so existing rows get a safe value)
alter table public.inventory_categories
  add column if not exists storage_location text not null default 'other';

-- 2. Add a check constraint so only valid values can be inserted
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inventory_categories_storage_location_check'
  ) then
    alter table public.inventory_categories
      add constraint inventory_categories_storage_location_check
      check (storage_location in ('fridge', 'freezer', 'pantry', 'other'));
  end if;
end $$;

-- 3. Backfill for The Keep's household
do $$
declare hh uuid := '11111111-1111-1111-1111-111111111111';
begin
  update public.inventory_categories set storage_location = 'fridge'
    where household_id = hh and name in ('Produce', 'Meat & Fish', 'Dairy & Eggs', 'Condiments & Sauces', 'Beverages');

  update public.inventory_categories set storage_location = 'freezer'
    where household_id = hh and name in ('Frozen');

  update public.inventory_categories set storage_location = 'pantry'
    where household_id = hh and name in (
      'Grains & Pasta', 'Baking', 'Canned Goods', 'Spices & Seasonings',
      'Oils & Vinegars', 'Breakfast', 'Snacks', 'Sweets', 'Tea & Coffee', 'Pets'
    );
end $$;

-- 4. Tell PostgREST to reload its schema cache so the new column is visible
notify pgrst, 'reload schema';
