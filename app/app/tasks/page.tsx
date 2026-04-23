import { createClient } from '@/lib/supabase/server';
import TasksClient from './TasksClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:assignee_id(id, display_name, avatar_glyph), creator:created_by(display_name)')
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_glyph')
    .order('display_name');

  return <TasksClient initialTasks={tasks ?? []} members={members ?? []} />;
}
