import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isEmailConfigured, sendAccountDeletionEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Baja definitiva de cuenta: elimina el usuario de auth.users con service_role.
// El resto de los datos se limpia en cascada (profiles, ingredients, recipes,
// products, payment_events, componentes) por los ON DELETE CASCADE del esquema.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Datos para el email de despedida (capturados antes de eliminar).
  const email = user.email ?? null;
  const meta = user.user_metadata ?? {};
  const name = (meta.full_name || meta.name || email?.split('@')[0] || 'pastelero') as string;

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error('[user/delete] Error eliminando usuario:', error);
      return NextResponse.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 });
    }

    console.log('[user/delete] Cuenta eliminada:', user.id);

    // Email de despedida: best-effort, nunca rompe la respuesta de éxito.
    if (email && isEmailConfigured()) {
      try {
        await sendAccountDeletionEmail({ to: email, name });
        console.log('[user/delete] Email de despedida enviado a', email);
      } catch (emailError) {
        console.error('[user/delete] Error enviando email de despedida:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[user/delete] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta' }, { status: 500 });
  }
}
