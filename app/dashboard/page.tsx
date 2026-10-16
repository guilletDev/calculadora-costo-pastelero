'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Check, X } from 'lucide-react';
import { TransitionLink } from '@/components/transition-link';
import { UpgradeButton } from '@/components/upgrade-button';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { createClient } from '@/utils/supabase/client';
import { isProUser } from '@/lib/limits';
import {
  PRO_PLAN_NAME,
  PRO_PLAN_DAYS,
  PRO_PLAN_OFFER_BADGE,
  PRO_PLAN_OFFER_DISCOUNT,
  formatProPrice,
  formatProOriginalPrice,
} from '@/lib/pricing';

const PAYMENT_POLL_ATTEMPTS = 12;
const PAYMENT_POLL_INTERVAL_MS = 2000;

function DashboardContent() {
  const router = useRouter();
  const { ready, ingredients, recipes, products, user, isPro: bootIsPro, refreshProfile } = useAppBoot();

  // override local para reflejar el plan al instante al confirmar el pago,
  // sin esperar a que el contexto vuelva a consultar.
  const [paymentVerified, setPaymentVerified] = useState(false);
  const isPro = paymentVerified || bootIsPro;

  // Cierre temporal del banner (sin persistencia: reaparece en cada recarga).
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const meta = user?.user_metadata ?? {};
  const userName = (meta.full_name || meta.name || user?.email?.split('@')[0] || '') as string;

  // Si llegamos con ?payment=success (el webhook puede tardar unos segundos),
  // mostramos un aviso y hacemos polling del perfil hasta ver el plan activo.
  // Usamos el user_id del contexto: 1 sola consulta a profiles por intento.
  useEffect(() => {
    if (!paymentSuccess || !user) return;
    let cancelled = false;
    let attempts = 0;

    toast('Verificando pago...', { id: 'payment-verify', duration: PAYMENT_POLL_ATTEMPTS * PAYMENT_POLL_INTERVAL_MS });

    const tick = async () => {
      if (cancelled || attempts >= PAYMENT_POLL_ATTEMPTS) {
        toast.dismiss('payment-verify');
        return;
      }
      attempts += 1;
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_type, pro_valid_until')
          .eq('id', user.id)
          .maybeSingle();
        if (profile && isProUser(user.email, profile.plan_type, profile.pro_valid_until)) {
          setPaymentVerified(true);
          toast.dismiss('payment-verify');
          toast.success('¡Tu plan Pro está activo!');
          void refreshProfile();
          return;
        }
      } catch {
        // reintentar en la próxima iteración
      }
      if (!cancelled) setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      toast.dismiss('payment-verify');
    };
  }, [paymentSuccess, user, refreshProfile]);

  // Onboarding: si el usuario aún no cargó al menos 2 ingredientes, lo llevamos
  // al inventario para completar la carga inicial (excepto al volver de un pago).
  useEffect(() => {
    if (ready && !paymentSuccess && ingredients.length < 2) {
      router.replace('/inventario');
    }
  }, [ready, ingredients.length, paymentSuccess, router]);

  const totalRecetas = recipes.length;
  const totalIngredientes = ingredients.length;
  const totalProductos = products.length;

  const kpis = [
    { label: 'Recetas', value: String(totalRecetas), icon: 'menu_book', iconBg: 'bg-[#ffd9de]/50 text-[#b80049]', href: '/recetas' },
    { label: 'Productos', value: String(totalProductos), icon: 'storefront', iconBg: 'bg-[#dce2f3]/50 text-[#151c27]', href: '/productos' },
    { label: 'Ingredientes', value: String(totalIngredientes), icon: 'inventory_2', iconBg: 'bg-[#ffd9de]/50 text-[#b80049]', href: '/inventario' },
  ];

  const quickActions = [
    { href: '/recetas/nueva', label: 'Nueva Receta', description: 'Calcular costos y márgenes de una receta completa', icon: 'cake', cta: '+ Crear' },
    { href: '/productos/nuevo', label: 'Nuevo Producto', description: 'Configurar producto final para la venta', icon: 'storefront', cta: '+ Crear' },
    { href: '/inventario', label: 'Inventario de Insumos', description: 'Actualizar precios de ingredientes y empaques', icon: 'inventory', cta: 'Ver' },
  ];

  if (!ready || (ready && !paymentSuccess && ingredients.length < 2)) {
    return (
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 flex flex-col items-center justify-center gap-2 text-[#5f5e5e]">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="text-[16px]">Cargando tu panel...</p>
      </main>
    );
  }

  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 flex flex-col gap-12">
      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
        <div>
          <h1
            className="text-[28px] md:text-[32px] leading-[1.2] md:tracking-[-0.01em] font-bold text-[#151c27] mb-2"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Hola, {userName || 'pastelero'}
          </h1>
          <p className="text-[#5f5e5e] text-[18px] leading-[1.6]">
            Este es el resumen de tu negocio.
          </p>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {kpis.map((kpi) => (
          <TransitionLink
            key={kpi.label}
            href={kpi.href}
            className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-stitch-label-sm text-stitch-label-sm text-stitch-secondary uppercase tracking-widest">
                {kpi.label}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.iconBg}`}>
                <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
              </div>
            </div>
            <div className="font-stitch-numeric-data text-[32px] leading-tight text-stitch-on-surface">
              {kpi.value}
            </div>
            <div className="mt-3 flex justify-end">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </TransitionLink>
        ))}
      </section>

      {/* ── Banner Mercado Pago (solo Free) ── */}
      {!isPro && !isBannerDismissed && (
        <section className="bg-[#1e2330] text-white rounded-[24px] p-8 md:p-10 border border-[#b80049]/40 shadow-floating relative overflow-hidden animate-fade-up">
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setIsBannerDismissed(true)}
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="text-[24px] md:text-[28px] font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                Desbloqueá el {PRO_PLAN_NAME}
              </h2>
              <ul className="space-y-2.5">
                {[
                  'Recetas, productos e ingredientes ilimitados',
                  'Cálculo de costos reales y márgenes de ganancia',
                  'Precios de venta sugeridos automáticos',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5 text-[14px] text-slate-200">
                    <Check className="w-4 h-4 text-[#ffb2be] shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="line-through text-gray-400 text-sm">{formatProOriginalPrice()}</span>
                <span className="rounded-full bg-[#b80049]/25 text-[#ffb2be] text-xs font-bold px-2.5 py-1">
                  {PRO_PLAN_OFFER_BADGE}
                </span>
                <span className="rounded-full bg-white/10 text-[#ebf1ff]/80 text-xs font-semibold px-2 py-1">
                  {PRO_PLAN_OFFER_DISCOUNT}
                </span>
              </div>
              <div className="text-[36px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                {formatProPrice()}
                <span className="text-base font-normal opacity-80"> / {PRO_PLAN_DAYS} días</span>
              </div>
              <UpgradeButton
                label="Pasar a Pro"
                className="inline-flex items-center justify-center gap-2 bg-[#b80049] text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:bg-[#bc004b] hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Accesos Rápidos ── */}
      <section className="space-y-6">
        <h2
          className="text-[24px] leading-[1.3] font-semibold text-[#151c27]"
          style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          Crea y Calcula
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <TransitionLink
              key={action.href}
              href={action.href}
              className="group bg-white rounded-[24px] p-8 border border-[#e4bdc2] hover:border-[#b80049] hover:shadow-xl transition-all duration-300 flex flex-col gap-4 [box-shadow:0_10px_40px_rgba(0,0,0,0.04)]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#ffd9de]/50 flex items-center justify-center text-[#b80049] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[20px] leading-[1.3] text-[#151c27] group-hover:text-[#b80049] transition-colors">
                  {action.label}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.5] text-[#5f5e5e]">
                  {action.description}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#b80049] text-white rounded-full text-[14px] leading-[1.4] tracking-[0.02em] font-semibold uppercase group-hover:bg-[#bc004b] transition-colors">
                {action.cta}
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
              </span>
            </TransitionLink>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 flex flex-col items-center justify-center gap-2 text-[#5f5e5e]">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <p className="text-[16px]">Cargando tu panel...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}