-- ============================================================
-- COSTO REPOSTERO — Migración 002: Ingredient snapshot
-- Agrega columna ingredient_name a recipe_ingredients para
-- almacenar una copia del nombre al momento de agregarlo a la
-- receta, y cambia la FK a ON DELETE SET NULL para permitir
-- eliminar ingredientes del inventario sin afectar recetas.
-- ============================================================

-- 1. Agregar columna ingredient_name (nullable temporalmente)
ALTER TABLE recipe_ingredients ADD COLUMN ingredient_name text;

-- 2. Poblar con los nombres actuales de ingredients
UPDATE recipe_ingredients
SET ingredient_name = ingredients.name
FROM ingredients
WHERE ingredients.id = recipe_ingredients.ingredient_id;

-- 3. Establecer NOT NULL (ya no hay NULLs después del UPDATE)
ALTER TABLE recipe_ingredients ALTER COLUMN ingredient_name SET NOT NULL;

-- 4. Permitir NULL en ingredient_id
ALTER TABLE recipe_ingredients
ALTER COLUMN ingredient_id DROP NOT NULL;

-- 5. Cambiar la FK de RESTRICT a SET NULL
ALTER TABLE recipe_ingredients
DROP CONSTRAINT recipe_ingredients_ingredient_id_fkey;

ALTER TABLE recipe_ingredients
ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
FOREIGN KEY (ingredient_id)
REFERENCES ingredients(id)
ON DELETE SET NULL;