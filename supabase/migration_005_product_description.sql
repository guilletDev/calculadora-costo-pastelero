-- ============================================================
-- COSTO REPOSTERO — Migracion 005: Descripcion de productos
-- Agrega columna description a products.
-- ============================================================

ALTER TABLE products
  ADD COLUMN description text NOT NULL DEFAULT '';

COMMENT ON COLUMN products.description IS 'Descripcion libre del producto final.';