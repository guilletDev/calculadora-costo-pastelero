import { LandingNavbar } from '@/components/landing-navbar';
import { TransitionLink } from '@/components/transition-link';

export default function LandingPage() {
  return (
    <div className="bg-surface text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container font-body page-enter">
      <LandingNavbar />
      
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-primary-container/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-secondary-container/20 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-on-surface">
              Calculá el costo <span className="gradient-text">real</span> de tus recetas en minutos
            </h1>
            <p className="font-body text-lg md:text-xl text-on-surface-variant mb-10 leading-relaxed">
              Optimizá tus márgenes de ganancia con cálculos precisos para tu emprendimiento pastelero. Olvidate
              de los excel complicados y tomá el control de tus números.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <TransitionLink href="/login" className="gradient-bg text-on-primary font-headline text-base font-semibold py-4 px-8 rounded-xl hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 ambient-shadow flex items-center justify-center gap-2 group">
                Empezar gratis
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
              </TransitionLink>
              <button className="bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-headline text-base font-semibold py-4 px-8 rounded-xl hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300">play_circle</span>
                Ver cómo funciona
              </button>
            </div>
            <div className="mt-12 flex items-center gap-4 text-sm font-body text-on-surface-variant">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-xs font-bold">👩‍🍳</div>
                <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-xs font-bold">👨‍🍳</div>
                <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-xs font-bold">🎂</div>
              </div>
              <p>Únete a +1000 pasteleros rentables</p>
            </div>
          </div>
          <div className="relative">
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-surface-container-low p-2 ambient-shadow border border-outline-variant/10 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <img alt="App Screenshot" className="w-full h-full object-cover rounded-xl shadow-inner" src="/costo-calculadora-imagen.webp" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-4">¿Te cuesta saber si realmente estás ganando dinero?</h2>
            <p className="font-body text-lg text-on-surface-variant">El mayor enemigo del pastelero no es el horno, son los números invisibles.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 transition-transform hover:-translate-y-2 duration-300">
              <div className="w-14 h-14 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-error text-3xl">calculate</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Cálculos &quot;a ojo&quot;</h3>
              <p className="font-body text-on-surface-variant">Multiplicar por 3 ya no funciona. La inflación y los costos variables destruyen tu rentabilidad sin que te des cuenta.</p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 transition-transform hover:-translate-y-2 duration-300 delay-100">
              <div className="w-14 h-14 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-error text-3xl">receipt_long</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Costos Olvidados</h3>
              <p className="font-body text-on-surface-variant">Packaging, luz, gas, transporte y tu propio tiempo. Si no los cobras, los estás pagando de tu bolsillo.</p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 transition-transform hover:-translate-y-2 duration-300 delay-200">
              <div className="w-14 h-14 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-error text-3xl">trending_down</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Trabajar para cambiar la plata</h3>
              <p className="font-body text-on-surface-variant">Vendes mucho pero a fin de mes no ves la ganancia. Tu esfuerzo merece una recompensa real.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className="py-24 bg-surface relative overflow-hidden">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative w-full aspect-square rounded-3xl bg-surface-container-low p-4 ambient-shadow border border-outline-variant/10">
                <img alt="App Dashboard" className="w-full h-full object-cover rounded-2xl shadow-sm" src="/calculadora-costos-imagen.webp" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-6">CostoRepostero hace los cálculos por vos</h2>
              <p className="font-body text-lg text-on-surface-variant mb-10">Una plataforma diseñada específicamente para las necesidades del mundo dulce. Precisión de ingeniero, simpleza de pastelero.</p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-container/20 rounded-xl flex items-center justify-center mt-1">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-bold text-on-surface">Control de Ingredientes</h4>
                    <p className="font-body text-on-surface-variant mt-1">Mantené tu alacena digital actualizada. Cambiás un precio y se actualizan todas las recetas mágicamente.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-container/20 rounded-xl flex items-center justify-center mt-1">
                    <span className="material-symbols-outlined text-primary">function</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-bold text-on-surface">Cálculo Automático</h4>
                    <p className="font-body text-on-surface-variant mt-1">Armá la receta sumando ingredientes. Nosotros hacemos la regla de tres simple, vos solo cociná.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-container/20 rounded-xl flex items-center justify-center mt-1">
                    <span className="material-symbols-outlined text-primary">percent</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-bold text-on-surface">Márgenes y Extras</h4>
                    <p className="font-body text-on-surface-variant mt-1">Añadí costos de packaging, horas de trabajo y tu porcentaje de ganancia deseado con un clic.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-container/20 rounded-xl flex items-center justify-center mt-1">
                    <span className="material-symbols-outlined text-primary">sell</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-bold text-on-surface">Precio Sugerido</h4>
                    <p className="font-body text-on-surface-variant mt-1">Obtené un precio de venta final realista, justo y que te garantice la rentabilidad que buscas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS TIMELINE */}
      <section className="py-24 bg-surface-container-lowest scroll-mt-20" id="como-funciona">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-4">Más simple que hacer un bizcochuelo</h2>
            <p className="font-body text-lg text-on-surface-variant">En tres simples pasos, tendrás el control total de tus precios.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-surface-container border-t border-dashed border-outline-variant/30 -translate-y-1/2 z-0"></div>
            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              {/* Step 1 */}
              <div className="bg-surface rounded-2xl p-8 ambient-shadow border border-outline-variant/10 text-center relative group">
                <div className="w-16 h-16 mx-auto bg-surface-container-lowest rounded-full flex items-center justify-center border-4 border-surface shadow-sm absolute -top-8 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-headline font-bold text-xl text-primary">1</span>
                </div>
                <div className="w-16 h-16 mx-auto bg-primary-container/10 rounded-2xl flex items-center justify-center mt-6 mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">grocery</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Cargá ingredientes</h3>
                <p className="font-body text-sm text-on-surface-variant">Ingresá tus insumos base, la cantidad y el precio que pagaste. Listo, tu inventario está vivo.</p>
              </div>
              {/* Step 2 */}
              <div className="bg-surface rounded-2xl p-8 ambient-shadow border border-outline-variant/10 text-center relative group">
                <div className="w-16 h-16 mx-auto bg-surface-container-lowest rounded-full flex items-center justify-center border-4 border-surface shadow-sm absolute -top-8 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-headline font-bold text-xl text-primary">2</span>
                </div>
                <div className="w-16 h-16 mx-auto bg-primary-container/10 rounded-2xl flex items-center justify-center mt-6 mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">blender</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Armá recetas</h3>
                <p className="font-body text-sm text-on-surface-variant">Seleccioná los ingredientes y qué cantidad usás para cada preparación. Nosotros costeamos la porción.</p>
              </div>
              {/* Step 3 */}
              <div className="bg-surface rounded-2xl p-8 ambient-shadow border border-outline-variant/10 text-center relative group">
                <div className="w-16 h-16 mx-auto bg-surface-container-lowest rounded-full flex items-center justify-center border-4 border-surface shadow-sm absolute -top-8 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform">
                  <span className="font-headline font-bold text-xl text-primary">3</span>
                </div>
                <div className="w-16 h-16 mx-auto bg-primary-container/10 rounded-2xl flex items-center justify-center mt-6 mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Obtené tu precio</h3>
                <p className="font-body text-sm text-on-surface-variant">Sumá packaging, horas de trabajo y tu ganancia. Descubrí el precio exacto al que tenés que vender.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS GRID */}
      <section className="py-24 bg-surface relative scroll-mt-20" id="beneficios">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-4">Todo lo que necesitás, en un solo lugar</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300 row-span-2 flex flex-col">
              <div className="w-12 h-12 bg-primary-container/20 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">timer</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Ahorro de Tiempo</h3>
              <p className="font-body text-on-surface-variant flex-grow">Olvidate de recalcular todo cada vez que sube la harina. Actualizá el precio del ingrediente y todas tus recetas se recalculan al instante.</p>
              <div className="mt-8 pt-6 border-t border-surface-container-low">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Actualización masiva
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-headline text-xl font-bold text-on-surface">Cero Errores</h3>
                <span className="material-symbols-outlined text-primary">verified</span>
              </div>
              <p className="font-body text-sm text-on-surface-variant">Las fórmulas matemáticas ya están hechas. Elimina el riesgo del error humano en los pasajes de gramos a kilos.</p>
            </div>
            <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300 gradient-bg text-on-primary">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-headline text-xl font-bold">Rentabilidad Real</h3>
                <span className="material-symbols-outlined">monitoring</span>
              </div>
              <p className="font-body text-sm opacity-90">Visualizá exactamente cuánto te queda en el bolsillo por cada torta vendida.</p>
            </div>
            <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-headline text-xl font-bold text-on-surface">Centralización</h3>
                <span className="material-symbols-outlined text-primary">folder_special</span>
              </div>
              <p className="font-body text-sm text-on-surface-variant">Todas tus recetas, costos y notas en un solo lugar. Chau a los cuadernos manchados de manteca.</p>
            </div>
            <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-headline text-xl font-bold text-on-surface">Decisiones Inteligentes</h3>
                <span className="material-symbols-outlined text-primary">lightbulb</span>
              </div>
              <p className="font-body text-sm text-on-surface-variant">Identificá qué productos son tus &quot;estrellas&quot; (altos en venta y margen) y cuáles te hacen perder plata.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-surface-container-lowest relative overflow-hidden scroll-mt-20" id="testimonios">
        <div className="absolute right-0 top-0 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-4">Pasteleros que ya profesionalizaron sus números</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface rounded-2xl p-8 border border-outline-variant/10 ambient-shadow">
              <div className="flex text-primary mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="font-body text-on-surface-variant mb-6 italic">&quot;Antes sufría cada vez que tenía que pasar un presupuesto. Ahora armo la receta en la app, pongo mi margen y sé que no estoy perdiendo plata. Me cambió el negocio.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-xl">👩‍🍳</div>
                <div>
                  <p className="font-headline font-bold text-on-surface">Sofía M.</p>
                  <p className="font-body text-xs text-on-surface-variant">Pastelería de Autor</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-2xl p-8 border border-outline-variant/10 ambient-shadow">
              <div className="flex text-primary mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="font-body text-on-surface-variant mb-6 italic">&quot;La función de actualizar un ingrediente y que se cambien todas las recetas es magia pura. Me ahorra horas de calculadora a fin de mes cuando hay inflación.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-xl">👨‍🍳</div>
                <div>
                  <p className="font-headline font-bold text-on-surface">Martín G.</p>
                  <p className="font-body text-xs text-on-surface-variant">Panadería Artesanal</p>
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-2xl p-8 border border-outline-variant/10 ambient-shadow">
              <div className="flex text-primary mb-4">
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
                <span className="material-symbols-outlined">star</span>
              </div>
              <p className="font-body text-on-surface-variant mb-6 italic">&quot;Me di cuenta que con algunos postres estaba trabajando gratis porque no cobraba el tiempo ni el packaging. Esta app me ayudó a valorar mi trabajo.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-xl">👩‍🍳</div>
                <div>
                  <p className="font-headline font-bold text-on-surface">Laura C.</p>
                  <p className="font-body text-xs text-on-surface-variant">Mesa Dulce &amp; Eventos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section className="py-24 bg-surface scroll-mt-20" id="preguntas">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl font-bold text-on-surface mb-4">Preguntas Frecuentes</h2>
          </div>
          <div className="space-y-4">
            <details className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 [&_summary::-webkit-details-marker]:hidden group">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-headline font-semibold text-on-surface">
                ¿Es realmente gratis?
                <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
              </summary>
              <div className="overflow-hidden max-h-0 group-open:max-h-[500px] transition-[max-height] duration-300 ease-out">
                <div className="px-6 pb-6 pt-0 font-body text-on-surface-variant">
                  Sí, tenemos un plan 100% gratuito que te permite cargar ingredientes y armar recetas básicas para que pruebes la herramienta. También ofrecemos planes premium con funciones avanzadas para negocios en crecimiento.
                </div>
              </div>
            </details>
            <details className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 [&_summary::-webkit-details-marker]:hidden group">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-headline font-semibold text-on-surface">
                ¿Puedo usarlo desde el celular?
                <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
              </summary>
              <div className="overflow-hidden max-h-0 group-open:max-h-[500px] transition-[max-height] duration-300 ease-out">
                <div className="px-6 pb-6 pt-0 font-body text-on-surface-variant">
                  ¡Totalmente! CostoRepostero está diseñado para funcionar perfecto en la pantalla de tu teléfono para que puedas chequear costos mientras estás en la cocina o comprando insumos.
                </div>
              </div>
            </details>
            <details className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 [&_summary::-webkit-details-marker]:hidden group">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-headline font-semibold text-on-surface">
                ¿Mis recetas y datos están seguros?
                <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
              </summary>
              <div className="overflow-hidden max-h-0 group-open:max-h-[500px] transition-[max-height] duration-300 ease-out">
                <div className="px-6 pb-6 pt-0 font-body text-on-surface-variant">
                  La privacidad de tus recetas es nuestra prioridad. Tus datos se guardan de forma segura en la nube y solo vos tenés acceso a ellos. Nunca compartiremos tus fórmulas secretas.
                </div>
              </div>
            </details>
            <details className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 [&_summary::-webkit-details-marker]:hidden group">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-headline font-semibold text-on-surface">
                ¿Necesito saber de contabilidad?
                <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
              </summary>
              <div className="overflow-hidden max-h-0 group-open:max-h-[500px] transition-[max-height] duration-300 ease-out">
                <div className="px-6 pb-6 pt-0 font-body text-on-surface-variant">
                  Para nada. Diseñamos la plataforma para que sea intuitiva y hable el &quot;idioma pastelero&quot;. Si sabes seguir una receta, sabes usar CostoRepostero.
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-6">Empezá a cobrar lo que tu trabajo realmente vale</h2>
          <p className="font-body text-xl text-on-surface-variant mb-10">Únete a cientos de pasteleros que ya transformaron su pasión en un negocio rentable.</p>
          <TransitionLink href="/login" className="inline-block gradient-bg text-on-primary font-headline text-lg font-bold py-5 px-10 rounded-xl hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 ambient-shadow">
            Crear cuenta gratis ahora
          </TransitionLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-12 py-10 w-full max-w-7xl mx-auto">
          <div className="text-center md:text-left">
            <p className="text-sm text-slate-500">© 2026 CostoRepostero. El arte de costear con precisión.</p>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Desarrollado by{' '}
            <a href="https://www.xora.com.ar/" target="_blank" rel="noopener noreferrer" className="text-[#ee2b6c] hover:underline">
              XORA WEB
            </a>
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-sm text-slate-400 hover:text-[#ee2b6c] transition-colors" href="#">Privacidad</a>
            <a className="text-sm text-slate-400 hover:text-[#ee2b6c] transition-colors" href="#">Términos</a>
            <a className="text-sm text-slate-400 hover:text-[#ee2b6c] transition-colors" href="#">Contacto</a>
            <a className="text-sm text-slate-400 hover:text-[#ee2b6c] transition-colors" href="#">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
