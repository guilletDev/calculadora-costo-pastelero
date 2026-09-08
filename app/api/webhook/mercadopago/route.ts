import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPaymentClient } from '@/lib/mercadopago';
import { activateProPlan } from '@/lib/payment-activation';

export const runtime = 'nodejs';

function parsePaymentId(req: NextRequest): string | null {
  const searchParams = req.nextUrl.searchParams;
  const topic = searchParams.get('topic') ?? searchParams.get('type');
  const idFromQuery = searchParams.get('id');

  if (topic === 'payment' && idFromQuery) return idFromQuery;

  const dataId = searchParams.get('data.id');
  if (dataId) return dataId;

  return null;
}

export async function POST(req: NextRequest) {
  const paymentId = parsePaymentId(req);

  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: 'no_payment_id' });
  }

  let payment;
  try {
    payment = await getPaymentClient().get({ id: paymentId });
  } catch (error) {
    console.error('[webhook] Error consultando pago en Mercado Pago:', error);
    return NextResponse.json({ error: 'mercadopago_error' }, { status: 500 });
  }

  let result;
  try {
    // La activación usa el cliente con service_role (ignora RLS) y busca al
    // usuario por el external_reference del pago (no hay sesión de usuario
    // cuando Mercado Pago llama al webhook).
    result = await activateProPlan(payment);
  } catch (error) {
    console.error('[webhook] Error activando plan:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  if (result.status === 'ignored') {
    return NextResponse.json({ received: true, ignored: result.reason });
  }

  if (result.status === 'duplicate') {
    return NextResponse.json({ received: true, ignored: 'duplicate' });
  }

  // Invalidar la caché de Next para que el estado PRO se refleje de inmediato
  revalidatePath('/pro/estado', 'layout');
  revalidatePath('/', 'layout');

  return NextResponse.json({ received: true, processed: true });
}