import { createClient } from '@/lib/supabase/server';
import KitchenClient from './KitchenClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('sort_order');

  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  return <KitchenClient initialCategories={categories ?? []} initialItems={items ?? []} />;
}
