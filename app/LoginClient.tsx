'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  display_name: string;
  class_name: string | null;
  theme: string;
  avatar_glyph: string | null;
};

export default function LoginClient({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/app');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-ink">
      <div className="w-full max-w-sm">
        <h1
          className="display text-center text-4xl font-semibold tracking-tight mb-1"
          style={{ color: 'var(--ink)' }}
        >
          Household
        </h1>
        <p className="text-center text-sm text-ink-soft mb-8">
          {selectedProfile ? `Signing in as ${selectedProfile.display_name}` : 'Choose who you are'}
        </p>

        {!selectedProfile && profiles.length > 0 && (
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className="w-full flex items-center gap-4 p-4 bg-surface border border-border rounded-lg hover:bg-surface-2 active:scale-[0.99] transition text-left"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-semibold display text-lg"
                  style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                >
                  {p.avatar_glyph || p.display_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{p.display_name}</div>
                  {p.class_name && (
                    <div className="text-sm text-ink-soft truncate">{p.class_name}</div>
                  )}
                </div>
                <div className="text-ink-soft">→</div>
              </button>
            ))}
          </div>
        )}

        {!selectedProfile && profiles.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-6">
            <p className="text-sm text-ink-soft mb-4 text-center">
              No profiles yet. Create the first account.
            </p>
            <button
              onClick={() => setSelectedProfile({ id: 'new', display_name: 'New', class_name: null, theme: 'neutral', avatar_glyph: null })}
              className="w-full p-3 rounded-lg font-medium"
              style={{ background: 'var(--accent)', color: 'var(--surface)' }}
            >
              Create account
            </button>
          </div>
        )}

        {selectedProfile && (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 text-sm rounded-md ${mode === 'signin' ? 'font-semibold' : 'text-ink-soft'}`}
                style={mode === 'signin' ? { background: 'var(--surface-2)' } : {}}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 text-sm rounded-md ${mode === 'signup' ? 'font-semibold' : 'text-ink-soft'}`}
                style={mode === 'signup' ? { background: 'var(--surface-2)' } : {}}
              >
                Sign up
              </button>
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-md bg-surface-2 border border-border text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 rounded-md bg-surface-2 border border-border text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
            />
            {error && <div className="text-sm text-danger">{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full p-3 rounded-md font-medium disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--surface)' }}
            >
              {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className="w-full text-sm text-ink-soft py-1"
            >
              ← Back to profiles
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
