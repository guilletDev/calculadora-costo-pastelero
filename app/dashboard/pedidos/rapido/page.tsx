'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { formatCurrency } from '@/lib/cost';
import { PresupuestoTicket } from '@/components/presupuesto-ticket';

interface BudgetLine {
  id: string;
  concepto: string;
  precio: string;
}

const DRAFT_KEY = 'costo_repostero_presupuesto_rapido_draft';

interface BudgetDraft {
  title: string;
  clientName: string;
  deposit: string;
  lines: BudgetLine[];
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-stitch-outline-variant bg-stitch-surface focus:bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim focus:ring-2 focus:ring-[#b80049]/20 focus:border-stitch-primary outline-none transition-all text-[15px]';

const cardClass =
  'bg-stitch-surface-container-lowest rounded-[24px] border border-stitch-outline-variant/30 p-6';

const cardShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;

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
  const [isSharing, setIsSharing] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const conceptInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldFocusLastLineRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const total = lines.reduce((acc, line) => acc + (parseFloat(line.precio) || 0), 0);

  const lastLine = lines[lines.length - 1];
  const canAddLine = !lastLine || isLineComplete(lastLine);
  const hasCompleteLine = lines.some(isLineComplete);

  // Recuperar borrador guardado en este dispositivo (una sola vez al montar).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<BudgetDraft> | null;
      if (!draft || typeof draft !== 'object') return;

      if (typeof draft.title === 'string') setTitle(draft.title);
      if (typeof draft.clientName === 'string') setClientName(draft.clientName);
      if (typeof draft.deposit === 'string') setDeposit(draft.deposit);
      if (Array.isArray(draft.lines)) {
        const validLines = draft.lines.filter(
          (line): line is BudgetLine =>
            !!line &&
            typeof line.concepto === 'string' &&
            typeof line.precio === 'string'
        );
        if (validLines.length > 0) {
          setLines(
            validLines.map((line) => ({
              id: typeof line.id === 'string' && line.id ? line.id : crypto.randomUUID(),
              concepto: line.concepto,
              precio: line.precio,
            }))
          );
        }
      }
    } catch (error) {
      console.error('[presupuesto-rapido] No se pudo leer el borrador:', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Auto-guardado en background: el formulario no pierde datos ante un refresh.
  // El flag `hydrated` evita pisar el borrador guardado con el estado inicial vacío.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, clientName, deposit, lines }));
      } catch (error) {
        console.error('[presupuesto-rapido] No se pudo autoguardar el borrador:', error);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, title, clientName, deposit, lines]);

  const handleShare = async () => {
    if (!hasCompleteLine) {
      toast.error('Completá el concepto y precio de las líneas');
      return;
    }
    const node = ticketRef.current;
    if (!node || isSharing) return;

    setIsSharing(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 480,
        height: Math.ceil(node.offsetHeight),
        skipFonts: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'presupuesto.png', { type: 'image/png' });

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareFiles && typeof navigator.share === 'function') {
        try {
          await navigator.share({ files: [file], title: 'Presupuesto - Costo Repostero' });
        } catch (shareError) {
          // El usuario puede cancelar el share nativo: no es un error real.
          if (!(shareError instanceof Error) || shareError.name !== 'AbortError') throw shareError;
        }
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'presupuesto.png';
        link.click();
      }
    } catch (error) {
      console.error('[presupuesto-rapido] Error generando la imagen:', error);
      toast.error('No pudimos generar la imagen. Intentá de nuevo.');
    } finally {
      setIsSharing(false);
    }
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), concepto: '', precio: '' },
    ]);
  };

  const handleAddLine = () => {
    if (!canAddLine) return;
    shouldFocusLastLineRef.current = true;
    addLine();
  };

  // Al agregar una línea (Enter o botón), enfocar el "Concepto" de la nueva fila
  // una vez que React la montó. El flag evita robar foco al cargar un borrador.
  useEffect(() => {
    if (!shouldFocusLastLineRef.current) return;
    shouldFocusLastLineRef.current = false;
    conceptInputRefs.current[lines.length - 1]?.focus();
  }, [lines.length]);

  const handleLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLine();
    }
  };

  const updateLine = (id: string, patch: Partial<BudgetLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="relative w-full flex items-center justify-center min-h-[44px] mb-6">
        <Link className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-semibold text-stitch-primary hover:underline flex items-center gap-1 z-10" href="/dashboard">
          ← Volver
        </Link>
        <h1 className="text-base sm:text-xl md:text-2xl font-bold text-stitch-on-surface text-center uppercase tracking-tight px-14 sm:px-16 w-full">
          PRESUPUESTO RÁPIDO
        </h1>
      </div>

      {/* ── Datos del presupuesto ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <div>
          <label className="block text-sm font-semibold text-stitch-secondary mb-1.5">
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
          <label className="block text-sm font-semibold text-stitch-secondary mb-1.5">
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
          className="text-xl font-semibold text-stitch-on-surface"
          style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          QUÉ INCLUYE
        </h2>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.id} className="flex gap-3">
              <input
                ref={(el) => { conceptInputRefs.current[index] = el; }}
                className={`${inputClass} flex-1`}
                type="text"
                placeholder="Concepto (ej: Decoración)"
                value={line.concepto}
                onChange={(e) => updateLine(line.id, { concepto: e.target.value })}
                onKeyDown={handleLineKeyDown}
              />
              <div className="relative w-32 shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stitch-tertiary-fixed-dim pointer-events-none">
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
                  onKeyDown={handleLineKeyDown}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddLine}
          disabled={!canAddLine}
          className="w-full py-3 rounded-full border border-stitch-primary text-stitch-primary text-sm font-semibold hover:bg-[#b80049]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          + Agregar línea
        </button>
      </section>

      {/* ── Total y seña ── */}
      <section className="space-y-4">
        <div
          className="bg-stitch-surface-container-lowest rounded-[24px] border border-stitch-outline-variant/40 p-6 flex items-center justify-between"
          style={cardShadow}
        >
          <span className="text-sm font-bold uppercase tracking-widest text-stitch-secondary">
            TOTAL
          </span>
          <span className="font-bold text-2xl text-stitch-primary">
            {formatCurrency(total)}
          </span>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stitch-secondary mb-1.5">
            Seña (opcional)
          </label>
          <div className="relative w-full sm:w-48">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-stitch-tertiary-fixed-dim pointer-events-none">
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
          onClick={handleShare}
          disabled={isSharing}
          className="w-full py-3.5 rounded-full bg-[#b80049] text-white font-semibold text-sm hover:bg-[#bc004b] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSharing ? 'Generando imagen...' : 'Compartir presupuesto'}
        </button>
      </div>

      {/* Ticket oculto para exportar como imagen. El wrapper 1px queda invisible y
          el clon se hace del nodo interno, que no tiene offsets de posicionamiento. */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 -z-50 h-px w-px overflow-hidden opacity-0 pointer-events-none"
      >
        <div ref={ticketRef} className="w-[480px] bg-stitch-surface-container-lowest">
          <PresupuestoTicket
            title={title}
            clientName={clientName}
            lines={lines}
            total={total}
            deposit={parseFloat(deposit) || 0}
          />
        </div>
      </div>
    </main>
  );
}
