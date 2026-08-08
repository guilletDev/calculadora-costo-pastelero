-- ============================================================
-- COSTO REPOSTERO — Migracion 003: Campos de salida fisica
-- Agrega output_quantity y output_unit a recipes para que
-- los Productos puedan calcular costo proporcional.
-- NULLABLE: recetas existentes no tienen este dato.
-- ============================================================

-- 1. Agregar output_quantity (nullable, pero si tiene valor debe ser > 0)
ALTER TABLE recipes
  ADD COLUMN output_quantity numeric
  CHECK (output_quantity IS NULL OR output_quantity > 0);

-- 2. Agregar output_unit (nullable, solo unidades base como el resto del proyecto)
ALTER TABLE recipes
  ADD COLUMN output_unit text
  CHECK (output_unit IS NULL OR output_unit IN ('g', 'ml', 'unidad'));

COMMENT ON COLUMN recipes.output_quantity IS 'Cantidad fisica total producida por la receta (en unidades base). NULL = aun no configurado.';
COMMENT ON COLUMN recipes.output_unit     IS 'Unidad de output_quantity (g, ml, unidad). NULL = aun no configurado.';
