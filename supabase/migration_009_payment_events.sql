-- ============================================================
-- COSTO REPOSTERO — Migracion 009: payment_events
-- Auditoria e idempotencia de notificaciones de Mercado Pago.
-- El UNIQUE en payment_id garantiza que un pago aprobado solo
-- active el plan una vez, aunque MP reenvie el webhook.
-- ============================================================

CREATE TABLE payment_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id         text NOT NULL UNIQUE,
  external_reference text NOT NULL,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount             numeric NOT NULL,
  currency           text NOT NULL DEFAULT 'ARS',
  status             text NOT NULL,
  raw_payload        jsonb,
  created_at         timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_payment_events_user_id ON payment_events(user_id);

-- Sin policies: solo el backend (service_role) escribe y lee.
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;