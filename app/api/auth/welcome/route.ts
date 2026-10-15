import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { maybeSendWelcomeEmail } from '@/lib/welcome-email';

export const runtime = 'nodejs';

// Dispara el email de bienvenida (idempotente vía profiles.welcome_email_sent)
// tras un login con Google Identity Services, que no pasa por /auth/callback.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await maybeSendWelcomeEmail(user);
  return NextResponse.json({ ok: true });
}
