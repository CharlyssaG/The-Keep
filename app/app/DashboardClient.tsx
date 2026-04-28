'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type Member = { id: string; display_name: string; avatar_glyph: string | null; theme: string };
type Poll = { id: string; household_id: string; question: string; created_by: string | null; created_at: string };
type Response = { id: string; poll_id: string; profile_id: string; response: string; created_at: string };
type Task = {
  id: string;
  title: string;
  description: string;
  tier: 'common' | 'rare' | 'epic' | 'urgent';
  assignee_id: string | null;
  completed_at: string | null;
  created_at: string;
};
type Item = {
  id: string;
  name: string;
  quantity: number;
  low_threshold: number;
  unit: string;
  category_id: string | null;
};

const DEFAULT_QUESTION = 'What are you doing tonight?';

export default function DashboardClient({
  initialPoll, initialResponses, initialTasks, initialItems, members,
}: {
  initialPoll: Poll | null;
  initialResponses: Response[];
  initialTasks: Task[];
  initialItems: Item[];
  members: Member[];
}) {
  const supabase = createClient();
  const { profile, theme, toast } = useApp();
  const [poll, setPoll] = useState<Poll | null>(initialPoll);
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newQuestion, setNewQuestion] = useState('');
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [myResponse, setMyResponse] = useState('');

  // --- Realtime subscriptions --------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, async () => {
        const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false }).limit(1);
        setPoll(data?.[0] ?? null);
        if (data?.[0]) {
          const { data: rs } = await supabase.from('poll_responses').select('*').eq('poll_id', data[0].id).order('created_at', { ascending: false });
          setResponses(rs ?? []);
        } else {
          setResponses([]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_responses' }, async () => {
        if (!poll) return;
        const { data: rs } = await supabase.from('poll_responses').select('*').eq('poll_id', poll.id).order('created_at', { ascending: false });
        setResponses(rs ?? []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data } = await supabase.from('tasks').select('*').is('completed_at', null).order('created_at', { ascending: true }).limit(50);
        setTasks(data ?? []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, async () => {
        const { data } = await supabase.from('inventory_items').select('*');
        setItems(data ?? []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, poll?.id]);

  // --- Top task: prioritized smart mix ------------------------------------
  const topTask = useMemo(() => pickTopTask(tasks, profile.id), [tasks, profile.id]);

  // --- Top 5 restocks: depleted first, then low-stock, oldest updated ----
  const restocks = useMemo(() => {
    const needing = items
      .filter((i) => i.quantity <= i.low_threshold)
      .sort((a, b) => {
        if (a.quantity === 0 && b.quantity !== 0) return -1;
        if (b.quantity === 0 && a.quantity !== 0) return 1;
        return a.quantity - b.quantity;
      });
    return needing.slice(0, 5);
  }, [items]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  const myExistingResponse = responses.find((r) => r.profile_id === profile.id) ?? null;

  // --- Actions ------------------------------------------------------------
  async function createNewPoll() {
    const q = newQuestion.trim();
    if (!q) { toast('Give the poll a question'); return; }
    const { error } = await supabase.from('polls').insert({
      household_id: profile.household_id,
      question: q,
      created_by: profile.id,
    } as any);
    if (error) { toast(error.message); return; }
    setNewQuestion('');
    setShowNewPoll(false);
  }

  async function submitResponse() {
    const r = myResponse.trim();
    if (!r) return;
    if (!poll) {
      // Auto-create the default poll if someone's answering the fallback question
      const { data: created, error: createErr } = await supabase.from('polls').insert({
        household_id: profile.household_id,
        question: DEFAULT_QUESTION,
        created_by: profile.id,
      } as any).select('*').single();
      if (createErr || !created) { toast(createErr?.message || 'Failed'); return; }
      const { error } = await supabase.from('poll_responses').insert({
        poll_id: created.id,
        profile_id: profile.id,
        response: r,
      } as any);
      if (error) { toast(error.message); return; }
      setMyResponse('');
      return;
    }
    if (myExistingResponse) {
      const { error } = await supabase.from('poll_responses').update({ response: r } as any).eq('id', myExistingResponse.id);
      if (error) { toast(error.message); return; }
    } else {
      const { error } = await supabase.from('poll_responses').insert({
        poll_id: poll.id,
        profile_id: profile.id,
        response: r,
      } as any);
      if (error) { toast(error.message); return; }
    }
    setMyResponse('');
  }

  async function quickAddToShoppingList(item: Item) {
    const { data: existing } = await supabase
      .from('shopping_list')
      .select('id')
      .eq('source_item_id', item.id)
      .is('checked_at', null)
      .maybeSingle();
    if (existing) { toast(`${item.name} already on the list`); return; }
    const { data: cat } = await supabase
      .from('inventory_categories')
      .select('name')
      .eq('id', item.category_id ?? '')
      .maybeSingle();
    const { error } = await supabase.from('shopping_list').insert({
      household_id: profile.household_id,
      item_name: item.name,
      quantity: item.unit || '',
      notes: '',
      added_by: profile.id,
      source_item_id: item.id,
      category: cat?.name || '',
    } as any);
    if (error) { toast(error.message); return; }
    toast(`Added ${item.name}`);
  }

  return (
    <div className="space-y-5">
      {/* ===== POLL / QUESTION CARD ===== */}
      <section
        className="p-4"
        style={{
          background: 'var(--surface)',
          border: `2px solid var(--accent)`,
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent-2)', fontFamily: 'var(--font-mono)' }}>
            {theme.copy.ornament} Question of the day
          </div>
          <button
            onClick={() => setShowNewPoll(!showNewPoll)}
            className="text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}
          >
            {showNewPoll ? 'cancel' : 'new poll'}
          </button>
        </div>

        {showNewPoll ? (
          <div className="space-y-2">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full p-2"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-body)',
              }}
              autoFocus
            />
            <button
              onClick={createNewPoll}
              className="w-full py-2 text-xs uppercase tracking-wider font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}
            >
              Post the question
            </button>
          </div>
        ) : (
          <h2 className="display text-xl font-bold mb-3" style={{ color: 'var(--accent)' }}>
            {poll?.question ?? DEFAULT_QUESTION}
          </h2>
        )}

        {!showNewPoll && (
          <>
            <div className="flex gap-2 mb-3">
              <input
                value={myResponse}
                onChange={(e) => setMyResponse(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitResponse(); }}
                placeholder={myExistingResponse ? 'update your answer…' : 'your answer…'}
                className="flex-1 p-2 text-sm"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              <button
                onClick={submitResponse}
                className="px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}
              >
                {myExistingResponse ? 'Update' : 'Post'}
              </button>
            </div>

            {responses.length > 0 && (
              <div className="space-y-1.5">
                {responses.map((r) => {
                  const m = memberById.get(r.profile_id);
                  return (
                    <div
                      key={r.id}
                      className="flex items-start gap-2 p-2 text-sm"
                      style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 display"
                        style={{ background: 'var(--accent-2)', color: 'var(--surface)' }}
                      >
                        {m?.avatar_glyph || m?.display_name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                          {m?.display_name || 'Someone'}
                        </div>
                        <div style={{ color: 'var(--ink)' }}>{r.response}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== TOP TASK ===== */}
      {topTask && (
        <section>
          <div className="text-[10px] uppercase tracking-widest mb-1 px-1" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
            Needs attention
          </div>
          <Link
            href="/app/tasks"
            className="block p-4 transition active:scale-[0.99]"
            style={{
              background: 'var(--surface)',
              border: `1px solid var(--border)`,
              borderRadius: 'var(--radius-lg)',
              textDecoration: 'none',
              borderLeft: `4px solid ${tierColor(topTask.tier)}`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold" style={{ color: 'var(--ink)' }}>{topTask.title}</div>
                {topTask.description && (
                  <div className="text-xs italic mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>
                    {topTask.description}
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-widest mt-1.5" style={{ color: tierColor(topTask.tier), fontFamily: 'var(--font-mono)' }}>
                  {theme.copy.tiers[topTask.tier] ?? topTask.tier} · {daysSince(topTask.created_at)}
                  {topTask.assignee_id && memberById.get(topTask.assignee_id) &&
                    ` · ${theme.copy.assignee} ${memberById.get(topTask.assignee_id)?.display_name}`
                  }
                </div>
              </div>
              <div className="text-xs" style={{ color: 'var(--accent)' }}>→</div>
            </div>
          </Link>
        </section>
      )}

      {/* ===== TOP 5 RESTOCKS ===== */}
      {restocks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-1 px-1">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
              Needs restocking
            </div>
            <Link
              href="/app/food"
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
            >
              view all →
            </Link>
          </div>
          <div className="space-y-1.5">
            {restocks.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-3"
                style={{
                  background: item.quantity === 0
                    ? 'color-mix(in srgb, var(--danger) 10%, var(--surface))'
                    : 'var(--surface)',
                  border: `1px solid ${item.quantity === 0 ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
                  <div className="text-xs italic" style={{ color: item.quantity === 0 ? 'var(--danger)' : 'var(--ink-soft)' }}>
                    {item.quantity === 0 ? theme.copy.depleted : theme.copy.lowStock}
                  </div>
                </div>
                <button
                  onClick={() => quickAddToShoppingList(item)}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                  style={{
                    background: 'var(--accent-2)',
                    color: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  + {theme.copy.addToShoppingAction}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!topTask && restocks.length === 0 && !poll && (
        <section className="text-center py-8 italic" style={{ color: 'var(--ink-soft)' }}>
          All quiet. {theme.copy.ornament}
        </section>
      )}
    </div>
  );
}

// =============================================================
// Priority heuristic for picking the "needs attention" task
// Higher score = more pressing
// =============================================================
function pickTopTask(tasks: Task[], myId: string): Task | null {
  if (tasks.length === 0) return null;
  const tierScore: Record<string, number> = { urgent: 40, epic: 25, rare: 12, common: 5 };
  const now = Date.now();
  const scored = tasks.map((t) => {
    let s = tierScore[t.tier] ?? 0;
    const ageDays = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 3) s += Math.min(ageDays * 2, 30); // capped so ancient tasks don't dominate forever
    if (t.assignee_id === myId) s += 8;
    if (!t.assignee_id) s += 3;
    return { t, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].t;
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'urgent': return 'var(--danger)';
    case 'epic':   return 'var(--accent)';
    case 'rare':   return 'var(--accent-2)';
    default:       return 'var(--ink-soft)';
  }
}

function daysSince(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}
