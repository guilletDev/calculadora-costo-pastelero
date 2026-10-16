'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type AuthMode = 'login' | 'register';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_TIMEOUT_MS = 3000;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleWrapRef = useRef<HTMLDivElement>(null);
  const googleOverlayRef = useRef<HTMLDivElement>(null);

  // Link de autenticación vencido/inválido: mensaje claro y limpieza de la URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'link_expired') {
      toast.error('El enlace expiró o ya fue usado. Solicitá un nuevo correo.');
      params.delete('error');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  // Google Identity Services: el ID token se valida directo contra Supabase
  // (signInWithIdToken), sin redirect_uri a supabase.co. Así el consentimiento
  // de Google muestra "ir a costorepostero.com".
  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response?.credential) {
      toast.error('No pudimos obtener las credenciales de Google.');
      return;
    }
    setGoogleLoading(true);
    const supabase = createClient();

    // Resguardo anti-congelamiento: si la verificación tarda más de 3s,
    // redirigimos si la sesión ya quedó activa o liberamos el botón para
    // que el usuario pueda reintentar. La promesa original sigue corriendo
    // y redirige igual si termina con éxito.
    const guard = window.setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // sin sesión: liberamos el botón abajo
      }
      setGoogleLoading(false);
    }, GOOGLE_TIMEOUT_MS);

    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });
      if (error) {
        console.error('[login] signInWithIdToken falló:', error.message);
        toast.error('No pudimos iniciar sesión con Google. Intentá de nuevo.');
        return;
      }
      // Email de bienvenida (idempotente en el server): fire-and-forget,
      // sin await para no demorar la redirección a /dashboard.
      void fetch('/api/auth/welcome', { method: 'POST' }).catch(() => {});
      toast.success('¡Bienvenido!');
      router.push('/dashboard');
    } catch (err) {
      console.error('[login] Error inesperado con Google:', err);
      toast.error('No pudimos iniciar sesión con Google. Intentá de nuevo.');
    } finally {
      window.clearTimeout(guard);
      setGoogleLoading(false);
    }
  }, [router]);

  // Inicializa GIS cuando el script está listo.
  useEffect(() => {
    if (!gisReady) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const gis = window.google?.accounts?.id;
    if (!clientId || !gis) return;

    gis.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      cancel_on_tap_outside: true,
    });
  }, [gisReady, handleGoogleCredential]);

  // Renderiza el botón oficial de Google (invisible) encima del botón custom:
  // el click siempre abre el popup de Google y el look se mantiene.
  useEffect(() => {
    if (!gisReady) return;
    const gis = window.google?.accounts?.id;
    const container = googleOverlayRef.current;
    const wrap = googleWrapRef.current;
    if (!gis || !container || !wrap) return;

    const render = () => {
      const width = Math.max(200, Math.min(wrap.offsetWidth, 400));
      container.innerHTML = '';
      gis.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width,
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [gisReady]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) return;

    if (mode === 'register' && password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes('invalid')) {
            toast.error('Email o contraseña incorrectos');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('¡Bienvenido de nuevo!');
        router.push('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (error.code === 'email_exists' || error.code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
            toast.error('Ya existe una cuenta con ese email. Iniciá sesión.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        if (data.session) {
          toast.success('¡Cuenta creada!');
          router.push('/dashboard');
        } else {
          toast.success('Revisá tu correo para confirmar la cuenta.');
          setMode('login');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9ff] text-[#151c27] min-h-screen md:h-screen flex flex-col md:flex-row overflow-x-hidden" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <Script
        src={GOOGLE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setGisReady(true)}
        onError={() => toast.error('No pudimos cargar Google. Revisá tu conexión e intentá de nuevo.')}
      />
      {/* Left Panel (Brand/Marketing) */}
      <div className="hidden md:flex flex-col justify-between w-[45%] h-full bg-[#151c27] text-white py-10 px-8 md:px-12 relative overflow-hidden">
        {/* Subtle Radial Gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(233, 30, 99, 0.15) 0%, transparent 70%)' }}
        ></div>

        {/* Logo */}
        <div className="z-10 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              costo repostero
            </span>
          </Link>
        </div>

        {/* Content */}
        <div className="z-10 flex flex-col gap-8 max-w-[480px]">
          <h1 className="text-[48px] leading-[1.1] tracking-tight font-[800] text-white" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
            Convierte cada receta en un negocio rentable
          </h1>
          <p className="text-[18px] leading-[1.6] text-[#dce2f3] opacity-90">
            Calcula costos de ingredientes, define precios de venta rentables y organiza tus recetas en un solo lugar.
          </p>
          <ul className="flex flex-col gap-5 mt-4">
            {[
              'Calcula el costo real',
              'Precios de venta sugeridos',
              'Controla márgenes de ganancia',
              'Gestiona ingredientes'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#b80049]/20 text-[#b80049]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <span className="text-[16px] text-[#dce2f3]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="z-10 text-[14px] font-[600] tracking-wide text-[#dce2f3]/50">
          © 2026 CostoRepostero
        </div>
      </div>

      {/* Right Panel (Auth Form) */}
      <div className="flex flex-col w-full md:w-[55%] bg-white py-10 px-8 md:px-12 relative">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="md:hidden flex items-center gap-2 mb-8 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ee2b6c] text-white shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bakery_dining</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#151c27] whitespace-nowrap" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              costo repostero
            </span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="w-full max-w-[480px] bg-white rounded-3xl p-6 md:p-7 border border-[#e4bdc2]/30 shadow-sm flex flex-col gap-3.5 m-auto relative">
          {/* Header */}
          <div className="text-center md:text-left flex flex-col gap-2">
            <h2 className="text-[28px] leading-[1.2] font-[700] text-[#151c27] tracking-tight" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              {mode === 'login' ? 'Bienvenido nuevamente' : 'Creá tu cuenta'}
            </h2>
            <p className="text-[15px] text-[#5b3f43]">
              {mode === 'login'
                ? 'Inicia sesión para continuar gestionando tus recetas y costos.'
                : 'Registrate gratis y empezá a calcular el costo real de tus recetas.'}
            </p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            {/* Google Sign In: botón custom (visual) + botón oficial GIS invisible encima */}
            <div ref={googleWrapRef} className="relative w-full">
              <button
                type="button"
                disabled={googleLoading || !gisReady}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-full border border-[#e4bdc2] bg-white text-[#151c27] text-[14px] font-[600] tracking-wide hover:bg-[#f0f3ff] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
              </button>
              <div
                ref={googleOverlayRef}
                className={`absolute inset-0 flex items-center justify-center overflow-hidden opacity-0 pointer-events-none [&_div]:pointer-events-auto ${
                  gisReady && !googleLoading ? '' : 'invisible'
                }`}
              />
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e4bdc2]/50" />
              <span className="text-[11px] text-[#5b3f43] uppercase tracking-widest font-semibold">
                o ingresá con email
              </span>
              <div className="flex-1 h-px bg-[#e4bdc2]/50" />
            </div>

            {/* Tabs: Iniciar Sesión / Registrarse */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#f0f3ff] rounded-full">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-2.5 rounded-full text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-[#b80049] text-white shadow-sm'
                    : 'text-[#5b3f43] hover:text-[#151c27]'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-2.5 rounded-full text-sm font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-[#b80049] text-white shadow-sm'
                    : 'text-[#5b3f43] hover:text-[#151c27]'
                }`}
              >
                Registrarse
              </button>
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-[#5b3f43] mb-1.5">Nombre completo</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]"
                    placeholder="Ej: María González"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[#5b3f43] mb-1.5">Email</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]"
                  placeholder="tucorreo@ejemplo.com"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#5b3f43] mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'register' ? 6 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#5b3f43] hover:text-[#151c27] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end mt-2">
                    <Link
                      href="/forgot-password"
                      className="text-[12px] text-[#b80049] font-medium hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#b80049] text-white text-[14px] font-bold tracking-wide hover:bg-[#bc004b] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                )}
                {loading
                  ? 'Procesando...'
                  : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Al continuar con Google o registrarte, aceptás nuestros{' '}
            <a
              href="/terminos-y-condiciones"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#b80049] transition-colors"
            >
              Términos y Condiciones
            </a>{' '}
            y nuestra{' '}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#b80049] transition-colors"
            >
              Política de Privacidad
            </a>
            .
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}