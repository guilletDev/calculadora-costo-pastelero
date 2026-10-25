'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/cost';

interface BudgetLine {
  id: string;
  concepto: string;
  precio: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]';

const cardClass =
  'bg-white rounded-[24px] border border-[#e4bdc2]/30 p-6';

const cardShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;

function comingSoon() {
  toast('Próximamente', {
    description: 'Esta función va a estar disponible en la próxima versión.',
  });
}

function isLineComplete(line: BudgetLine): boolean {
  return line.concepto.trim().length > 0 && (parseFloat(line.precio) || 0) > 0;
}

export default function PresupuestoRapidoPage() {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [deposit, setDeposit] = useState('');
  const [lines, setLines] = useState<BudgetLine[]>([
    { id: 'line-1', concepto: '', precio: '' },
  ]);

  const total = lines.reduce((acc, line) => acc + (parseFloat(line.precio) || 0), 0);

  const lastLine = lines[lines.length - 1];
  const canAddLine = !lastLine || isLineComplete(lastLine);
  const hasCompleteLine = lines.some(isLineComplete);

  const handleAction = () => {
    if (!hasCompleteLine) {
      toast.error('Completá el concepto y precio de las líneas');
      return;
    }
    comingSoon();
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), concepto: '', precio: '' },
    ]);
  };

  const updateLine = (id: string, patch: Partial<BudgetLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="relative w-full flex items-center justify-center min-h-[44px] mb-6">
        <Link className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#b80049] hover:underline flex items-center gap-1 z-10" href="/dashboard">
          ← Volver
        </Link>
        <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#151c27] text-center uppercase tracking-tight px-14 sm:px-16 w-full">
          PRESUPUESTO RÁPIDO
        </h1>
      </div>

      {/* ── Datos del presupuesto ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <div>
          <label className="block text-sm font-semibold text-[#5f5e5e] mb-1.5">
            Título (ej: Torta cumple Emma)
          </label>
          <input
            className={inputClass}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5f5e5e] mb-1.5">
            Nombre del cliente (opcional)
          </label>
          <input
            className={inputClass}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
      </section>

      {/* ── Qué incluye ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <h2
          className="text-xl font-semibold text-[#151c27]"
          style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          QUÉ INCLUYE
        </h2>
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="flex gap-3">
              <input
                className={`${inputClass} flex-1`}
                type="text"
                placeholder="Concepto (ej: Decoración)"
                value={line.concepto}
                onChange={(e) => updateLine(line.id, { concepto: e.target.value })}
              />
              <div className="relative w-32 shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#c5c7c8] pointer-events-none">
                  $
                </span>
                <input
                  className={`${inputClass} pl-7`}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={line.precio}
                  onChange={(e) => updateLine(line.id, { precio: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          disabled={!canAddLine}
          className="w-full py-3 rounded-full border border-[#b80049] text-[#b80049] text-sm font-semibold hover:bg-[#b80049]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          + Agregar línea
        </button>
      </section>

      {/* ── Total y seña ── */}
      <section className="space-y-4">
        <div
          className="bg-white rounded-[24px] border border-[#e4bdc2]/40 p-6 flex items-center justify-between"
          style={cardShadow}
        >
          <span className="text-sm font-bold uppercase tracking-widest text-[#5f5e5e]">
            TOTAL
          </span>
          <span className="font-bold text-2xl text-[#b80049]">
            {formatCurrency(total)}
          </span>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5f5e5e] mb-1.5">
            Seña (opcional)
          </label>
          <div className="relative w-full sm:w-48">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#c5c7c8] pointer-events-none">
              $
            </span>
            <input
              className={`${inputClass} pl-8`}
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Acciones ── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAction}
          className="w-full py-3.5 rounded-full border border-[#b80049] text-[#b80049] font-semibold text-sm hover:bg-[#b80049]/10 transition-colors"
        >
          Guardar en borrador
        </button>
        <button
          type="button"
          onClick={handleAction}
          className="w-full py-3.5 rounded-full bg-[#b80049] text-white font-semibold text-sm hover:bg-[#bc004b] transition-colors"
        >
          Compartir presupuesto
        </button>
      </div>
    </main>
  );
}
