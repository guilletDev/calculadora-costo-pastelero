'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://costorepostero.com';
    const cleanOrigin = origin.replace(/\/+$/, '');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${cleanOrigin}/auth/update-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
      toast.success('Te enviamos un link para restablecer tu contraseña.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar el link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex items-center justify-center px-6"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 md:p-10 border border-[#e4bdc2]/30 shadow-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffd9de]/50 text-[#b80049]">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>lock_reset</span>
          </div>
          <h1 className="text-[26px] leading-[1.2] font-[700] text-[#151c27] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Recuperar contraseña
          </h1>
          <p className="text-[14px] text-[#5b3f43] mt-2">
            Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-green-600" style={{ fontSize: 40 }}>mark_email_read</span>
            <p className="text-[14px] text-[#5b3f43] leading-[1.6]">
              Si el email está registrado, recibirás un link para restablecer tu contraseña. Revisá tu casilla.
            </p>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#b80049] text-white text-[14px] font-bold tracking-wide hover:bg-[#bc004b] transition-colors duration-200"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#5b3f43] mb-1.5">Email</label>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#b80049] text-white text-[14px] font-bold tracking-wide hover:bg-[#bc004b] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
              )}
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <Link
              href="/login"
              className="text-center text-xs text-[#5b3f43] opacity-80 hover:text-[#b80049] hover:opacity-100 transition-colors font-medium"
            >
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}