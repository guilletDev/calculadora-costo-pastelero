// Activación del Plan Pro ante un pago aprobado de Mercado Pago.
// Lógica compartida entre el webhook (app/api/webhook/mercadopago) y el
// endpoint de retorno (app/api/checkout/success) para no duplicar código.
//
// Usa SIEMPRE el cliente con service_role (createAdminClient): la petición
// puede venir de Mercado Pago sin sesión de usuario, y el UPDATE de profiles
// está bloqueado para el cliente por RLS (solo escritura backend).

import { createAdminClient } from '@/lib/supabase-admin';
import { PRO_PLAN_PRICE, PRO_PLAN_DAYS } from '@/lib/pricing';

const DAYS_MS = PRO_PLAN_DAYS * 24 * 60 * 60 * 1000;

// El external_reference se genera en checkout como `${user.id}:${Date.now()}`
export function parseUserIdFromExternalReference(
  externalReference: string | undefined | null
): string | null {
  if (!externalReference) return null;
  const userId = externalReference.split(':')[0];
  if (!userId || userId.length < 8) return null;
  return userId;
}

export type ActivationResult =
  | { status: 'activated'; userId: string }
  | { status: 'duplicate'; userId: string }
  | { status: 'ignored'; reason: string };

export interface PaymentLike {
  id?: string | number;
  status?: string;
  transaction_amount?: number;
  external_reference?: string | null;
  currency_id?: string | null;
}

export async function activateProPlan(payment: PaymentLike): Promise<ActivationResult> {
  console.log('[payment-activation] Inicio', {
    paymentId: payment.id,
    status: payment.status,
    amount: payment.transaction_amount,
    external_reference: payment.external_reference ?? null,
  });

  if (payment.status !== 'approved') {
    console.log(`[payment-activation] Pago ignorado por status: ${payment.status}`);
    return { status: 'ignored', reason: `status_${payment.status}` };
  }

  if (Number(payment.transaction_amount) !== PRO_PLAN_PRICE) {
    console.warn(
      `[payment-activation] Monto inesperado en pago ${payment.id}: ${payment.transaction_amount} (esperado: ${PRO_PLAN_PRICE})`
    );
    return { status: 'ignored', reason: 'amount_mismatch' };
  }

  const userId = parseUserIdFromExternalReference(payment.external_reference);
  if (!userId) {
    console.warn(`[payment-activation] external_reference inválida en pago ${payment.id}`);
    return { status: 'ignored', reason: 'bad_external_reference' };
  }
  console.log('[payment-activation] Usuario identificado por external_reference:', userId);

  const admin = createAdminClient();

  // Idempotencia: payment_id UNIQUE → un pago aprobado activa el plan una sola vez
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
      // payment_id ya procesado (webhook + retorno simultáneos) → no sumar días otra vez
      console.log(`[payment-activation] Duplicado detectado (payment_id ${payment.id})`);
      return { status: 'duplicate', userId };
    }
    console.error('[payment-activation] Error registrando payment_event:', {
      code: insertError.code,
      message: insertError.message,
    });
    throw new Error(`Error registrando payment_event: ${insertError.message}`);
  }

  if (!inserted) {
    console.log(`[payment-activation] Sin fila insertada en payment_events (payment_id ${payment.id})`);
    return { status: 'duplicate', userId };
  }
  console.log(`[payment-activation] payment_event registrado: ${inserted.id}`);

  // Extender la vigencia: si el usuario ya tiene plan activo, se suma sobre esa fecha
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('pro_valid_until')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[payment-activation] Error consultando perfil:', {
      code: profileError.code,
      message: profileError.message,
    });
    throw new Error(`Error consultando perfil: ${profileError.message}`);
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
    console.error('[payment-activation] Error actualizando perfil:', {
      code: updateError.code,
      message: updateError.message,
    });
    throw new Error(`Error actualizando perfil: ${updateError.message}`);
  }

  console.log('[payment-activation] Perfil actualizado a PRO', {
    userId,
    pro_valid_until: newValidUntil,
    profileAnterior: profile?.pro_valid_until ?? null,
  });

  return { status: 'activated', userId };
}