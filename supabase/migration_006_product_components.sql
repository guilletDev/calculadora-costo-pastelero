-- ============================================================
-- COSTO REPOSTERO — Migracion 006: Componentes de productos
-- Permite que product_recipes contenga recetas o ingredientes
-- puros del inventario (selector combinado).
-- Aditiva: conserva los datos existentes.
-- ============================================================

-- 1. El snapshot de nombre de receta pasa a ser opcional
--    (las filas de tipo ingrediente no lo usan)
ALTER TABLE product_recipes
  ALTER COLUMN recipe_name DROP NOT NULL;

-- 2. Tipo de componente
ALTER TABLE product_recipes
  ADD COLUMN component_type text NOT NULL DEFAULT 'recipe'
  CHECK (component_type IN ('recipe', 'ingredient'));

-- 3. Referencia + snapshot para ingredientes puros
--    (misma filosofia que ingredients en recipe_ingredients)
ALTER TABLE product_recipes
  ADD COLUMN ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL;

ALTER TABLE product_recipes
  ADD COLUMN ingredient_name text;

CREATE INDEX idx_product_recipes_ingredient_id ON product_recipes(ingredient_id);

COMMENT ON COLUMN product_recipes.component_type  IS 'Tipo de componente: recipe o ingredient.';
COMMENT ON COLUMN product_recipes.ingredient_id   IS 'Ingrediente del inventario usado como componente. NULL si es una receta.';
COMMENT ON COLUMN product_recipes.ingredient_name IS 'Snapshot del nombre del ingrediente al momento de agregarlo.';