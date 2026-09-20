-- ============================================================
-- COSTO REPOSTERO — Migracion 014: Refactor de rendimiento
-- Unifica el concepto de "Subproductos" dentro de "Recetas":
--   - yield_portions (porciones, nullable) y yield_grams (peso
--     total en gramos, nullable). Una receta puede tener ambos.
--   - Se elimina output_quantity/output_unit (rendimiento fisico
--     con unidad generica) en favor de gramos.
--   - product_recipes gana use_unit ('portion'|'gram') para saber
--     si una receta componente se mide por porciones o gramos.
-- ============================================================

-- 1. recipes: renombrar units_produced -> yield_portions (nullable)
ALTER TABLE recipes RENAME COLUMN units_produced TO yield_portions;

ALTER TABLE recipes ALTER COLUMN yield_portions DROP NOT NULL;
ALTER TABLE recipes ALTER COLUMN yield_portions DROP DEFAULT;

-- 2. recipes: nueva columna yield_grams (nullable, > 0 si tiene valor)
ALTER TABLE recipes
  ADD COLUMN yield_grams numeric
  CHECK (yield_grams IS NULL OR yield_grams > 0);

-- 3. Migracion de datos: los rendimientos en gramos pasan a yield_grams.
--    Los de 'ml'/'unidad' no son convertibles a gramos: quedan sin
--    rendimiento (documentado) y las columnas output_* se eliminan.
UPDATE recipes
SET yield_grams = output_quantity
WHERE output_unit = 'g' AND output_quantity > 0;

ALTER TABLE recipes DROP COLUMN output_quantity;
ALTER TABLE recipes DROP COLUMN output_unit;

COMMENT ON COLUMN recipes.yield_portions IS 'Cantidad de porciones/unidades finales. NULL = no definido.';
COMMENT ON COLUMN recipes.yield_grams IS 'Peso/rendimiento total en gramos. NULL = no definido.';

-- 4. product_recipes: use_unit ('portion'|'gram') para componentes receta
ALTER TABLE product_recipes
  ADD COLUMN use_unit text
  CHECK (use_unit IS NULL OR use_unit IN ('portion', 'gram'));

-- Filas existentes que referencian recetas se miden en gramos (sus
-- cantidades ya estan en unidades base).
UPDATE product_recipes
SET use_unit = 'gram'
WHERE recipe_id IS NOT NULL;

-- 5. product_recipes: unit pasa a nullable (solo ingredientes lo usan)
ALTER TABLE product_recipes ALTER COLUMN unit DROP NOT NULL;

UPDATE product_recipes
SET unit = NULL
WHERE recipe_id IS NOT NULL;

COMMENT ON COLUMN product_recipes.use_unit IS 'Si el componente es una receta: 'portion' (se mide en porciones) o 'gram' (se mide en gramos). NULL para ingredientes.';