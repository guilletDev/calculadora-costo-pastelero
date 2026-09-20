'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export function HourlyRateCard() {
  const [hourlyRate, setHourlyRate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.hourly_rate != null && profile.hourly_rate > 0) {
        setHourlyRate(String(profile.hourly_rate));
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      toast.error('Ingresá un valor hora válido');
      return;
    }
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('update_user_hourly_rate', { p_rate: rate });
      if (error) throw new Error(error.message);
      toast.success('Valor hora guardado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el valor hora');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      className="bg-white rounded-[24px] border border-gray-100 overflow-hidden card-animate"
      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}
    >
      <div className="p-8 border-b border-gray-100 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#b80049] text-[28px]">schedule</span>
        <h2
          className="font-semibold text-[24px] leading-[1.3] text-[#151c27]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Configuración de Mano de Obra
        </h2>
      </div>

      <div className="p-8 space-y-6">
        <p className="text-[#5f5e5e] text-[16px] leading-[1.6]">
          Definí tu valor hora global. En tus recetas y subproductos podrás ingresar los minutos
          trabajados para sumar la mano de obra automáticamente.
        </p>

        {isLoading ? (
          <div className="inline-flex items-center gap-2 text-[#5f5e5e]">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span className="text-sm font-medium">Cargando valor hora...</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">
                Tarifa por hora (ARS)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#c5c7c8] pointer-events-none">$</span>
                <input
                  className="interactive-input w-full sm:w-64 pl-8 pr-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="4000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#b80049] text-white rounded-full text-[16px] font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              {isSaving ? 'Guardando...' : 'Guardar Valor Hora'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}