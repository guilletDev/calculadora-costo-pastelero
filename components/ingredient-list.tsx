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

  const handleSave = () => {
    if (!formData.name || !formData.purchasedQuantity || !formData.totalPrice) return;

    const normalizedName = formData.name.toLowerCase().trim();
    const rawQuantity = parseFloat(formData.purchasedQuantity);
    const price = parseFloat(formData.totalPrice);
    const converted = toBaseUnit(rawQuantity, formData.unit);

    if (editingId) {
      const pricePerUnit = price / converted.quantity;
      const updated = ingredients.map(ing =>
        ing.id === editingId
          ? { ...ing, name: formData.name, purchasedQuantity: converted.quantity, unit: converted.unit, totalPrice: price, pricePerUnit }
          : ing
      );
      updateIngredients(updated);
      setEditingId(null);
    } else {
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
        setIsAdding(false);
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
        const updated = [...ingredients, newIngredient];
        updateIngredients(updated);
        setIsAdding(false);
      }
    }
    
    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
  };

  const handleEdit = (ingredient: BaseIngredient) => {
    setEditingId(ingredient.id);
    setFormData({
      name: ingredient.name,
      purchasedQuantity: ingredient.purchasedQuantity.toString(),
      unit: ingredient.unit,
      totalPrice: ingredient.totalPrice.toString(),
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const updated = ingredients.filter(ing => ing.id !== id);
    updateIngredients(updated);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', purchasedQuantity: '', unit: 'kg', totalPrice: '' });
  };

  const totalInvestment = ingredients.reduce((sum, ing) => sum + ing.totalPrice, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
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
              <th className="px-6 py-4">Ingrediente</th>
              <th className="px-6 py-4">Cantidad</th>
              <th className="px-6 py-4">Unidad</th>
              <th className="px-6 py-4">Precio Total</th>
              <th className="px-6 py-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Agrega ingredientes para registrar en el inventario.
                </td>
              </tr>
            ) : (
              ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors bg-white dark:bg-slate-900">
                  <td className="px-6 py-4 font-medium">{ingredient.name}</td>
                  <td className="px-6 py-4">{ingredient.purchasedQuantity}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs">{ingredient.unit}</span></td>
                  <td className="px-6 py-4 font-semibold text-[#ee2b6c]">{formatCurrency(ingredient.totalPrice)}</td>
                  <td className="px-6 py-4 flex gap-2 justify-end">
                    {!isLocked && (
                      <>
                        <button onClick={() => handleEdit(ingredient)} className="text-slate-400 hover:text-blue-500">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button onClick={() => handleDelete(ingredient.id)} className="text-slate-400 hover:text-red-500">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Agregar / Editar Ingrediente (Visible si se está agregando o no hay candado) */}
      {!isLocked && (isAdding ? (
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre</label>
              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                placeholder="Ej: Harina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cantidad</label>
              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                type="number" step="0.01"
                placeholder="10"
                value={formData.purchasedQuantity}
                onChange={(e) => setFormData({ ...formData, purchasedQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Unidad</label>
              <select
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Total ($)</label>
              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-[#ee2b6c] focus:border-[#ee2b6c]"
                type="number" step="0.01"
                placeholder="8500"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={handleCancel} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-opacity dark:bg-slate-700 dark:text-slate-200">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-[#ee2b6c] text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ee2b6c] text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">add</span> Añadir Ingrediente
          </button>
        </div>
      ))}

      {/* Tarjeta de Resumen y Guardado */}
      {ingredients.length > 0 && (
        <div className="p-6 bg-[#ee2b6c]/5 border-t border-[#ee2b6c]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Inversión total en ingredientes</p>
            <p className="text-3xl font-black text-[#ee2b6c]">{formatCurrency(totalInvestment)}</p>
          </div>
          <div className="flex gap-2">
            {isLocked ? (
              <button 
                onClick={() => handleLockToggle(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-opacity dark:bg-slate-700 dark:text-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Editar Inventario
              </button>
            ) : (
              <button 
                onClick={() => handleLockToggle(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#ee2b6c] text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-opacity hover:scale-[1.02]"
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
