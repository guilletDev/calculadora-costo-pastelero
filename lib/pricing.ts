// Fuente de verdad comercial del Plan Pro (Checkout Pro, pago único de 30 días).
// Todo el copy de la app (landing, navbar, modal, preferencia de MP) lee de acá.

export const PRO_PLAN_ID = 'plan-pro-30';
export const PRO_PLAN_NAME = 'Pro';
export const PRO_PLAN_TITLE = 'Plan Pro';
export const PRO_PLAN_DESCRIPTION = 'Plan Pro - 30 días de acceso';
export const PRO_PLAN_ITEM_TITLE = 'Costo Repostero - Plan Pro (Oferta de Lanzamiento)';
export const PRO_PLAN_PRICE = 9900;
export const PRO_PLAN_ORIGINAL_PRICE = 15000;
export const PRO_PLAN_CURRENCY = 'ARS';
export const PRO_PLAN_DAYS = 30;
export const PRO_PLAN_OFFER_BADGE = 'Oferta de Lanzamiento';
export const PRO_PLAN_OFFER_DISCOUNT = '34% OFF';
export const PRO_STATEMENT_DESCRIPTOR = 'COSTOREPOSTERO';

export function formatProPrice(): string {
  return `$${PRO_PLAN_PRICE.toLocaleString('es-AR')}`;
}

export function formatProOriginalPrice(): string {
  return `$${PRO_PLAN_ORIGINAL_PRICE.toLocaleString('es-AR')}`;
}

export const PRO_PLAN_LABEL = `${formatProPrice()} / ${PRO_PLAN_DAYS} días`;

export function formatProValidUntil(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}