import { LandingNavbar } from '@/components/landing-navbar';
import { TransitionLink } from '@/components/transition-link';
import { UpgradeButton } from '@/components/upgrade-button';
import { Reveal, Stagger } from '@/components/landing-scroll-reveal';
import { FREE_TIER_RECIPES_LIMIT, FREE_TIER_INGREDIENTS_LIMIT, FREE_TIER_PRODUCTS_LIMIT } from '@/lib/limits';
import { PRO_PLAN_NAME, PRO_PLAN_LABEL } from '@/lib/pricing';

export default function LandingPage() {
  return (
    <div
      className="antialiased overflow-x-hidden"
      style={{
        fontFamily: 'var(--font-inter), sans-serif',
        backgroundColor: '#f9f9ff',
        color: '#151c27',
      }}
    >
      <style>{`
        ::selection {
          background-color: #ffd9de;
          color: #900038;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Manrope', sans-serif;
          letter-spacing: -0.02em;
        }
      `}</style>

      <LandingNavbar />

      <main className="pt-28 pb-20">
        {/* Hero Section */}
        <section
          id="inicio"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-in-up scroll-mt-24"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="flex flex-col gap-8 z-10 lg:col-span-6">

            <h1
              className="text-4xl md:text-[56px] leading-[1.1] tracking-tight font-[800]"
              style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Calcula el costo real de{' '}
              <span className="text-[#b80049] relative inline-block whitespace-nowrap">
                cada receta
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#ffb2be]/50"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 10"
                >
                  <path d="M0,5 Q50,10 100,0" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
              .
            </h1>
            <p
              className="text-lg leading-relaxed text-[#5f5e5e] max-w-lg"
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
            >
              Deja de adivinar tus márgenes. Una herramienta premium diseñada para maestros
              pasteleros que buscan precisión, organización y rentabilidad sin complejidad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
              <TransitionLink
                href="/login"
                className="w-full sm:w-auto text-center bg-[#b80049] text-white text-sm font-semibold tracking-[0.02em] px-8 py-3.5 rounded-full btn-hover-effect transition-all duration-300 hover:scale-105"
              >
                Comenzar prueba gratis
              </TransitionLink>
<a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-full border-2 border-slate-200 hover:border-rose-300 text-slate-900 bg-white font-semibold shadow-sm hover:bg-rose-50/50 transition-all active:scale-[0.98] text-sm"
              >
                <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} />
                </svg>
                Ver Demo
              </a>
            </div>
          </div>

          <div className="relative hidden md:block lg:col-span-6">
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-white p-2 shadow-floating border border-[#e4bdc2]/20 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <img alt="App Screenshot" className="w-full h-full object-cover rounded-xl shadow-inner" src="/costo-calculadora-imagen.webp" />
            </div>
          </div>
        </section>

        {/* Ancla del video demo (placeholder para el iframe futuro) */}
        <section
          id="demo"
          aria-label="Demo"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 scroll-mt-24"
        />

        {/* Benefits Section */}
<section
          id="beneficios"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24 scroll-mt-24"
        >
          <Reveal className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-[#151c27] mb-6 tracking-tight">
              Todo lo que necesitas para ser rentable
            </h2>
            <p className="text-base text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              Una interfaz minimalista enfocada en los datos que realmente importan para tu negocio artesanal.
            </p>
          </Reveal>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" itemClassName="h-full min-w-0">
            {/* Benefit 1 */}
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#ffd9de]/50 mb-6 flex items-center justify-center text-[#b80049] group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined">calculate</span>
              </div>
              <h3 className="text-xl text-[#151c27] font-bold mb-3">Calculadora de Costos</h3>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Desglosa gramo a gramo cada ingrediente y conoce el costo exacto de producción al instante.
              </p>
            </div>
            {/* Benefit 2 */}
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#dce2f3]/50 mb-6 flex items-center justify-center text-[#151c27] group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="text-xl text-[#151c27] font-bold mb-3">Precio Sugerido</h3>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Obtén recomendaciones de precios de venta basados en tus objetivos de margen y costos fijos.
              </p>
            </div>
            {/* Benefit 3 */}
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#ffd9de]/50 mb-6 flex items-center justify-center text-[#b80049] group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <h3 className="text-xl text-[#151c27] font-bold mb-3">Gestión de Ingredientes</h3>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Actualiza el precio de un ingrediente y todas las recetas que lo utilizan se recalcularán solas.
              </p>
            </div>
            {/* Benefit 4 */}
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#dce2f3]/50 mb-6 flex items-center justify-center text-[#151c27] group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <h3 className="text-xl text-[#151c27] font-bold mb-3">Márgenes de Utilidad</h3>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Visualiza métricas claras sobre tus productos más rentables para enfocar tus ventas.
              </p>
            </div>
          </Stagger>
        </section>

        {/* Cómo Funciona Section - Adapted from previous landing to Stitch design */}
<section
          id="como-funciona"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24 scroll-mt-24"
        >
          <Reveal className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-[#151c27] mb-6 tracking-tight">
              Más simple que hacer un bizcochuelo
            </h2>
            <p className="text-base text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              En tres simples pasos, tendrás el control total de tus precios.
            </p>
          </Reveal>
          <div className="relative">
            {/* Connecting dotted line (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 z-0 border-t-2 border-dashed border-[#e4bdc2]/40"></div>
            <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch relative z-10" itemClassName="h-full min-w-0">
              {/* Step 1 */}
              <div className="bg-white rounded-2xl p-8 border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 text-center relative group h-full flex flex-col justify-between">
                <div className="w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center border-4 border-[#f9f9ff] shadow-sm absolute -top-7 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-bold text-xl text-[#b80049]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>1</span>
                </div>
                <div className="w-14 h-14 mx-auto bg-[#ffd9de]/30 rounded-2xl flex items-center justify-center mt-6 mb-5">
                  <span className="material-symbols-outlined text-[#b80049] text-3xl">grocery</span>
                </div>
                <h3 className="text-xl text-[#151c27] font-bold mb-3">Cargá ingredientes</h3>
                <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Ingresá tus insumos base, la cantidad y el precio que pagaste. Listo, tu inventario está vivo.
                </p>
              </div>
              {/* Step 2 */}
              <div className="bg-white rounded-2xl p-8 border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 text-center relative group h-full flex flex-col justify-between">
                <div className="w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center border-4 border-[#f9f9ff] shadow-sm absolute -top-7 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-bold text-xl text-[#b80049]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>2</span>
                </div>
                <div className="w-14 h-14 mx-auto bg-[#ffd9de]/30 rounded-2xl flex items-center justify-center mt-6 mb-5">
                  <span className="material-symbols-outlined text-[#b80049] text-3xl">blender</span>
                </div>
                <h3 className="text-xl text-[#151c27] font-bold mb-3">Armá recetas</h3>
                <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Seleccioná los ingredientes y qué cantidad usás para cada preparación. Nosotros costeamos la porción.
                </p>
              </div>
              {/* Step 3 */}
              <div className="bg-white rounded-2xl p-8 border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover hover:-translate-y-1 transition-all duration-300 text-center relative group h-full flex flex-col justify-between">
                <div className="w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center border-4 border-[#f9f9ff] shadow-sm absolute -top-7 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-bold text-xl text-[#b80049]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>3</span>
                </div>
                <div className="w-14 h-14 mx-auto bg-[#ffd9de]/30 rounded-2xl flex items-center justify-center mt-6 mb-5">
                  <span className="material-symbols-outlined text-[#b80049] text-3xl">payments</span>
                </div>
                <h3 className="text-xl text-[#151c27] font-bold mb-3">Obtené tu precio</h3>
                <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Sumá packaging, horas de trabajo y tu ganancia. Descubrí el precio exacto al que tenés que vender.
                </p>
              </div>
            </Stagger>
          </div>
        </section>

        {/* Pricing Section */}
<section
          id="precios"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24 rounded-3xl border border-[#e4bdc2]/10 scroll-mt-24"
        >
          <Reveal className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-[#151c27] mb-6 tracking-tight">
              Planes simples, como tus recetas
            </h2>
            <p className="text-base text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              Comienza gratis y mejora cuando tu negocio lo necesite.
            </p>
          </Reveal>
          <Reveal className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Plan Gratis */}
            <div className="bg-white p-8 md:p-12 rounded-3xl border-2 border-slate-200 shadow-md flex flex-col h-full justify-between">
              <div className="mb-8">
                <span
                  className="text-xs text-[#5f5e5e] font-semibold uppercase tracking-widest block mb-4"
                  style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  Para Arrancar
                </span>
                <h3 className="text-4xl text-[#151c27] mb-3 tracking-tight font-[800]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  Gratis
                </h3>
                <p className="text-sm text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Sin mensualidad - ideal para probar
                </p>
              </div>
              <div className="text-5xl text-[#151c27] mb-10 tracking-tight font-[800]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                $0 <span className="text-base text-[#5f5e5e] font-normal" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>/mes</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#b80049] text-[20px]">check</span>
                  <span className="text-sm text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Hasta {FREE_TIER_RECIPES_LIMIT} recetas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#b80049] text-[20px]">check</span>
                  <span className="text-sm text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Hasta {FREE_TIER_INGREDIENTS_LIMIT} ingredientes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#b80049] text-[20px]">check</span>
                  <span className="text-sm text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Hasta {FREE_TIER_PRODUCTS_LIMIT} producto</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#b80049] text-[20px]">check</span>
                  <span className="text-sm text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Cálculo completo de costos y márgenes de ganancia</span>
                </li>
              </ul>
              <TransitionLink
                href="/login"
                className="w-full py-3.5 px-6 rounded-full border-2 border-slate-300 font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all text-center block"
              >
                Empezar gratis
              </TransitionLink>
            </div>

            {/* Plan Pro */}
            <div className="bg-[#2a313d] text-[#ebf1ff] p-8 md:p-12 rounded-3xl border border-[#b80049] relative shadow-floating flex flex-col h-full justify-between">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#b80049] text-white text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 font-bold shadow-sm">
                <span className="material-symbols-outlined text-[14px]">star</span> Más elegido
              </div>
              <div className="mb-8 mt-2">
                <h3 className="text-4xl text-[#ebf1ff] mb-3 tracking-tight font-[800]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  {PRO_PLAN_NAME}
                </h3>
                <p className="text-sm opacity-80" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                  Pago único · 30 días de acceso
                </p>
              </div>
              <div className="text-5xl text-[#ebf1ff] mb-10 tracking-tight font-[800]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                {PRO_PLAN_LABEL.split(' / ')[0]} <span className="text-base opacity-80 font-normal" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>/ 30 días</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ffb2be] text-[20px]">check</span>
                  <span className="text-sm opacity-90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Recetas ilimitadas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ffb2be] text-[20px]">check</span>
                  <span className="text-sm opacity-90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Ingredientes ilimitados</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ffb2be] text-[20px]">check</span>
                  <span className="text-sm opacity-90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Productos ilimitados</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ffb2be] text-[20px]">check</span>
                  <span className="text-sm opacity-90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Cálculo completo de costos y márgenes de ganancia</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ffb2be] text-[20px]">check</span>
                  <span className="text-sm opacity-90" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Soporte prioritario</span>
                </li>
              </ul>
              <UpgradeButton
                label={`Activar ${PRO_PLAN_NAME} por ${PRO_PLAN_LABEL}`}
                className="w-full text-center bg-[#b80049] text-white text-sm py-4 rounded-full btn-hover-effect font-semibold shadow-sm hover:bg-[#bc004b] transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </Reveal>
        </section>

        {/* FAQ Section */}
<section
          id="preguntas"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24 scroll-mt-24"
        >
          <Reveal className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-[#151c27] mb-6 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-base text-[#5f5e5e]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              Todo lo que necesitas saber para empezar a rentabilizar tu pastelería.
            </p>
          </Reveal>
          <Reveal className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Es CostoRepostero gratuito?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Sí, ofrecemos un plan gratuito para siempre que te permite gestionar hasta {FREE_TIER_RECIPES_LIMIT} recetas y {FREE_TIER_INGREDIENTS_LIMIT} ingredientes.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Puedo usarlo desde mi celular?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                ¡Claro! Nuestra plataforma es totalmente responsiva y funciona perfectamente en smartphones y tablets.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Cómo calculo el costo de una receta?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Solo ingresas tus ingredientes y sus precios; nuestra calculadora desglosa el costo por gramo automáticamente.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Puedo incluir costos de packaging y mano de obra?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Sí, puedes agregar costos fijos y variables para obtener un precio de venta realmente rentable.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Puedo organizar múltiples recetas?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Absolutamente. Puedes categorizar y buscar tus recetas para mantener tu producción organizada.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Mis datos están seguros?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Tus datos están encriptados y protegidos con los más altos estándares de seguridad en la nube.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Necesito conocimientos de contabilidad?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                No. Diseñamos la interfaz para que sea intuitiva y fácil de usar para cualquier maestro pastelero.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e4bdc2]/20 shadow-card hover:shadow-ambient-hover transition-all duration-300">
              <h4 className="text-[18px] text-[#151c27] mb-3 font-bold tracking-tight">
                ¿Puedo actualizar los precios en cualquier momento?
              </h4>
              <p className="text-sm text-[#5f5e5e] leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                Sí, y lo mejor es que al actualizar un ingrediente, todas las recetas que lo usan se recalculan solas.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Final CTA Section */}
<section
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-24"
        >
          <Reveal className="bg-[#2a313d] rounded-[2rem] py-24 px-6 md:px-12 text-center relative overflow-hidden shadow-floating">
            <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
              <h2
                className="text-4xl md:text-5xl text-[#ebf1ff] mb-8 leading-tight tracking-tight font-[800]"
                style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
              >
                Comenzá a cobrar lo que tus recetas realmente valen.
              </h2>
              <p
                className="text-base md:text-lg text-[#ebf1ff] opacity-80 mb-12 max-w-2xl leading-relaxed"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Calculá tus costos, definí precios rentables y tomá mejores decisiones de negocio con confianza.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mt-2">
                <TransitionLink
                  href="/login"
                  className="bg-[#b80049] text-white text-sm px-10 py-4 rounded-full btn-hover-effect font-semibold shadow-sm w-full sm:w-auto text-center transition-all duration-300 hover:scale-105"
                >
                  Comenzar Gratis
                </TransitionLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 md:py-24 border-t border-[#e4bdc2]/20" style={{ backgroundColor: '#ffffff' }}>
        <Reveal className="grid grid-cols-1 md:grid-cols-12 gap-12 max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="md:col-span-5 flex flex-col items-start gap-6">
            <a href="#inicio" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                costo repostero
              </span>
            </a>
            <p className="text-sm text-[#5f5e5e] max-w-sm leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              La herramienta premium diseñada para maestros pasteleros que buscan precisión, organización y
              rentabilidad sin complejidad.
            </p>
          </div>
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="text-base text-[#151c27] mb-2 font-bold">Producto</h4>
              <a
                className="text-sm text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                href="#beneficios"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Funcionalidades
              </a>
              <a
                className="text-sm text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                href="#precios"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Precios
              </a>
              <a
                className="text-sm text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                href="#preguntas"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Preguntas Frecuentes
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-base text-[#151c27] mb-2 font-bold">Legal</h4>
              <a
                className="text-sm text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                href="/privacidad"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Privacidad
              </a>
              <a
                className="text-sm text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                href="/terminos-y-condiciones"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Términos y Condiciones
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-base text-[#151c27] mb-2 font-bold">Contacto</h4>
              <a
                className="inline-flex items-center gap-2 bg-[#e7eefe]/50 px-4 py-2.5 rounded-lg text-xs text-[#151c27] hover:bg-[#e7eefe] transition-colors w-max font-medium"
                href="#"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                <span className="material-symbols-outlined text-[16px]">mail</span> Email
              </a>
              <a
                className="inline-flex items-center gap-2 bg-[#e7eefe]/50 px-4 py-2.5 rounded-lg text-xs text-[#151c27] hover:bg-[#e7eefe] transition-colors w-max font-medium"
                href="#"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span> Instagram
              </a>
            </div>
          </div>
          </Reveal>
        
        {/* Copyright */}
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#e4bdc2]/20 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left px-6 md:px-12 lg:px-16">
          <p className="text-xs text-[#5f5e5e] opacity-70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            © 2026 CostoRepostero. Todos los derechos reservados.
          </p>
          <p className="text-xs text-[#5f5e5e] opacity-70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            Desarrollado por{' '}
            <a
              href="https://www.xora.com.ar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#b80049] hover:underline font-medium"
            >
              XORA WEB
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
