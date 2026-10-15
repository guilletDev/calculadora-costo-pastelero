import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase-admin';
import { isEmailConfigured, sendWelcomeEmail } from '@/lib/email';

// Envía el email de bienvenida una sola vez por usuario (idempotente via
// profiles.welcome_email_sent). Nunca rompe el login: cualquier fallo se
// loguea y el flujo continúa.
export async function maybeSendWelcomeEmail(user: User) {
  try {
    if (!isEmailConfigured() || !user.email) return;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('welcome_email_sent')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.welcome_email_sent) return;

    const meta = user.user_metadata ?? {};
    const name = (meta.full_name || meta.name || user.email.split('@')[0] || 'pastelero') as string;

    await sendWelcomeEmail({ to: user.email, name });
    console.log('[welcome-email] Email de bienvenida enviado a', user.email);

    await admin
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', user.id);
  } catch (error) {
    console.error('[welcome-email] Error enviando email de bienvenida:', error);
  }
}
