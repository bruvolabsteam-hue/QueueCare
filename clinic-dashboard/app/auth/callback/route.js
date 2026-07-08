import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  let errorMessage = 'auth_failed';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    errorMessage = error.message;
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMessage)}`);
}
