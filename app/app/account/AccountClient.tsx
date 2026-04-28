'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/AppShell';
import { THEMES, type ThemeId } from '@/lib/themes';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Order matters — controls the grid order on the account page.
// Hardcoded list of linked apps. To add or change one, edit this array,
// commit, and redeploy. No DB changes needed.
const EXTERNAL_LINKS: Array<{ name: string; url: string; tagline: string; icon: string }> = [
  {
    name: 'Terran Mandate',
    url: 'https://terran-mandate-wiki.vercel.app/',
    tagline: 'UEF field reference wiki',
    icon: '🛰',
  },
  {
    name: 'Chain Reaction',
    url: 'https://ripple-pop.vercel.app/',
    tagline: 'tap-to-pop arcade',
    icon: '🎮',
  },
];

const THEME_ORDER: ThemeId[] = ['dnd', 'alien', 'horror', 'marquee', 'cozy', 'space', 'oldwest', 'nineties', 'underwater', 'station', 'barbie', 'neutral'];

// Small flavor descriptor shown under each theme card.
const THEME_BLURBS: Record<ThemeId, string> = {
  dnd:        'parchment & burgundy',
  alien:      'retro CRT phosphor',
  horror:     'candlelight & gothic',
  marquee:    'broadway marquee',
  cozy:       'honey & hundred-acre wood',
  space:      'nebula & starlight',
  oldwest:    'leather & saddle-oil amber',
  nineties:   'GeoCities neon chaos',
  underwater: 'coral reef & bioluminescence',
  station:    'Starfleet bridge command',
  barbie:     'pastel pink dreamhouse',
  neutral:    'clean and unopinionated',
};

export default function AccountClient({ initialProfile }: { initialProfile: Profile }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useApp();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [avatarGlyph, setAvatarGlyph] = useState(initialProfile.avatar_glyph || '');
  const [className, setClassName] = useState(initialProfile.class_name || '');
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || profile.display_name,
        avatar_glyph: avatarGlyph.trim().slice(0, 2),
        class_name: className.trim(),
      } as any)
      .eq('id', profile.id);
    setSaving(false);
    if (error) { toast(error.message); return; }
    toast('Saved');
    setProfile({ ...profile, display_name: displayName.trim() || profile.display_name, avatar_glyph: avatarGlyph.trim().slice(0, 2), class_name: className.trim() });
    router.refresh();
  }

  async function changeTheme(themeId: ThemeId) {
    const { error } = await supabase
      .from('profiles')
      .update({ theme: themeId } as any)
      .eq('id', profile.id);
    if (error) { toast(error.message); return; }
    toast(`Theme: ${THEMES[themeId].label}`);
    setProfile({ ...profile, theme: themeId });
    // A hard reload ensures the server-rendered layout picks up the new theme
    // and re-renders everything with new CSS variables, copy strings, and icons.
    window.location.reload();
  }

  return (
    <div>
      <div className="text-center mt-2 mb-6">
        <h2 className="display text-xl font-bold" style={{ color: 'var(--accent)' }}>
          Account
        </h2>
        <p className="text-sm italic mt-1" style={{ color: 'var(--ink-soft)' }}>
          personalize your corner of the house
        </p>
      </div>

      {/* === Identity === */}
      <section
        className="p-4 mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
      >
        <h3 className="display text-sm uppercase tracking-widest mb-3" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          Identity
        </h3>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)' }}>Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="inp"
            />
          </label>

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)' }}>Avatar</span>
              <input
                value={avatarGlyph}
                onChange={(e) => setAvatarGlyph(e.target.value)}
                maxLength={2}
                placeholder="C"
                className="inp text-center"
                style={{ width: '3.5rem' }}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)' }}>Class / title</span>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Half-Elf Sorceress"
                className="inp"
              />
            </label>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-2 mt-2 text-sm uppercase tracking-wider font-semibold disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--surface)', borderRadius: 'var(--radius)' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>

      {/* === Theme picker === */}
      <section
        className="p-4 mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
      >
        <h3 className="display text-sm uppercase tracking-widest mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          Theme
        </h3>
        <p className="text-xs italic mb-3" style={{ color: 'var(--ink-soft)' }}>
          tap to switch — the whole app reskins
        </p>

        <div className="grid grid-cols-2 gap-2">
          {THEME_ORDER.map((themeId) => {
            const t = THEMES[themeId];
            if (!t) return null;
            const active = profile.theme === themeId;
            return (
              <button
                key={themeId}
                onClick={() => changeTheme(themeId)}
                className="p-3 text-left transition active:scale-[0.97]"
                style={{
                  background: active ? 'var(--accent)' : 'var(--surface-2)',
                  color: active ? 'var(--surface)' : 'var(--ink)',
                  border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ThemeSwatch themeId={themeId} />
                  <span className="display font-bold text-sm">{t.label}</span>
                  {active && <span className="ml-auto text-xs">✓</span>}
                </div>
                <div className="text-[11px] italic" style={{ color: active ? 'var(--surface)' : 'var(--ink-soft)', opacity: active ? 0.85 : 1 }}>
                  {THEME_BLURBS[themeId]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* === External apps === */}
      {EXTERNAL_LINKS.length > 0 && (
        <section
          className="p-4 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
        >
          <h3 className="display text-sm uppercase tracking-widest mb-1" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            Other apps
          </h3>
          <p className="text-xs italic mb-3" style={{ color: 'var(--ink-soft)' }}>
            opens in a new tab
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EXTERNAL_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 transition active:scale-[0.97]"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '1.4rem' }}>{link.icon}</span>
                  <span className="display font-bold text-sm" style={{ color: 'var(--ink)' }}>{link.name}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--ink-soft)' }}>↗</span>
                </div>
                <div className="text-[11px] italic" style={{ color: 'var(--ink-soft)' }}>
                  {link.tagline}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* === Stats (read-only) === */}
      <section
        className="p-4 mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
      >
        <h3 className="display text-sm uppercase tracking-widest mb-3" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          Stats
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Level" value={profile.level} />
          <Stat label="XP" value={profile.xp.toLocaleString()} />
          <Stat label="Gold" value={profile.gold} />
        </div>
      </section>

      {/* === Sign out === */}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full py-3 text-sm uppercase tracking-wider font-semibold"
          style={{
            background: 'transparent',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
          }}
        >
          Sign out
        </button>
      </form>

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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="display font-bold text-xl" style={{ color: 'var(--accent)' }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  );
}

// Little color swatch for each theme — the actual accent + surface colors
// hardcoded because CSS vars only apply when that theme is active.
const SWATCHES: Record<ThemeId, { bg: string; accent: string; accent2: string }> = {
  neutral:    { bg: '#f7f3ec', accent: '#3d3530', accent2: '#8a7a5c' },
  dnd:        { bg: '#e8dcc0', accent: '#8b2828', accent2: '#c9a23f' },
  alien:      { bg: '#0a0f0a', accent: '#39ff14', accent2: '#00b4ff' },
  horror:     { bg: '#18141e', accent: '#8b0000', accent2: '#d4af37' },
  marquee:    { bg: '#1a0a2a', accent: '#ff2d7e', accent2: '#ffd93d' },
  cozy:       { bg: '#fef6e4', accent: '#d88a30', accent2: '#c66848' },
  space:      { bg: '#080b1e', accent: '#9d7bff', accent2: '#5ec3e8' },
  oldwest:    { bg: '#3a2817', accent: '#d4952e', accent2: '#a8502a' },
  nineties:   { bg: '#1a0033', accent: '#ff2bd6', accent2: '#00ffe0' },
  underwater: { bg: '#04323d', accent: '#5eead4', accent2: '#fda4af' },
  station:    { bg: '#0a0d1a', accent: '#ff9933', accent2: '#6a8cff' },
  barbie:     { bg: '#ffdbe8', accent: '#e91e85', accent2: '#7ac4e8' },
};

function ThemeSwatch({ themeId }: { themeId: ThemeId }) {
  const s = SWATCHES[themeId];
  return (
    <div className="flex gap-0.5" style={{ height: 16 }}>
      <div style={{ width: 6, height: 16, background: s.bg, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)' }} />
      <div style={{ width: 6, height: 16, background: s.accent, borderRadius: 2 }} />
      <div style={{ width: 6, height: 16, background: s.accent2, borderRadius: 2 }} />
    </div>
  );
}
