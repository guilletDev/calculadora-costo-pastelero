// Cliente único de Mercado Pago (solo server-side).
// No importar desde componentes de cliente: expone el access token.
// Inicialización lazy: no toca variables de entorno hasta el primer uso.

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

let cachedConfig: MercadoPagoConfig | null = null;
let cachedPreference: Preference | null = null;
let cachedPayment: Payment | null = null;

export function getMpConfig(): MercadoPagoConfig {
  if (!cachedConfig) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Falta la variable de entorno MP_ACCESS_TOKEN');
    }
    cachedConfig = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 8000 },
    });
  }
  return cachedConfig;
}

export function getPreferenceClient(): Preference {
  cachedPreference ??= new Preference(getMpConfig());
  return cachedPreference;
}

export function getPaymentClient(): Payment {
  cachedPayment ??= new Payment(getMpConfig());
  return cachedPayment;
}

export function isSandboxToken(): boolean {
  return process.env.MP_ACCESS_TOKEN?.startsWith('TEST-') ?? false;
}

export function buildAppUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    throw new Error('Falta la variable de entorno NEXT_PUBLIC_APP_URL');
  }
  return new URL(path, base).toString();
}