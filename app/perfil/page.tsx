import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isProUser } from '@/lib/limits';
import { PRO_PLAN_NAME, PRO_PLAN_DESCRIPTION, formatProValidUntil } from '@/lib/pricing';
import { formatCurrency } from '@/lib/cost';
import { UpgradeButton } from '@/components/upgrade-button';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

const FREE_BENEFITS = [
  { icon: 'calculate', text: 'Calculadora de costos completa para tus recetas' },
  { icon: 'inventory_2', text: 'Inventario de ingredientes sin límites' },
  { icon: 'menu_book', text: 'Recetas ilimitadas' },
  { icon: 'storefront', text: 'Productos ilimitados con márgenes de ganancia' },
];

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type, pro_valid_until')
    .eq('id', user.id)
    .maybeSingle();

  // payment_events no expone policies de RLS (solo el backend escribe/lee):
  // se consulta con el cliente service_role filtrando por el user_id de la
  // sesión, exclusivamente desde este Server Component.
  const admin = createAdminClient();
  const { data: payments, error: paymentsError } = await admin
    .from('payment_events')
    .select('id, payment_id, amount, currency, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('[perfil] Error consultando payment_events:', paymentsError);
  }

  const isPro = isProUser(user.email, profile?.plan_type, profile?.pro_valid_until);
  const validUntil = profile?.pro_valid_until ?? null;
  const daysLeft = validUntil
    ? Math.max(0, Math.ceil((new Date(validUntil).getTime() - Date.now()) / DAY_MS))
    : null;

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

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-10 space-y-8">
      {/* ── Header de Perfil ─────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white dark:bg-[#2a1a24] rounded-[24px] p-8 border border-[#e4bdc2]/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
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
      <section className="bg-white dark:bg-[#2a1a24] rounded-[24px] p-8 border border-[#e4bdc2]/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        {isPro ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#ee2b6c]" style={{ fontSize: 22 }}>
                  workspace_premium
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Suscripción Activa
                </h2>
              </div>
              {validUntil && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
              label="Volverse PRO"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#ee2b6c] text-white text-sm font-semibold px-8 py-3 transition-all duration-300 hover:bg-[#d4235e]"
            />
          </div>
        )}
      </section>

      {/* ── Historial de Pagos ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#2a1a24] rounded-[24px] p-8 border border-[#e4bdc2]/30 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          Historial de Pagos
        </h2>
        {!payments || payments.length === 0 ? (
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
    </main>
  );
}