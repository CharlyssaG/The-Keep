import { createClient } from '@/lib/supabase/server';
import RecipesClient from './RecipesClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .order('created_at', { ascending: false });

  const { data: items } = await supabase
    .from('inventory_items')
    .select('name, quantity');

  return <RecipesClient initialRecipes={recipes ?? []} inventoryItems={items ?? []} />;
}
