-- ============================================================
-- COSTO REPOSTERO — Migracion 012: Minutos de mano de obra
-- Agrega labor_minutes a recipes para registrar los minutos de
-- trabajo activo y calcular el costo de mano de obra usando el
-- hourly_rate del perfil (migration_011).
-- ============================================================

ALTER TABLE recipes
  ADD COLUMN labor_minutes numeric NOT NULL DEFAULT 0 CHECK (labor_minutes >= 0);

COMMENT ON COLUMN recipes.labor_minutes IS 'Minutos de trabajo activo para calcular mano de obra en recetas y subproductos.';