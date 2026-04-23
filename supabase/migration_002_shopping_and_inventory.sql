-- =========================================================================
-- HOUSEHOLD APP · Migration 002
-- Adds: shopping list table, restructured categories, curated inventory seed
--
-- HOW TO APPLY:
--   Supabase dashboard → SQL Editor → New query → paste this entire file → Run
--
-- SAFE TO RUN MULTIPLE TIMES: everything uses `on conflict do nothing` or
-- drops/recreates idempotently where appropriate.
-- =========================================================================

-- ---- 1. SHOPPING LIST TABLE --------------------------------------------
create table if not exists public.shopping_list (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  item_name     text not null,
  quantity      text default '',              -- free text: "2 gallons", "a bunch", etc
  notes         text default '',
  added_by      uuid references public.profiles(id) on delete set null,
  added_at      timestamptz not null default now(),
  checked_at    timestamptz,                   -- null = still on list; set = bought
  checked_by    uuid references public.profiles(id) on delete set null,
  source_item_id uuid references public.inventory_items(id) on delete set null,
                                              -- if auto-added from inventory depletion
  category      text default ''                -- copied from source category at add time
);

create index if not exists idx_shopping_list_household_checked
  on public.shopping_list(household_id, checked_at);

alter table public.shopping_list enable row level security;

-- RLS: household members can read/write their household's list
drop policy if exists "household shopping read"   on public.shopping_list;
drop policy if exists "household shopping insert" on public.shopping_list;
drop policy if exists "household shopping update" on public.shopping_list;
drop policy if exists "household shopping delete" on public.shopping_list;

create policy "household shopping read"   on public.shopping_list for select
  using (household_id = public.current_household_id());
create policy "household shopping insert" on public.shopping_list for insert
  with check (household_id = public.current_household_id());
create policy "household shopping update" on public.shopping_list for update
  using (household_id = public.current_household_id());
create policy "household shopping delete" on public.shopping_list for delete
  using (household_id = public.current_household_id());

-- Enable realtime so shopping list updates live across phones
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'shopping_list'
  ) then
    alter publication supabase_realtime add table public.shopping_list;
  end if;
end $$;

-- ---- 2. RESTRUCTURED INVENTORY CATEGORIES -------------------------------
-- Clear the old placeholder categories and rebuild from the ground up.
-- This is SAFE because no items should be attached yet; we seed fresh below.
do $$
declare
  hh uuid := '11111111-1111-1111-1111-111111111111';
begin
  -- Only purge + reseed if the only items are the original stubs
  -- (to protect against accidentally wiping real data on re-run)
  if (select count(*) from public.inventory_items where household_id = hh) < 25 then
    delete from public.inventory_items where household_id = hh;
    delete from public.inventory_categories where household_id = hh;

    insert into public.inventory_categories (household_id, name, sort_order) values
      (hh, 'Produce',              1),
      (hh, 'Meat & Fish',          2),
      (hh, 'Dairy & Eggs',         3),
      (hh, 'Grains & Pasta',       4),
      (hh, 'Baking',               5),
      (hh, 'Canned Goods',         6),
      (hh, 'Condiments & Sauces',  7),
      (hh, 'Spices & Seasonings',  8),
      (hh, 'Oils & Vinegars',      9),
      (hh, 'Breakfast',           10),
      (hh, 'Snacks',              11),
      (hh, 'Sweets',              12),
      (hh, 'Beverages',           13),
      (hh, 'Tea & Coffee',        14),
      (hh, 'Frozen',              15),
      (hh, 'Pets',                16);
  end if;
end $$;

-- ---- 3. SEED: UNIVERSAL STAPLES + PHOTO-ID'D ITEMS ----------------------
-- Quantity = 1 means "present". Low_threshold = 1 means "alert when < 1".
-- Set qty = 0 where photos clearly showed item is out/gone.

do $$
declare
  hh uuid := '11111111-1111-1111-1111-111111111111';
  cat_produce uuid; cat_meat uuid; cat_dairy uuid; cat_grain uuid;
  cat_baking uuid; cat_canned uuid; cat_condiment uuid; cat_spice uuid;
  cat_oil uuid; cat_breakfast uuid; cat_snack uuid; cat_sweet uuid;
  cat_bev uuid; cat_tea uuid; cat_frozen uuid; cat_pets uuid;
begin
  select id into cat_produce   from public.inventory_categories where household_id=hh and name='Produce';
  select id into cat_meat      from public.inventory_categories where household_id=hh and name='Meat & Fish';
  select id into cat_dairy     from public.inventory_categories where household_id=hh and name='Dairy & Eggs';
  select id into cat_grain     from public.inventory_categories where household_id=hh and name='Grains & Pasta';
  select id into cat_baking    from public.inventory_categories where household_id=hh and name='Baking';
  select id into cat_canned    from public.inventory_categories where household_id=hh and name='Canned Goods';
  select id into cat_condiment from public.inventory_categories where household_id=hh and name='Condiments & Sauces';
  select id into cat_spice     from public.inventory_categories where household_id=hh and name='Spices & Seasonings';
  select id into cat_oil       from public.inventory_categories where household_id=hh and name='Oils & Vinegars';
  select id into cat_breakfast from public.inventory_categories where household_id=hh and name='Breakfast';
  select id into cat_snack     from public.inventory_categories where household_id=hh and name='Snacks';
  select id into cat_sweet     from public.inventory_categories where household_id=hh and name='Sweets';
  select id into cat_bev       from public.inventory_categories where household_id=hh and name='Beverages';
  select id into cat_tea       from public.inventory_categories where household_id=hh and name='Tea & Coffee';
  select id into cat_frozen    from public.inventory_categories where household_id=hh and name='Frozen';
  select id into cat_pets      from public.inventory_categories where household_id=hh and name='Pets';

  -- Only seed if inventory is still empty or near-empty
  if (select count(*) from public.inventory_items where household_id=hh) < 25 then

    -- PRODUCE (staples you likely always have/want)
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_produce, 'Onions',           1, '',    1),
      (hh, cat_produce, 'Garlic',           1, 'head',1),
      (hh, cat_produce, 'Potatoes',         1, 'lb',  1),
      (hh, cat_produce, 'Carrots',          1, 'bag', 1),
      (hh, cat_produce, 'Celery',           0, '',    1),
      (hh, cat_produce, 'Lettuce',          1, 'head',1),
      (hh, cat_produce, 'Tomatoes',         0, '',    1),
      (hh, cat_produce, 'Bell Peppers',     0, '',    1),
      (hh, cat_produce, 'Spinach',          0, 'bag', 1),
      (hh, cat_produce, 'Lemons',           0, '',    1),
      (hh, cat_produce, 'Halos Oranges',    1, 'bag', 1);

    -- MEAT & FISH
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_meat, 'Chicken Breasts',  0, '',   1),
      (hh, cat_meat, 'Ground Beef',      1, 'lb', 1),
      (hh, cat_meat, 'Bacon',            1, 'pack', 1),
      (hh, cat_meat, 'Salmon Fillet',    0, '',   1);

    -- DAIRY & EGGS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_dairy, 'Eggs',              1, 'dozen', 1),
      (hh, cat_dairy, 'Whole Milk',        1, 'gallon', 1),
      (hh, cat_dairy, 'Lactose-Free Milk (Fairlife)', 1, 'bottle', 1),
      (hh, cat_dairy, 'Butter',            1, 'stick', 2),
      (hh, cat_dairy, 'Cream Cheese',      1, 'block', 1),
      (hh, cat_dairy, 'Sour Cream',        1, 'tub', 1),
      (hh, cat_dairy, 'Shredded Cheddar',  1, 'bag', 1),
      (hh, cat_dairy, 'Sharp Cheddar',     1, 'block', 1),
      (hh, cat_dairy, 'Greek Yogurt',      1, 'cup', 1),
      (hh, cat_dairy, 'Whipped Cream (Reddi-Wip)', 1, 'can', 1);

    -- GRAINS & PASTA
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_grain, 'Jasmine Rice',       1, 'bag', 1),
      (hh, cat_grain, 'Arborio Rice',       1, 'jar', 1),
      (hh, cat_grain, 'Long Grain Wild Rice', 1, 'box', 1),
      (hh, cat_grain, 'Pasta (Spaghetti)',  1, 'box', 1),
      (hh, cat_grain, 'Pasta (Penne/DeCecco)', 1, 'box', 1),
      (hh, cat_grain, 'Bread',              1, 'loaf', 1),
      (hh, cat_grain, 'Tortillas',          1, 'pack', 1),
      (hh, cat_grain, 'Bread Crumbs',       1, 'can', 1);

    -- BAKING
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_baking, 'All-Purpose Flour',   1, 'bag', 1),
      (hh, cat_baking, 'Cake Flour',          1, 'box', 1),
      (hh, cat_baking, 'Granulated Sugar',    1, 'bag', 1),
      (hh, cat_baking, 'Brown Sugar',         1, 'bag', 1),
      (hh, cat_baking, 'Crisco Shortening',   1, 'can', 1),
      (hh, cat_baking, 'Vanilla Extract',     1, 'bottle', 1),
      (hh, cat_baking, 'Baking Powder',       1, 'can', 1),
      (hh, cat_baking, 'Baking Soda',         1, 'box', 1),
      (hh, cat_baking, 'Chocolate Frosting',  1, 'can', 1),
      (hh, cat_baking, 'Milk Chocolate Frosting', 1, 'can', 1),
      (hh, cat_baking, 'Jell-O (assorted)',   1, 'box', 1),
      (hh, cat_baking, 'Shake ''N Bake',      1, 'box', 1),
      (hh, cat_baking, 'Jiffy Corn Muffin Mix', 1, 'box', 1);

    -- CANNED GOODS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_canned, 'Tomato Sauce (Hunt''s)',  1, 'can', 1),
      (hh, cat_canned, 'Diced Tomatoes',           1, 'can', 1),
      (hh, cat_canned, 'Chickpeas (Goya)',         1, 'can', 1),
      (hh, cat_canned, 'Black Beans',              1, 'can', 1),
      (hh, cat_canned, 'Kidney Beans (Heinz)',     1, 'can', 1),
      (hh, cat_canned, 'Cream of Mushroom',        1, 'can', 1),
      (hh, cat_canned, 'Tuna (Bumble Bee Albacore)', 1, 'can', 1),
      (hh, cat_canned, 'Canned Peaches',           1, 'can', 1),
      (hh, cat_canned, 'Chicken Broth',            1, 'carton', 1),
      (hh, cat_canned, 'Better Than Bouillon',     1, 'jar', 1);

    -- CONDIMENTS & SAUCES
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_condiment, 'Ketchup (Heinz)',           1, 'bottle', 1),
      (hh, cat_condiment, 'Mayo (Hellmann''s)',        1, 'jar', 1),
      (hh, cat_condiment, 'Yellow Mustard (French''s)', 1, 'bottle', 1),
      (hh, cat_condiment, 'Dijon Mustard',             1, 'bottle', 1),
      (hh, cat_condiment, 'Soy Sauce (Lee Kum Kee)',   1, 'bottle', 1),
      (hh, cat_condiment, 'Hoisin Sauce',              1, 'bottle', 1),
      (hh, cat_condiment, 'Hot Sauce',                 1, 'bottle', 1),
      (hh, cat_condiment, 'BBQ Sauce',                 0, 'bottle', 1),
      (hh, cat_condiment, 'Ranch Dressing',            1, 'bottle', 1),
      (hh, cat_condiment, 'Zesty Italian (Ken''s)',    1, 'bottle', 1),
      (hh, cat_condiment, 'Italian Dressing (Olive Garden)', 1, 'bottle', 1),
      (hh, cat_condiment, 'Log Cabin Syrup',           1, 'bottle', 1),
      (hh, cat_condiment, 'Honey',                     1, 'jar', 1),
      (hh, cat_condiment, 'Peanut Butter (Jif)',       1, 'jar', 1),
      (hh, cat_condiment, 'Grape Jelly',               0, 'jar', 1),
      (hh, cat_condiment, 'Pickles (Claussen)',        1, 'jar', 1),
      (hh, cat_condiment, 'Pickles (Mt. Olive)',       1, 'jar', 1),
      (hh, cat_condiment, 'Baby Gherkins',             1, 'jar', 1),
      (hh, cat_condiment, 'Fresh Peeled Garlic',       1, 'bag', 1),
      (hh, cat_condiment, 'Yucatan Guacamole',         1, 'pack', 1);

    -- SPICES & SEASONINGS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_spice, 'Morton Kosher Salt',     1, 'box', 1),
      (hh, cat_spice, 'Black Pepper',           1, '',    1),
      (hh, cat_spice, 'Granulated Garlic',      1, '',    1),
      (hh, cat_spice, 'Parsley Flakes',         1, '',    1),
      (hh, cat_spice, 'Badia Parsley',          1, '',    1),
      (hh, cat_spice, 'Taco Seasoning',         1, '',    1),
      (hh, cat_spice, 'Crushed Red Pepper',     1, '',    1),
      (hh, cat_spice, 'Cinnamon',               1, '',    1),
      (hh, cat_spice, 'Paprika',                1, '',    1),
      (hh, cat_spice, 'Cumin',                  1, '',    1),
      (hh, cat_spice, 'Bay Leaves',             1, '',    1),
      (hh, cat_spice, 'Italian Seasoning',      1, '',    1),
      (hh, cat_spice, 'Onion Powder',           1, '',    1);

    -- OILS & VINEGARS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_oil, 'Extra Virgin Olive Oil',   1, 'bottle', 1),
      (hh, cat_oil, 'Cooking Oil',              1, 'bottle', 1),
      (hh, cat_oil, 'PAM Cooking Spray',        1, 'can', 1),
      (hh, cat_oil, 'White Vinegar',            1, 'bottle', 1),
      (hh, cat_oil, 'Apple Cider Vinegar',      1, 'bottle', 1);

    -- BREAKFAST
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_breakfast, 'Quick Oats',              1, 'can', 1),
      (hh, cat_breakfast, 'Instant Oatmeal (Quaker)', 1, 'box', 1),
      (hh, cat_breakfast, 'Cinnamon Toast Crunch',   1, 'box', 1),
      (hh, cat_breakfast, 'Krave Chocolate Cereal',  1, 'box', 1),
      (hh, cat_breakfast, 'Pop-Tarts',               1, 'box', 1),
      (hh, cat_breakfast, 'Javvy Protein Coffee',    1, 'bag', 1);

    -- SNACKS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_snack, 'Cheez-It (Original)',    1, 'box', 1),
      (hh, cat_snack, 'Cheez-It (White Cheddar)', 1, 'box', 1),
      (hh, cat_snack, 'Ritz Crackers',          1, 'box', 1),
      (hh, cat_snack, 'Club Crackers',          1, 'box', 1),
      (hh, cat_snack, 'Triscuit',               1, 'box', 1),
      (hh, cat_snack, 'Tortilla Chips',         1, 'bag', 1),
      (hh, cat_snack, 'Pistachios',             1, 'bag', 1),
      (hh, cat_snack, 'Popcorn',                1, 'pack', 1);

    -- SWEETS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_sweet, 'Oreos',         1, 'pack', 1),
      (hh, cat_sweet, 'Fruit by the Foot', 1, 'box', 1);

    -- BEVERAGES
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_bev, 'Cherry Coca-Cola',      1, '12-pack', 1),
      (hh, cat_bev, 'Dr Pepper Zero',         1, '12-pack', 1),
      (hh, cat_bev, 'Sprite',                 1, '12-pack', 1),
      (hh, cat_bev, 'Peach Coconut Lemonade', 1, 'jug', 1),
      (hh, cat_bev, 'Alani Nu Energy',        1, 'can', 2),
      (hh, cat_bev, 'Celsius',                1, 'can', 2),
      (hh, cat_bev, 'Miller Lite',            1, '12-pack', 1);

    -- TEA & COFFEE
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_tea, 'Coffee (ground)',        1, 'bag', 1),
      (hh, cat_tea, 'Sleepytime Tea',         1, 'box', 1),
      (hh, cat_tea, 'Chamomile Tea',          1, 'box', 1),
      (hh, cat_tea, 'Twinings Chai',          1, 'box', 1),
      (hh, cat_tea, 'Throat Coat Tea',        1, 'box', 1),
      (hh, cat_tea, '4C Iced Tea Mix',        1, 'can', 1),
      (hh, cat_tea, 'Electrolyte Powder',     1, 'bag', 1);

    -- FROZEN
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_frozen, 'Frozen Mixed Vegetables', 1, 'bag', 1),
      (hh, cat_frozen, 'Frozen Corn',             1, 'bag', 1),
      (hh, cat_frozen, 'Frozen Berries',          1, 'bag', 1),
      (hh, cat_frozen, 'French Fries (McCain)',   1, 'bag', 1),
      (hh, cat_frozen, 'Cole''s Mozzarella Breadsticks', 1, 'box', 1),
      (hh, cat_frozen, 'Texas Toast',             1, 'box', 1),
      (hh, cat_frozen, 'Ice Cream (French Vanilla)', 1, 'tub', 1);

    -- PETS
    insert into public.inventory_items (household_id, category_id, name, quantity, unit, low_threshold) values
      (hh, cat_pets, 'Temptations Treats (Seafood)',       1, 'container', 1),
      (hh, cat_pets, 'Fancy Feast Gravy Collection',       1, '48-pack', 1),
      (hh, cat_pets, 'Fancy Feast Petites',                1, 'pack', 1),
      (hh, cat_pets, 'Fancy Feast Variety 42ct',           1, 'box', 1),
      (hh, cat_pets, 'Dry Cat Food',                       1, 'container', 1),
      (hh, cat_pets, 'Nutrish Burger Bites (dog)',         1, 'bag', 1),
      (hh, cat_pets, 'Nutrish Soup Bones Chicken (dog)',   1, 'bag', 1),
      (hh, cat_pets, 'Nutrish Soup Bones Beef (dog)',      1, 'bag', 1),
      (hh, cat_pets, 'Greenies Dentastix',                 1, 'bag', 1),
      (hh, cat_pets, 'Full Moon Chicken Treats (dog)',     1, 'bag', 1),
      (hh, cat_pets, 'Credelio (flea/tick)',               1, 'box', 1),
      (hh, cat_pets, 'Revolution (flea/tick)',             1, 'box', 1);

  end if;
end $$;

-- ---- DONE. ---------------------------------------------------------------
-- After running this, your Kitchen screen will show ~120 items across 16
-- categories. Mark things 0 as you use them, add your own with the + button.
-- The Shopping List will auto-populate from depleted items.
