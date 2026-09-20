import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { getPaymentClient, buildAppUrl } from '@/lib/mercadopago';
import { activateProPlan, parseUserIdFromExternalReference } from '@/lib/payment-activation';

export const runtime = 'nodejs';

// Endpoint de retorno de Mercado Pago (back_urls.success).
// El usuario vuelve acá tras pagar: verificamos el payment_id contra la API
// de Mercado Pago e impactamos plan_type='pro' + pro_valid_until en Supabase
// de forma SÍNCRONA (con service_role), antes de redirigir a /pro/estado.
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const paymentId = searchParams.get('payment_id');
  const mpStatus = searchParams.get('status');

  console.log('[checkout/success] Retorno de Mercado Pago recibido', {
    payment_id: paymentId ?? null,
    status_param: mpStatus ?? null,
    url: req.url,
  });

  const redirectTo = (result: string) =>
    NextResponse.redirect(buildAppUrl(`/pro/estado?result=${result}`), 303);

  // Sin payment_id no hay nada que verificar: el webhook + el polling cubren
  // la activación asincrónica.
  if (!paymentId) {
    return redirectTo('pending');
  }

  // Hint temprano del estado: si MP ya avisó que quedó pendiente, no consultamos la API.
  if (mpStatus === 'pending' || mpStatus === 'in_process') {
    return redirectTo('pending');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payment;
  try {
    payment = await getPaymentClient().get({ id: paymentId });
  } catch (error) {
    console.error('[checkout/success] Error consultando pago en Mercado Pago:', error);
    return redirectTo('pending');
  }

  // Seguridad: solo activamos si el pago pertenece al usuario autenticado.
  const paymentUserId = parseUserIdFromExternalReference(payment.external_reference);
  console.log('[checkout/success] Verificación de pertenencia', {
    paymentUserId: paymentUserId ?? null,
    authedUserId: user?.id ?? null,
  });
  if (!paymentUserId || (user && paymentUserId !== user.id)) {
    console.warn(
      `[checkout/success] payment_id ${paymentId} no corresponde al usuario autenticado`
    );
    return redirectTo('pending');
  }

  if (payment.status !== 'approved') {
    return redirectTo(payment.status === 'pending' ? 'pending' : 'failure');
  }

  try {
    await activateProPlan(payment);
  } catch (error) {
    console.error('[checkout/success] Error activando plan:', error);
    return redirectTo('pending');
  }

  console.log('[checkout/success] Plan activado correctamente', { paymentId, userId: paymentUserId });

  // Invalidar la caché de Next para que el estado PRO se refleje de inmediato
  revalidatePath('/pro/estado', 'layout');
  revalidatePath('/', 'layout');
  revalidatePath('/dashboard', 'layout');

  return redirectTo('success');
}