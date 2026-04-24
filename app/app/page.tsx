import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  // --- Latest poll (if any) ---
  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  const latestPoll = polls?.[0] ?? null;

  // --- Responses to that poll ---
  let responses: any[] = [];
  if (latestPoll) {
    const { data } = await supabase
      .from('poll_responses')
      .select('*')
      .eq('poll_id', latestPoll.id)
      .order('created_at', { ascending: false });
    responses = data ?? [];
  }

  // --- All active tasks for prioritization (client picks the top one) ---
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .is('completed_at', null)
    .order('created_at', { ascending: true })
    .limit(50);

  // --- Restock candidates: items at or below threshold ---
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*');

  // --- Member list for displaying names on poll responses ---
  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_glyph, theme');

  return (
    <DashboardClient
      initialPoll={latestPoll}
      initialResponses={responses}
      initialTasks={tasks ?? []}
      initialItems={items ?? []}
      members={members ?? []}
    />
  );
}
