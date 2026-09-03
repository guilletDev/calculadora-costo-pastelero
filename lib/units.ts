import { Unit } from './types';

export function convertToBaseUnit(quantity: number, unit: Unit): { quantity: number; unit: Unit } {
  if (unit === 'kg') return { quantity: quantity * 1000, unit: 'g' };
  if (unit === 'l')  return { quantity: quantity * 1000, unit: 'ml' };
  return { quantity, unit };
}

export function toBaseQuantity(quantity: number, unit: Unit): number {
  return convertToBaseUnit(quantity, unit).quantity;
}

export function toBaseUnit(unit: Unit): Unit {
  return convertToBaseUnit(0, unit).unit;
}

export function costPerUnitLabel(unit: Unit | null): string {
  switch (unit) {
    case 'g':  return 'Costo por gramo';
    case 'ml': return 'Costo por ml';
    case 'kg': return 'Costo por kilogramo';
    case 'l':  return 'Costo por litro';
    default:   return 'Costo por unidad';
  }
}
