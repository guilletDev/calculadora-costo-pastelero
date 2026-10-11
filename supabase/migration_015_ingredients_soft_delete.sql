-- ============================================================
-- COSTO REPOSTERO — Migracion 015: Soft delete de ingredientes
-- Papelera de insumos: deleted_at (NULL = activo) + opcion de
-- restaurar. El indice unico pasa a ser parcial (WHERE deleted_at
-- IS NULL) para que un insumo en la papelera no bloquee su nombre
-- al volver a cargarlo, y el RPC upsert_ingredient se actualiza
-- con el predicado del indice parcial.
-- ============================================================

-- 1. Columna deleted_at
ALTER TABLE ingredients ADD COLUMN deleted_at timestamptz;

CREATE INDEX idx_ingredients_user_deleted ON ingredients(user_id, deleted_at);

COMMENT ON COLUMN ingredients.deleted_at IS 'Marca de soft delete: NULL = activo, con timestamp = en la papelera.';

-- 2. Indice unico parcial: los eliminados no bloquean nombres
DROP INDEX IF EXISTS ingredients_user_name_key;

CREATE UNIQUE INDEX ingredients_user_name_key
  ON ingredients (user_id, lower(name))
  WHERE deleted_at IS NULL;

-- 3. RPC upsert_ingredient actualizado: el ON CONFLICT ahora usa el
--    predicado del indice parcial. Si el nombre existe como activo
--    suma cantidad/precio; si solo existe en la papelera, inserta
--    una fila activa nueva.
CREATE OR REPLACE FUNCTION public.upsert_ingredient(
  p_name text,
  p_purchased_quantity numeric,
  p_unit text,
  p_total_price numeric
)
RETURNS SETOF public.ingredients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  IF p_purchased_quantity IS NULL OR p_purchased_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  IF p_total_price IS NULL OR p_total_price < 0 THEN
    RAISE EXCEPTION 'El precio total no puede ser negativo';
  END IF;

  IF p_unit NOT IN ('g', 'ml', 'unidad') THEN
    RAISE EXCEPTION 'Unidad invalida: debe ser g, ml o unidad';
  END IF;

  RETURN QUERY
  INSERT INTO public.ingredients (
    user_id, name, purchased_quantity, unit, total_price, price_per_unit
  )
  VALUES (
    v_user_id,
    trim(p_name),
    p_purchased_quantity,
    p_unit,
    p_total_price,
    p_total_price / p_purchased_quantity
  )
  ON CONFLICT (user_id, lower(name)) WHERE deleted_at IS NULL
  DO UPDATE SET
    purchased_quantity = ingredients.purchased_quantity + EXCLUDED.purchased_quantity,
    total_price        = ingredients.total_price + EXCLUDED.total_price,
    price_per_unit     = (ingredients.total_price + EXCLUDED.total_price)
                         / (ingredients.purchased_quantity + EXCLUDED.purchased_quantity),
    updated_at         = now()
  RETURNING *;
END;
$$;

-- Seguridad: solo usuarios autenticados pueden llamarla
REVOKE ALL ON FUNCTION public.upsert_ingredient(text, numeric, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_ingredient(text, numeric, text, numeric) TO authenticated;

COMMENT ON FUNCTION public.upsert_ingredient IS 'Inserta un ingrediente activo o suma cantidad/precio si ya existe uno activo con el mismo nombre (insensible a mayusculas). Los ingredientes en la papelera no bloquean el nombre.';