interface CostSummaryProps {
  ingredientsCost: number;
  extraCostsTotal: number;
  totalCost: number;
  costPerUnit: number;
  unitsProduced: number;
}

export function CostSummary({
  ingredientsCost,
  extraCostsTotal,
  totalCost,
  costPerUnit,
  unitsProduced,
}: CostSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const totalProfit = totalCost * 4;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal ingredientes</span>
        <span className="font-medium">{formatCurrency(ingredientsCost)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Costos adicionales</span>
        <span className="font-medium">{formatCurrency(extraCostsTotal)}</span>
      </div>
      <div className="border-t border-primary/20 pt-3">
        <div className="flex justify-between mb-3">
          <span className="font-semibold">Total del lote</span>
          <span className="font-bold text-lg">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="font-semibold text-green-700 dark:text-green-400">Ganancia total (x4)</span>
          <span className="font-bold text-lg text-green-700 dark:text-green-400">{formatCurrency(totalProfit)}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-md bg-primary text-primary-foreground">
          <div>
            <p className="text-sm opacity-90">Costo por unidad</p>
            <p className="text-xs opacity-75">({unitsProduced} {unitsProduced === 1 ? 'unidad' : 'unidades'})</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(costPerUnit)}</p>
        </div>
      </div>
    </div>
  );
}
