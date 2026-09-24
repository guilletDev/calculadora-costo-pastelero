import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Aceptación de los términos y uso del servicio',
    body: 'Al acceder o utilizar Costo Repostero aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte de ellos, te pedimos que no utilices la plataforma. El servicio está diseñado para ayudarte a calcular costos de recetas, gestionar productos e ingredientes y organizar tu emprendimiento gastronómico.',
  },
  {
    title: 'Cuentas de usuario y seguridad de las credenciales',
    body: 'Para utilizar la plataforma necesitás crear una cuenta con tu correo electrónico o iniciando sesión con Google. Sos responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta. Si detectás un uso no autorizado, comunicate con nuestro equipo de soporte de inmediato.',
  },
  {
    title: 'Planes de suscripción (Free vs PRO), pagos y cancelaciones',
    body: 'Costo Repostero ofrece un plan gratuito (Free) con límites de uso y un plan de pago único (Pro) que habilita beneficios adicionales por un período determinado. Los pagos se procesan a través de Mercado Pago y son únicos, no recurrentes. No se realizan reembolsos una vez completado el pago, salvo disposición legal aplicable. Podés dejar de utilizar el servicio en cualquier momento; tu plan Pro caduca al vencer el período contratado.',
  },
  {
    title: 'Propiedad intelectual',
    body: 'Las recetas, productos, ingredientes y demás datos que cargás en la plataforma son de tu propiedad. La plataforma, el software, el diseño, las marcas y el contenido de Costo Repostero pertenecen a la empresa y están protegidos por las leyes de propiedad intelectual. No podés copiar, modificar ni revender la plataforma o sus componentes.',
  },
  {
    title: 'Limitación de responsabilidad',
    body: 'Los cálculos de costos, precios sugeridos e información generada por la plataforma se ofrecen con fines informativos y de gestión. Costo Repostero no se responsabiliza por decisiones comerciales tomadas en base a dichos cálculos, ni por variaciones de precios de insumos, errores de carga o resultados financieros del usuario.',
  },
  {
    title: 'Modificaciones a los términos y contacto',
    body: 'Podemos actualizar estos Términos y Condiciones cuando sea necesario. Los cambios entrarán en vigencia al ser publicados en esta página. Si tenés dudas sobre estos términos o necesitás asistencia, escribinos a nuestro equipo de soporte.',
  },
];

export default function TerminosYCondicionesPage() {
  const contactEmail = 'soporte@costorepostero.com';

  return (
    <div
      className="min-h-screen bg-[#f9f9ff] text-[#151c27] antialiased"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Mini header */}
      <header className="w-full border-b border-[#e4bdc2]/20 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: "'Manrope', sans-serif" }}>
              costo repostero
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#b80049] mb-3">
          Documento legal
        </p>
        <h1
          className="text-[28px] md:text-[40px] leading-[1.15] tracking-tight font-[800] mb-4"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Términos y Condiciones - Costo Repostero
        </h1>
        <p className="text-[#5f5e5e] text-[15px] leading-[1.6] mb-12">
          Última actualización: septiembre de 2026. Estos términos regulan el uso de la plataforma
          Costo Repostero y de todos sus servicios.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((section, index) => (
            <section key={section.title} className="bg-white rounded-[24px] border border-[#e4bdc2]/30 p-8 shadow-sm">
              <h2
                className="text-[20px] font-bold text-[#151c27] mb-3 flex items-center gap-3"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <span className="w-8 h-8 rounded-full bg-[#ffd9de]/50 text-[#b80049] flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                {section.title}
              </h2>
              <p className="text-[15px] leading-[1.7] text-[#5f5e5e]">
                {section.body}
              </p>
            </section>
          ))}

          <section className="bg-white rounded-[24px] border border-[#e4bdc2]/30 p-8 shadow-sm">
            <h2
              className="text-[20px] font-bold text-[#151c27] mb-3 flex items-center gap-3"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              <span className="w-8 h-8 rounded-full bg-[#ffd9de]/50 text-[#b80049] flex items-center justify-center text-sm font-bold shrink-0">
                7
              </span>
              Contacto
            </h2>
            <p className="text-[15px] leading-[1.7] text-[#5f5e5e] mb-4">
              Si tenés preguntas sobre estos términos o necesitás asistencia, escribinos a:
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#e7eefe]/50 rounded-xl text-[#151c27] font-semibold hover:bg-[#e7eefe] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              {contactEmail}
            </a>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#b80049] text-white px-10 py-4 rounded-full font-semibold shadow-lg hover:bg-[#bc004b] hover:scale-105 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver al Inicio
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#e4bdc2]/20 py-8 text-center text-xs text-[#5a5c5d] opacity-70">
        © 2026 CostoRepostero. Todos los derechos reservados.
      </footer>
    </div>
  );
}