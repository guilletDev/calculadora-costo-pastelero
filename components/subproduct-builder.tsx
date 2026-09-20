'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BaseIngredient, RecipeIngredient, SaleType, Unit } from '@/lib/types';
import { fetchRecipeById, upsertRecipe } from '@/lib/recipes-db';
import { calculateIngredientCost, costPerOutputUnit, formatCurrency, sumIngredientCosts } from '@/lib/cost';
import { toBaseQuantity } from '@/lib/units';
import { navigateWithTransition } from '@/lib/view-transition';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { useUpgradeGuard } from '@/hooks/use-upgrade-guard';
import { UpgradeModal } from '@/components/upgrade-modal';
import { createClient } from '@/utils/supabase/client';

interface SubproductDraftIngredient {
  id: string;
  baseIngredientId: string | null;
  ingredientName: string;
  quantityUsed: string;
  unit: Unit;
  cost: number;
}

interface SubproductBuilderProps {
  subproductId?: string;
  sandbox?: boolean;
}

const UNIT_OPTIONS: Unit[] = ['kg', 'g', 'l', 'ml', 'unidad'];

const stitchFontManrope = { fontFamily: "'Manrope', sans-serif" } as const;
const stitchShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;

export function SubproductBuilder({ subproductId, sandbox = false }: SubproductBuilderProps) {
  const router = useRouter();
  const { ready, ingredients: bootIngredients, recipes: bootRecipes, applyLocal } = useAppBoot();
  const { upgradeType, closeUpgrade, guardUpgrade } = useUpgradeGuard();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [laborMinutes, setLaborMinutes] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');
  const [outputUnit, setOutputUnit] = useState<Unit | null>(null);
  const [rows, setRows] = useState<SubproductDraftIngredient[]>([]);

  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState<Unit>('g');
  const [manualName, setManualName] = useState('');
  const [manualPricePerUnit, setManualPricePerUnit] = useState('');

  const [hourlyRate, setHourlyRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const baseIngredients: BaseIngredient[] = [...bootIngredients].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  // Valor hora del perfil (para el cálculo de mano de obra)
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
      setHourlyRate(profile?.hourly_rate ?? 0);
    });
    return () => { cancelled = true; };
  }, []);

  // Modo edición: precargar el subproducto
  useEffect(() => {
    if (!ready) return;
    if (!subproductId) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const found = await fetchRecipeById(subproductId);
        if (!found) {
          navigateWithTransition(router, '/subproductos');
          return;
        }
        setName(found.name);
        setDescription(found.description ?? '');
        setLaborMinutes(String(found.laborMinutes ?? 0));
        setOutputQuantity(found.outputQuantity != null ? String(found.outputQuantity) : '');
        setOutputUnit(found.outputUnit);
        setRows(found.ingredients.map(ing => ({
          id: ing.id,
          baseIngredientId: ing.baseIngredientId,
          ingredientName: ing.ingredientName,
          quantityUsed: String(ing.quantityUsed),
          unit: ing.unit,
          cost: ing.cost,
        })));
      } catch (err) {
        toast.error('Error al cargar el subproducto');
        navigateWithTransition(router, '/subproductos');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [ready, subproductId, router]);

  const resolveCost = (baseIngredientId: string | null, qty: number, unit: Unit, fallback?: number): number => {
    const base = baseIngredients.find(i => i.id === baseIngredientId);
    if (!base) return fallback ?? 0;
    return calculateIngredientCost(base.pricePerUnit, qty, unit);
  };

  const addIngredient = () => {
    if (!newIngredientId || !newQuantity) return;
    const qty = parseFloat(newQuantity);
    if (!qty || qty <= 0) return;

    const isManual = newIngredientId === '__manual__';
    let row: SubproductDraftIngredient | null = null;
    if (isManual) {
      const name = manualName.trim();
      const pricePerUnit = parseFloat(manualPricePerUnit);
      if (!name || !pricePerUnit || pricePerUnit <= 0) return;
      row = {
        id: crypto.randomUUID(),
        baseIngredientId: null,
        ingredientName: name,
        quantityUsed: newQuantity,
        unit: newUnit,
        cost: pricePerUnit * toBaseQuantity(qty, newUnit),
      };
    } else {
      const base = baseIngredients.find(i => i.id === newIngredientId);
      if (!base) return;
      row = {
        id: crypto.randomUUID(),
        baseIngredientId: base.id,
        ingredientName: base.name,
        quantityUsed: newQuantity,
        unit: newUnit,
        cost: resolveCost(newIngredientId, qty, newUnit),
      };
    }

    setRows(prev => [...prev, row as SubproductDraftIngredient]);
    setNewIngredientId('');
    setNewQuantity('');
    setNewUnit('g');
    setManualName('');
    setManualPricePerUnit('');
  };

  const updateRow = (id: string, quantityUsed: string, unit: Unit) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const cost = resolveCost(r.baseIngredientId, parseFloat(quantityUsed) || 0, unit, r.cost);
      return { ...r, quantityUsed, unit, cost };
    }));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const ingredientsCost = sumIngredientCosts(rows);
  const minutes = parseFloat(laborMinutes) || 0;
  const laborCost = (minutes / 60) * hourlyRate;
  const totalCost = ingredientsCost + laborCost;
  const outputQty = parseFloat(outputQuantity) || 0;
  const unitCost = costPerOutputUnit(totalCost, outputQty);
  const hasOutput = outputQty > 0 && outputUnit !== null;

  const canSave = name.trim() !== '' && rows.length > 0 && hasOutput;

  const saveSubproduct = async () => {
    if (savingRef.current || isSaving) return;
    if (!canSave) return;
    if (!guardUpgrade('recipes', bootRecipes.length)) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const draft = {
        name: name.trim(),
        description: description.trim(),
        ingredients: rows.map(r => ({
          id: crypto.randomUUID(),
          baseIngredientId: r.baseIngredientId,
          ingredientName: r.ingredientName,
          quantityUsed: parseFloat(r.quantityUsed) || 0,
          unit: r.unit,
          cost: r.cost,
        })) as RecipeIngredient[],
        extraCosts: { packaging: 0, bags: 0, labels: 0, shipping: 0, others: 0 },
        unitsProduced: 0,
        saleType: 'unidad' as SaleType,
        profitMargin: 0,
        totalCost,
        costPerUnit: unitCost,
        outputQuantity: outputQty,
        outputUnit,
        laborMinutes: minutes,
      };

      const saved = await upsertRecipe(draft, subproductId);
      const nextRecipes = subproductId
        ? bootRecipes.map(r => r.id === subproductId ? saved : r)
        : [saved, ...bootRecipes];
      applyLocal({ recipes: nextRecipes });
      toast.success(subproductId ? 'Subproducto actualizado exitosamente' : 'Subproducto guardado exitosamente');
      navigateWithTransition(router, '/subproductos');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar subproducto');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-[24px] border border-gray-100 p-12 text-center" style={stitchShadow}>
        <p className="text-[#5f5e5e] text-[16px] leading-[1.5]">Cargando...</p>
      </section>
    );
  }

  return (
    <>
      <div className="space-y-8">

        {/* ── 1. Información del Subproducto ── */}
        <article className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6" style={stitchShadow}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#b80049] text-[28px]">layers</span>
            <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>Información del Subproducto</h2>
          </div>

          {sandbox && (
            <div className="px-4 py-3 rounded-lg bg-[#ffd9de]/20 border border-[#e4bdc2]/30 text-[#5f5e5e] text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">science</span>
              Borrador temporal de simulación: nada se guarda hasta presionar &quot;Guardar como Subproducto&quot;.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Nombre del Subproducto</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: Ganache de Chocolate"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Descripción (opcional)</label>
              <textarea
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] resize-none"
                placeholder="Ej: Ganache de chocolate semiamargo para rellenos y coberturas."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Minutos de trabajo activo (opcional)</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: 30"
                type="number"
                min="0"
                step="any"
                value={laborMinutes}
                onChange={(e) => setLaborMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Rendimiento obtenido</label>
              <div className="flex gap-3">
                <input
                  className="interactive-input w-full md:w-44 px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                  placeholder="Ej: 850"
                  type="number"
                  min="0.01"
                  step="any"
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(e.target.value)}
                />
                <select
                  className="interactive-input w-full md:w-32 px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27]"
                  value={outputUnit ?? ''}
                  onChange={(e) => setOutputUnit(e.target.value ? (e.target.value as Unit) : null)}
                >
                  <option value="" disabled>Unidad</option>
                  {UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{u === 'unidad' ? 'unidad' : u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </article>

        {/* ── 2. Insumos ── */}
        <article className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6" style={stitchShadow}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#b80049] text-[28px]">inventory_2</span>
            <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>Insumos</h2>
          </div>

          {!sandbox && baseIngredients.length === 0 ? (
            <div className="bg-[#f0f3ff] rounded-xl p-6 text-center">
              <p className="text-[#5f5e5e] text-[16px] leading-[1.5] mb-4">
                Primero debes agregar ingredientes al inventario para poder armar un subproducto.
              </p>
              <a
                href="/inventario"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#b80049] text-white rounded-full text-[14px] font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">inventory</span>
                Ir al Inventario
              </a>
            </div>
          ) : (
            <>
              {/* Selector de insumo */}
              <form
                noValidate
                onSubmit={(e) => { e.preventDefault(); addIngredient(); }}
                className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center"
              >
                <div className="w-full md:w-1/2">
                  {newIngredientId === '__manual__' ? (
                    <input
                      className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                      placeholder="Nombre del insumo de prueba (ej: Ganache test)"
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  ) : (
                    <select
                      className="interactive-input w-full appearance-none px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] pr-10"
                      value={newIngredientId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId === '__manual__') {
                          setNewIngredientId(selectedId);
                          setNewUnit('g');
                          return;
                        }
                        const base = baseIngredients.find(ing => ing.id === selectedId);
                        setNewIngredientId(selectedId);
                        setNewUnit(base?.unit || 'g');
                      }}
                    >
                      <option value="" disabled>Seleccionar insumo...</option>
                      {baseIngredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                      <option value="__manual__">➕ Insumo de prueba (manual)</option>
                    </select>
                  )}
                </div>
                <div className="w-full md:w-1/4 flex gap-2">
                  <input
                    className="interactive-input w-2/3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                    type="number"
                    min="0"
                    placeholder="250"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                  />
                  <select
                    className="interactive-input w-1/3 px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] text-center"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as Unit)}
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u === 'unidad' ? 'unidad' : u}</option>
                    ))}
                  </select>
                </div>
                <div className={`w-full ${newIngredientId === '__manual__' ? 'md:w-1/3' : 'md:w-1/4'} flex items-center justify-end gap-2`}>
                  {newIngredientId === '__manual__' && (
                    <div className="relative shrink-0">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#c5c7c8] pointer-events-none">$</span>
                      <input
                        className="interactive-input w-24 pl-7 pr-2 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8] text-right"
                        placeholder="precio/un"
                        type="number" min="0" step="any"
                        value={manualPricePerUnit}
                        onChange={(e) => setManualPricePerUnit(e.target.value)}
                      />
                    </div>
                  )}
                  <span className="text-[18px] leading-[1.2] text-[#151c27] font-semibold whitespace-nowrap">
                    {newIngredientId && newQuantity
                      ? formatCurrency(
                          newIngredientId === '__manual__'
                            ? (parseFloat(manualPricePerUnit) || 0) * toBaseQuantity(parseFloat(newQuantity) || 0, newUnit)
                            : resolveCost(newIngredientId, parseFloat(newQuantity) || 0, newUnit)
                        )
                      : '$0,00'}
                  </span>
                  <button
                    type="submit"
                    className="interactive-btn text-[#b80049] hover:text-[#900038] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffd9de]"
                    title="Agregar insumo"
                  >
                    <span className="material-symbols-outlined text-[24px]">add_circle</span>
                  </button>
                </div>
              </form>

              {/* Filas de insumos */}
              {rows.length === 0 ? (
                <div className="bg-[#f0f3ff] rounded-xl p-6 text-center text-[#5f5e5e] text-[16px]">
                  Agregá al menos un insumo para armar el subproducto.
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map(row => (
                    <div key={row.id} className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center">
                      <div className="w-full md:w-1/2">
                        <span className="text-[16px] leading-[1.5] font-medium text-[#151c27]">{row.ingredientName}</span>
                      </div>
                      <div className="w-full md:w-1/4 flex gap-2">
                        <input
                          className="interactive-input w-2/3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27]"
                          type="number"
                          min="0"
                          placeholder="250"
                          value={row.quantityUsed}
                          onChange={(e) => updateRow(row.id, e.target.value, row.unit)}
                        />
                        <select
                          className="interactive-input w-1/3 px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] text-center"
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, row.quantityUsed, e.target.value as Unit)}
                        >
                          {UNIT_OPTIONS.map(u => (
                            <option key={u} value={u}>{u === 'unidad' ? 'unidad' : u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-2">
                        <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">{formatCurrency(row.cost)}</span>
                        <button
                          onClick={() => removeRow(row.id)}
                          className="interactive-btn text-[#ba1a1a] hover:text-[#ffffff] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffdad6]"
                          title="Quitar insumo"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </article>

        {/* ── 3. Resumen de Costos ── */}
        <article className="bg-[#b80049] rounded-[32px] p-8 text-white" style={{ boxShadow: '0 20px 50px rgba(184, 0, 73, 0.3)' }}>
          <h2 className="font-bold text-[28px] mb-8" style={stitchFontManrope}>Resumen de Costos</h2>
          <div className="space-y-4 text-[#ffb2be]" style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: '1.5' }}>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Costo Insumos:</span>
              <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2' }}>{formatCurrency(ingredientsCost)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Mano de Obra{minutes > 0 ? ` (${minutes} min × ${formatCurrency(hourlyRate)}/h)` : ''}:</span>
              <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2' }}>{formatCurrency(laborCost)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <span>Costo Total:</span>
              <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2' }}>{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {hourlyRate === 0 && (
            <p className="mt-4 text-[13px] text-[#ffd9de]">
              Configurá tu valor hora en Inventario para calcular la mano de obra automáticamente.
            </p>
          )}

          <div className="mt-10 pt-6 border-t border-white/20">
            <p className="uppercase tracking-widest text-[#ffd9de] mb-1 text-[10px] font-bold" style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600' }}>
              COSTO POR UNIDAD
            </p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="font-extrabold text-[42px] leading-none" style={stitchFontManrope}>{formatCurrency(unitCost)}</span>
              <span className="text-[#ffb2be] text-sm">/ {outputUnit ?? '—'}</span>
            </div>
            <button
              onClick={saveSubproduct}
              disabled={!canSave || isSaving}
              className="interactive-btn w-full py-4 bg-white text-[#b80049] rounded-full font-bold tracking-wider hover:bg-[#ffd9de] hover:text-[#400014] shadow-lg disabled:bg-white disabled:text-[#b80049]/60 disabled:cursor-not-allowed"
              style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
            >
              {isSaving ? 'GUARDANDO...' : (subproductId ? 'ACTUALIZAR SUBPRODUCTO' : sandbox ? 'GUARDAR COMO SUBPRODUCTO' : 'GUARDAR SUBPRODUCTO')}
            </button>
            {!canSave && (
              <p className="mt-3 text-center text-[13px] text-[#ffd9de]">
                {name.trim() === '' ? 'Completá el nombre.' : rows.length === 0 ? 'Agregá al menos un insumo.' : 'Completá cantidad y unidad de rendimiento.'}
              </p>
            )}
          </div>
        </article>
      </div>

      <UpgradeModal
        open={upgradeType !== null}
        onOpenChange={(open) => { if (!open) closeUpgrade(); }}
        resourceType={upgradeType ?? 'recipes'}
      />
    </>
  );
}