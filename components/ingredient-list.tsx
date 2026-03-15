'use client';

import { useState, useEffect } from 'react';
import { BaseIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';

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

  // Estado para edición inline de un ingrediente existente
  const [editInlineData, setEditInlineData] = useState({
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

  useEffect(() => {
    const savedIngredients = storage.getIngredients();
    const savedLocked = storage.getIsLocked();
    setIngredients(savedIngredients);
    setIsLocked(savedLocked);
    onLockChange?.(savedLocked);
  }, []);

  useEffect(() => {
    if (ingredientsVersion === 0) return;
    setIngredients(storage.getIngredients());
  }, [ingredientsVersion]);

  const updateIngredients = (updated: BaseIngredient[]) => {
    setIngredients(updated);
    storage.saveIngredients(updated);
    onIngredientsChange?.(updated);
  };

  const toBaseUnit = (quantity: number, unit: Unit): { quantity: number; unit: Unit } => {
    if (unit === 'kg') return { quantity: quantity * 1000, unit: 'g' };
    if (unit === 'l') return { quantity: quantity * 1000, unit: 'ml' };
    return { quantity, unit };
  };

  // Iniciar edición inline directo en la fila
  const startInlineEdit = (ingredient: BaseIngredient) => {
    setEditingId(ingredient.id);
    setEditInlineData({
      purchasedQuantity: ingredient.purchasedQuantity.toString(),
      unit: ingredient.unit,
      totalPrice: ingredient.totalPrice.toString(),
    });
    // Cerrar el form de "añadir" si estaba abierto
    setIsAdding(false);
  };

  const saveInlineEdit = (ingredient: BaseIngredient) => {
    const rawQuantity = parseFloat(editInlineData.purchasedQuantity);
    const price = parseFloat(editInlineData.totalPrice);
    if (!rawQuantity || !price) return;

    const converted = toBaseUnit(rawQuantity, editInlineData.unit);
    const pricePerUnit = price / converted.quantity;

    const updated = ingredients.map(ing =>
      ing.id === ingredient.id
        ? { ...ing, purchasedQuantity: converted.quantity, unit: converted.unit, totalPrice: price, pricePerUnit }
        : ing
    );
    updateIngredients(updated);
    setEditingId(null);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
  };

  // Guardar ingrediente nuevo
  const handleSave = () => {
    if (!formData.name || !formData.purchasedQuantity || !formData.totalPrice) return;

    const normalizedName = formData.name.toLowerCase().trim();
    const rawQuantity = parseFloat(formData.purchasedQuantity);
    const price = parseFloat(formData.totalPrice);
    const converted = toBaseUnit(rawQuantity, formData.unit);

    const existingIndex = ingredients.findIndex(
      ing => ing.name.toLowerCase().trim() === normalizedName
    );

    if (existingIndex !== -1) {
      const existing = ingredients[existingIndex];
      const newTotalQuantity = existing.purchasedQuantity + converted.quantity;
      const newTotalPrice = existing.totalPrice + price;
      const newPricePerUnit = newTotalPrice / newTotalQuantity;

      const updated = ingredients.map((ing, idx) =>
        idx === existingIndex
          ? { ...ing, purchasedQuantity: newTotalQuantity, totalPrice: newTotalPrice, pricePerUnit: newPricePerUnit }
          : ing
      );
      updateIngredients(updated);
    } else {
      const pricePerUnit = price / converted.quantity;
      const newIngredient: BaseIngredient = {
        id: crypto.randomUUID(),
        name: formData.name,
        purchasedQuantity: converted.quantity,
        unit: converted.unit,
        totalPrice: price,
        pricePerUnit,
      };
      updateIngredients([...ingredients, newIngredient]);
    }

    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = ingredients.filter(ing => ing.id !== id);
    updateIngredients(updated);
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
    <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ee2b6c]">inventory_2</span>
          <h3 className="text-xl font-bold">1. Inventario de Ingredientes</h3>
        </div>
      </div>
      
      {/* Listado de ingredientes */}
      <div className="overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="px-5 py-3">Ingrediente</th>
              <th className="px-5 py-3">Cantidad</th>
              <th className="px-5 py-3">Unidad</th>
              <th className="px-5 py-3">Precio Total</th>
              <th className="px-5 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  Agrega ingredientes para registrar en el inventario.
                </td>
              </tr>
            ) : (
              ingredients.map((ingredient) => (
                editingId === ingredient.id ? (
                  /* ─── FILA EN MODO EDICIÓN INLINE ─── */
                  <tr key={ingredient.id} className="bg-[#ee2b6c]/3 dark:bg-[#ee2b6c]/10">
                    <td className="px-5 py-3 font-medium text-sm text-slate-700 dark:text-slate-300">
                      {ingredient.name}
                      <span className="block text-xs text-slate-400 font-normal">editando...</span>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        className="w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                        type="number" min="0" step="0.01"
                        value={editInlineData.purchasedQuantity}
                        onChange={(e) => setEditInlineData({ ...editInlineData, purchasedQuantity: e.target.value })}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          className="w-28 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
                          type="number" min="0" step="0.01"
                          value={editInlineData.totalPrice}
                          onChange={(e) => setEditInlineData({ ...editInlineData, totalPrice: e.target.value })}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 items-center justify-end">
                        <button
                          onClick={() => saveInlineEdit(ingredient)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#ee2b6c] text-white rounded-md text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          OK
                        </button>
                        <button
                          onClick={cancelInlineEdit}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ─── FILA NORMAL ─── */
                  <tr key={ingredient.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors bg-white dark:bg-slate-900">
                    <td className="px-5 py-4 font-medium">{ingredient.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{ingredient.purchasedQuantity}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">{ingredient.unit}</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#ee2b6c]">{formatCurrency(ingredient.totalPrice)}</td>
                    <td className="px-5 py-4">
                      {!isLocked && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => startInlineEdit(ingredient)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(ingredient.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario para añadir ingrediente nuevo */}
      {!isLocked && (isAdding ? (
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre</label>
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: Harina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cantidad</label>
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                type="number" step="0.01" min="0"
                placeholder="10"
                value={formData.purchasedQuantity}
                onChange={(e) => setFormData({ ...formData, purchasedQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Unidad</label>
              <select
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
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
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Total ($)</label>
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                type="number" step="0.01" min="0"
                placeholder="8500"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={handleCancel} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity dark:bg-slate-700 dark:text-slate-200">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-4 py-2.5 bg-[#ee2b6c] text-white rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#ee2b6c] text-white rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">add</span> Añadir Ingrediente
          </button>
        </div>
      ))}

      {/* Tarjeta de Resumen y Guardado */}
      {ingredients.length > 0 && (
        <div className="p-5 bg-[#ee2b6c]/5 border-t border-[#ee2b6c]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Inversión total en ingredientes</p>
            <p className="text-3xl font-black text-[#ee2b6c]">{formatCurrency(totalInvestment)}</p>
          </div>
          <div className="flex gap-2">
            {isLocked ? (
              <button 
                onClick={() => handleLockToggle(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity dark:bg-slate-700 dark:text-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Editar Inventario
              </button>
            ) : (
              <button 
                onClick={() => handleLockToggle(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#ee2b6c] text-white rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Guardar y Habilitar Recetas
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
