-- ============================================================
-- COSTO REPOSTERO — Migración inicial
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. FUNCIÓN: auto-actualizar updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. TABLA: ingredients
-- ============================================================

CREATE TABLE ingredients (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  purchased_quantity numeric NOT NULL CHECK (purchased_quantity > 0),
  unit               text NOT NULL CHECK (unit IN ('g', 'ml', 'unidad')),
  total_price        numeric NOT NULL CHECK (total_price >= 0),
  price_per_unit     numeric NOT NULL CHECK (price_per_unit >= 0),
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);

CREATE TRIGGER set_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ingredients"
  ON ingredients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingredients"
  ON ingredients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingredients"
  ON ingredients FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 3. TABLA: recipes
-- ============================================================

CREATE TABLE recipes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  units_produced  numeric NOT NULL DEFAULT 0 CHECK (units_produced >= 0),
  sale_type       text NOT NULL DEFAULT 'unidad' CHECK (sale_type IN ('unidad', 'docena', 'media-docena')),
  extra_costs     jsonb NOT NULL DEFAULT '{"packaging":0,"bags":0,"labels":0,"shipping":0,"others":0}',
  profit_margin   numeric NOT NULL DEFAULT 0 CHECK (profit_margin >= 0),
  total_cost      numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  cost_per_unit   numeric NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);

CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. TABLA: recipe_ingredients
-- ============================================================

CREATE TABLE recipe_ingredients (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id   uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_used   numeric NOT NULL CHECK (quantity_used > 0),
  unit            text NOT NULL CHECK (unit IN ('g', 'ml', 'unidad')),
  cost            numeric NOT NULL DEFAULT 0 CHECK (cost >= 0)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe ingredients"
  ON recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own recipe ingredients"
  ON recipe_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recipe ingredients"
  ON recipe_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipe ingredients"
  ON recipe_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );
