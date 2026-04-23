# Household

A multi-aesthetic household management app for five people. Same features,
five distinct visual worlds: D&D (Charlyssa), retro alien (Jamie), horror
(Jalex), musical theater (Kelly), and cozy Winnie-the-Pooh (Janiya).

Stack: **Next.js 14** (App Router, TypeScript) · **Supabase** (Postgres,
Auth, Realtime, RLS) · **Tailwind** · Deploys to **Vercel**.

## Features

- **Task board** with assignees, XP + gold rewards, tier levels, filters,
  and real-time sync across devices
- **Kitchen inventory** with plain-English food names, quantity controls,
  low-stock alerts, and category grouping
- **Recipes** that cross-check ingredients against live inventory — know at
  a glance what you can actually cook right now
- **Notifications** (broadcast or direct) with realtime delivery
- **Per-user themes** — log in and the whole app transforms

## Setup

### 1. Supabase project

1. Create a project at https://supabase.com
2. In the SQL Editor, open `supabase/schema.sql` and run the whole file.
   This creates the tables, RLS policies, realtime publications, and seeds
   the household with inventory categories, example items, and example
   recipes.
3. Go to Authentication → Providers → Email. Turn off "Confirm email" while
   you're testing, or keep it on and check your inbox when signing up.
4. Copy your project URL and anon key from Settings → API.

### 2. Local dev

```bash
git clone <your-repo-url>
cd <repo>
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Visit `http://localhost:3000`.

### 3. Create the five accounts

Each person signs up at `/` with their email + password. After signing up,
note down their `auth.users.id` value (visible in Supabase → Authentication
→ Users).

Then in the SQL editor, link them to profiles with the correct theme:

```sql
insert into public.profiles (id, household_id, display_name, theme, class_name, avatar_glyph) values
  ('<charlyssa-uuid>', '11111111-1111-1111-1111-111111111111', 'Charlyssa', 'dnd',     'Half-Elf Sorceress',   'C'),
  ('<jamie-uuid>',     '11111111-1111-1111-1111-111111111111', 'Jamie',     'alien',   'Starborn Scout',       'J'),
  ('<jalex-uuid>',     '11111111-1111-1111-1111-111111111111', 'Jalex',     'horror',  'Shadow Necromancer',   'J'),
  ('<kelly-uuid>',     '11111111-1111-1111-1111-111111111111', 'Kelly',     'marquee', 'Bard of Spectacle',    'K'),
  ('<janiya-uuid>',    '11111111-1111-1111-1111-111111111111', 'Janiya',    'cozy',    'Druid of Soft Places', 'J');
```

After that, everyone sees each other on the login screen and the right
theme activates on login.

### 4. Deploy to Vercel

```bash
# Push to GitHub first, then:
vercel
# Or import the repo in the Vercel dashboard.
```

Add the environment variables in Vercel's project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deploy. Done.

### 5. (Optional) Regenerate TypeScript types

Once your schema is in production:

```bash
npx supabase login
# set SUPABASE_PROJECT_ID in .env.local
npm run types
```

## Project structure

```
app/
  page.tsx                    login screen (neutral theme)
  LoginClient.tsx             login form
  auth/signout/route.ts       POST /auth/signout
  app/                        authenticated routes
    layout.tsx                checks auth, loads profile, applies theme
    page.tsx                  redirects to /app/tasks
    tasks/                    task board
    kitchen/                  inventory
    recipes/                  recipes + ingredient check
    notifications/            realtime notifications
components/
  AppShell.tsx                header, nav, theme context, toast
lib/
  themes.ts                   copy dictionaries per theme
  database.types.ts           generated Supabase types
  supabase/
    client.ts                 browser Supabase client
    server.ts                 server Supabase client
    middleware.ts             session refresh helper
styles/
  globals.css                 Tailwind + base CSS variables
  themes.css                  per-theme variable sets
supabase/
  schema.sql                  full DB schema + seed data
middleware.ts                 Next.js edge middleware
```

## How the theme system works

Each user's `profiles.theme` column stores one of:
`dnd | alien | horror | marquee | cozy`.

On login, `AppShell` sets `<body data-theme="...">`. In `styles/themes.css`
each theme defines its CSS custom properties — colors, fonts, radii, textures,
overlays. Components use `var(--accent)`, `var(--surface)`, etc., so they
restyle automatically.

Theme copy strings (labels like "Quests" vs. "Directives" vs. "Rituals") live
in `lib/themes.ts`. Use `useApp().theme.copy.*` anywhere in the app to pull
the themed label.

### Adjusting a theme

Edit `styles/themes.css` — just change the variable values inside
`[data-theme="..."] { … }`. No component changes needed.

### Adjusting theme copy

Edit `lib/themes.ts`. Each theme has a `copy` object; change any string and
it flows through the whole app.

### Adding a 6th theme

1. Add the new id to the union type in `lib/themes.ts` and `database.types.ts`
2. Add the copy dictionary in `lib/themes.ts`
3. Add the CSS variable block in `styles/themes.css`
4. Update the check constraint in `supabase/schema.sql` (and run
   `alter table profiles drop constraint profiles_theme_check, add constraint …`)

## Notes on the food names

Inventory item names are intentionally plain English ("Ground Beef",
"Butter", "Spinach") regardless of theme, so anyone can glance at the
kitchen and know what's there. Only the surrounding UI is themed.

## Notifications

In-app notifications are fully working (realtime push to any phone that's
open). True mobile push notifications (lock-screen alerts) require a
separate setup — either a PWA with Web Push, or a native wrapper. Both are
tractable additions later.

## Echo / Alexa integration

Not built in this pass. Alexa skills are a separate Amazon codebase that
would read from and write to the same Supabase database via the service
role key. Ask and I'll stub it out.
