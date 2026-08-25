'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Recipe } from '@/lib/types';
import { fetchRecipes } from '@/lib/recipes-db';
import { formatCurrency } from '@/lib/cost';

const stitchFontManrope = { fontFamily: "'Manrope', sans-serif" } as const;

export default function RecetasPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecipes() {
      try {
        setIsLoading(true);
        const data = await fetchRecipes();
        setRecipes(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar recetas');
      } finally {
        setIsLoading(false);
      }
    }
    loadRecipes();
  }, []);

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
            Mis Recetas
          </h1>
          <p className="text-[#5f5e5e] text-[18px] leading-[1.6]">
            {recipes.length === 0
              ? 'Todavía no guardaste ninguna receta.'
              : `${recipes.length} receta${recipes.length !== 1 ? 's' : ''} guardada${recipes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search Bar */}
          {recipes.length > 0 && (
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#5a5c5d]">search</span>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3 bg-white border border-[#e4bdc2] rounded-xl text-[#151c27] placeholder:text-[#5a5c5d] focus:ring-2 focus:ring-[#b80049]/20 focus:border-[#b80049] transition-all text-[16px] shadow-sm"
                placeholder="Buscar receta..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {/* Nueva Receta button */}
          <Link
            href="/calculadora#recipe-builder"
            className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center justify-center gap-2 hover:bg-[#bc004b] hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 duration-150 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Nueva Receta
          </Link>
        </div>
      </section>

      {/* ── Recipe Grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-[#5f5e5e] flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <p className="text-[16px]">Cargando recetas...</p>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#f0f3ff] rounded-[32px] border border-[#e4bdc2] border-dashed">
          <span className="material-symbols-outlined text-[48px] text-[#5a5c5d] mb-4">menu_book</span>
          <h3 className="font-semibold text-[24px] leading-[1.3] text-[#151c27] mb-2" style={stitchFontManrope}>
            {search ? 'Sin resultados' : 'Aún no tienes recetas'}
          </h3>
          <p className="text-[#5f5e5e] text-[16px] leading-[1.5] mb-6 max-w-md">
            {search
              ? 'No encontramos ninguna receta con ese nombre.'
              : 'Comienza a calcular tus costos con precisión creando tu primera receta.'}
          </p>
          {!search && (
            <Link
              href="/calculadora#recipe-builder"
              className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 hover:bg-[#bc004b] transition-all hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Crear Primera Receta
            </Link>
          )}
        </div>
      ) : (
        /* ── Recipe Cards Grid ── */
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((recipe, index) => (
            <Link
              key={recipe.id}
              href={`/recetas/${recipe.id}`}
              className={`group block bg-white rounded-[24px] p-8 border border-[#e4bdc2] hover:border-[#b80049] hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full animate-fade-up stagger-${Math.min(index + 1, 6)}`}
              style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)' }}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#b80049] rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

              {/* Header */}
              <header className="flex justify-between items-center mb-6" style={stitchFontManrope}>
                <h2 className="font-semibold text-[24px] leading-[1.3] text-[#151c27] group-hover:text-[#b80049] transition-colors">
                  {recipe.name}
                </h2>
                <span className="material-symbols-outlined text-[#5a5c5d] group-hover:text-[#b80049] transition-colors group-hover:translate-x-1">
                  chevron_right
                </span>
              </header>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase mb-1">
                    Porciones
                  </span>
                  <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">
                    {recipe.unitsProduced}
                  </span>
                </div>
                <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[14px] leading-[1.4] tracking-[0.05em] font-semibold text-[#5f5e5e] uppercase mb-1">
                    Ganancia
                  </span>
                  <span className="text-[20px] leading-[1.2] text-[#151c27] font-semibold">
                    {recipe.profitMargin ?? 0}%
                  </span>
                </div>
              </div>

              {/* Pricing Footer */}
              <div className="mt-auto flex justify-between items-end border-t border-[#e4bdc2] pt-6">
                <div>
                  <span className="text-[12px] text-[#5a5c5d] uppercase tracking-wider block mb-1 font-semibold" style={{ letterSpacing: '0.05em', fontSize: '12px' }}>
                    Precio Venta
                  </span>
                  <span className="text-[28px] text-[#b80049] font-bold tracking-tight">
                    {formatCurrency(recipe.costPerUnit)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#5a5c5d] uppercase tracking-wider block mb-1 font-semibold" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                    Precio de Costo
                  </span>
                  <span className="text-[18px] text-[#5f5e5e] font-medium tracking-tight">
                    {formatCurrency(recipe.totalCost)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
