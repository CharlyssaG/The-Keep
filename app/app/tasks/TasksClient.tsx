'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type Member = { id: string; display_name: string; avatar_glyph: string | null };
type TaskRow = any; // convenience — the joined shape from the server query

export default function TasksClient({ initialTasks, members }: { initialTasks: TaskRow[]; members: Member[] }) {
  const supabase = createClient();
  const { profile, theme, toast, refresh } = useApp();
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<'all' | 'mine' | 'open' | 'urgent' | 'done'>('open');
  const [showAdd, setShowAdd] = useState(false);

  // Realtime: listen for task changes and re-fetch
  useEffect(() => {
    const channel = supabase
      .channel('tasks-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data } = await supabase
          .from('tasks')
          .select('*, assignee:assignee_id(id, display_name, avatar_glyph), creator:created_by(display_name)')
          .order('completed_at', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (data) setTasks(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const shown = tasks.filter((t) => {
    if (filter === 'mine')   return t.assignee_id === profile.id && !t.completed_at;
    if (filter === 'open')   return !t.completed_at;
    if (filter === 'urgent') return t.tier === 'urgent' && !t.completed_at;
    if (filter === 'done')   return !!t.completed_at;
    return true;
  });

  async function completeTask(t: TaskRow) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: new Date().toISOString(), completed_by: profile.id } as any)
      .eq('id', t.id);
    if (error) { toast(error.message); return; }

    // Award XP/gold to completer
    const newXp = profile.xp + (t.xp_reward || 0);
    const newGold = Math.round((profile.gold + Number(t.gold_reward || 0)) * 100) / 100;
    const newLevel = Math.floor(newXp / 400) + 1;
    await supabase
      .from('profiles')
      .update({ xp: newXp, gold: newGold, level: newLevel })
      .eq('id', profile.id);

    toast(theme.copy.completedToast(t.xp_reward || 0, Number(t.gold_reward || 0)));
    refresh();
  }

  async function createTask(form: FormData) {
    const payload = {
      household_id: profile.household_id,
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      assignee_id: (form.get('assignee_id') as string) || null,
      created_by: profile.id,
      tier: String(form.get('tier') || 'common') as any,
      xp_reward: parseInt(String(form.get('xp_reward') || '50')) || 0,
      gold_reward: parseFloat(String(form.get('gold_reward') || '0')) || 0,
    };
    if (!payload.title) { toast('Give it a title'); return; }
    const { error } = await supabase.from('tasks').insert(payload as any);
    if (error) { toast(error.message); return; }
    setShowAdd(false);
    toast(theme.id === 'dnd' ? '✦ Quest inscribed ✦' : 'Added');
  }

  return (
    <div>
      <SectionHeading title={theme.copy.tasks} subtitle={theme.copy.tasksSubtitle} ornament={theme.copy.ornament} />

      <FilterChips value={filter} onChange={setFilter} labels={theme.copy.filters} />

      {shown.length === 0 ? (
        <EmptyState message="Nothing here yet." ornament={theme.copy.ornament} />
      ) : (
        <div className="space-y-3">
          {shown.map((t) => (
            <TaskCard key={t.id} task={t} onComplete={() => completeTask(t)} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center text-3xl font-light shadow-lg active:scale-95 transition z-10"
        style={{
          background: 'var(--accent)',
          color: 'var(--surface)',
          border: '3px solid var(--accent-2)',
        }}
      >
        +
      </button>

      {showAdd && (
        <AddTaskModal
          members={members}
          onClose={() => setShowAdd(false)}
          onSubmit={createTask}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function SectionHeading({ title, subtitle, ornament }: { title: string; subtitle: string; ornament: string }) {
  return (
    <div className="text-center mt-2 mb-4">
      <h2 className="display text-xl font-bold" style={{ color: 'var(--accent)' }}>
        {ornament} {title} {ornament}
      </h2>
      <p className="text-sm italic mt-1" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
    </div>
  );
}

function FilterChips({
  value, onChange, labels,
}: { value: string; onChange: (v: any) => void; labels: Record<string, string> }) {
  const keys: ('all' | 'mine' | 'open' | 'urgent' | 'done')[] = ['all', 'mine', 'open', 'urgent', 'done'];
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-1 px-1">
      {keys.map((k) => {
        const active = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className="flex-shrink-0 px-3 py-1.5 text-[11px] uppercase tracking-wider rounded"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--ink-soft)',
              border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius)',
            }}
          >
            {labels[k]}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onComplete }: { task: TaskRow; onComplete: () => void }) {
  const { theme } = useApp();
  const done = !!task.completed_at;
  const urgent = task.tier === 'urgent' && !done;

  return (
    <div
      className={`relative p-4 border shadow-sm transition ${done ? 'opacity-60' : ''}`}
      style={{
        background: urgent
          ? 'color-mix(in srgb, var(--danger) 10%, var(--surface))'
          : 'var(--surface)',
        borderColor: urgent ? 'var(--danger)' : 'var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className="font-semibold flex-1 display"
          style={{
            color: 'var(--ink)',
            textDecoration: done ? 'line-through' : 'none',
            letterSpacing: '0.02em',
          }}
        >
          {task.title}
        </h3>
        <span
          className="text-[10px] uppercase tracking-wider px-2 py-0.5 flex-shrink-0"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface)',
            fontFamily: 'var(--font-mono)',
            borderRadius: 'var(--radius)',
          }}
        >
          {theme.copy.tiers[task.tier as keyof typeof theme.copy.tiers]}
        </span>
      </div>

      {task.description && (
        <p className="text-sm italic mb-3" style={{ color: 'var(--ink-soft)' }}>{task.description}</p>
      )}

      <div
        className="flex justify-between items-center pt-2 text-xs"
        style={{
          borderTop: '1px dotted var(--border)',
          color: 'var(--ink-soft)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div className="flex gap-3">
          <span><b style={{ color: 'var(--success)' }}>{task.xp_reward}</b> {theme.copy.xpLabel}</span>
          <span><b style={{ color: 'var(--accent-2)' }}>{task.gold_reward}</b> {theme.copy.goldLabel}</span>
        </div>
        <div>
          {theme.copy.assignee}{' '}
          <b style={{ color: 'var(--accent)' }}>
            {task.assignee?.display_name || 'Anyone'}
          </b>
        </div>
      </div>

      {!done && (
        <button
          onClick={onComplete}
          className="w-full mt-3 py-2 text-xs uppercase tracking-widest font-semibold"
          style={{
            background: 'var(--success)',
            color: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {theme.copy.completeTask}
        </button>
      )}
    </div>
  );
}

function EmptyState({ message, ornament }: { message: string; ornament: string }) {
  return (
    <div className="text-center py-12" style={{ color: 'var(--ink-soft)' }}>
      <div className="text-2xl mb-2" style={{ color: 'var(--accent-2)' }}>{ornament} {ornament} {ornament}</div>
      <p className="italic">{message}</p>
    </div>
  );
}

function AddTaskModal({
  members, onClose, onSubmit,
}: { members: Member[]; onClose: () => void; onSubmit: (form: FormData) => void }) {
  const { theme } = useApp();
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-30 p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
        className="w-full max-w-md p-5 space-y-3"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--accent-2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <h3 className="display text-lg font-bold text-center" style={{ color: 'var(--accent)' }}>
          {theme.copy.newTask}
        </h3>

        <Field label="Title">
          <input name="title" required className="inp" autoFocus />
        </Field>

        <Field label="Description">
          <textarea name="description" rows={2} className="inp" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Assignee">
            <select name="assignee_id" className="inp" defaultValue="">
              <option value="">Anyone</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </Field>

          <Field label="Tier">
            <select name="tier" className="inp" defaultValue="common">
              <option value="common">{theme.copy.tiers.common}</option>
              <option value="rare">{theme.copy.tiers.rare}</option>
              <option value="epic">{theme.copy.tiers.epic}</option>
              <option value="urgent">{theme.copy.tiers.urgent}</option>
            </select>
          </Field>

          <Field label={`${theme.copy.xpLabel} reward`}>
            <input name="xp_reward" type="number" className="inp" defaultValue={50} />
          </Field>

          <Field label={`${theme.copy.goldLabel} reward`}>
            <input name="gold_reward" type="number" step="0.5" className="inp" defaultValue={5} />
          </Field>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm uppercase tracking-wider" style={{ color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            Cancel
          </button>
          <button type="submit" className="flex-1 py-2 text-sm uppercase tracking-wider font-semibold" style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}>
            {theme.copy.newTask}
          </button>
        </div>

        <style jsx>{`
          .inp {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--ink);
            font-family: var(--font-body);
            border-radius: var(--radius);
            font-size: 0.95rem;
          }
          .inp:focus { outline: none; border-color: var(--accent); }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      {children}
    </label>
  );
}
