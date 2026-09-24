'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // El link del correo llega con #access_token=...&type=recovery:
  // supabase-js detecta la sesión desde el hash de la URL automáticamente.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(!!data.session);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Contraseña actualizada correctamente');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === null) {
    return (
      <div
        className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex items-center justify-center px-6"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <p className="text-[#5b3f43] flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
          Verificando enlace...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex items-center justify-center px-6"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 md:p-10 border border-[#e4bdc2]/30 shadow-sm flex flex-col gap-6">
        {hasSession ? (
          <>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffd9de]/50 text-[#b80049]">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>password</span>
              </div>
              <h1 className="text-[26px] leading-[1.2] font-[700] text-[#151c27] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Nueva contraseña
              </h1>
              <p className="text-[14px] text-[#5b3f43] mt-2">
                Elegí una nueva contraseña para tu cuenta.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#5b3f43] mb-1.5">Nueva contraseña</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]"
                  placeholder="••••••••"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#5b3f43] mb-1.5">Confirmar contraseña</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]"
                  placeholder="••••••••"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#b80049] text-white text-[14px] font-bold tracking-wide hover:bg-[#bc004b] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                )}
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffdad6] text-[#ba1a1a]">
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>error</span>
            </div>
            <h1 className="text-[24px] leading-[1.2] font-[700] text-[#151c27] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Enlace inválido o vencido
            </h1>
            <p className="text-[14px] text-[#5b3f43] leading-[1.6]">
              El enlace de recuperación no es válido o ya fue utilizado. Solicitá uno nuevo.
            </p>
            <Link
              href="/forgot-password"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#b80049] text-white text-[14px] font-bold tracking-wide hover:bg-[#bc004b] transition-colors duration-200"
            >
              Solicitar nuevo link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}