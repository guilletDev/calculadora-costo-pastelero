'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { BaseIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';
import {
  fetchIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  upsertIngredient,
} from '@/lib/ingredients-db';

interface IngredientListProps {
  onLockChange?: (isLocked: boolean) => void;
  onIngredientsChange?: (ingredients: BaseIngredient[]) => void;
  ingredientsVersion?: number;
}

export function IngredientList({ onLockChange, onIngredientsChange, ingredientsVersion = 0 }: IngredientListProps) {
  const [ingredients, setIngredients] = useState<BaseIngredient[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para edición inline de un ingrediente existente
  const [editInlineData, setEditInlineData] = useState({
    name: '',
    purchasedQuantity: '',
    unit: 'g' as Unit,
    totalPrice: '',
  });

  const handleLockToggle = (locked: boolean) => {
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
      const data = await fetchIngredients();
      const sorted = [...data].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setIngredients(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar ingredientes';
      toast.error(message);
      console.error('[loadIngredients]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
    const savedLocked = storage.getIsLocked();
    setIsLocked(savedLocked);
    onLockChange?.(savedLocked);
  }, []);

  // Auto-desbloquear si no hay ingredientes (ej: al migrar a DB vacía con localStorage bloqueado)
  useEffect(() => {
    if (!isLoading && ingredients.length === 0 && isLocked) {
      setIsLocked(false);
      storage.saveIsLocked(false);
      onLockChange?.(false);
    }
  }, [isLoading, ingredients.length, isLocked, onLockChange]);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    loadIngredients();
  }, [ingredientsVersion]);

  const toBaseUnit = (quantity: number, unit: Unit): { quantity: number; unit: Unit } => {
    if (unit === 'kg') return { quantity: quantity * 1000, unit: 'g' };
    if (unit === 'l') return { quantity: quantity * 1000, unit: 'ml' };
    return { quantity, unit };
  };

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
    const rawQuantity = parseFloat(editInlineData.purchasedQuantity);
    const price = parseFloat(editInlineData.totalPrice);
    const trimmedName = editInlineData.name.trim();
    if (!rawQuantity || !price || !trimmedName) return;

    const converted = toBaseUnit(rawQuantity, editInlineData.unit);
    const pricePerUnit = price / converted.quantity;

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
      onIngredientsChange?.(sorted);
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  // Guardar ingrediente nuevo
  const handleSave = async () => {
    if (!formData.name || !formData.purchasedQuantity || !formData.totalPrice) return;

    const rawQuantity = parseFloat(formData.purchasedQuantity);
    const price = parseFloat(formData.totalPrice);
    const converted = toBaseUnit(rawQuantity, formData.unit);
    const pricePerUnit = price / converted.quantity;

    setIsSaving(true);
    try {
      const { ingredient: savedIngredient, isNew } = await upsertIngredient(
        {
          name: formData.name,
          purchasedQuantity: converted.quantity,
          unit: converted.unit,
          totalPrice: price,
          pricePerUnit,
        },
        ingredients
      );

      const raw = isNew
        ? [...ingredients, savedIngredient]
        : ingredients.map(ing => ing.id === savedIngredient.id ? savedIngredient : ing);
      const sorted = [...raw].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      setIngredients(sorted);
      onIngredientsChange?.(sorted);

      setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
      setIsAdding(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await deleteIngredient(id);
      const updated = ingredients.filter(ing => ing.id !== id);
      setIngredients(updated);
      onIngredientsChange?.(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
  };

  const totalInvestment = ingredients.reduce((sum, ing) => sum + ing.totalPrice, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <article className="bg-white rounded-[24px] border border-gray-100 overflow-hidden card-animate delay-100" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
      <div className="p-8 border-b border-gray-100 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#b80049] text-[28px]">inventory_2</span>
        <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27]" style={{ fontFamily: "'Manrope', sans-serif" }}>1. Inventario de Ingredientes</h2>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-[#5f5e5e]">
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              <span className="text-sm font-medium">Cargando ingredientes...</span>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase border-b-2 border-[#e2e8f8]">
                <th className="pb-4 pt-8 pl-8 font-semibold">INGREDIENTE</th>
                <th className="pb-4 pt-8 font-semibold">CANTIDAD</th>
                <th className="pb-4 pt-8 font-semibold">UNIDAD</th>
                <th className="pb-4 pt-8 font-semibold text-right pr-8">PRECIO TOTAL</th>
                {!isLocked && <th className="pb-4 pt-8 w-24"></th>}
              </tr>
            </thead>
            <tbody className="text-[16px] leading-[1.5] text-[#151c27] divide-y divide-gray-50">
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={!isLocked ? 5 : 4} className="p-8 text-center text-[#5f5e5e] text-[16px]">
                    Agrega ingredientes para registrar en el inventario.
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => (
                  editingId === ingredient.id ? (
                    <tr key={ingredient.id} className="interactive-row bg-[#ffd9de]/10">
                      <td className="pl-8 py-3">
                        <input
                          className="interactive-input w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[#151c27] text-sm"
                          type="text"
                          autoFocus
                          value={editInlineData.name}
                          onChange={(e) => setEditInlineData({ ...editInlineData, name: e.target.value })}
                          placeholder="Nombre"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          className="interactive-input w-24 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[#151c27] text-sm"
                          type="number" min="0" step="0.01"
                          value={editInlineData.purchasedQuantity}
                          onChange={(e) => setEditInlineData({ ...editInlineData, purchasedQuantity: e.target.value })}
                        />
                      </td>
                      <td className="py-3">
                        <select
                          className="interactive-input rounded-lg border border-gray-200 bg-white text-[#151c27] text-sm px-2 py-2"
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
                          <span className="text-[#5f5e5e] text-sm">$</span>
                          <input
                            className="interactive-input w-28 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[#151c27] text-sm text-right"
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
                            className="interactive-btn p-1.5 text-[#5f5e5e] hover:text-[#151c27] rounded-lg hover:bg-[#f0f3ff]"
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#dce2f3] text-[#5b3f43]">
                          {ingredient.unit}
                        </span>
                      </td>
                      <td className="py-4 text-right text-[#b80049] text-[20px] leading-[1.2] font-medium pr-8">{formatCurrency(ingredient.totalPrice)}</td>
                      {!isLocked && (
                        <td className="py-4 pr-8">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => startInlineEdit(ingredient)}
                              className="interactive-btn p-1.5 text-[#5f5e5e] hover:text-[#b80049] rounded-lg hover:bg-[#f0f3ff]"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(ingredient.id)}
                              disabled={isSaving}
                              className="interactive-btn p-1.5 text-[#5f5e5e] hover:text-[#ba1a1a] rounded-lg hover:bg-[#ffdad6]/30 disabled:opacity-50"
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
      {!isLocked && !isLoading && (isAdding ? (
        <div className="p-8 border-t border-gray-100 bg-[#f0f3ff]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Nombre</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                placeholder="Ej: Harina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Cantidad</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                type="number" step="0.01" min="0"
                placeholder="10"
                value={formData.purchasedQuantity}
                onChange={(e) => setFormData({ ...formData, purchasedQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Unidad</label>
              <select
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27]"
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
              <label className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e]">Total ($)</label>
              <input
                className="interactive-input w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#151c27] placeholder:text-[#c5c7c8]"
                type="number" step="0.01" min="0"
                placeholder="8500"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={handleCancel} className="interactive-btn px-6 py-3 bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] rounded-full text-[16px] font-medium border border-gray-200">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="interactive-btn px-6 py-3 bg-[#b80049] text-white rounded-full text-[16px] font-medium disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 border-t border-gray-100">
          <button onClick={() => setIsAdding(true)} className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] rounded-full text-[16px] font-medium border border-gray-200">
            <span className="material-symbols-outlined text-[20px]">add</span> Añadir Ingrediente
          </button>
        </div>
      ))}

      {/* Tarjeta de Resumen y Guardado */}
      {ingredients.length > 0 && !isLoading && (
        <div className="bg-[#ffd9de]/20 p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-b-[24px]">
          <div>
            <p className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase mb-1">Inversión total en ingredientes</p>
            <p className="font-bold text-[28px] md:text-[32px] leading-[1.2] tracking-[-0.01em] text-[#b80049]" style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(totalInvestment)}</p>
          </div>
          <div className="flex gap-2">
            {isLocked ? (
              <button
                onClick={() => handleLockToggle(false)}
                className="interactive-btn flex items-center gap-2 px-6 py-3 bg-[#e2e8f8] hover:bg-[#dce2f3] text-[#151c27] rounded-full text-[16px] font-medium border border-gray-200"
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
        </div>
      )}
    </article>
  );
}
