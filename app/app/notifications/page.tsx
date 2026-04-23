import { createClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  const { data: notifs } = await supabase
    .from('notifications')
    .select('*, sender:sender_id(display_name), recipient:recipient_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name');

  return <NotificationsClient initialNotifs={notifs ?? []} members={members ?? []} />;
}
