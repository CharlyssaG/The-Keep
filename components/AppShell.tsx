'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getTheme, type ThemeId } from '@/lib/themes';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LiteProfile = Pick<Profile, 'id' | 'display_name' | 'theme' | 'avatar_glyph'>;

type AppCtx = {
  profile: Profile;
  allProfiles: LiteProfile[];
  theme: ReturnType<typeof getTheme>;
  toast: (msg: string) => void;
  refresh: () => void;
};

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be inside AppShell');
  return v;
};

export default function AppShell({
  profile,
  allProfiles,
  children,
}: {
  profile: Profile;
  allProfiles: LiteProfile[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const theme = getTheme(profile.theme);

  // Apply theme to <body data-theme="...">
  useEffect(() => {
    document.body.dataset.theme = profile.theme;
    return () => { document.body.dataset.theme = 'neutral'; };
  }, [profile.theme]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  // Subscribe to new notifications for this user
  useEffect(() => {
    const channel = supabase
      .channel('household-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n: any = payload.new;
          if (!n.recipient_id || n.recipient_id === profile.id) {
            toast(`${theme.copy.ornament} ${n.title}`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, supabase, toast, theme.copy.ornament]);

  const navItems = [
    { href: '/app',               label: theme.copy.home,          icon: homeIcon(profile.theme) },
    { href: '/app/tasks',         label: theme.copy.tasks,         icon: tasksIcon(profile.theme) },
    { href: '/app/food',          label: theme.copy.food,          icon: foodIcon(profile.theme) },
    { href: '/app/notifications', label: theme.copy.notifications, icon: notifIcon(profile.theme) },
  ];

  return (
    <Ctx.Provider value={{ profile, allProfiles, theme, toast, refresh }}>
      <div className="min-h-screen pb-20 pt-4 px-4 relative">
        <Header profile={profile} theme={theme} />
        <main className="pt-4">{children}</main>

        <nav
          className="fixed bottom-0 left-0 right-0 border-t z-20"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          <div className="flex">
            {navItems.map((item) => {
              const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 py-3 text-center text-[11px] flex flex-col items-center gap-1 transition"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--ink-soft)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.1em',
                  }}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="uppercase">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {toastMsg && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 px-5 py-2 text-sm border z-30 shadow-lg animate-fade"
            style={{
              background: 'var(--accent)',
              color: 'var(--surface)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              maxWidth: '90vw',
            }}
          >
            {toastMsg}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade { animation: fade-in 0.25s ease; }
      `}</style>
    </Ctx.Provider>
  );
}

function Header({ profile, theme }: { profile: Profile; theme: ReturnType<typeof getTheme> }) {
  return (
    <header
      className="flex items-center justify-between pb-4 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <h1
          className="display text-2xl font-bold"
          style={{ color: 'var(--accent)', letterSpacing: theme.id === 'alien' ? '0.15em' : 'normal' }}
        >
          {theme.copy.appName}
        </h1>
        <div className="flex gap-3 mt-1 text-[11px] mono" style={{ color: 'var(--ink-soft)' }}>
          <span>{theme.copy.levelLabel} <b style={{ color: 'var(--accent)' }}>{profile.level}</b></span>
          <span>{theme.copy.xpLabel} <b style={{ color: 'var(--accent)' }}>{profile.xp.toLocaleString()}</b></span>
          <span>{theme.copy.goldLabel} <b style={{ color: 'var(--accent-2)' }}>{profile.gold}</b></span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/app/account"
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold display"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface)',
            border: '2px solid var(--accent-2)',
            textDecoration: 'none',
          }}
          title="Account"
        >
          {profile.avatar_glyph || profile.display_name[0]}
        </Link>
      </div>
    </header>
  );
}

// Theme-aware nav icons (simple glyphs, readable at any size).
// Typed as Partial so the 'neutral' theme safely falls through to the default.
type IconSet = Partial<Record<ThemeId, string>>;
const HOME_ICONS:     IconSet = { dnd: '◈', alien: '◎', horror: '♰', marquee: '❖', cozy: '🏡', space: '◯', oldwest: '✧', nineties: '✦', underwater: '🌸', station: '⧫', barbie: '♡' };
const TASKS_ICONS:    IconSet = { dnd: '⚔', alien: '◈', horror: '†', marquee: '★', cozy: '✦', space: '✦', oldwest: '★', nineties: '✪', underwater: '❀', station: '⋆', barbie: '✿' };
// Food icon: the unified Stock/Shopping/Recipes section. Picked themed icons
// that read more "kitchen/pantry/feast" than just "shopping cart".
const FOOD_ICONS:     IconSet = { dnd: '🍖', alien: '◉', horror: '🕯', marquee: '🍽', cozy: '🍯', space: '◉', oldwest: '🥩', nineties: '🍕', underwater: '🐚', station: '◉', barbie: '🍰' };
const KITCHEN_ICONS:  IconSet = { dnd: '⚱', alien: '▣', horror: '🕯', marquee: '♛', cozy: '🍯', space: '◉', oldwest: '🏺', nineties: '▣', underwater: '🐚', station: '◉', barbie: '🎀' };
const SHOPPING_ICONS: IconSet = { dnd: '⚖', alien: '⊞', horror: '☗', marquee: '🎭', cozy: '🧺', space: '⊕', oldwest: '🛒', nineties: '✚', underwater: '🪸', station: '⊕', barbie: '👛' };
const RECIPE_ICONS:   IconSet = { dnd: '📜', alien: '◐', horror: '✦', marquee: '♬', cozy: '📖', space: '◎', oldwest: '📜', nineties: '❖', underwater: '🌿', station: '◎', barbie: '💄' };
const NOTIF_ICONS:    IconSet = { dnd: '✦', alien: '⟐', horror: '◈', marquee: '✧', cozy: '✉', space: '⟨⟩', oldwest: '✉', nineties: '✉', underwater: '🌊', station: '◆', barbie: '💌' };

function homeIcon(t: string)     { return HOME_ICONS[t as ThemeId]     ?? '◈'; }
function tasksIcon(t: string)    { return TASKS_ICONS[t as ThemeId]    ?? '✓'; }
function foodIcon(t: string)     { return FOOD_ICONS[t as ThemeId]     ?? '🍴'; }
function kitchenIcon(t: string)  { return KITCHEN_ICONS[t as ThemeId]  ?? '◉'; }
function shoppingIcon(t: string) { return SHOPPING_ICONS[t as ThemeId] ?? '🛒'; }
function recipesIcon(t: string)  { return RECIPE_ICONS[t as ThemeId]   ?? '❖'; }
function notifIcon(t: string)    { return NOTIF_ICONS[t as ThemeId]    ?? '●'; }
