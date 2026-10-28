'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { createClient } from '@/utils/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PRO_PLAN_NAME, PRO_PLAN_DESCRIPTION, formatProValidUntil, formatProPrice } from '@/lib/pricing';
import { FREE_TIER_INGREDIENTS_LIMIT, FREE_TIER_RECIPES_LIMIT, FREE_TIER_PRODUCTS_LIMIT } from '@/lib/limits';
import { formatCurrency } from '@/lib/cost';
import { UpgradeButton } from '@/components/upgrade-button';
import { ThemeToggle } from '@/components/theme-toggle';

interface PaymentRow {
  id: string;
  payment_id: number | string;
  amount: number | string;
  currency: string;
  created_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const FREE_BENEFITS = [
  { icon: 'calculate', text: 'Calculadora de costos para tus recetas' },
  { icon: 'inventory_2', text: `Hasta ${FREE_TIER_INGREDIENTS_LIMIT} ingredientes, ${FREE_TIER_RECIPES_LIMIT} recetas y ${FREE_TIER_PRODUCTS_LIMIT} producto${FREE_TIER_PRODUCTS_LIMIT === 1 ? '' : 's'}` },
  { icon: 'storefront', text: 'Gestión de productos básica' },
];

const PRO_BENEFITS = [
  { icon: 'all_inclusive', text: 'Recetas, productos e ingredientes ilimitados' },
  { icon: 'calculate', text: 'Cálculo de costos reales y márgenes de ganancia' },
  { icon: 'sell', text: 'Precios de venta sugeridos automáticos' },
];

export default function PerfilPage() {
  const router = useRouter();
  // Usuario + plan ya vienen del contexto de boot: la vista renderiza al
  // instante, sin consultas bloqueantes al entrar.
  const { ready, user, isPro, profile } = useAppBoot();
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const deleteConfirmInputRef = useRef<HTMLInputElement>(null);
  const canDeleteAccount = deleteConfirmText === 'ELIMINAR';

  // Seguridad extra (el middleware ya protege la ruta): sin sesión → login.
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  // Historial de pagos en segundo plano: la página no espera esta llamada.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/perfil/payments')
      .then((res) => (res.ok ? res.json() : { payments: [] }))
      .then((data) => {
        if (!cancelled) setPayments(Array.isArray(data.payments) ? data.payments : []);
      })
      .catch(() => {
        if (!cancelled) setPayments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Baja definitiva de cuenta: elimina el usuario en el server (service_role)
  // y limpia la sesión local antes de volver al login.
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR' || isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/user/delete', { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'No se pudo eliminar la cuenta');
      }
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Aunque falle el signOut, el usuario ya no existe en el server.
      }
      toast.success('Tu cuenta ha sido eliminada correctamente');
      router.push('/login?deleted=true');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta');
      setIsDeletingAccount(false);
    }
  };

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="text-[16px]">Cargando tu perfil...</p>
      </main>
    );
  }

  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const name = (meta.full_name || meta.name || user.email?.split('@')[0] || 'Usuario') as string;
  const email = user.email ?? '';
  const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const validUntil = profile.proValidUntil;
  const daysLeft = validUntil
    ? Math.max(0, Math.ceil((new Date(validUntil).getTime() - Date.now()) / DAY_MS))
    : null;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 space-y-8">
      {/* ── Header de Perfil ─────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-5 bg-stitch-surface-container-lowest dark:bg-[#2a1a24] rounded-[24px] p-8 border border-stitch-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="h-20 w-20 rounded-full object-cover ring-2 ring-[#ee2b6c]/20 shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-[#ee2b6c] flex items-center justify-center text-white text-2xl font-bold ring-2 ring-[#ee2b6c]/20 shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">
            {name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{email}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
            isPro
              ? 'bg-[#ee2b6c]/10 text-[#ee2b6c]'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {isPro ? 'workspace_premium' : 'person'}
          </span>
          {isPro ? 'PRO' : 'FREE'}
        </span>
      </section>

      {/* ── Tarjeta de Suscripción ───────────────────────────────────────── */}
      <section className="bg-stitch-surface-container-lowest dark:bg-[#2a1a24] rounded-[24px] p-8 border border-stitch-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        {isPro ? (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#ee2b6c]" style={{ fontSize: 22 }}>
                  workspace_premium
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Plan PRO
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">
                  Activo
                </span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {PRO_BENEFITS.map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[#ee2b6c]" style={{ fontSize: 16 }}>
                      {icon}
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              {validUntil && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tu plan {PRO_PLAN_NAME} vence el{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatProValidUntil(validUntil)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {daysLeft !== null && daysLeft > 0
                      ? `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
                      : 'Tu plan vence hoy'}
                  </p>
                </>
              )}
            </div>
            <UpgradeButton
              label="Extender Plan"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#ee2b6c] text-white text-sm font-semibold px-8 py-3 transition-all duration-300 hover:bg-[#d4235e]"
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Plan Gratuito
              </h2>
              <ul className="space-y-1.5">
                {FREE_BENEFITS.map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[#ee2b6c]" style={{ fontSize: 16 }}>
                      {icon}
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <UpgradeButton
              label={`Mejorar a PRO · ${formatProPrice()}`}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#ee2b6c] text-white text-sm font-semibold px-8 py-3 transition-all duration-300 hover:bg-[#d4235e]"
            />
          </div>
        )}
      </section>

      {/* ── Apariencia ───────────────────────────────────────────────────── */}
      <section className="bg-stitch-surface-container-lowest dark:bg-[#2a1a24] rounded-[24px] p-8 border border-stitch-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Apariencia</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Elegí entre modo claro y oscuro para la app.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* ── Historial de Pagos ───────────────────────────────────────────── */}
      <section className="bg-stitch-surface-container-lowest dark:bg-[#2a1a24] rounded-[24px] p-8 border border-stitch-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          Historial de Pagos
        </h2>
        {payments === null ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 22 }}>
              progress_activity
            </span>
            <span className="text-sm">Cargando historial...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600" style={{ fontSize: 40 }}>
              receipt_long
            </span>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay transacciones registradas.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Cuando realices tu primer pago, vas a verlo acá.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[12px] uppercase tracking-[0.05em] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Concepto</th>
                  <th className="pb-3 pr-4 text-right">Monto</th>
                  <th className="pb-3 text-right">ID de pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 pr-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(payment.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-600 dark:text-slate-300">
                      {PRO_PLAN_DESCRIPTION}
                    </td>
                    <td className="py-3 pr-4 text-sm font-semibold text-slate-900 dark:text-white text-right whitespace-nowrap">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="py-3 text-sm text-slate-400 dark:text-slate-500 text-right font-mono whitespace-nowrap">
                      {payment.payment_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Zona de Peligro ──────────────────────────────────────────────── */}
      <section className="bg-stitch-surface-container-lowest dark:bg-[#2a1a24] rounded-[24px] p-8 border border-red-200/60 dark:border-red-900/40 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Zona de Peligro
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Eliminar tu cuenta es permanente: se borran tus recetas, productos,
          pedidos, ingredientes e historial de pagos. Esta acción no se puede deshacer.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText('');
            setDeleteOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[#ba1a1a] text-stitch-error font-semibold text-sm px-6 py-2.5 hover:bg-stitch-error-container/40 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_forever</span>
          Eliminar mi cuenta
        </button>
      </section>

      {/* ── Confirmación de baja definitiva (tipeo obligatorio) ──────────── */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (isDeletingAccount) return;
          setDeleteOpen(open);
          if (!open) setDeleteConfirmText('');
        }}
      >
        <AlertDialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            deleteConfirmInputRef.current?.focus();
          }}
          className="max-w-md rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant"
        >
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stitch-error-container">
              <span className="material-symbols-outlined text-stitch-error" style={{ fontSize: 24 }}>delete_forever</span>
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-stitch-on-surface">
              Eliminar mi cuenta definitivamente
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 rounded-xl border border-stitch-error/30 bg-stitch-error-container/30 p-3 text-center text-sm leading-relaxed text-stitch-error">
              Esta acción es irreversible y eliminará permanentemente tus recetas, productos,
              pedidos, ingredientes y configuraciones asociadas. No podrás recuperarlos.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="delete-account-confirmation"
              className="block text-xs font-semibold text-stitch-secondary"
            >
              Escribí <span className="font-bold text-stitch-error">ELIMINAR</span> para confirmar
            </label>
            <input
              id="delete-account-confirmation"
              ref={deleteConfirmInputRef}
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ELIMINAR"
              disabled={isDeletingAccount}
              className="w-full rounded-xl border border-stitch-outline-variant bg-stitch-surface px-4 py-2.5 text-sm text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:border-stitch-error focus:ring-2 focus:ring-stitch-error/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <AlertDialogFooter className="mt-4 sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isDeletingAccount}
              className="flex-1 rounded-full border border-gray-300 bg-stitch-surface-container-lowest text-gray-700 dark:border-stitch-outline-variant dark:bg-white/10 dark:text-stitch-on-surface font-medium text-sm py-2.5 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-white/15 dark:hover:border-stitch-outline-variant focus:outline-none focus-visible:ring-0 shadow-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={!canDeleteAccount || isDeletingAccount}
              className="flex-1 rounded-full bg-[#ba1a1a] text-white font-medium text-sm py-2.5 hover:bg-[#a31313] focus:outline-none focus-visible:ring-0 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeletingAccount ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                  Eliminando cuenta...
                </span>
              ) : (
                'Eliminar mi cuenta definitivamente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
