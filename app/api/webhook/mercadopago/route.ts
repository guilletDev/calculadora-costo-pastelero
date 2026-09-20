import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPaymentClient } from '@/lib/mercadopago';
import { activateProPlan } from '@/lib/payment-activation';

export const runtime = 'nodejs';

// Mercado Pago puede notificar el id del pago de varias formas:
//  - Query params: ?type=payment&id=123  |  ?topic=payment&id=123  |  ?type=payment&data.id=123
//  - JSON body:    { "data": { "id": "123" }, "type": "payment" }  |  { "id": "123" }
async function parsePaymentId(req: NextRequest): Promise<string | null> {
  const searchParams = req.nextUrl.searchParams;
  const topic = searchParams.get('topic') ?? searchParams.get('type');
  const idFromQuery = searchParams.get('id');

  if (topic === 'payment' && idFromQuery) return idFromQuery;

  const dataIdFromQuery = searchParams.get('data.id');
  if (dataIdFromQuery) return dataIdFromQuery;

  // Formato moderno: el id llega en el JSON body
  try {
    const body = await req.json();
    if (body && typeof body === 'object') {
      if (body.data?.id) return String(body.data.id);
      if (body.id) return String(body.id);
    }
  } catch {
    // Sin body JSON o body no consumible: no es un error, seguimos.
  }

  return null;
}

export async function POST(req: NextRequest) {
  const paymentId = await parsePaymentId(req);
  console.log('[webhook] Evento recibido', {
    method: 'POST',
    url: req.url,
    paymentId: paymentId ?? null,
  });

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

  console.log('[webhook] Pago consultado en Mercado Pago', {
    id: payment.id,
    status: payment.status,
    transaction_amount: payment.transaction_amount,
    external_reference: payment.external_reference ?? null,
  });

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

  console.log('[webhook] Resultado de la activación', result);

  if (result.status === 'ignored') {
    return NextResponse.json({ received: true, ignored: result.reason });
  }

  if (result.status === 'duplicate') {
    return NextResponse.json({ received: true, ignored: 'duplicate' });
  }

  // Invalidar la caché de Next para que el estado PRO se refleje de inmediato
  revalidatePath('/pro/estado', 'layout');
  revalidatePath('/', 'layout');
  revalidatePath('/dashboard', 'layout');

  return NextResponse.json({ received: true, processed: true });
}

// Mercado Pago suele verificar el endpoint con un GET al configurar el webhook:
// responder 200 evita que el panel marque el webhook como inválido.
export async function GET(req: NextRequest) {
  console.log('[webhook] GET recibido (verificación de Mercado Pago)', { url: req.url });
  return NextResponse.json({ received: true });
}