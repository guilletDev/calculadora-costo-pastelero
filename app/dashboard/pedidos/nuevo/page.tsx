'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { PresupuestoTicket } from '@/components/presupuesto-ticket';
import { EXTRA_COST_LABELS, Recipe } from '@/lib/types';
import { formatCurrency, proportionalCost } from '@/lib/cost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecipeLine {
  id: string;
  recipeId?: string;
  quantity: string;
}

interface ExtraLine {
  id: string;
  key: string;
  label: string;
  amount: string;
  isCustom: boolean;
}

const CUSTOM_EXTRA_OPTION = '__custom__';

const EXTRA_PRESETS = Object.entries(EXTRA_COST_LABELS).map(([key, label]) => ({
  key,
  label,
}));

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] outline-none transition-all text-[15px]';

const triggerClass =
  'w-full !h-auto rounded-xl border border-[#e4bdc2] bg-[#f9f9ff] px-4 py-3 text-[15px] text-[#151c27] justify-between gap-2';

const cardClass = 'bg-white rounded-[24px] border border-[#e4bdc2]/30 p-6';
const cardShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;
const selectContentClass =
  'bg-white border border-gray-200 rounded-xl shadow-lg max-w-[min(24rem,calc(100vw-2rem))]';

function comingSoon() {
  toast('Próximamente', {
    description: 'Esta función va a estar disponible en la próxima versión.',
  });
}

function quantityLabel(recipe: Recipe | undefined): string {
  if (recipe?.yieldPortions != null && recipe.yieldPortions > 0) return 'Porciones';
  if (recipe?.yieldGrams != null && recipe.yieldGrams > 0) return 'Gramos';
  return 'Cantidad';
}

function quantityPlaceholder(recipe: Recipe | undefined): string {
  if (recipe?.yieldPortions != null && recipe.yieldPortions > 0) return 'Ej: 12';
  if (recipe?.yieldGrams != null && recipe.yieldGrams > 0) return 'Ej: 500';
  return 'Ej: 1';
}

function isRecipeLineComplete(line: RecipeLine): boolean {
  return !!line.recipeId && (parseFloat(line.quantity) || 0) > 0;
}

function isExtraLineComplete(line: ExtraLine): boolean {
  const hasLabel = line.label.trim().length > 0 || line.key !== '';
  return hasLabel && (parseFloat(line.amount) || 0) > 0;
}

export default function CotizarPedidoPage() {
  const { recipes } = useAppBoot();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([
    { id: 'recipe-line-1', quantity: '' },
  ]);
  const [extraLines, setExtraLines] = useState<ExtraLine[]>([
    { id: 'extra-line-1', key: '', label: '', amount: '', isCustom: false },
  ]);
  const [salePrice, setSalePrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const recipeSelectRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shouldFocusRecipeRef = useRef(false);
  const extraSelectRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shouldFocusExtraRef = useRef(false);

  const findRecipe = (recipeId: string | undefined) =>
    recipes.find((recipe) => recipe.id === recipeId);

  const recipeLineCost = (line: RecipeLine): number => {
    const recipe = findRecipe(line.recipeId);
    const quantity = parseFloat(line.quantity) || 0;
    if (!recipe || quantity <= 0) return 0;
    if (recipe.yieldPortions != null && recipe.yieldPortions > 0) {
      return proportionalCost(recipe.totalCost, recipe.yieldPortions, quantity);
    }
    if (recipe.yieldGrams != null && recipe.yieldGrams > 0) {
      return proportionalCost(recipe.totalCost, recipe.yieldGrams, quantity);
    }
    return 0;
  };

  const addRecipeLine = () => {
    setRecipeLines((prev) => [...prev, { id: crypto.randomUUID(), quantity: '' }]);
  };

  const updateRecipeLine = (id: string, patch: Partial<RecipeLine>) => {
    setRecipeLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const removeRecipeLine = (id: string) => {
    setRecipeLines((prev) => prev.filter((line) => line.id !== id));
  };

  const addExtraLine = () => {
    setExtraLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), key: '', label: '', amount: '', isCustom: false },
    ]);
  };

  const updateExtraLine = (id: string, patch: Partial<ExtraLine>) => {
    setExtraLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const removeExtraLine = (id: string) => {
    setExtraLines((prev) => prev.filter((line) => line.id !== id));
  };

  const setExtraPreset = (id: string, value: string) => {
    if (value === CUSTOM_EXTRA_OPTION) {
      updateExtraLine(id, { key: '', label: '', isCustom: true });
      return;
    }
    const preset = EXTRA_PRESETS.find((item) => item.key === value);
    updateExtraLine(id, {
      key: value,
      label: preset?.label ?? value,
      isCustom: false,
    });
  };

  const lastRecipeLine = recipeLines[recipeLines.length - 1];
  const canAddRecipe = !lastRecipeLine || isRecipeLineComplete(lastRecipeLine);
  const lastExtraLine = extraLines[extraLines.length - 1];
  const canAddExtra = !lastExtraLine || isExtraLineComplete(lastExtraLine);

  const handleAddRecipe = () => {
    if (!canAddRecipe) return;
    shouldFocusRecipeRef.current = true;
    addRecipeLine();
  };

  const handleAddExtra = () => {
    if (!canAddExtra) return;
    shouldFocusExtraRef.current = true;
    addExtraLine();
  };

  // Al agregar una fila (Enter o botón), enfocar el Select de la nueva fila
  // una vez que React la montó. Los flags evitan robar foco en el primer render.
  useEffect(() => {
    if (!shouldFocusRecipeRef.current) return;
    shouldFocusRecipeRef.current = false;
    recipeSelectRefs.current[recipeLines.length - 1]?.focus();
  }, [recipeLines.length]);

  useEffect(() => {
    if (!shouldFocusExtraRef.current) return;
    shouldFocusExtraRef.current = false;
    extraSelectRefs.current[extraLines.length - 1]?.focus();
  }, [extraLines.length]);

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLElement>, add: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  const recipesTotal = recipeLines.reduce(
    (sum, line) => sum + recipeLineCost(line),
    0
  );
  const extrasTotal = extraLines.reduce(
    (sum, line) => sum + (parseFloat(line.amount) || 0),
    0
  );
  const totalCost = recipesTotal + extrasTotal;

  // Datos para el ticket exportable: recetas y gastos con sus subtotales.
  const ticketLines = [
    ...recipeLines
      .filter((line) => line.recipeId)
      .map((line) => {
        const recipe = findRecipe(line.recipeId);
        const quantity = line.quantity ? ` · ${line.quantity}` : '';
        return {
          id: line.id,
          concepto: `${recipe?.name ?? 'Receta'}${quantity}`,
          precio: String(recipeLineCost(line)),
        };
      }),
    ...extraLines
      .filter((line) => line.label.trim() || line.amount)
      .map((line) => ({
        id: line.id,
        concepto: line.label.trim() || 'Gasto extra',
        precio: line.amount,
      })),
  ];

  const parsedSalePrice = parseFloat(salePrice) || 0;
  const ticketTotal = parsedSalePrice > 0 ? parsedSalePrice : totalCost;

  const hasSomethingToShare =
    recipeLines.some((line) => line.recipeId) ||
    extraLines.some((line) => line.label.trim() || line.amount);

  const handleShare = async () => {
    if (!hasSomethingToShare) {
      toast.error('Agregá al menos una receta o un gasto extra para compartir');
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
      console.error('[cotizar-pedido] Error generando la imagen:', error);
      toast.error('No pudimos generar la imagen. Intentá de nuevo.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="relative w-full flex items-center justify-center min-h-[44px] mb-6">
        <Link className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#b80049] hover:underline flex items-center gap-1 z-10" href="/dashboard">
          ← Volver
        </Link>
        <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#151c27] text-center uppercase tracking-tight px-14 sm:px-16 w-full">
          COTIZAR PEDIDO
        </h1>
      </div>

      {/* ── Datos del pedido ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <div>
          <label className="block text-sm font-semibold text-[#5f5e5e] mb-1.5">
            Título del pedido
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

      {/* ── Recetas ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-widest text-[#5f5e5e]"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Mis recetas
          </h2>
          <p className="mt-1 text-[13px] text-[#5f5e5e]">
            Agregá las recetas que forman parte del pedido.
          </p>
        </div>

        <div className="space-y-4">
          {recipeLines.map((line, index) => {
            const recipe = findRecipe(line.recipeId);
            return (
              <div
                key={line.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <label className="block text-[11px] uppercase tracking-widest font-semibold text-[#5f5e5e] mb-1.5">
                    Receta
                  </label>
                  <Select
                    value={line.recipeId}
                    onValueChange={(value) =>
                      updateRecipeLine(line.id, { recipeId: value })
                    }
                  >
                    <SelectTrigger
                      ref={(el) => { recipeSelectRefs.current[index] = el; }}
                      className={triggerClass}
                      onKeyDown={(e) => handleRowKeyDown(e, handleAddRecipe)}
                    >
                      <SelectValue placeholder="Seleccionar receta" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      avoidCollisions={false}
                      className={selectContentClass}
                    >
                      {recipes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[#5f5e5e]">
                          Todavía no tenés recetas guardadas.
                        </div>
                      ) : (
                        recipes.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                          >
                            {item.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-[11px] uppercase tracking-widest font-semibold text-[#5f5e5e] mb-1.5">
                    {quantityLabel(recipe)}
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="any"
                    placeholder={quantityPlaceholder(recipe)}
                    value={line.quantity}
                    onChange={(e) =>
                      updateRecipeLine(line.id, { quantity: e.target.value })
                    }
                    onKeyDown={(e) => handleRowKeyDown(e, handleAddRecipe)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end sm:pb-1">
                  <span className="whitespace-nowrap text-sm font-semibold text-[#b80049]">
                    {formatCurrency(recipeLineCost(line))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRecipeLine(line.id)}
                    aria-label="Eliminar receta"
                    title="Eliminar receta"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddRecipe}
          disabled={!canAddRecipe}
          className="w-full py-3 rounded-full border border-[#b80049] text-[#b80049] text-sm font-semibold hover:bg-[#b80049]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          + Agregar otra receta
        </button>
      </section>

      {/* ── Gastos extra ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-widest text-[#5f5e5e]"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Gastos extra
          </h2>
          <p className="mt-1 text-[13px] text-[#5f5e5e]">
            Sumá packaging, envíos u otros costos del pedido.
          </p>
        </div>

        <div className="space-y-4">
          {extraLines.map((line, index) => (
            <div
              key={line.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest font-semibold text-[#5f5e5e] mb-1.5">
                    Gasto
                  </label>
                  <Select
                    value={
                      line.isCustom ? CUSTOM_EXTRA_OPTION : line.key || undefined
                    }
                    onValueChange={(value) => setExtraPreset(line.id, value)}
                  >
                    <SelectTrigger
                      ref={(el) => { extraSelectRefs.current[index] = el; }}
                      className={triggerClass}
                      onKeyDown={(e) => handleRowKeyDown(e, handleAddExtra)}
                    >
                      <SelectValue placeholder="Seleccionar gasto" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      avoidCollisions={false}
                      className={selectContentClass}
                    >
                      {EXTRA_PRESETS.map((preset) => (
                        <SelectItem
                          key={preset.key}
                          value={preset.key}
                          className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                        >
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value={CUSTOM_EXTRA_OPTION}
                        className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                      >
                        Otro...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {line.isCustom && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest font-semibold text-[#5f5e5e] mb-1.5">
                      Descripción
                    </label>
                    <input
                      className={inputClass}
                      type="text"
                      placeholder="Ej: Moldes descartables"
                      value={line.label}
                      onChange={(e) =>
                        updateExtraLine(line.id, { label: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="w-full sm:w-36">
                <label className="block text-[11px] uppercase tracking-widest font-semibold text-[#5f5e5e] mb-1.5">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#c5c7c8] pointer-events-none">
                    $
                  </span>
                  <input
                    className={`${inputClass} pl-8`}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={line.amount}
                    onChange={(e) =>
                      updateExtraLine(line.id, { amount: e.target.value })
                    }
                    onKeyDown={(e) => handleRowKeyDown(e, handleAddExtra)}
                  />
                </div>
              </div>

              <div className="flex justify-end sm:pb-1">
                <button
                  type="button"
                  onClick={() => removeExtraLine(line.id)}
                  aria-label="Eliminar gasto extra"
                  title="Eliminar gasto extra"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddExtra}
          disabled={!canAddExtra}
          className="w-full py-3 rounded-full border border-[#b80049] text-[#b80049] text-sm font-semibold hover:bg-[#b80049]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          + Agregar gasto extra
        </button>
      </section>

      {/* ── Desglose ── */}
      <section className={cardClass} style={cardShadow}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-[#5f5e5e]">
            <span>Mis recetas</span>
            <span className="font-semibold text-[#151c27]">
              {formatCurrency(recipesTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-[#5f5e5e]">
            <span>Gastos extra</span>
            <span className="font-semibold text-[#151c27]">
              {formatCurrency(extrasTotal)}
            </span>
          </div>
          <div className="border-t border-[#e4bdc2]/40 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-widest text-[#5f5e5e]">
              COSTO TOTAL
            </span>
            <span className="font-bold text-2xl text-[#b80049]">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Precio de venta ── */}
      <section className={`${cardClass} space-y-4`} style={cardShadow}>
        <h2
          className="text-xl font-semibold text-[#151c27]"
          style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          PRECIO DE VENTA
        </h2>
        <div>
          <label className="block text-sm font-semibold text-[#5f5e5e] mb-1.5">
            ¿Cuánto le cobrás?
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#c5c7c8] text-lg pointer-events-none">
              $
            </span>
            <input
              className={`${inputClass} pl-9 py-4 text-lg`}
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
          <p className="mt-2 text-[13px] text-[#5f5e5e]">
            Poné el precio de venta y te calculamos el markup.
          </p>
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
          onClick={comingSoon}
          className="w-full py-3.5 rounded-full border border-[#b80049] text-[#b80049] font-semibold text-sm hover:bg-[#b80049]/10 transition-colors"
        >
          Guardar en borrador
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="w-full py-3.5 rounded-full bg-[#b80049] text-white font-semibold text-sm hover:bg-[#bc004b] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSharing ? 'Generando imagen...' : 'Compartir presupuesto'}
        </button>
      </div>

      {/* Ticket oculto para exportar como imagen */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 -z-50 h-px w-px overflow-hidden opacity-0 pointer-events-none"
      >
        <div ref={ticketRef} className="w-[480px] bg-white">
          <PresupuestoTicket
            title={title}
            clientName={clientName}
            lines={ticketLines}
            total={ticketTotal}
            deposit={parseFloat(deposit) || 0}
          />
        </div>
      </div>
    </main>
  );
}
