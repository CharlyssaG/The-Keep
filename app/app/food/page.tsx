import { createClient } from '@/lib/supabase/server';
import FoodClient from './FoodClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  // Load all three data sets up front. They're all small enough that this is
  // fine even if the user only ends up looking at one tab.
  const [
    { data: categories },
    { data: items },
    { data: shoppingItems, error: shoppingErr },
    { data: recipes },
  ] = await Promise.all([
    supabase.from('inventory_categories').select('*').order('sort_order'),
    supabase.from('inventory_items').select('*').order('name'),
    supabase
      .from('shopping_list')
      .select('*')
      .order('checked_at', { ascending: true, nullsFirst: true })
      .order('added_at', { ascending: false }),
    supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .order('created_at', { ascending: false }),
  ]);

  if (shoppingErr) console.error('Shopping list query failed:', shoppingErr);

  // For Recipes' "what can I make" filter we only need name + quantity.
  const recipeInventory = (items ?? []).map((i: any) => ({
    name: i.name,
    quantity: i.quantity,
  }));

  return (
    <FoodClient
      initialCategories={categories ?? []}
      initialItems={items ?? []}
      initialShopping={shoppingItems ?? []}
      initialRecipes={recipes ?? []}
      recipeInventory={recipeInventory}
    />
  );
}
