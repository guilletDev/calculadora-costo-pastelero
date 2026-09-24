import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Información que recopilamos',
    body: 'Recopilamos únicamente los datos básicos de perfil (nombre y correo electrónico) que facilitás al iniciar sesión con tu cuenta de Google o al registrarte con tu email y contraseña. No solicitamos ni almacenamos información sensible adicional.',
  },
  {
    title: 'Uso de la información',
    body: 'Usamos tu información exclusivamente para autenticarte en la plataforma, gestionar tu suscripción al Plan Pro y guardar tus recetas, productos e ingredientes. No utilizamos tus datos para ningún otro propósito.',
  },
  {
    title: 'Protección de datos',
    body: 'No vendemos ni compartimos tu información personal con terceros. Tus datos se almacenan de forma segura y solo se accede a ellos para operar el servicio que solicitaste.',
  },
  {
    title: 'Derechos del usuario',
    body: 'Podés solicitar la eliminación de tu cuenta y de todos tus datos en cualquier momento escribiendo a nuestro equipo de soporte. Procesaremos tu solicitud en un plazo razonable y eliminaremos tu información de forma permanente.',
  },
];

export default function PrivacidadPage() {
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
          Política de Privacidad - Costo Repostero
        </h1>
        <p className="text-[#5f5e5e] text-[15px] leading-[1.6] mb-12">
          Última actualización: septiembre de 2026. Esta política describe cómo Costo Repostero
          recopila, usa y protege tu información personal.
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
                5
              </span>
              Contacto
            </h2>
            <p className="text-[15px] leading-[1.7] text-[#5f5e5e] mb-4">
              Si tenés preguntas sobre esta política o querés ejercer tus derechos sobre tus datos,
              escribinos a:
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