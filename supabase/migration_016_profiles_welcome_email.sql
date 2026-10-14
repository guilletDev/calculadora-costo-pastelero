-- ============================================================
-- COSTO REPOSTERO — Migracion 016: Flag de email de bienvenida
-- Agrega welcome_email_sent a profiles para enviar el email de
-- bienvenida una sola vez por usuario (idempotente desde el
-- callback de auth, usando el cliente service_role).
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN welcome_email_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.welcome_email_sent IS 'True cuando ya se envió el email de bienvenida al usuario.';