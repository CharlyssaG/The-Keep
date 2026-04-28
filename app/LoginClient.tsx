'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// A simple email + password login. Sign-up is not exposed here; new
// households are onboarded by an admin running the household-setup runbook
// (see supabase/onboard_new_household.md). After a household member is
// created, they receive their own email + password and use this form to
// sign in. Their profile.household_id determines which household's data
// they see.
export default function LoginClient() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setInfo('Check your email for a reset link.');
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
          className="text-center text-5xl tracking-tight mb-1"
          style={{
            color: 'var(--ink)',
            fontFamily: "'Fraunces', 'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          roost
        </h1>
        <p
          className="text-center text-xs italic mb-6"
          style={{
            color: 'var(--ink-soft)',
            fontFamily: "'Fraunces', 'Cormorant Garamond', Georgia, serif",
            letterSpacing: '0.01em',
          }}
        >
          for the people who share your roof
        </p>
        <p className="text-center text-sm text-ink-soft mb-8">
          {showReset ? 'reset your password' : 'welcome back'}
        </p>

        <form
          onSubmit={showReset ? handlePasswordReset : handleSignIn}
          className="bg-surface border border-border rounded-lg p-5 space-y-3"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full p-3 rounded-md bg-surface-2 border border-border text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
          />
          {!showReset && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full p-3 rounded-md bg-surface-2 border border-border text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
            />
          )}
          {error && <div className="text-sm text-danger">{error}</div>}
          {info && <div className="text-sm" style={{ color: 'var(--success)' }}>{info}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full p-3 rounded-md font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--surface)' }}
          >
            {busy ? '…' : showReset ? 'Send reset link' : 'Sign in'}
          </button>
          <div className="flex justify-between items-center pt-1">
            {showReset ? (
              <button
                type="button"
                onClick={() => { setShowReset(false); setError(null); setInfo(null); }}
                className="text-sm text-ink-soft"
              >
                ← Back to sign in
              </button>
            ) : (
              <>
                <span />
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setError(null); setInfo(null); }}
                  className="text-sm"
                  style={{ color: 'var(--accent)' }}
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-ink-soft mt-6">
          By invitation only. Want a household?{' '}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdwGzhiq2Zl8S1ERmltKIWYhmyAaygeMK56uMKMGjTQrGylig/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            Request access
          </a>
        </p>
      </div>
    </div>
  );
}
