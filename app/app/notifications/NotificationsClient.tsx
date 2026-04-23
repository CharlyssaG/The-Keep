'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';

type Member = { id: string; display_name: string };
type Notif = any;

export default function NotificationsClient({
  initialNotifs, members,
}: { initialNotifs: Notif[]; members: Member[] }) {
  const supabase = createClient();
  const { profile, theme, toast } = useApp();
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('notif-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*, sender:sender_id(display_name), recipient:recipient_id(display_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (data) setNotifs(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async function send(form: FormData) {
    const payload = {
      household_id: profile.household_id,
      sender_id: profile.id,
      recipient_id: (form.get('recipient_id') as string) || null,
      title: String(form.get('title') || '').trim(),
      body: String(form.get('body') || '').trim(),
      kind: 'info' as const,
    };
    if (!payload.title) { toast('Need a title'); return; }
    const { error } = await supabase.from('notifications').insert(payload as any);
    if (error) { toast(error.message); return; }
    setShowCompose(false);
    toast(`${theme.copy.sendNotification} sent`);
  }

  return (
    <div>
      <SectionHeading title={theme.copy.notifications} subtitle={theme.copy.notificationsSubtitle} ornament={theme.copy.ornament} />

      {notifs.length === 0 ? (
        <div className="text-center py-12 italic" style={{ color: 'var(--ink-soft)' }}>
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const unread = !n.read_at && (n.recipient_id === profile.id || n.recipient_id === null);
            return (
              <div
                key={n.id}
                onClick={() => unread && markRead(n.id)}
                className="p-3 cursor-pointer"
                style={{
                  background: unread ? 'var(--surface)' : 'transparent',
                  border: `1px solid ${unread ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  opacity: unread ? 1 : 0.65,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold" style={{ color: 'var(--ink)' }}>
                    {unread ? '●' : '○'} {n.title}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {n.body && <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{n.body}</p>}
                <div className="text-[10px] mt-1" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                  from {n.sender?.display_name || 'house'} {n.recipient_id ? `→ ${n.recipient?.display_name || 'you'}` : '→ everyone'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center text-3xl font-light shadow-lg active:scale-95 transition z-10"
        style={{
          background: 'var(--accent)',
          color: 'var(--surface)',
          border: '3px solid var(--accent-2)',
        }}
      >
        +
      </button>

      {showCompose && <ComposeModal members={members} onClose={() => setShowCompose(false)} onSubmit={send} />}
    </div>
  );
}

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

function ComposeModal({
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
        <h3 className="display text-lg font-bold text-center" style={{ color: 'var(--accent)' }}>{theme.copy.sendNotification}</h3>

        <Field label="To">
          <select name="recipient_id" className="inp" defaultValue="">
            <option value="">Everyone</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </Field>

        <Field label="Title"><input name="title" required className="inp" autoFocus /></Field>
        <Field label="Message"><textarea name="body" rows={3} className="inp" /></Field>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm uppercase tracking-wider" style={{ color: 'var(--ink-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm uppercase tracking-wider font-semibold" style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}>Send</button>
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
