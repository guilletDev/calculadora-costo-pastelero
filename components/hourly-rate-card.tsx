'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { useAppBoot } from '@/components/boot/app-boot-context';

export function HourlyRateCard() {
  // Valor hora desde el contexto de boot (sin consultas propias de sesión/perfil).
  const { ready, profile, refreshProfile } = useAppBoot();
  const [hourlyRate, setHourlyRate] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedValue, setHasSavedValue] = useState(false);

  // Seed del input desde el contexto, una sola vez al terminar el boot.
  useEffect(() => {
    if (!ready || initialized) return;
    const saved = profile.hourlyRate;
    if (saved != null && saved > 0) {
      setHourlyRate(String(saved));
      setHasSavedValue(true);
    }
    setInitialized(true);
  }, [ready, initialized, profile.hourlyRate]);

  const isLoading = !ready || !initialized;

  const parsedRate = parseFloat(hourlyRate);
  const isValid = hourlyRate.trim() !== '' && !isNaN(parsedRate) && parsedRate > 0;

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Ingresá un valor hora válido');
      return;
    }
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('update_user_hourly_rate', { p_rate: parsedRate });
      if (error) throw new Error(error.message);
      setHasSavedValue(true);
      toast.success('Valor hora guardado');
      void refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el valor hora');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article
      className="bg-stitch-surface-container-lowest rounded-[24px] border border-gray-100 dark:border-stitch-outline-variant/60 overflow-hidden card-animate"
      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}
    >
      <div className="p-8 border-b border-gray-100 dark:border-stitch-outline-variant/60 flex items-center gap-3">
        <span className="material-symbols-outlined text-stitch-primary text-[28px]">schedule</span>
        <h2
          className="font-semibold text-[24px] leading-[1.3] text-stitch-on-surface"
          style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          Configuración de Mano de Obra
        </h2>
      </div>

      <div className="p-8 space-y-6">
        <p className="text-stitch-secondary text-[16px] leading-[1.6]">
          Definí tu valor hora global. En tus recetas podrás ingresar los minutos
          trabajados para sumar la mano de obra automáticamente.
        </p>

        {isLoading ? (
          <div className="inline-flex items-center gap-2 text-stitch-secondary">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span className="text-sm font-medium">Cargando valor hora...</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary">
                Tarifa por hora (ARS)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-stitch-tertiary-fixed-dim pointer-events-none">$</span>
                <input
                  className="interactive-input w-full sm:w-64 pl-8 pr-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface focus:bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ej: 4000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || !isValid}
              className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#b80049] text-white rounded-full text-[16px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              {isSaving ? 'Guardando...' : hasSavedValue ? 'Actualizar Valor Hora' : 'Guardar Valor Hora'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}