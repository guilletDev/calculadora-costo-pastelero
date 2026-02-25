'use client';

import { useState, useEffect } from 'react';
import { BaseIngredient, Unit } from '@/lib/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface IngredientListProps {
  onLockChange?: (isLocked: boolean) => void;
  onIngredientsChange?: (ingredients: BaseIngredient[]) => void;
}

export function IngredientList({ onLockChange, onIngredientsChange }: IngredientListProps) {
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

  const updateIngredients = (updated: BaseIngredient[]) => {
    setIngredients(updated);
    storage.saveIngredients(updated);
    onIngredientsChange?.(updated);
  };

  const calculatePricePerUnit = (totalPrice: number, quantity: number, unit: Unit): number => {
    let baseQuantity = quantity;
    if (unit === 'kg') baseQuantity = quantity * 1000;
    if (unit === 'l') baseQuantity = quantity * 1000;
    return totalPrice / baseQuantity;
  };

  const handleSave = () => {
    if (!formData.name || !formData.purchasedQuantity || !formData.totalPrice) return;

    const normalizedName = formData.name.toLowerCase().trim();
    const quantity = parseFloat(formData.purchasedQuantity);
    const price = parseFloat(formData.totalPrice);

    if (editingId) {
      const pricePerUnit = calculatePricePerUnit(price, quantity, formData.unit);
      const updated = ingredients.map(ing =>
        ing.id === editingId
          ? { ...ing, name: formData.name, purchasedQuantity: quantity, unit: formData.unit, totalPrice: price, pricePerUnit }
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
        const newTotalQuantity = existing.purchasedQuantity + quantity;
        const newTotalPrice = existing.totalPrice + price;
        const newPricePerUnit = calculatePricePerUnit(newTotalPrice, newTotalQuantity, existing.unit);

        const updated = ingredients.map((ing, idx) =>
          idx === existingIndex
            ? { ...ing, purchasedQuantity: newTotalQuantity, totalPrice: newTotalPrice, pricePerUnit: newPricePerUnit }
            : ing
        );
        updateIngredients(updated);
        setIsAdding(false);
      } else {
        const pricePerUnit = calculatePricePerUnit(price, quantity, formData.unit);
        const newIngredient: BaseIngredient = {
          id: crypto.randomUUID(),
          name: formData.name,
          purchasedQuantity: quantity,
          unit: formData.unit,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de Ingredientes</h2>
          <p className="text-muted-foreground">Gestiona tu inventario base de ingredientes</p>
        </div>
        {!isLocked && !isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Ingrediente
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <Card className="p-6 border-2 border-primary/20 bg-card">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del ingrediente</Label>
              <Input
                id="name"
                placeholder="Ej: Harina"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad comprada</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="10"
                value={formData.purchasedQuantity}
                onChange={(e) => setFormData({ ...formData, purchasedQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value as Unit })}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="l">litros</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="unidad">unidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio total ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="8500"
                  className="pl-7"
                  value={formData.totalPrice}
                  onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                />
              </div>
            </div>
          </div>
          {!editingId && (
            <p className="text-xs text-muted-foreground mt-2">
              Si el ingrediente ya existe, se sumara la cantidad y el precio al registro actual.
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} size="sm">
              <Check className="mr-2 h-4 w-4" />
              Guardar
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm">
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {ingredients.map((ingredient) => (
          <Card key={ingredient.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Ingrediente</p>
                  <p className="font-semibold">{ingredient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cantidad</p>
                  <p className="font-semibold">
                    {ingredient.purchasedQuantity} {ingredient.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precio total</p>
                  <p className="font-semibold">{formatCurrency(ingredient.totalPrice)}</p>
                </div>
              </div>
              {!isLocked && (
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleEdit(ingredient)}
                    variant="ghost"
                    size="icon"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(ingredient.id)}
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {ingredients.length > 0 && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inversion total en ingredientes</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalInvestment)}</p>
            </div>
            <div className="flex gap-2">
              {isLocked ? (
                <Button onClick={() => handleLockToggle(false)} variant="outline">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar lista
                </Button>
              ) : (
                <Button onClick={() => handleLockToggle(true)}>
                  <Check className="mr-2 h-4 w-4" />
                  Lista terminada
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
