-- ============================================================
-- COSTO REPOSTERO — Migracion 004: Productos
-- Crea products y product_recipes para que un Producto reutilice
-- una o varias recetas, calculando costo proporcional.
-- ============================================================

-- 1. TABLA: products
CREATE TABLE products (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  profit_margin numeric NOT NULL DEFAULT 0 CHECK (profit_margin >= 0),
  extra_costs   jsonb NOT NULL DEFAULT '{"packaging":0,"bags":0,"labels":0,"shipping":0,"others":0}',
  total_cost    numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_products_user_id ON products(user_id);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 2. TABLA: product_recipes (junction con snapshot)
-- ============================================================

CREATE TABLE product_recipes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recipe_id     uuid REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name   text NOT NULL,
  quantity_used numeric NOT NULL CHECK (quantity_used > 0),
  unit          text NOT NULL CHECK (unit IN ('g', 'ml', 'unidad')),
  cost          numeric NOT NULL DEFAULT 0 CHECK (cost >= 0)
);

CREATE INDEX idx_product_recipes_product_id ON product_recipes(product_id);
CREATE INDEX idx_product_recipes_recipe_id ON product_recipes(recipe_id);

ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product recipes"
  ON product_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_recipes.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own product recipes"
  ON product_recipes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_recipes.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own product recipes"
  ON product_recipes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_recipes.product_id
        AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_recipes.product_id
        AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own product recipes"
  ON product_recipes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_recipes.product_id
        AND products.user_id = auth.uid()
    )
  );