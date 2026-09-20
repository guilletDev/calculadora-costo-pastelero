-- ============================================================
-- COSTO REPOSTERO — Migracion 013: Componentes de recetas
-- Permite que recipe_ingredients contenga insumos del inventario
-- O subproductos (otras recetas con rendimiento fisico), usando
-- el mismo patron de product_recipes (migration_006).
-- Aditiva: conserva los datos existentes (default 'ingredient').
-- ============================================================

-- 1. Tipo de componente
ALTER TABLE recipe_ingredients
  ADD COLUMN component_type text NOT NULL DEFAULT 'ingredient'
  CHECK (component_type IN ('ingredient', 'subproduct'));

-- 2. Referencia + snapshot para subproductos
ALTER TABLE recipe_ingredients
  ADD COLUMN subproduct_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;

ALTER TABLE recipe_ingredients
  ADD COLUMN subproduct_recipe_name text;

CREATE INDEX idx_recipe_ingredients_subproduct_recipe_id
  ON recipe_ingredients(subproduct_recipe_id);

COMMENT ON COLUMN recipe_ingredients.component_type        IS 'Tipo de componente: ingredient (inventario) o subproduct (otra receta con output).';
COMMENT ON COLUMN recipe_ingredients.subproduct_recipe_id  IS 'Receta subproducto usada como componente. NULL si es un ingrediente del inventario.';
COMMENT ON COLUMN recipe_ingredients.subproduct_recipe_name IS 'Snapshot del nombre del subproducto al momento de agregarlo.';