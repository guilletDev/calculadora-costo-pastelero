import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentClient } from '@/lib/mercadopago';
import { createAdminClient } from '@/lib/supabase-admin';
import { PRO_PLAN_PRICE, PRO_PLAN_DAYS } from '@/lib/pricing';

export const runtime = 'nodejs';

const DAYS_MS = PRO_PLAN_DAYS * 24 * 60 * 60 * 1000;

function parsePaymentId(req: NextRequest): string | null {
  const searchParams = req.nextUrl.searchParams;
  const topic = searchParams.get('topic') ?? searchParams.get('type');
  const idFromQuery = searchParams.get('id');

  if (topic === 'payment' && idFromQuery) return idFromQuery;

  const dataId = searchParams.get('data.id');
  if (dataId) return dataId;

  return null;
}

function parseUserIdFromExternalReference(externalReference: string | undefined | null): string | null {
  if (!externalReference) return null;
  const userId = externalReference.split(':')[0];
  if (!userId || userId.length < 8) return null;
  return userId;
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

  if (payment.status !== 'approved') {
    return NextResponse.json({ received: true, ignored: `status_${payment.status}` });
  }

  if (Number(payment.transaction_amount) !== PRO_PLAN_PRICE) {
    console.warn(
      `[webhook] Monto inesperado en pago ${payment.id}: ${payment.transaction_amount}`
    );
    return NextResponse.json({ received: true, ignored: 'amount_mismatch' });
  }

  const userId = parseUserIdFromExternalReference(payment.external_reference);
  if (!userId) {
    console.warn(`[webhook] external_reference inválida en pago ${payment.id}`);
    return NextResponse.json({ received: true, ignored: 'bad_external_reference' });
  }

  const admin = createAdminClient();

  const { data: inserted, error: insertError } = await admin
    .from('payment_events')
    .insert({
      payment_id: String(payment.id),
      external_reference: payment.external_reference ?? '',
      user_id: userId,
      amount: Number(payment.transaction_amount),
      currency: payment.currency_id ?? 'ARS',
      status: payment.status,
      raw_payload: payment as unknown as Record<string, unknown>,
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      // payment_id ya procesado (notificación duplicada) → no sumar días otra vez
      return NextResponse.json({ received: true, ignored: 'duplicate' });
    }
    console.error('[webhook] Error registrando payment_event:', insertError);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ received: true, ignored: 'duplicate' });
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('pro_valid_until')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[webhook] Error consultando perfil:', profileError);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const baseMs = profile?.pro_valid_until
    ? Math.max(new Date(profile.pro_valid_until).getTime(), Date.now())
    : Date.now();
  const newValidUntil = new Date(baseMs + DAYS_MS).toISOString();

  const { error: updateError } = await admin
    .from('profiles')
    .update({ plan_type: 'pro', pro_valid_until: newValidUntil })
    .eq('id', userId);

  if (updateError) {
    console.error('[webhook] Error actualizando perfil:', updateError);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true, processed: true });
}