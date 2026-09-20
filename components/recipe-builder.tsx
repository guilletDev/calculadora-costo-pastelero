'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AdditionalCost, BaseIngredient, EXTRA_COST_LABELS, Recipe, RecipeIngredient, SaleType, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';
import { fetchIngredients } from '@/lib/ingredients-db';
import { upsertRecipe } from '@/lib/recipes-db';
import { calculateIngredientCost, formatCurrency, proportionalCost, sumIngredientCosts } from '@/lib/cost';
import { convertToBaseUnit, toBaseQuantity } from '@/lib/units';
import { useUpgradeGuard } from '@/hooks/use-upgrade-guard';
import { UpgradeModal } from '@/components/upgrade-modal';
import { useAppBoot } from '@/components/boot/app-boot-context';
import { navigateWithTransition } from '@/lib/view-transition';
import { createClient } from '@/utils/supabase/client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecipeDraft {
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  unitsProduced: string;
  profitMargin: string;
  saleType: SaleType;
  laborMinutes: string;
  additionalCosts: AdditionalCost[];
}

interface RecipeBuilderProps {
  isIngredientsLocked?: boolean;
  ingredientsVersion?: number;
  standalone?: boolean;
  sandbox?: boolean;
}

const UNIT_OPTIONS: Unit[] = ['kg', 'g', 'l', 'ml', 'unidad'];

const CUSTOM_EXTRA_COST_KEY = 'others';
const CUSTOM_EXTRA_COST_OPTION = '__custom__';

const EXTRA_COST_PRESETS = [
  { key: 'packaging', label: EXTRA_COST_LABELS.packaging },
  { key: 'bags', label: EXTRA_COST_LABELS.bags },
  { key: 'labels', label: EXTRA_COST_LABELS.labels },
  { key: 'shipping', label: EXTRA_COST_LABELS.shipping },
];

function buildDefaultAdditionalCosts(): AdditionalCost[] {
  return [
    ...EXTRA_COST_PRESETS.map(p => ({ key: p.key, label: p.label, value: '', isCustom: false })),
    { key: CUSTOM_EXTRA_COST_KEY, label: '', value: '', isCustom: true },
  ];
}

function buildAdditionalCostsFromExtraCosts(extraCosts: Record<string, number>): AdditionalCost[] {
  const rows: AdditionalCost[] = [];
  for (const [key, value] of Object.entries(extraCosts || {})) {
    if (key === CUSTOM_EXTRA_COST_KEY) {
      rows.push({ key, label: '', value: String(value || ''), isCustom: true });
    } else if (EXTRA_COST_LABELS[key]) {
      rows.push({ key, label: EXTRA_COST_LABELS[key], value: String(value || ''), isCustom: false });
    } else {
      rows.push({ key, label: key, value: String(value || ''), isCustom: true });
    }
  }
  return rows.length > 0 ? rows : buildDefaultAdditionalCosts();
}

function additionalCostsToExtraCosts(rows: AdditionalCost[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const value = parseFloat(row.value) || 0;
    if (value <= 0) continue;
    const key = row.isCustom ? (row.label.trim() || CUSTOM_EXTRA_COST_KEY) : row.key;
    result[key] = value;
  }
  return result;
}

const stitchFontManrope = { fontFamily: "'Manrope', sans-serif" } as const;
const stitchShadow = { boxShadow: '0 10px 40px rgba(0,0,0,0.04)' } as const;

export function RecipeBuilder({ isIngredientsLocked = false, ingredientsVersion = 0, standalone = false, sandbox = false }: RecipeBuilderProps) {
  const router = useRouter();
  const [baseIngredients, setBaseIngredients] = useState<BaseIngredient[]>([]);
  const { ready, ingredients: bootIngredients, recipes: bootRecipes, applyLocal } = useAppBoot();
  const { upgradeType, closeUpgrade, guardUpgrade } = useUpgradeGuard();

  const defaultDraft: RecipeDraft = {
    name: '',
    description: '',
    ingredients: [],
    unitsProduced: '',
    profitMargin: '',
    saleType: 'unidad',
    laborMinutes: '',
    additionalCosts: buildDefaultAdditionalCosts(),
  };

  const [currentRecipe, setCurrentRecipe] = useState<RecipeDraft>(defaultDraft);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingUnit, setEditingUnit] = useState<Unit>('g');

  const [selectedValue, setSelectedValue] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState<Unit>('g');
  const [manualName, setManualName] = useState('');
  const [manualPricePerUnit, setManualPricePerUnit] = useState('');

  const [hourlyRate, setHourlyRate] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const searchParams = useSearchParams();

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

  useEffect(() => {
    let retries = 0;
    const MAX_RETRIES = 30;

    const scrollToBuilder = () => {
      const el = document.getElementById('recipe-builder');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // El form aún no está montado (datos cargando): reintentar cada 100ms
      if (retries < MAX_RETRIES) {
        retries += 1;
        setTimeout(scrollToBuilder, 100);
      }
    };

    const tryScroll = () => {
      if (window.location.hash === '#recipe-builder') scrollToBuilder();
    };

    tryScroll();
    window.addEventListener('hashchange', tryScroll);
    return () => window.removeEventListener('hashchange', tryScroll);
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;

    setBaseIngredients([...bootIngredients].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    ));

    const editId = searchParams.get('edit');
    if (editId) {
      const recipeToEdit = bootRecipes.find(r => r.id === editId);
      if (recipeToEdit) {
        setEditingRecipeId(recipeToEdit.id);
        setCurrentRecipe({
          name: recipeToEdit.name,
          description: recipeToEdit.description ?? '',
          ingredients: recipeToEdit.ingredients,
          unitsProduced: String(recipeToEdit.unitsProduced),
          profitMargin: String(recipeToEdit.profitMargin || ''),
          saleType: recipeToEdit.saleType || 'unidad',
          laborMinutes: String(recipeToEdit.laborMinutes ?? 0),
          additionalCosts: buildAdditionalCostsFromExtraCosts(recipeToEdit.extraCosts),
        });
        setTimeout(() => {
          requestAnimationFrame(() => {
            document.getElementById('recipe-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }, 150);
        return;
      }
    }

    const draft = storage.getDraft();
    if (draft) setCurrentRecipe({ ...defaultDraft, ...draft });
  }, [ready, bootIngredients, bootRecipes, searchParams]);

  useEffect(() => {
    if (editingRecipeId) return;
    storage.saveDraft(currentRecipe);
  }, [currentRecipe, editingRecipeId]);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    fetchIngredients()
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        setBaseIngredients(sorted);
      })
      .catch(() => {});
  }, [ingredientsVersion]);

  const sortedBaseIngredients = [...baseIngredients].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  const subproducts: Recipe[] = bootRecipes.filter(r =>
    r.id !== editingRecipeId &&
    r.outputQuantity != null && r.outputQuantity > 0 &&
    r.outputUnit != null
  );

  const resolveComponentCost = (ing: RecipeIngredient, qty: number, unit: Unit, fallback?: number): number => {
    if (ing.componentType === 'subproduct') {
      const sub = subproducts.find(s => s.id === ing.subproductRecipeId);
      if (!sub || sub.outputQuantity == null) return fallback ?? 0;
      return proportionalCost(sub.totalCost, sub.outputQuantity, toBaseQuantity(qty, unit));
    }
    const base = baseIngredients.find(i => i.id === ing.baseIngredientId);
    if (!base) return fallback ?? 0;
    return calculateIngredientCost(base.pricePerUnit, qty, unit);
  };

  const addComponentToRecipe = () => {
    if (!selectedValue || !newQuantity) return;
    const qty = parseFloat(newQuantity);
    if (!qty || qty <= 0) return;

    const isManual = selectedValue === '__manual__';
    const [type, id] = isManual ? [] : selectedValue.split(':');

    let row: RecipeIngredient | null = null;
    if (isManual) {
      const name = manualName.trim();
      const pricePerUnit = parseFloat(manualPricePerUnit);
      if (!name || !pricePerUnit || pricePerUnit <= 0) return;
      const normalized = convertToBaseUnit(qty, newUnit);
      row = {
        id: crypto.randomUUID(),
        baseIngredientId: null,
        ingredientName: name,
        quantityUsed: normalized.quantity,
        unit: normalized.unit,
        cost: pricePerUnit * normalized.quantity,
        componentType: 'ingredient',
      };
    } else if (type === 'subproduct') {
      const sub = subproducts.find(s => s.id === id);
      if (!sub || sub.outputUnit == null || sub.outputQuantity == null) return;
      const normalized = convertToBaseUnit(qty, newUnit);
      row = {
        id: crypto.randomUUID(),
        baseIngredientId: null,
        ingredientName: sub.name,
        quantityUsed: normalized.quantity,
        unit: normalized.unit,
        cost: proportionalCost(sub.totalCost, sub.outputQuantity, normalized.quantity),
        componentType: 'subproduct',
        subproductRecipeId: sub.id,
        subproductRecipeName: sub.name,
      };
    } else {
      const base = baseIngredients.find(i => i.id === id);
      if (!base) return;
      const normalized = convertToBaseUnit(qty, newUnit);
      row = {
        id: crypto.randomUUID(),
        baseIngredientId: base.id,
        ingredientName: base.name,
        quantityUsed: normalized.quantity,
        unit: normalized.unit,
        cost: calculateIngredientCost(base.pricePerUnit, qty, newUnit),
        componentType: 'ingredient',
      };
    }

    setCurrentRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), row as RecipeIngredient],
    }));
    setSelectedValue('');
    setNewQuantity('');
    setNewUnit('g');
    setManualName('');
    setManualPricePerUnit('');
  };

  const removeComponentFromRecipe = (id: string) => {
    setCurrentRecipe({
      ...currentRecipe,
      ingredients: currentRecipe.ingredients?.filter((ing: RecipeIngredient) => ing.id !== id) || [],
    });
    if (editingComponentId === id) setEditingComponentId(null);
  };

  const startEditComponent = (ing: RecipeIngredient) => {
    setEditingComponentId(ing.id);
    setEditingQuantity(String(ing.quantityUsed));
    setEditingUnit(ing.unit);
  };

  const saveEditComponent = (ingId: string) => {
    const qty = parseFloat(editingQuantity);
    if (!qty || qty <= 0) return;
    const normalized = convertToBaseUnit(qty, editingUnit);
    const updatedIngredients = (currentRecipe.ingredients || []).map((ing: RecipeIngredient) => {
      if (ing.id !== ingId) return ing;
      const cost = resolveComponentCost(ing, normalized.quantity, normalized.unit, ing.cost);
      return { ...ing, quantityUsed: normalized.quantity, unit: normalized.unit, cost };
    });
    setCurrentRecipe({ ...currentRecipe, ingredients: updatedIngredients });
    setEditingComponentId(null);
  };

  const addCostRow = () => {
    setCurrentRecipe(prev => ({
      ...prev,
      additionalCosts: [
        ...prev.additionalCosts,
        { key: CUSTOM_EXTRA_COST_KEY, label: '', value: '', isCustom: true },
      ],
    }));
  };

  const removeCostRow = (index: number) => {
    setCurrentRecipe(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.filter((_, i) => i !== index),
    }));
  };

  const updateCostRowValue = (index: number, value: string) => {
    setCurrentRecipe(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => i === index ? { ...row, value } : row),
    }));
  };

  const updateCostRowPreset = (index: number, option: string) => {
    setCurrentRecipe(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => {
        if (i !== index) return row;
        if (option === CUSTOM_EXTRA_COST_OPTION) {
          return { ...row, key: CUSTOM_EXTRA_COST_KEY, label: '', isCustom: true };
        }
        const preset = EXTRA_COST_PRESETS.find(p => p.key === option);
        if (!preset) return row;
        return { ...row, key: preset.key, label: preset.label, isCustom: false };
      }),
    }));
  };

  const updateCostRowLabel = (index: number, label: string) => {
    setCurrentRecipe(prev => ({
      ...prev,
      additionalCosts: prev.additionalCosts.map((row, i) => i === index ? { ...row, label } : row),
    }));
  };

  const resetCurrentRecipe = () => {
    setCurrentRecipe({ ...defaultDraft });
    storage.clearDraft();
  };

  // ── Cálculos en tiempo real ──
  const componentsCost = sumIngredientCosts(currentRecipe.ingredients);
  const minutes = parseFloat(currentRecipe.laborMinutes) || 0;
  const laborCost = (minutes / 60) * hourlyRate;
  const extraCostsTotal = currentRecipe.additionalCosts.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0);
  const totalCost = componentsCost + laborCost + extraCostsTotal;
  const units = parseFloat(currentRecipe.unitsProduced) || 0;
  const margin = parseFloat(currentRecipe.profitMargin) || 0;
  const costPerUnitNet = units > 0 ? totalCost / units : 0;
  const salePriceTotal = totalCost * (1 + margin / 100);
  const salePerUnit = units > 0 ? salePriceTotal / units : 0;

  const isNameValid = currentRecipe.name.trim().length > 0;
  const hasComponents = (currentRecipe.ingredients || []).length > 0;
  const isOutputValid = units > 0;
  const canSave = isNameValid && hasComponents && isOutputValid && (standalone || isIngredientsLocked);

  const getComponentName = (ing: RecipeIngredient) =>
    ing.componentType === 'subproduct'
      ? (ing.subproductRecipeName ?? ing.ingredientName)
      : (baseIngredients.find(i => i.id === ing.baseIngredientId)?.name || ing.ingredientName);

  const previewCost = (() => {
    if (!selectedValue || !newQuantity) return 0;
    const qty = parseFloat(newQuantity);
    if (selectedValue === '__manual__') {
      const pricePerUnit = parseFloat(manualPricePerUnit);
      if (!pricePerUnit || pricePerUnit <= 0) return 0;
      return pricePerUnit * toBaseQuantity(qty, newUnit);
    }
    const [type, id] = selectedValue.split(':');
    if (type === 'subproduct') {
      const sub = subproducts.find(s => s.id === id);
      if (!sub || sub.outputQuantity == null) return 0;
      return proportionalCost(sub.totalCost, sub.outputQuantity, toBaseQuantity(qty, newUnit));
    }
    const base = baseIngredients.find(i => i.id === id);
    if (!base) return 0;
    return calculateIngredientCost(base.pricePerUnit, qty, newUnit);
  })();

  const isManual = selectedValue === '__manual__';

  const saveRecipe = async () => {
    if (savingRef.current || isSaving) return;
    if (!canSave) return;
    const recipeCount = bootRecipes.length - (editingRecipeId ? 1 : 0);
    if (!guardUpgrade('recipes', recipeCount)) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const draftToSave = {
        name: currentRecipe.name.trim(),
        description: currentRecipe.description.trim(),
        ingredients: currentRecipe.ingredients,
        extraCosts: additionalCostsToExtraCosts(currentRecipe.additionalCosts),
        unitsProduced: units,
        profitMargin: margin,
        saleType: currentRecipe.saleType || 'unidad',
        totalCost,
        costPerUnit: salePerUnit,
        outputQuantity: null,
        outputUnit: null,
        laborMinutes: minutes,
      };

      const savedRecipe = await upsertRecipe(draftToSave, editingRecipeId ?? undefined);
      const nextRecipes = editingRecipeId
        ? bootRecipes.map(r => r.id === editingRecipeId ? savedRecipe : r)
        : [savedRecipe, ...bootRecipes];
      applyLocal({ recipes: nextRecipes });
      setEditingRecipeId(null);
      resetCurrentRecipe();
      toast.success(editingRecipeId ? 'Receta actualizada exitosamente' : 'Receta guardada exitosamente', { duration: 2500 });
      navigateWithTransition(router, '/recetas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar receta');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingRecipeId(null);
    resetCurrentRecipe();
  };

  if (!sandbox && baseIngredients.length === 0 && subproducts.length === 0) {
    return (
      <section className="bg-white rounded-[24px] border border-gray-100 p-8 text-center card-animate delay-200" style={stitchShadow}>
        <p className="text-[#5f5e5e] text-[16px] leading-[1.5] mb-4">
          Primero debes agregar ingredientes al inventario o crear subproductos para poder armar una receta.
        </p>
        <a
          href="/inventario"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#b80049] text-white rounded-full text-[14px] font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">inventory</span>
          Ir al Inventario
        </a>
      </section>
    );
  }

  return (
    <>
      <div id="recipe-builder" className="space-y-8 scroll-mt-20">

        {/* ── Armador de Receta ── */}
        <article className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 card-animate delay-200" style={stitchShadow}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#b80049] text-[28px]">receipt_long</span>
            <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>
              {standalone ? 'Armador de Receta' : '2. Armador de Receta'}
            </h2>
          </div>

          {sandbox && (
            <div className="px-4 py-3 rounded-lg bg-[#ffd9de]/20 border border-[#e4bdc2]/30 text-[#5f5e5e] text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">science</span>
              Borrador temporal de simulación: nada se guarda hasta presionar &quot;Guardar como Receta Oficial&quot;.
            </div>
          )}

          {!standalone && !isIngredientsLocked && (
            <div className="px-4 py-3 rounded-lg bg-[#ffd9de]/20 border border-[#e4bdc2]/30 text-[#5f5e5e] text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Bloqueá el inventario para poder guardar recetas.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Nombre de la Receta</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: Pastel de Chocolate Especial"
                type="text"
                value={currentRecipe.name}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Descripción (opcional)</label>
              <textarea
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8] resize-none"
                placeholder="Ej: Bizcochuelo de vainilla con relleno de crema y frutillas."
                rows={2}
                value={currentRecipe.description}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Rendimiento (Porciones)</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: 12"
                type="number"
                min="0"
                value={currentRecipe.unitsProduced ?? ''}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, unitsProduced: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Minutos de trabajo activo (opcional)</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: 45"
                type="number"
                min="0"
                step="any"
                value={currentRecipe.laborMinutes ?? ''}
                onChange={(e) => setCurrentRecipe({ ...currentRecipe, laborMinutes: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            {/* Header de la grilla */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-end mb-2">
              <div className="col-span-6">
                <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">INGREDIENTE / SUBPRODUCTO</label>
              </div>
              <div className="col-span-3">
                <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">CANT. USADA</label>
              </div>
              <div className="col-span-3 text-right">
                <label className="block text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mb-2 uppercase text-[10px]">COSTO CALC.</label>
              </div>
            </div>

            {/* Componentes agregados */}
            {currentRecipe.ingredients?.map((ing: RecipeIngredient) => (
              editingComponentId === ing.id ? (
                <div key={ing.id} className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center mb-2">
                  <div className="w-full md:w-1/2">
                    <span className="text-[16px] leading-[1.5] font-medium text-[#151c27]">{getComponentName(ing)}</span>
                    <span className="block text-xs text-[#5f5e5e] font-normal">editando cantidad...</span>
                  </div>
                  <div className="w-full md:w-1/4 flex gap-2">
                    <input
                      className="interactive-input flex-1 min-w-0 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27]"
                      type="number" min="0" placeholder="250"
                      value={editingQuantity}
                      onChange={(e) => setEditingQuantity(e.target.value)}
                      autoFocus
                    />
                    <select
                      className="interactive-input w-24 shrink-0 px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e]"
                      value={editingUnit}
                      onChange={(e) => setEditingUnit(e.target.value as Unit)}
                    >
                      {UNIT_OPTIONS.map(u => (
                        <option key={u} value={u}>{u === 'unidad' ? 'unidad' : u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-4">
                    <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
                    <span className="text-[18px] leading-[1.2] text-[#151c27] font-semibold">
                      {editingQuantity
                        ? formatCurrency(resolveComponentCost(ing, parseFloat(editingQuantity) || 0, editingUnit, ing.cost))
                        : '$0,00'}
                    </span>
                    <button onClick={() => saveEditComponent(ing.id)}
                      className="interactive-btn text-[#b80049] hover:text-[#900038] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffd9de]">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </button>
                    <button onClick={() => setEditingComponentId(null)}
                      className="interactive-btn text-[#5f5e5e] hover:text-[#151c27] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f3ff]">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div key={ing.id} className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center mb-2 interactive-row">
                  <div className="w-full md:w-1/2">
                    <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] mr-1">Ítem:</span>
                    <span className="text-[16px] leading-[1.5] font-medium text-[#151c27]">{getComponentName(ing)}</span>
                    {ing.componentType === 'subproduct' && (
                      <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full bg-[#ffd9de] text-[#b80049] text-[10px] leading-[1.4] tracking-[0.05em] font-semibold whitespace-nowrap align-middle">
                        Subproducto
                      </span>
                    )}
                  </div>
                  <div className="w-full md:w-1/4 flex items-center gap-2 md:justify-center">
                    <span className="md:hidden text-xs text-[#5f5e5e]">Cantidad:</span>
                    <span className="text-sm text-[#151c27]">{ing.quantityUsed} {ing.unit}</span>
                    <button
                      onClick={() => startEditComponent(ing)}
                      className="interactive-btn text-[#5f5e5e] hover:text-[#b80049] transition-colors"
                      title="Editar cantidad"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                  </div>
                  <div className="w-full md:w-1/4 flex justify-between md:justify-end items-center gap-2">
                    <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
                    <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">{formatCurrency(ing.cost)}</span>
                    <button
                      onClick={() => removeComponentFromRecipe(ing.id)}
                      className="interactive-btn text-[#ba1a1a] hover:text-[#ffffff] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffdad6]"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              )
            ))}

            {/* Selector para nuevo componente */}
            <form
              noValidate
              onSubmit={(e) => { e.preventDefault(); addComponentToRecipe(); }}
              className="bg-[#ffd9de]/10 p-4 rounded-xl border border-[#e4bdc2]/30 flex flex-col md:flex-row gap-4 items-center"
            >
              <div className="w-full md:w-1/2">
                {isManual ? (
                  <input
                    className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                    placeholder="Nombre del ingrediente de prueba (ej: Harina test)"
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                ) : (
                  <Select
                    value={selectedValue || undefined}
                    onValueChange={(val) => {
                      setSelectedValue(val);
                      if (val === '__manual__') {
                        setNewUnit('g');
                        return;
                      }
                      const [type, id] = val.split(':');
                      if (type === 'subproduct') {
                        const sub = subproducts.find(s => s.id === id);
                        if (sub?.outputUnit) setNewUnit(sub.outputUnit);
                      } else {
                        const base = baseIngredients.find(i => i.id === id);
                        if (base) setNewUnit(base.unit);
                      }
                    }}
                  >
                    <SelectTrigger className="interactive-input w-full truncate rounded-lg border border-gray-200 bg-white px-4 py-3 text-[16px] text-[#5f5e5e] justify-between gap-2">
                      <SelectValue placeholder="Seleccionar ingrediente o subproducto..." />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" className="bg-white border border-gray-200 rounded-xl shadow-lg max-w-[min(24rem,calc(100vw-2rem))]">
                      {sortedBaseIngredients.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[#b80049] font-bold uppercase tracking-wide text-[10px] px-2 py-1.5">Ingredientes</SelectLabel>
                          {sortedBaseIngredients.map(ing => (
                            <SelectItem
                              key={`ingredient:${ing.id}`}
                              value={`ingredient:${ing.id}`}
                              className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                            >
                              {ing.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {subproducts.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[#b80049] font-bold uppercase tracking-wide text-[10px] px-2 py-1.5">Subproductos</SelectLabel>
                          {subproducts.map(sub => (
                            <SelectItem
                              key={`subproduct:${sub.id}`}
                              value={`subproduct:${sub.id}`}
                              className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                            >
                              {sub.name} — rinde {sub.outputQuantity} {sub.outputUnit}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        <SelectLabel className="text-[#b80049] font-bold uppercase tracking-wide text-[10px] px-2 py-1.5">Prueba manual</SelectLabel>
                        <SelectItem
                          value="__manual__"
                          className="text-[#151c27] truncate focus:bg-[#ffd9de] focus:text-[#400014]"
                        >
                          ➕ Ingrediente de prueba (manual)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="w-full md:w-1/4 grid grid-cols-2 gap-2">
                <input
                  className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                  type="number" min="0" placeholder="250"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
                <div className="relative">
                  <select
                    className="interactive-input w-full appearance-none px-2 py-3 rounded-lg border border-gray-200 bg-white text-[#5f5e5e] text-[16px] text-center"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as Unit)}
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u === 'unidad' ? 'unidad' : u}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#5f5e5e]">
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </div>
                </div>
              </div>
              <div className={`w-full ${isManual ? 'md:w-1/3' : 'md:w-1/4'} flex items-center justify-end gap-2`}>
                {isManual && (
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
                <span className="md:hidden text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Costo:</span>
                <span className="text-[18px] leading-[1.2] text-[#151c27] font-semibold whitespace-nowrap">
                  {selectedValue && newQuantity ? formatCurrency(previewCost) : '$0,00'}
                </span>
                <button
                  type="submit"
                  className="interactive-btn text-[#b80049] hover:text-[#900038] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffd9de]"
                  title="Agregar"
                >
                  <span className="material-symbols-outlined text-[24px]">add_circle</span>
                </button>
              </div>
            </form>
          </div>
        </article>

        {/* ── Costos Adicionales + Resumen ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Costos Adicionales */}
          <div id="col-costos-adicionales">
            <article className="bg-white rounded-[24px] border border-gray-100 p-8 card-animate delay-300" style={stitchShadow}>
              <div className="flex items-center gap-3 mb-8">
                <span className="material-symbols-outlined text-[#b80049] text-[28px]">local_shipping</span>
                <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={stitchFontManrope}>3. Costos Adicionales</h2>
              </div>

              <form
                noValidate
                onSubmit={(e) => { e.preventDefault(); addCostRow(); }}
                className="space-y-6"
              >
                {currentRecipe.additionalCosts.map((row, index) => {
                  const usedKeys = currentRecipe.additionalCosts
                    .filter((r, i) => i !== index && !r.isCustom)
                    .map(r => r.key);
                  return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                        <select
                          className="interactive-input w-full sm:w-56 px-3 py-2.5 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] text-sm"
                          value={row.isCustom ? CUSTOM_EXTRA_COST_OPTION : row.key}
                          onChange={(e) => updateCostRowPreset(index, e.target.value)}
                        >
                          {EXTRA_COST_PRESETS.map(preset => (
                            <option key={preset.key} value={preset.key} disabled={usedKeys.includes(preset.key)}>
                              {preset.label}
                            </option>
                          ))}
                          <option value={CUSTOM_EXTRA_COST_OPTION}>Otro...</option>
                        </select>
                        {row.isCustom && (
                          <input
                            className="interactive-input w-full sm:w-56 px-3 py-2.5 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-[#151c27] text-sm"
                            placeholder="Ej: Moldes descartables"
                            type="text"
                            value={row.label}
                            onChange={(e) => updateCostRowLabel(index, e.target.value)}
                          />
                        )}
                      </div>
                      <div className="relative w-full sm:w-32">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#c5c7c8] pointer-events-none">$</span>
                        <input
                          className="interactive-input w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 bg-[#f9f9ff] focus:bg-white text-right text-[#151c27] placeholder:text-[#c5c7c8]"
                          placeholder="0" type="number" min="0"
                          value={row.value}
                          onChange={(e) => updateCostRowValue(index, e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCostRow(index)}
                        className="interactive-btn text-[#ba1a1a] hover:text-[#ffffff] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ffdad6] shrink-0"
                        title="Quitar costo"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  );
                })}
                <button
                  type="submit"
                  className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] rounded-full text-[16px] font-medium border border-gray-200"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Agregar costo adicional
                </button>
              </form>

              <hr className="border-gray-100 my-6" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] leading-[1.4] tracking-[0.05em] font-bold text-[#b80049]">Margen de Ganancia (%)</h3>
                  <p className="text-[12px] text-[#5a5c5d]">Porcentaje extra sobre el costo total</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-20">
                    <input
                      className="interactive-input w-full px-4 py-2 rounded-lg border-2 border-[#ffd9de] bg-white text-center text-[#b80049] font-semibold placeholder:text-[#c5c7c8]"
                      placeholder="Ej: 40" type="number" min="0" max="500"
                      value={currentRecipe.profitMargin ?? ''}
                      onChange={(e) => setCurrentRecipe({ ...currentRecipe, profitMargin: e.target.value })}
                    />
                  </div>
                  <span className="text-[#b80049] font-bold">%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {[10, 20, 30, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCurrentRecipe({ ...currentRecipe, profitMargin: String(pct) })}
                    className={`interactive-btn px-4 py-1.5 rounded-full transition-colors text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-xs ${
                      String(currentRecipe.profitMargin) === String(pct)
                        ? 'bg-[#ffd9de] text-[#400014]'
                        : 'bg-[#ffd9de]/30 text-[#b80049] hover:bg-[#ffd9de]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </article>
          </div>

          {/* Resumen Total */}
          <div id="col-resumen-total">
            <article
              className="bg-[#b80049] rounded-[32px] p-8 text-white card-animate delay-400"
              style={{ boxShadow: '0 20px 50px rgba(184, 0, 73, 0.3)' }}
            >
              <h2
                className="font-bold text-[28px] mb-8"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Resumen Total
              </h2>
              <div className="space-y-4 text-sm text-[#ffb2be]" style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', lineHeight: '1.5' }}>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span>Subtotal Ingredientes:</span>
                  <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(componentsCost)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span>Mano de Obra{minutes > 0 ? ` (${minutes} min × ${formatCurrency(hourlyRate)}/h)` : ''}:</span>
                  <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(laborCost)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span>Costos Extras / Packaging:</span>
                  <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(extraCostsTotal)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-4">
                  <span>Costo Total Neto:</span>
                  <span className="text-white font-medium" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '500', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-white text-base">Precio de Venta Sugerido ({margin}%):</span>
                  <span className="text-white font-bold text-lg" style={{ fontSize: '20px', lineHeight: '1.2', fontWeight: '700', fontFamily: "'Inter', sans-serif" }}>{formatCurrency(salePriceTotal)}</span>
                </div>
              </div>

              {hourlyRate === 0 && (
                <p className="mt-4 text-[13px] text-[#ffd9de]">
                  Configurá tu valor hora en Inventario para calcular la mano de obra automáticamente.
                </p>
              )}

              <div className="mt-10 pt-6 border-t border-white/20">
                <p
                  className="uppercase tracking-widest text-[#ffd9de] mb-1 text-[10px] font-bold"
                  style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
                >
                  COSTO POR UNIDAD
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-extrabold text-[42px] leading-none" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: '800' }}>{formatCurrency(costPerUnitNet)}</span>
                  <span className="text-[#ffb2be] text-sm">/ porción</span>
                </div>
                <p className="text-[13px] text-[#ffd9de] mb-8">
                  Precio sugerido por porción: {formatCurrency(salePerUnit)}
                </p>
                <button
                  onClick={saveRecipe}
                  disabled={!canSave || isSaving}
                  className="interactive-btn w-full py-4 bg-white text-[#b80049] rounded-full font-bold tracking-wider hover:bg-[#ffd9de] hover:text-[#400014] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
                >
                  {isSaving ? 'GUARDANDO...' : (editingRecipeId ? 'ACTUALIZAR RECETA' : sandbox ? 'GUARDAR COMO RECETA OFICIAL' : 'GUARDAR RECETA')}
                </button>
                {!canSave && (
                  <p className="mt-3 text-center text-[13px] text-[#ffd9de]">
                    {!isNameValid ? 'Completá el nombre.' : !hasComponents ? 'Agregá al menos un ingrediente o subproducto.' : !isOutputValid ? 'Completá el rendimiento (porciones).' : 'Bloqueá el inventario para poder guardar recetas.'}
                  </p>
                )}
                {editingRecipeId && (
                  <button
                    onClick={cancelEdit}
                    className="interactive-btn mt-2 w-full py-2.5 bg-transparent border border-white text-white rounded-full font-bold hover:bg-white/10 transition-colors"
                    style={{ fontSize: '14px', letterSpacing: '0.05em', lineHeight: '1.4', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}
                  >
                    CANCELAR
                  </button>
                )}
              </div>
            </article>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={upgradeType !== null}
        onOpenChange={(open) => { if (!open) closeUpgrade(); }}
        resourceType={upgradeType ?? 'recipes'}
      />
    </>
  );
}