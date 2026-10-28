'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { formatCurrency, calculateSalePrice } from '@/lib/cost';
import { useUpgradeGuard } from '@/hooks/use-upgrade-guard';
import { UpgradeModal } from '@/components/upgrade-modal';
import { useAppBoot } from '@/components/boot/app-boot-context';

const stitchFontManrope = { fontFamily: 'var(--font-manrope), sans-serif' } as const;

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const { ready, products: bootProducts } = useAppBoot();
  const { upgradeType, closeUpgrade, guardUpgrade, loading } = useUpgradeGuard();

  useEffect(() => {
    if (ready) setProducts(bootProducts);
  }, [ready, bootProducts]);

  const isLoading = !ready;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
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
            className="text-[28px] md:text-[32px] leading-[1.2] md:tracking-[-0.01em] font-bold text-stitch-on-surface mb-2"
            style={stitchFontManrope}
          >
            Mis Productos
          </h1>
          <p className="text-stitch-secondary text-[18px] leading-[1.6]">
            {products.length === 0
              ? 'Todavía no guardaste ningún producto.'
              : `${products.length} producto${products.length !== 1 ? 's' : ''} guardado${products.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search Bar */}
          {products.length > 0 && (
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-stitch-tertiary">search</span>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3 bg-stitch-surface-container-lowest border border-stitch-outline-variant rounded-xl text-stitch-on-surface placeholder:text-stitch-tertiary focus:ring-2 focus:ring-[#b80049]/20 focus:border-stitch-primary transition-all text-[16px] shadow-sm"
                placeholder="Buscar producto..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {/* Nuevo Producto button */}
          <Link
            href="/productos/nuevo"
            onClick={(e) => { if (loading) { e.preventDefault(); return; } if (!guardUpgrade('products', products.length)) e.preventDefault(); }}
            className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center justify-center gap-2 hover:bg-[#bc004b] hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 duration-150 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Nuevo Producto
          </Link>
        </div>
      </section>

      {/* ── Product Grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-stitch-secondary flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <p className="text-[16px]">Cargando productos...</p>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-stitch-surface-container-low rounded-[32px] border border-stitch-outline-variant border-dashed">
          <span className="material-symbols-outlined text-[48px] text-stitch-tertiary mb-4">storefront</span>
          <h3 className="font-semibold text-[24px] leading-[1.3] text-stitch-on-surface mb-2" style={stitchFontManrope}>
            {search ? 'Sin resultados' : 'Aún no tienes productos'}
          </h3>
          <p className="text-stitch-secondary text-[16px] leading-[1.5] mb-6 max-w-md">
            {search
              ? 'No encontramos ningún producto con ese nombre.'
              : 'Combiná tus recetas para crear productos finales con costos precisos.'}
          </p>
          {!search && (
            <Link
              href="/productos/nuevo"
              onClick={(e) => { if (loading) { e.preventDefault(); return; } if (!guardUpgrade('products', products.length)) e.preventDefault(); }}
              className="bg-[#b80049] text-white px-8 py-3 rounded-full text-[14px] leading-[1.4] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 hover:bg-[#bc004b] transition-all hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Crear Primer Producto
            </Link>
          )}
        </div>
      ) : (
        /* ── Product Cards Grid ── */
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((product, index) => {
            const salePrice = calculateSalePrice(product.totalCost, product.profitMargin);
            return (
              <Link
                key={product.id}
                href={`/productos/${product.id}`}
                className={`group block bg-stitch-surface-container-lowest rounded-[24px] p-8 border border-stitch-outline-variant hover:border-stitch-primary hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full animate-fade-up stagger-${Math.min(index + 1, 6)}`}
                style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)' }}
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#b80049] rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

                {/* Header */}
                <header className="flex justify-between items-center mb-6" style={stitchFontManrope}>
                  <h2 className="font-semibold text-[24px] leading-[1.3] text-stitch-on-surface group-hover:text-stitch-primary transition-colors">
                    {product.name}
                  </h2>
                  <span className="material-symbols-outlined text-stitch-tertiary group-hover:text-stitch-primary transition-colors group-hover:translate-x-1">
                    chevron_right
                  </span>
                </header>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 w-full my-4">
                  <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-stitch-surface-container-low min-w-0 w-full text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stitch-muted tracking-wider uppercase leading-tight w-full truncate">
                      Ingredientes
                    </span>
                    <span className="text-base sm:text-lg md:text-xl font-bold text-stitch-on-surface leading-tight mt-0.5">
                      {product.components.length}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-stitch-surface-container-low min-w-0 w-full text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stitch-muted tracking-wider uppercase leading-tight w-full truncate">
                      Margen
                    </span>
                    <span className="text-base sm:text-lg md:text-xl font-bold text-stitch-on-surface leading-tight mt-0.5">
                      {product.profitMargin}%
                    </span>
                  </div>
                </div>

                {/* Pricing Footer */}
                <div className="mt-auto grid grid-cols-2 gap-4 items-end border-t border-stitch-outline-variant pt-6">
                  <div>
                    <span className="text-[12px] text-stitch-tertiary uppercase tracking-wider block mb-1 font-semibold" style={{ letterSpacing: '0.05em', fontSize: '12px' }}>
                      Precio Venta
                    </span>
                    <span className="text-[22px] 2xl:text-[24px] text-stitch-primary font-bold tracking-tighter">
                      {formatCurrency(salePrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-stitch-tertiary uppercase tracking-wider block mb-1 font-semibold" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>
                      Precio de Costo
                    </span>
                    <span className="text-[14px] 2xl:text-[16px] text-stitch-secondary font-medium tracking-tight">
                      {formatCurrency(product.totalCost)}
                    </span>
                  </div>
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
        resourceType={upgradeType ?? 'products'}
      />
    </>
  );
}