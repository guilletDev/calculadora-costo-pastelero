'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/types';
import { formatCurrency, costPerOutputUnit } from '@/lib/cost';
import { costPerUnitLabel } from '@/lib/units';
import { useUpgradeGuard } from '@/hooks/use-upgrade-guard';
import { UpgradeModal } from '@/components/upgrade-modal';
import { useAppBoot } from '@/components/boot/app-boot-context';

const stitchFontManrope = { fontFamily: "'Manrope', sans-serif" } as const;

export default function SubproductosPage() {
  const [subproducts, setSubproducts] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const { ready, recipes: bootRecipes } = useAppBoot();
  const { upgradeType, closeUpgrade, guardUpgrade } = useUpgradeGuard();

  useEffect(() => {
    if (!ready) return;
    const filtered = bootRecipes.filter(r =>
      r.outputQuantity != null && r.outputQuantity > 0 &&
      r.outputUnit != null && r.unitsProduced <= 0
    );
    setSubproducts(filtered);
  }, [ready, bootRecipes]);

  const isLoading = !ready;

  const visible = subproducts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main
        className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 flex flex-col gap-12"
      >
        {/* ── Hero Section ── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
          <div>
            <h1
              className="text-[28px] md:text-[32px] leading-[1.2] md:tracking-[-0.01em] font-bold text-[#151c27] mb-2"
              style={stitchFontManrope}
            >
              Mis Subproductos
            </h1>
            <p className="text-[#5f5e5e] text-[18px] leading-[1.6]">
              {subproducts.length === 0
                ? 'Todavía no guardaste ningún subproducto.'
                : `${subproducts.length} subproducto${subproducts.length !== 1 ? 's' : ''} guardado${subproducts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Search Bar */}
            {subproducts.length > 0 && (
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#5a5c5d]">search</span>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#e4bdc2] rounded-xl text-[#151c27] placeholder:text-[#5a5c5d] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] transition-all text-[16px] shadow-sm"
                  placeholder="Buscar subproducto..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {/* Nuevo Subproducto button */}
            <Link
              href="/subproductos/nuevo"
              onClick={(e) => { if (!guardUpgrade('recipes', subproducts.length)) e.preventDefault(); }}
              className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center justify-center gap-2 hover:bg-[#bc004b] hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 duration-150 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Nuevo Subproducto
            </Link>
          </div>
        </section>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="py-20 text-center text-[#5f5e5e] flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
            <p className="text-[16px]">Cargando subproductos...</p>
          </div>
        ) : visible.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[#f0f3ff] rounded-[32px] border border-[#e4bdc2] border-dashed">
            <span className="material-symbols-outlined text-[48px] text-[#5a5c5d] mb-4">layers</span>
            <h3 className="font-semibold text-[24px] leading-[1.3] text-[#151c27] mb-2" style={stitchFontManrope}>
              {search ? 'Sin resultados' : 'Aún no tienes subproductos'}
            </h3>
            <p className="text-[#5f5e5e] text-[16px] leading-[1.5] mb-6 max-w-md">
              {search
                ? 'No encontramos ningún subproducto con ese nombre.'
                : 'Creá preparaciones base (ganaches, masas, rellenos) para reutilizarlas en tus productos.'}
            </p>
            {!search && (
              <Link
                href="/subproductos/nuevo"
                onClick={(e) => { if (!guardUpgrade('recipes', subproducts.length)) e.preventDefault(); }}
                className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 hover:bg-[#bc004b] transition-all hover:shadow-lg"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Crear Primer Subproducto
              </Link>
            )}
          </div>
        ) : (
          /* ── Cards Grid ── */
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {visible.map((subproduct, index) => {
              const baseCostPerUnit = costPerOutputUnit(subproduct.totalCost, subproduct.outputQuantity ?? 0);
              return (
                <Link
                  key={subproduct.id}
                  href={`/subproductos/${subproduct.id}`}
                  className={`group block bg-white rounded-[24px] p-8 border border-[#e4bdc2] hover:border-[#b80049] hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full animate-fade-up stagger-${Math.min(index + 1, 6)}`}
                  style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)' }}
                >
                  {/* Top Accent Line */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-[#b80049] rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

                  {/* Header */}
                  <header className="flex flex-col gap-2 mb-6" style={stitchFontManrope}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ffd9de] text-[#b80049] text-[10px] leading-[1.4] tracking-[0.05em] font-semibold whitespace-nowrap max-w-max">
                      Subproducto
                    </span>
                    <div className="flex justify-between items-start gap-2">
                      <h2 className="flex-1 min-w-0 line-clamp-2 font-semibold text-[24px] leading-[1.3] text-[#151c27] group-hover:text-[#b80049] transition-colors">
                        {subproduct.name}
                      </h2>
                      <span className="material-symbols-outlined text-[#5a5c5d] group-hover:text-[#b80049] transition-colors group-hover:translate-x-1 shrink-0">
                        chevron_right
                      </span>
                    </div>
                  </header>

                  {subproduct.description && (
                    <p className="mb-6 text-[14px] leading-[1.5] text-[#5f5e5e] line-clamp-2">
                      {subproduct.description}
                    </p>
                  )}

                  {/* ── Metrics ── */}
                  <div className="flex flex-col gap-4 mb-8">
                    <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase">
                        Costo Total
                      </span>
                      <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">
                        {formatCurrency(subproduct.totalCost)}
                      </span>
                    </div>
                    <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase">
                        Rendimiento Total
                      </span>
                      <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">
                        Rinde {subproduct.outputQuantity} {subproduct.outputUnit}
                      </span>
                    </div>
                  </div>

                  {/* ── Footer ── */}
                  <div className="mt-auto border-t border-[#e4bdc2] pt-6">
                    <span className="text-[12px] text-[#5a5c5d] uppercase tracking-wider block mb-1 font-semibold" style={{ letterSpacing: '0.05em', fontSize: '12px' }}>
                      {costPerUnitLabel(subproduct.outputUnit)}
                    </span>
                    <span className="text-[22px] 2xl:text-[24px] text-[#b80049] font-bold tracking-tighter">
                      {formatCurrency(baseCostPerUnit)}
                      <span className="text-[14px] text-[#5f5e5e] font-medium"> / {subproduct.outputUnit}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </main>

      <UpgradeModal
        open={upgradeType !== null}
        onOpenChange={(open) => { if (!open) closeUpgrade(); }}
        resourceType={upgradeType ?? 'recipes'}
      />
    </>
  );
}