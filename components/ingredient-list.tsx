'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BaseIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';
import {
  fetchIngredients,
  fetchDeletedIngredients,
  updateIngredient,
  softDeleteIngredient,
  restoreIngredient,
  upsertIngredient,
} from '@/lib/ingredients-db';
import { formatCurrency } from '@/lib/cost';
import { convertToBaseUnit } from '@/lib/units';
import { withClockSkewRetry } from '@/lib/retry';
import { FREE_TIER_INGREDIENTS_LIMIT } from '@/lib/limits';
import { useUpgradeGuard } from '@/hooks/use-upgrade-guard';
import { UpgradeModal } from '@/components/upgrade-modal';
import { useAppBoot } from '@/components/boot/app-boot-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IngredientListProps {
  onLockChange?: (isLocked: boolean) => void;
  onIngredientsChange?: (ingredients: BaseIngredient[]) => void;
  ingredientsVersion?: number;
  lockEnabled?: boolean;
  title?: string;
}

const WELCOME_DISMISSED_KEY_PREFIX = 'cr-onboarding-welcome-dismissed';
const welcomeDismissedKey = (userId: string) => `${WELCOME_DISMISSED_KEY_PREFIX}:${userId}`;

export function IngredientList({
  onLockChange,
  onIngredientsChange,
  ingredientsVersion = 0,
  lockEnabled = true,
  title = '1. Inventario de Ingredientes',
}: IngredientListProps) {
  const [ingredients, setIngredients] = useState<BaseIngredient[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { upgradeType, closeUpgrade, guardUpgrade, loading: guardLoading } = useUpgradeGuard();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<BaseIngredient | null>(null);
  const [view, setView] = useState<'active' | 'trash'>('active');
  const [deletedIngredients, setDeletedIngredients] = useState<BaseIngredient[]>([]);
  const { ready, user, ingredients: bootIngredients, recipes: bootRecipes, applyLocal } = useAppBoot();
  const router = useRouter();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const prevIngredientsCountRef = useRef<number | null>(null);
  const milestoneShownRef = useRef(false);

  // Estado para edición inline de un ingrediente existente
  const [editInlineData, setEditInlineData] = useState({
    name: '',
    purchasedQuantity: '',
    unit: 'g' as Unit,
    totalPrice: '',
  });

  const handleLockToggle = (locked: boolean) => {
    if (!lockEnabled) return;
    setIsLocked(locked);
    storage.saveIsLocked(locked);
    onLockChange?.(locked);
  };
  
  const [formData, setFormData] = useState({
    name: '',
    purchasedQuantity: '',
    unit: 'kg' as Unit,
    totalPrice: '',
  });

  // Cargar ingredientes desde Supabase (ordenados A-Z por nombre)
  const loadIngredients = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await withClockSkewRetry(() => fetchIngredients());
      const sorted = [...data].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setIngredients(sorted);
      applyLocal({ ingredients: sorted });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar ingredientes';
      toast.error(message);
      console.error('[loadIngredients]', err);
    } finally {
      setIsLoading(false);
    }
  }, [applyLocal]);

  useEffect(() => {
    if (!lockEnabled) return;
    const savedLocked = storage.getIsLocked();
    setIsLocked(savedLocked);
    onLockChange?.(savedLocked);
  }, [onLockChange, lockEnabled]);

  // Seed inicial desde el boot cache (evita el fetch inicial duplicado)
  useEffect(() => {
    if (!ready) return;
    if (ingredients.length === 0) {
      const sorted = [...bootIngredients].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setIngredients(sorted);
    }
    setIsLoading(false);
  }, [ready, bootIngredients, ingredients.length]);

  // Cargar la papelera (soft delete) para el contador y la vista Papelera
  useEffect(() => {
    let cancelled = false;
    fetchDeletedIngredients()
      .then(data => { if (!cancelled) setDeletedIngredients(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Onboarding: recordar si el usuario ya cerró el modal de bienvenida.
  // La clave es por usuario: cada cuenta nueva ve el welcome una vez.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ready || !user) return;
    setWelcomeDismissed(Boolean(localStorage.getItem(welcomeDismissedKey(user.id))));
  }, [ready, user]);

  // Onboarding: al detectar el 2º ingrediente (y sin recetas), abrir el modal de hito
  useEffect(() => {
    if (isLoading || bootRecipes.length >= 1) return;
    const prev = prevIngredientsCountRef.current;
    prevIngredientsCountRef.current = ingredients.length;
    if (
      prev != null && prev < 2 && ingredients.length >= 2 &&
      !milestoneShownRef.current
    ) {
      milestoneShownRef.current = true;
      setMilestoneOpen(true);
    }
  }, [ingredients.length, isLoading, bootRecipes.length]);

  // Pre-carga del builder durante el onboarding: cuando el usuario cruce los
  // 2 ingredientes, el clic en "Ir a Recetas" entra con la vista caliente.
  useEffect(() => {
    if (!isLoading && ingredients.length < 2 && bootRecipes.length < 1) {
      router.prefetch('/recetas/nueva');
    }
  }, [isLoading, ingredients.length, bootRecipes.length, router]);

  // Pre-carga del builder apenas el modal de hito se vuelve visible.
  useEffect(() => {
    if (milestoneOpen) router.prefetch('/recetas/nueva');
  }, [milestoneOpen, router]);

  // Auto-desbloquear si no hay ingredientes (ej: al migrar a DB vacía con localStorage bloqueado)
  useEffect(() => {
    if (!lockEnabled) return;
    if (!isLoading && ingredients.length === 0 && isLocked) {
      setIsLocked(false);
      storage.saveIsLocked(false);
      onLockChange?.(false);
    }
  }, [isLoading, ingredients.length, isLocked, onLockChange, lockEnabled]);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    loadIngredients();
  }, [ingredientsVersion]);

  // Iniciar edición inline directo en la fila
  const startInlineEdit = (ingredient: BaseIngredient) => {
    setEditingId(ingredient.id);
    setEditInlineData({
      name: ingredient.name,
      purchasedQuantity: ingredient.purchasedQuantity.toString(),
      unit: ingredient.unit,
      totalPrice: ingredient.totalPrice.toString(),
    });
    // Cerrar el form de "añadir" si estaba abierto
    setIsAdding(false);
  };

  const saveInlineEdit = async (ingredient: BaseIngredient) => {
    if (savingRef.current || isSaving) return;
    const rawQuantity = parseFloat(editInlineData.purchasedQuantity);
    const price = parseFloat(editInlineData.totalPrice);
    const trimmedName = editInlineData.name.trim();
    if (!rawQuantity || !price || !trimmedName) return;

    const converted = convertToBaseUnit(rawQuantity, editInlineData.unit);
    const pricePerUnit = price / converted.quantity;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const updated = await updateIngredient(ingredient.id, {
        name: trimmedName,
        purchasedQuantity: converted.quantity,
        unit: converted.unit,
        totalPrice: price,
        pricePerUnit,
      });
      const next = ingredients.map(ing => ing.id === ingredient.id ? updated : ing);
      const sorted = [...next].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      setIngredients(sorted);
      applyLocal({ ingredients: sorted });
      onIngredientsChange?.(sorted);
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  // Guardar ingrediente nuevo
  const handleSave = async () => {
    if (savingRef.current || isSaving) return;
    if (!formData.name || !formData.purchasedQuantity || !formData.totalPrice) return;

    const normalizedName = formData.name.toLowerCase().trim();
    const exists = ingredients.some(ing => ing.name.toLowerCase().trim() === normalizedName);
    if (!exists && !guardUpgrade('ingredients', ingredients.length)) return;

    const rawQuantity = parseFloat(formData.purchasedQuantity);
    const price = parseFloat(formData.totalPrice);
    const converted = convertToBaseUnit(rawQuantity, formData.unit);
    const pricePerUnit = price / converted.quantity;

    // ── Optimistic UI: la tabla se actualiza al instante ──
    const snapshot = ingredients;
    const existing = ingredients.find(ing => ing.name.toLowerCase().trim() === normalizedName);
    const tempId = `temp-${crypto.randomUUID()}`;

    let optimisticNext: BaseIngredient[];
    if (existing) {
      // Predicción del merge idéntico al RPC upsert_ingredient (ON CONFLICT DO UPDATE)
      const mergedQty = existing.purchasedQuantity + converted.quantity;
      const mergedTotal = existing.totalPrice + price;
      const mergedRow: BaseIngredient = {
        ...existing,
        purchasedQuantity: mergedQty,
        totalPrice: mergedTotal,
        pricePerUnit: mergedTotal / mergedQty,
      };
      optimisticNext = ingredients.map(ing => ing.id === existing.id ? mergedRow : ing);
    } else {
      const optimisticRow: BaseIngredient = {
        id: tempId,
        name: formData.name,
        purchasedQuantity: converted.quantity,
        unit: converted.unit,
        totalPrice: price,
        pricePerUnit,
        deletedAt: null,
      };
      optimisticNext = [...ingredients, optimisticRow];
    }

    const optimisticSorted = [...optimisticNext].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    setIngredients(optimisticSorted);
    applyLocal({ ingredients: optimisticSorted });
    onIngredientsChange?.(optimisticSorted);
    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
    setIsAdding(false);

    // ── Persistencia en background + reconciliación con el server ──
    savingRef.current = true;
    setIsSaving(true);
    try {
      const savedIngredient = await upsertIngredient({
        name: formData.name,
        purchasedQuantity: converted.quantity,
        unit: converted.unit,
        totalPrice: price,
        pricePerUnit,
      });

      let replaced = false;
      const reconciled = optimisticSorted.map(ing => {
        if (ing.id === tempId || (existing && ing.id === existing.id)) {
          replaced = true;
          return savedIngredient;
        }
        return ing;
      });
      if (!replaced) reconciled.push(savedIngredient);

      const reconciledSorted = [...reconciled].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setIngredients(reconciledSorted);
      applyLocal({ ingredients: reconciledSorted });
      onIngredientsChange?.(reconciledSorted);
    } catch (err) {
      // Rollback al estado previo y devolución de los datos al formulario
      setIngredients(snapshot);
      applyLocal({ ingredients: snapshot });
      onIngredientsChange?.(snapshot);
      setFormData({
        name: formData.name,
        purchasedQuantity: formData.purchasedQuantity,
        unit: formData.unit,
        totalPrice: formData.totalPrice,
      });
      setIsAdding(true);
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (savingRef.current || isSaving) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await softDeleteIngredient(id);
      const removed = ingredients.find(ing => ing.id === id);
      const updated = ingredients.filter(ing => ing.id !== id);
      setIngredients(updated);
      applyLocal({ ingredients: updated });
      onIngredientsChange?.(updated);
      if (removed) {
        setDeletedIngredients(prev => [
          { ...removed, deletedAt: new Date().toISOString() },
          ...prev,
        ]);
      }
      toast.success('Ingrediente enviado a la papelera');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (savingRef.current || isSaving) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await restoreIngredient(id);
      const removed = deletedIngredients.find(ing => ing.id === id);
      setDeletedIngredients(prev => prev.filter(ing => ing.id !== id));
      if (removed) {
        const restored: BaseIngredient = { ...removed, deletedAt: null };
        const next = [...ingredients, restored].sort((a, b) =>
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );
        setIngredients(next);
        applyLocal({ ingredients: next });
        onIngredientsChange?.(next);
      }
      toast.success('Ingrediente restaurado correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al restaurar';
      toast.error(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
  };

  const totalInvestment = ingredients.reduce((sum, ing) => sum + ing.totalPrice, 0);
  const locked = lockEnabled && isLocked;
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDeleted = deletedIngredients.filter(ing =>
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  const showWelcome = !isLoading && view === 'active' && ingredients.length < 2 && !welcomeDismissed;

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(welcomeDismissedKey(user.id), '1');
    }
  };

  return (
    <>
      <article className="bg-stitch-surface-container-lowest rounded-[24px] border border-gray-100 dark:border-stitch-outline-variant/60 overflow-hidden card-animate delay-100" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
      <div className="p-8 border-b border-gray-100 dark:border-stitch-outline-variant/60 flex items-center gap-3">
        <span className="material-symbols-outlined text-stitch-primary text-[28px]">inventory_2</span>
        <h2 className="font-semibold text-[24px] leading-[1.3] text-stitch-on-surface" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{title}</h2>
      </div>

      {/* Tabs: Activos / Papelera */}
      <div className="px-8 pt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView('active')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            view === 'active'
              ? 'bg-[#b80049] text-white shadow-sm'
              : 'bg-stitch-surface-container-low text-stitch-on-surface-variant hover:text-stitch-on-surface'
          }`}
        >
          Activos ({ingredients.length})
        </button>
        <button
          type="button"
          onClick={() => setView('trash')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            view === 'trash'
              ? 'bg-[#b80049] text-white shadow-sm'
              : 'bg-stitch-surface-container-low text-stitch-on-surface-variant hover:text-stitch-on-surface'
          }`}
        >
          Papelera ({deletedIngredients.length})
        </button>
      </div>

      {(view === 'active' ? ingredients.length > 0 : deletedIngredients.length > 0) && (
        <div className="px-8 pt-4">
          <input
            className="interactive-input w-full sm:w-80 px-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface focus:bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim"
            placeholder={view === 'trash' ? 'Buscar en papelera...' : 'Buscar ingrediente...'}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-stitch-secondary">
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              <span className="text-sm font-medium">Cargando ingredientes...</span>
            </div>
          </div>
        ) : view === 'trash' ? (
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary uppercase border-b-2 border-stitch-surface-container-high">
                <th className="pb-4 pt-8 pl-8 font-semibold">INGREDIENTE</th>
                <th className="pb-4 pt-8 font-semibold">UNIDAD</th>
                <th className="pb-4 pt-8 font-semibold">ELIMINADO</th>
                <th className="pb-4 pt-8 w-32"></th>
              </tr>
            </thead>
            <tbody className="text-[16px] leading-[1.5] text-stitch-on-surface divide-y divide-gray-50 dark:divide-stitch-outline-variant/40">
              {deletedIngredients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stitch-secondary text-[16px]">
                    La papelera está vacía. Los insumos que elimines aparecerán acá y podrás restaurarlos.
                  </td>
                </tr>
              ) : filteredDeleted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stitch-secondary text-[16px]">
                    Sin resultados para &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredDeleted.map((ing) => (
                  <tr key={ing.id} className="interactive-row">
                    <td className="pl-8 py-4 font-medium">{ing.name}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stitch-surface-container-highest text-stitch-on-surface-variant">
                        {ing.unit}
                      </span>
                    </td>
                    <td className="py-4 text-stitch-secondary text-sm">
                      {ing.deletedAt ? new Date(ing.deletedAt).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td className="py-4 pr-8">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRestore(ing.id)}
                          disabled={isSaving}
                          className="interactive-btn flex items-center gap-1.5 px-3 py-2 text-stitch-primary hover:text-stitch-on-primary-fixed-variant rounded-lg hover:bg-stitch-primary-fixed text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Restaurar"
                        >
                          <span className="material-symbols-outlined text-[18px]">undo</span>
                          Restaurar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary uppercase border-b-2 border-stitch-surface-container-high">
                <th className="pb-4 pt-8 pl-8 font-semibold">INGREDIENTE</th>
                <th className="pb-4 pt-8 font-semibold">CANTIDAD</th>
                <th className="pb-4 pt-8 font-semibold">UNIDAD</th>
                <th className="pb-4 pt-8 font-semibold text-right pr-8">PRECIO TOTAL</th>
                {!locked && <th className="pb-4 pt-8 w-24"></th>}
              </tr>
            </thead>
            <tbody className="text-[16px] leading-[1.5] text-stitch-on-surface divide-y divide-gray-50 dark:divide-stitch-outline-variant/40">
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={!locked ? 5 : 4} className="p-8 text-center text-stitch-secondary text-[16px]">
                    Agrega ingredientes para registrar en el inventario.
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={!locked ? 5 : 4} className="p-8 text-center text-stitch-secondary text-[16px]">
                    Sin resultados para &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ingredient) => (
                  editingId === ingredient.id ? (
                    <tr key={ingredient.id} className="interactive-row bg-stitch-primary-fixed/10">
                      <td className="pl-8 py-3">
                        <input
                          className="interactive-input w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface text-sm"
                          type="text"
                          autoFocus
                          value={editInlineData.name}
                          onChange={(e) => setEditInlineData({ ...editInlineData, name: e.target.value })}
                          placeholder="Nombre"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          className="interactive-input w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface text-sm"
                          type="number" min="0" step="0.01"
                          value={editInlineData.purchasedQuantity}
                          onChange={(e) => setEditInlineData({ ...editInlineData, purchasedQuantity: e.target.value })}
                        />
                      </td>
                      <td className="py-3">
                        <select
                          className="interactive-input rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface text-sm px-2 py-2"
                          value={editInlineData.unit}
                          onChange={(e) => setEditInlineData({ ...editInlineData, unit: e.target.value as Unit })}
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="l">litros</option>
                          <option value="ml">ml</option>
                          <option value="unidad">unidad</option>
                        </select>
                      </td>
                      <td className="py-3 pr-8">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-stitch-secondary text-sm">$</span>
                          <input
                            className="interactive-input w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface text-sm text-right"
                            type="number" min="0" step="0.01"
                            value={editInlineData.totalPrice}
                            onChange={(e) => setEditInlineData({ ...editInlineData, totalPrice: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-8">
                        <div className="flex gap-1.5 items-center justify-end">
                          <button
                            onClick={() => saveInlineEdit(ingredient)}
                            disabled={isSaving}
                            className="interactive-btn flex items-center gap-1 px-3 py-1.5 bg-[#b80049] text-white rounded-lg text-xs font-bold"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            OK
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="interactive-btn p-1.5 text-stitch-secondary hover:text-stitch-on-surface rounded-lg hover:bg-stitch-surface-container-low"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={ingredient.id} className="interactive-row">
                      <td className="pl-8 py-4 font-medium">{ingredient.name}</td>
                      <td className="py-4">{ingredient.purchasedQuantity}</td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stitch-surface-container-highest text-stitch-on-surface-variant">
                          {ingredient.unit}
                        </span>
                      </td>
                      <td className="py-4 text-right text-stitch-primary text-[20px] leading-[1.2] font-medium pr-8">{formatCurrency(ingredient.totalPrice)}</td>
                      {!locked && (
                        <td className="py-4 pr-8">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => startInlineEdit(ingredient)}
                              className="interactive-btn p-1.5 text-stitch-secondary hover:text-stitch-primary rounded-lg hover:bg-stitch-surface-container-low"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(ingredient)}
                              disabled={isSaving}
                              className="interactive-btn p-1.5 text-stitch-secondary hover:text-stitch-error rounded-lg hover:bg-stitch-error-container/30 disabled:opacity-50"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulario para añadir ingrediente nuevo */}
      {view === 'active' && !locked && !isLoading && (isAdding ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          className="p-8 border-t border-gray-100 dark:border-stitch-outline-variant/60 bg-stitch-surface-container-low"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary">Nombre</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim"
                placeholder="Ej: Harina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary">Cantidad</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim"
                type="number" step="0.01" min="0"
                placeholder="10"
                value={formData.purchasedQuantity}
                onChange={(e) => setFormData({ ...formData, purchasedQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary">Unidad</label>
              <select
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">litros</option>
                <option value="ml">ml</option>
                <option value="unidad">unidad</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary">Total ($)</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface placeholder:text-stitch-tertiary-fixed-dim"
                type="number" step="0.01" min="0"
                placeholder="8500"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={handleCancel} className="interactive-btn px-6 py-3 bg-stitch-surface-container-high hover:bg-stitch-surface-container-highest text-stitch-on-surface rounded-full text-[16px] font-medium border border-gray-200 dark:border-stitch-outline-variant">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="interactive-btn px-6 py-3 bg-[#b80049] text-white rounded-full text-[16px] font-medium disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-8 border-t border-gray-100 dark:border-stitch-outline-variant/60">
          <button onClick={() => { if (guardLoading) return; if (guardUpgrade('ingredients', ingredients.length)) setIsAdding(true); }} className="interactive-btn flex items-center gap-2 px-6 py-3 bg-stitch-surface-container-high hover:bg-stitch-surface-container-highest text-stitch-on-surface rounded-full text-[16px] font-medium border border-gray-200 dark:border-stitch-outline-variant">
            <span className="material-symbols-outlined text-[20px]">add</span> Añadir Ingrediente
          </button>
        </div>
      ))}

      {/* Tarjeta de Resumen y Guardado */}
      {view === 'active' && ingredients.length > 0 && !isLoading && (
        <div className="bg-stitch-primary-fixed/20 p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-b-[24px]">
          <div>
            <p className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-stitch-secondary uppercase mb-1">Inversión total en ingredientes</p>
            <p className="font-bold text-[28px] md:text-[32px] leading-[1.2] tracking-[-0.01em] text-stitch-primary" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{formatCurrency(totalInvestment)}</p>
          </div>
          {lockEnabled && (
            <div className="flex gap-2">
              {isLocked ? (
                <button
                  onClick={() => handleLockToggle(false)}
                  className="interactive-btn flex items-center gap-2 px-6 py-3 bg-stitch-surface-container-high hover:bg-stitch-surface-container-highest text-stitch-on-surface rounded-full text-[16px] font-medium border border-gray-200 dark:border-stitch-outline-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                  Editar Inventario
                </button>
              ) : (
                <button
                  onClick={() => handleLockToggle(true)}
                  className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#b80049] text-white rounded-full text-[16px] font-medium"
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Guardar y Habilitar Recetas
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>

      <UpgradeModal
        open={upgradeType !== null}
        onOpenChange={(open) => { if (!open) closeUpgrade(); }}
        resourceType={upgradeType ?? 'ingredients'}
      />

      {/* Onboarding Paso 1: bienvenida (modal custom con backdrop difuminado) */}
      {showWelcome && (
        <div
          className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-welcome-title"
        >
          <div className="w-full max-w-md bg-stitch-surface-container-lowest rounded-[24px] p-6 md:p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stitch-primary-fixed">
              <span className="material-symbols-outlined text-stitch-primary" style={{ fontSize: 28 }}>bakery_dining</span>
            </div>
            <h2
              id="onboarding-welcome-title"
              className="text-xl font-bold text-stitch-on-surface mb-3"
              style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              ¡Te damos la bienvenida! 🎂
            </h2>
            <p className="text-sm leading-[1.6] text-stitch-secondary mb-6">
              Para comenzar a calcular costos de tus recetas, el primer paso es cargar al menos
              2 ingredientes en tu inventario.
            </p>
            <button
              type="button"
              onClick={dismissWelcome}
              className="w-full rounded-full bg-[#b80049] text-white font-semibold text-sm py-3.5 hover:bg-[#bc004b] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Paso 2: hito alcanzado (modal custom con backdrop difuminado) */}
      {milestoneOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-milestone-title"
        >
          <div className="w-full max-w-md bg-stitch-surface-container-lowest rounded-[24px] p-6 md:p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stitch-primary-fixed">
              <span className="material-symbols-outlined text-stitch-primary" style={{ fontSize: 28 }}>celebration</span>
            </div>
            <h2
              id="onboarding-milestone-title"
              className="text-xl font-bold text-stitch-on-surface mb-3"
              style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              ¡Excelente!
            </h2>
            <p className="text-sm leading-[1.6] text-stitch-secondary mb-6">
              ¡Excelente! Ya tenés la base. Ya podés ir a crear tu primera receta o seguir
              agregando más ingredientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setMilestoneOpen(false);
                  startTransition(() => {
                    router.push('/recetas/nueva');
                  });
                }}
                className="flex-1 rounded-full bg-[#b80049] text-white font-semibold text-sm py-3.5 hover:bg-[#bc004b] transition-colors"
              >
                Ir a Recetas
              </button>
              <button
                type="button"
                onClick={() => setMilestoneOpen(false)}
                className="flex-1 rounded-full border-2 border-stitch-outline-variant text-stitch-on-surface font-semibold text-sm py-3.5 hover:bg-stitch-surface-container-low transition-colors"
              >
                Seguir agregando
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm rounded-[24px] bg-stitch-surface-container-lowest border-stitch-outline-variant">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stitch-error-container">
              <span className="material-symbols-outlined text-stitch-error" style={{ fontSize: 24 }}>delete</span>
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-stitch-on-surface">
              ¿Eliminar ingrediente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-stitch-secondary leading-relaxed">
              ¿Estás seguro de que querés eliminar &quot;{deleteTarget?.name}&quot;? Esta acción puede
              afectar o desconfigurar las recetas y productos que utilicen este insumo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:flex-row gap-2">
            <AlertDialogCancel
              className="flex-1 rounded-md border border-stitch-outline-variant bg-stitch-surface-container-lowest text-stitch-on-surface font-semibold text-sm py-2.5 hover:bg-stitch-surface-container-low dark:bg-white/10 dark:hover:bg-white/15 transition-colors"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                const id = deleteTarget.id;
                setDeleteTarget(null);
                await handleDelete(id);
              }}
              disabled={isSaving}
              className="flex-1 rounded-md bg-[#ba1a1a] text-white font-semibold text-sm py-2.5 hover:bg-[#a31313] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
