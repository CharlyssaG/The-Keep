import { createClient } from '@/lib/supabase/server';
import ShoppingClient from './ShoppingClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  const { data: items, error } = await supabase
    .from('shopping_list')
    .select('*')
    .order('checked_at', { ascending: true, nullsFirst: true })
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Shopping list query failed:', error);
  }

  return <ShoppingClient initialItems={items ?? []} />;
}
