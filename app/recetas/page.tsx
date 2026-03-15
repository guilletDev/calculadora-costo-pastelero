'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/types';
import { storage } from '@/lib/storage';

export default function RecetasPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRecipes(storage.getRecipes());
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Mis Recetas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {recipes.length === 0
              ? 'Todavía no guardaste ninguna receta.'
              : `${recipes.length} receta${recipes.length !== 1 ? 's' : ''} guardada${recipes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ee2b6c] text-white rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Receta
        </Link>
      </div>

      {/* Buscador */}
      {recipes.length > 0 && (
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ee2b6c]"
            placeholder="Buscar receta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Lista de recetas */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600 block mb-3">menu_book</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {search ? 'No encontramos ninguna receta con ese nombre.' : 'Aún no tenés recetas guardadas.'}
          </p>
          {!search && (
            <Link href="/" className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#ee2b6c] font-bold hover:underline">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Ir a la calculadora
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recetas/${recipe.id}`}
              className="group block rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-[#ee2b6c]/40 hover:shadow-md transition-all overflow-hidden"
            >
              {/* Color top bar */}
              <div className="h-1.5 bg-gradient-to-r from-[#ee2b6c] to-[#ff6b9d]" />

              <div className="p-5 space-y-4">
                {/* Nombre y cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-[#ee2b6c] transition-colors leading-snug">
                    {recipe.name}
                  </h3>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-[#ee2b6c] text-[20px] shrink-0 transition-colors">
                    chevron_right
                  </span>
                </div>

                {/* Datos rápidos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2.5">
                    <p className="text-xs text-slate-400 font-medium">Porciones</p>
                    <p className="text-base font-black text-slate-700 dark:text-slate-200">{recipe.unitsProduced}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2.5">
                    <p className="text-xs text-slate-400 font-medium">Margen</p>
                    <p className="text-base font-black text-slate-700 dark:text-slate-200">{recipe.profitMargin ?? 0}%</p>
                  </div>
                </div>

                {/* Costo por unidad */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Costo / porción</p>
                    <p className="text-xl font-black text-[#ee2b6c]">{formatCurrency(recipe.costPerUnit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total receta</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatCurrency(recipe.totalCost)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
