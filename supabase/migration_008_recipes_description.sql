-- ============================================================
-- COSTO REPOSTERO — Migracion 008: Descripcion de recetas
-- Agrega columna description a recipes (nullable).
-- ============================================================

ALTER TABLE recipes
  ADD COLUMN description text;

COMMENT ON COLUMN recipes.description IS 'Descripcion libre de la receta.';