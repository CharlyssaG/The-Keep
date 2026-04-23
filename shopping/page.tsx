import { createClient } from '@/lib/supabase/server';
import ShoppingClient from './ShoppingClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  // Fetch open (not yet checked off) items first, then recently-checked items.
  // ORDER: null checked_at comes first (still to buy), then most recently checked.
  const { data: items } = await supabase
    .from('shopping_list')
    .select('*, added_by_profile:added_by(display_name, avatar_glyph), checked_by_profile:checked_by(display_name)')
    .order('checked_at', { ascending: true, nullsFirst: true })
    .order('added_at', { ascending: false });

  return <ShoppingClient initialItems={items ?? []} />;
}
