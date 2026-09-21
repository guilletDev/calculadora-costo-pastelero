'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransitionLink } from '@/components/transition-link';
import { UpgradeButton } from '@/components/upgrade-button';
import { createClient } from '@/utils/supabase/client';
import { isProUser } from '@/lib/limits';
import { PRO_PLAN_NAME, PRO_PLAN_LABEL, formatProValidUntil } from '@/lib/pricing';

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 2000;

function EstadoContent() {
  const searchParams = useSearchParams();
  const result = searchParams.get('result') ?? 'pending';
  const wasPro = searchParams.get('waspro');
  const successTitle = wasPro === '1'
    ? '¡Plan extendido exitosamente!'
    : wasPro === '0'
      ? `¡Ya sos ${PRO_PLAN_NAME}!`
      : '¡Pago exitoso!';
  const [proValidUntil, setProValidUntil] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (result !== 'success') return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      if (cancelled || attempts >= MAX_POLL_ATTEMPTS) {
        setWaiting(false);
        return;
      }
      attempts += 1;
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan_type, pro_valid_until')
            .eq('id', user.id)
            .maybeSingle();
          if (profile && isProUser(user.email, profile.plan_type, profile.pro_valid_until)) {
            setProValidUntil(profile.pro_valid_until);
            setWaiting(false);
            return;
          }
        }
      } catch {
        // reintentar en la próxima iteración
      }
      if (!cancelled) setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [result]);

  const card =
    'w-full max-w-md rounded-[24px] bg-white dark:bg-[#2a1a24] border border-[#e4bdc2]/30 p-8 md:p-10 text-center shadow-floating';

  if (result === 'success') {
    return (
      <div className={card}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <span className="material-symbols-outlined text-green-600 dark:text-green-400" style={{ fontSize: 32 }}>check_circle</span>
        </div>
        {proValidUntil ? (
          <>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">{successTitle}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Tu plan está activo hasta el <span className="font-semibold text-slate-700 dark:text-slate-200">{formatProValidUntil(proValidUntil)}</span>.
            </p>
            <TransitionLink
              href="/dashboard"
              className="inline-block w-full rounded-full bg-[#ee2b6c] text-white text-sm font-semibold py-3.5 transition-all duration-300 hover:scale-[1.02] hover:bg-[#d4235e]"
            >
              Volver al inicio
            </TransitionLink>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Procesando tu pago…</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              {waiting
                ? 'Estamos activando tu plan. Esto puede tardar unos segundos.'
                : 'Todavía no vemos la activación. Si el pago fue aprobado, actualizá en unos instantes.'}
            </p>
            {!waiting && (
              <TransitionLink
                href="/dashboard"
                className="inline-block w-full rounded-full bg-[#ee2b6c] text-white text-sm font-semibold py-3.5 transition-all duration-300 hover:scale-[1.02] hover:bg-[#d4235e]"
              >
                Volver al inicio
              </TransitionLink>
            )}
          </>
        )}
      </div>
    );
  }

  if (result === 'failure') {
    return (
      <div className={card}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400" style={{ fontSize: 32 }}>cancel</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">El pago no se completó</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Podés intentarlo de nuevo cuando quieras. El {PRO_PLAN_NAME} cuesta {PRO_PLAN_LABEL} por pago único.
        </p>
        <div className="flex flex-col gap-3">
          <UpgradeButton
            label="Reintentar pago"
            className="w-full rounded-full bg-[#ee2b6c] text-white text-sm font-semibold py-3.5 transition-all duration-300 hover:scale-[1.02] hover:bg-[#d4235e]"
          />
          <TransitionLink
            href="/dashboard"
            className="inline-block w-full rounded-full border border-[#e4bdc2] text-slate-700 dark:text-slate-300 text-sm font-semibold py-3.5 transition-all duration-300 hover:bg-[#f0f3ff] dark:hover:bg-slate-800"
          >
            Volver al inicio
          </TransitionLink>
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400" style={{ fontSize: 32 }}>schedule</span>
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Pago pendiente</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
        Estamos esperando la acreditación del pago. Cuando se confirme, tu plan se activa automáticamente.
      </p>
      <div className="flex flex-col gap-3">
        <TransitionLink
          href="/dashboard"
          className="inline-block w-full rounded-full bg-[#ee2b6c] text-white text-sm font-semibold py-3.5 transition-all duration-300 hover:scale-[1.02] hover:bg-[#d4235e]"
        >
          Volver al inicio
        </TransitionLink>
        <UpgradeButton
          label="Pagar de nuevo"
          className="w-full rounded-full border border-[#e4bdc2] text-slate-700 dark:text-slate-300 text-sm font-semibold py-3.5 transition-all duration-300 hover:bg-[#f0f3ff] dark:hover:bg-slate-800"
        />
      </div>
    </div>
  );
}

export default function ProEstadoPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
            <p className="text-sm">Cargando estado del pago…</p>
          </div>
        }
      >
        <EstadoContent />
      </Suspense>
    </main>
  );
}