import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPreferenceClient, buildAppUrl, isSandboxToken } from '@/lib/mercadopago';
import {
  PRO_PLAN_ID,
  PRO_PLAN_TITLE,
  PRO_PLAN_DESCRIPTION,
  PRO_PLAN_PRICE,
  PRO_PLAN_CURRENCY,
  PRO_PLAN_DAYS,
  PRO_STATEMENT_DESCRIPTOR,
} from '@/lib/pricing';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'no_authed' }, { status: 401 });
  }

  const externalReference = `${user.id}:${Date.now()}`;

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: PRO_PLAN_ID,
            title: PRO_PLAN_DESCRIPTION,
            description: `${PRO_PLAN_TITLE} por ${PRO_PLAN_DAYS} días`,
            quantity: 1,
            unit_price: PRO_PLAN_PRICE,
            currency_id: PRO_PLAN_CURRENCY,
          },
        ],
        back_urls: {
          success: buildAppUrl('/pro/estado?result=success'),
          pending: buildAppUrl('/pro/estado?result=pending'),
          failure: buildAppUrl('/pro/estado?result=failure'),
        },
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: buildAppUrl('/api/webhook/mercadopago'),
        statement_descriptor: PRO_STATEMENT_DESCRIPTOR,
        binary_mode: false,
      },
    });

    const initPoint = isSandboxToken()
      ? preference.sandbox_init_point
      : preference.init_point;

    if (!initPoint) {
      console.error('[checkout] Mercado Pago no devolvió init_point', preference.id);
      return NextResponse.json(
        { error: 'mercadopago_error' },
        { status: 502 }
      );
    }

    return NextResponse.json({ initPoint, preferenceId: preference.id });
  } catch (error) {
    console.error('[checkout] Error creando preferencia:', error);
    return NextResponse.json(
      { error: 'mercadopago_error' },
      { status: 502 }
    );
  }
}