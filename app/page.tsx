import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export default async function Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already signed in, skip past the login screen
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (profile) redirect('/app');
  }

  // Get all profiles in the demo household (shown as tappable options)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, class_name, theme, avatar_glyph')
    .order('display_name');

  return <LoginClient profiles={profiles ?? []} />;
}
