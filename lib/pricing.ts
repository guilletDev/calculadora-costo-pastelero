// Fuente de verdad comercial del Plan Pro (Checkout Pro, pago único de 30 días).
// Todo el copy de la app (landing, navbar, modal, preferencia de MP) lee de acá.

export const PRO_PLAN_ID = 'plan-pro-30';
export const PRO_PLAN_NAME = 'Pro';
export const PRO_PLAN_TITLE = 'Plan Pro';
export const PRO_PLAN_DESCRIPTION = 'Plan Pro - 30 días de acceso';
export const PRO_PLAN_PRICE = 9900;
export const PRO_PLAN_CURRENCY = 'ARS';
export const PRO_PLAN_DAYS = 30;
export const PRO_PLAN_LABEL = '$9.900 / 30 días';
export const PRO_STATEMENT_DESCRIPTOR = 'Costo Repostero';

export function formatProPrice(): string {
  return `$${PRO_PLAN_PRICE.toLocaleString('es-AR')}`;
}

export function formatProValidUntil(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}