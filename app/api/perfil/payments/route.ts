import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

// Historial de pagos del usuario autenticado.
// payment_events no expone policies de RLS (solo el backend escribe/lee):
// se consulta con el cliente service_role filtrando por el user_id de la
// sesión, exclusivamente desde este Route Handler server-side.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: payments, error } = await admin
      .from('payment_events')
      .select('id, payment_id, amount, currency, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[perfil/payments] Error consultando payment_events:', error);
      return NextResponse.json({ error: 'Error al cargar pagos' }, { status: 500 });
    }

    return NextResponse.json({ payments: payments ?? [] });
  } catch (error) {
    console.error('[perfil/payments] Error inesperado:', error);
    return NextResponse.json({ error: 'Error al cargar pagos' }, { status: 500 });
  }
}
