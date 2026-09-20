'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { TransitionLink } from '@/components/transition-link';
import { UpgradeButton } from '@/components/upgrade-button';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { createClient } from '@/utils/supabase/client';
import { isProUser } from '@/lib/limits';
import { PRO_PLAN_NAME, PRO_PLAN_LABEL } from '@/lib/pricing';

const PAYMENT_POLL_ATTEMPTS = 12;
const PAYMENT_POLL_INTERVAL_MS = 2000;

function DashboardContent() {
  const { ready, ingredients, recipes, products } = useAppBoot();

  const [isPro, setIsPro] = useState(false);
  const [userName, setUserName] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(true);

  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) setLoadingPlan(false); };
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (!user) {
        finish();
        return;
      }

      const meta = user.user_metadata ?? {};
      setUserName(
        (meta.full_name || meta.name || user.email?.split('@')[0] || 'Usuario') as string
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, pro_valid_until')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsPro(isProUser(user.email, profile?.plan_type ?? null, profile?.pro_valid_until ?? null));
      finish();
    });
    return () => { cancelled = true; };
  }, []);

  // Si llegamos con ?payment=success (el webhook puede tardar unos segundos),
  // mostramos un aviso y hacemos polling del perfil hasta ver el plan activo.
  useEffect(() => {
    if (!paymentSuccess) return;
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
            setIsPro(true);
            setLoadingPlan(false);
            toast.dismiss('payment-verify');
            toast.success('¡Tu plan Pro está activo!');
            return;
          }
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
  }, [paymentSuccess]);

  const subproducts = recipes.filter(r =>
    r.outputQuantity != null && r.outputQuantity > 0 &&
    r.outputUnit != null && r.unitsProduced <= 0
  );
  const totalRecetas = recipes.length - subproducts.length;
  const totalIngredientes = ingredients.length;
  const totalSubproductos = subproducts.length;
  const totalProductos = products.length;

  const kpis = [
    { label: 'Recetas', value: String(totalRecetas), icon: 'menu_book', iconBg: 'bg-[#ffd9de]/50 text-[#b80049]' },
    { label: 'Subproductos', value: String(totalSubproductos), icon: 'layers', iconBg: 'bg-[#dce2f3]/50 text-[#151c27]' },
    { label: 'Productos', value: String(totalProductos), icon: 'storefront', iconBg: 'bg-[#ffd9de]/50 text-[#b80049]' },
    { label: 'Ingredientes', value: String(totalIngredientes), icon: 'inventory_2', iconBg: 'bg-[#dce2f3]/50 text-[#151c27]' },
  ];

  const quickActions = [
    { href: '/recetas/nueva', label: 'Nueva Receta', description: 'Calcular costos y márgenes de una receta completa', icon: 'cake', cta: '+ Crear' },
    { href: '/subproductos/nuevo', label: 'Nuevo Subproducto', description: 'Armar preparaciones base (masas, rellenos, cremas)', icon: 'blender', cta: '+ Crear' },
    { href: '/productos/nuevo', label: 'Nuevo Producto', description: 'Configurar producto final para la venta', icon: 'storefront', cta: '+ Crear' },
    { href: '/inventario', label: 'Inventario de Insumos', description: 'Actualizar precios de ingredientes y empaques', icon: 'inventory', cta: 'Ver' },
  ];

  if (!ready || loadingPlan) {
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
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Hola, {userName || 'pastelero'}
          </h1>
          <p className="text-[#5f5e5e] text-[18px] leading-[1.6]">
            Este es el resumen de tu negocio.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide w-max ${
            isPro
              ? 'bg-[#ee2b6c]/10 text-[#ee2b6c]'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {isPro ? 'workspace_premium' : 'person'}
          </span>
          {isPro ? 'Pro' : 'Free'}
        </span>
      </section>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-stitch-surface-container-lowest rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-stitch-outline-variant flex flex-col justify-between"
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
          </div>
        ))}
      </section>

      {/* ── Banner Mercado Pago (solo Free) ── */}
      {!loadingPlan && !isPro && (
        <section className="bg-[#2a313d] text-[#ebf1ff] rounded-[32px] p-8 md:p-12 border border-[#b80049] relative shadow-floating overflow-hidden animate-fade-up">
          <div className="absolute -top-4 left-8 bg-[#b80049] text-white text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 font-bold shadow-sm">
            <span className="material-symbols-outlined text-[14px]">star</span> Más elegido
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mt-4">
            <div className="max-w-xl">
              <h2 className="text-[28px] font-bold tracking-tight mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Desbloqueá el {PRO_PLAN_NAME}
              </h2>
              <p className="text-[15px] leading-[1.6] opacity-80 mb-4">
                Recetas e ingredientes ilimitados, cálculo de márgenes y sugerencia de precios para llevar tu
                pastelería al siguiente nivel.
              </p>
              <ul className="space-y-2 text-[14px]">
                {[
                  'Recetas e ingredientes ilimitados',
                  'Cálculo de márgenes y sugerencia de precios',
                  'Exportación a PDF/Excel',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#ffb2be] text-[18px]">check</span>
                    <span className="opacity-90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
              <div className="text-[40px] font-extrabold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {PRO_PLAN_LABEL.split(' / ')[0]}
                <span className="text-base font-normal opacity-80"> / {PRO_PLAN_LABEL.split(' / ')[1]}</span>
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
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Crea y Calcula
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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