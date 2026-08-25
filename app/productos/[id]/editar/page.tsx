'use client';

import { useParams } from 'next/navigation';
import { ProductBuilder } from '@/components/product-builder';

export default function EditarProductoPage() {
  const params = useParams();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <main
      className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-[10%] py-12 md:py-16 space-y-4"
    >
      <section className="mb-12">
        <h1
          className="font-stitch-headline-lg text-stitch-headline-lg-mobile md:text-stitch-headline-lg text-stitch-on-surface mb-4"
        >
          Editar Producto
        </h1>
        <p className="font-stitch-body-lg text-stitch-body-lg text-stitch-secondary max-w-2xl">
          Actualizá los componentes y costos de tu producto.
        </p>
      </section>

      {productId ? <ProductBuilder productId={productId} /> : null}
    </main>
  );
}