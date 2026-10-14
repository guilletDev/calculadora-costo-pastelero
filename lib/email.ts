// Envío de emails transaccionales con Resend (solo server-side).
// Si falta RESEND_API_KEY, isEmailConfigured() devuelve false y los
// callers simplemente omiten el envío sin romper el flujo principal.

import { Resend } from 'resend';
import { formatProValidUntil } from './pricing';

let cachedResend: Resend | null = null;

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function getResend(): Resend {
  if (!cachedResend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('Falta la variable de entorno RESEND_API_KEY');
    cachedResend = new Resend(key);
  }
  return cachedResend;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? 'Costo Repostero <no-reply@costorepostero.com>';
}

function getAppUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://costorepostero.com';
  return base.replace(/\/+$/, '');
}

function emailLayout(content: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f9f9ff;font-family:Arial,Helvetica,sans-serif;color:#151c27;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${appUrl}/logo-120.png" alt="Costo Repostero" width="120" style="display: block; margin: 0 auto; border: 0; outline: none;" />
      </div>
      <div style="background-color:#ffffff;border:1px solid #e4bdc2;border-radius:24px;padding:32px;">
        ${content}
      </div>
      <p style="text-align:center;font-size:12px;color:#8a8a8a;margin-top:24px;">
        © 2026 CostoRepostero. Todos los derechos reservados.
      </p>
    </div>
  </body>
</html>`;
}

interface WelcomeEmailParams {
  to: string;
  name: string;
}

export async function sendWelcomeEmail({ to, name }: WelcomeEmailParams): Promise<void> {
  const appUrl = getAppUrl();
  const html = emailLayout(`
    <h1 style="font-size:22px;margin:0 0 12px;">¡Bienvenido, ${name}! 🎂</h1>
    <p style="font-size:15px;line-height:1.6;color:#5f5e5e;margin:0 0 16px;">
      Gracias por sumarte a Costo Repostero. Para comenzar a calcular costos de tus recetas,
      el primer paso es cargar al menos 2 ingredientes en tu inventario.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#5f5e5e;margin:0 0 24px;">
      Después vas a poder armar recetas, definir precios de venta y conocer tus márgenes reales.
    </p>
    <a href="${appUrl}/inventario"
       style="display:inline-block;background-color:#b80049;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:999px;">
      Cargar mis primeros ingredientes
    </a>
  `);

  const { error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: '¡Bienvenido a Costo Repostero! 🎂',
    html,
  });

  if (error) throw new Error(`Error enviando email de bienvenida: ${error.message}`);
}

interface ProConfirmationEmailParams {
  to: string;
  name: string;
  validUntil: string;
}

export async function sendProConfirmationEmail({ to, name, validUntil }: ProConfirmationEmailParams): Promise<void> {
  const appUrl = getAppUrl();
  const html = emailLayout(`
    <h1 style="font-size:22px;margin:0 0 12px;">¡Tu Plan Pro está activo, ${name}! 🚀</h1>
    <p style="font-size:15px;line-height:1.6;color:#5f5e5e;margin:0 0 16px;">
      Confirmamos tu pago y tu cuenta ya tiene acceso completo a Costo Repostero:
      recetas, ingredientes y productos ilimitados, cálculo de márgenes y soporte prioritario.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#5f5e5e;margin:0 0 24px;">
      Tu plan está vigente hasta el <strong style="color:#151c27;">${formatProValidUntil(validUntil)}</strong>.
    </p>
    <a href="${appUrl}/dashboard"
       style="display:inline-block;background-color:#b80049;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:999px;">
      Ir a mi panel
    </a>
  `);

  const { error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: '¡Tu Plan Pro está activo! 🚀',
    html,
  });

  if (error) throw new Error(`Error enviando email de confirmación Pro: ${error.message}`);
}