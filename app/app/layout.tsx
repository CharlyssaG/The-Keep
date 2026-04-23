import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    // User signed up but hasn't been linked to a profile yet
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-ink">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold display">Almost there</h1>
          <p className="text-ink-soft text-sm">
            Your account exists but isn't linked to the household yet. An admin needs to add your
            profile row. Share your user ID: <code className="bg-surface-2 px-2 py-1 rounded text-xs">{user.id}</code>
          </p>
          <form action="/auth/signout" method="post">
            <button className="text-sm underline text-ink-soft">Sign out</button>
          </form>
        </div>
      </div>
    );
  }

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, display_name, theme, avatar_glyph')
    .order('display_name');

  return (
    <AppShell profile={profile} allProfiles={allProfiles ?? []}>
      {children}
    </AppShell>
  );
}
