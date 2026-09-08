-- ============================================================
-- COSTO REPOSTERO — Migración 010: Deduplicación + UPSERT atómico
-- ============================================================
-- OBJETIVO:
--   1) Limpiar los registros duplicados existentes en
--      ingredients, recipes y products (mismo nombre, mismo user).
--   2) Crear índices UNIQUE por (user_id, lower(name)) para que
--      la base de datos impida duplicados a partir de ahora.
--   3) Crear la función RPC public.upsert_ingredient() que suma
--      cantidad y precio si el ingrediente ya existe, o inserta
--      si es nuevo (OPERACIÓN ATÓMICA, sin race conditions).
--
-- FORMA DE EJECUCIÓN (Supabase → SQL Editor):
--   Ejecutar las partes POR SEPARADO y en orden:
--     PARTE 1 → diagnóstico (solo lectura, no cambia nada)
--     PARTE 2 → limpieza de duplicados (destructiva, transaccional)
--     PARTE 3 → índices UNIQUE
--     PARTE 4 → función RPC
--     PARTE 5 → verificación + prueba
--   El script es idempotente: si se vuelve a correr no rompe nada.
--
-- ADVERTENCIAS:
--   - La PARTE 2 borra registros. Revisá la PARTE 1 antes de correrla.
--   - En recipes/product_recipes los snapshots de nombre se conservan.
--   - Las recetas/productos con nombre repetido pasan a fallar con el
--     error 23505 (unique_violation) al insertar. El cliente (Fase C2)
--     mostrará un mensaje amigable. Hasta entonces verás el error crudo.
-- ============================================================


-- ============================================================
-- PARTE 1 — DIAGNÓSTICO (solo lectura)
-- ============================================================

-- 1A. Cantidad de grupos duplicados por tabla
SELECT 'ingredients' AS tabla, COUNT(*) AS grupos_duplicados
FROM (
  SELECT user_id, lower(name)
  FROM public.ingredients
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'recipes', COUNT(*)
FROM (
  SELECT user_id, lower(name)
  FROM public.recipes
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'products', COUNT(*)
FROM (
  SELECT user_id, lower(name)
  FROM public.products
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d;

-- 1B. Detalle: ingredientes duplicados (para revisar antes de limpiar)
SELECT i.id, i.user_id, i.name, i.purchased_quantity, i.unit,
       i.total_price, i.price_per_unit, i.created_at
FROM public.ingredients i
JOIN (
  SELECT user_id, lower(name) AS name_key
  FROM public.ingredients
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d ON d.user_id = i.user_id AND d.name_key = lower(i.name)
ORDER BY d.user_id, i.name, i.created_at;

-- 1C. Detalle: recetas duplicadas
SELECT r.id, r.user_id, r.name, r.created_at, r.updated_at
FROM public.recipes r
JOIN (
  SELECT user_id, lower(name) AS name_key
  FROM public.recipes
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d ON d.user_id = r.user_id AND d.name_key = lower(r.name)
ORDER BY d.user_id, r.name, r.updated_at;

-- 1D. Detalle: productos duplicados
SELECT p.id, p.user_id, p.name, p.created_at, p.updated_at
FROM public.products p
JOIN (
  SELECT user_id, lower(name) AS name_key
  FROM public.products
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d ON d.user_id = p.user_id AND d.name_key = lower(p.name)
ORDER BY d.user_id, p.name, p.updated_at;


-- ============================================================
-- PARTE 2 — LIMPIEZA DE DUPLICADOS (destructiva, transaccional)
-- ============================================================
-- Cada bloque corre en su propia transacción: si algo falla,
-- se revierte solo y podés revisar el error.
--
-- CRITERIOS:
--   Ingredients: se CONSERVA el registro más antiguo y se SUMAN
--     cantidades y precios (se recalcula price_per_unit). Se borran
--     los posteriores. La unidad que queda es la del conservado.
--     Las referencias en recipe_ingredients / product_recipes pasan
--     a NULL (FK ON DELETE SET NULL) y el nombre se conserva en el
--     snapshot, así las recetas/productos no se rompen.
--   Recipes: se conserva la MÁS RECIENTE (updated_at), se borran las
--     anteriores. recipe_ingredients se borra en cascada;
--     product_recipes.recipe_id pasa a NULL (conserva recipe_name).
--   Products: se conserva el MÁS RECIENTE, se borran los anteriores.
--     product_recipes se borra en cascada.

-- 2A. INGREDIENTS: consolidar y borrar duplicados
BEGIN;

-- 2A.1 Sumar cantidades/precios de todo el grupo al sobreviviente (el más antiguo)
WITH ranked AS (
  SELECT
    id,
    user_id,
    lower(name) AS name_key,
    ROW_NUMBER() OVER (PARTITION BY user_id, lower(name)
                       ORDER BY created_at ASC, id ASC) AS rn
  FROM public.ingredients
),
agg AS (
  SELECT
    r.user_id,
    r.name_key,
    SUM(i.purchased_quantity) AS total_qty,
    SUM(i.total_price)        AS total_price
  FROM ranked r
  JOIN public.ingredients i ON i.id = r.id
  GROUP BY r.user_id, r.name_key
  HAVING COUNT(*) > 1
)
UPDATE public.ingredients AS tgt
SET
  purchased_quantity = agg.total_qty,
  total_price        = agg.total_price,
  price_per_unit     = agg.total_price / agg.total_qty,
  updated_at         = now()
FROM agg
JOIN ranked r
  ON r.user_id = agg.user_id
 AND r.name_key = agg.name_key
 AND r.rn = 1
WHERE tgt.id = r.id;

-- 2A.2 Borrar los duplicados (todo excepto el sobreviviente de cada grupo)
DELETE FROM public.ingredients
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, lower(name)
                              ORDER BY created_at ASC, id ASC) AS rn
    FROM public.ingredients
  ) ranked
  WHERE rn > 1
);

COMMIT;


-- 2B. RECIPES: conservar la más reciente, borrar el resto
BEGIN;

DELETE FROM public.recipes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, lower(name)
                              ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
    FROM public.recipes
  ) ranked
  WHERE rn > 1
);

COMMIT;


-- 2C. PRODUCTS: conservar el más reciente, borrar el resto
BEGIN;

DELETE FROM public.products
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, lower(name)
                              ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
    FROM public.products
  ) ranked
  WHERE rn > 1
);

COMMIT;


-- ============================================================
-- PARTE 3 — ÍNDICES UNIQUE
-- ============================================================
-- A partir de acá, la DB rechaza duplicados de nombre por usuario.
-- IMPORTANTE: debe correr DESPUÉS de la Parte 2 (sino falla si hay duplicados).

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_user_name_key
  ON public.ingredients (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS recipes_user_name_key
  ON public.recipes (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS products_user_name_key
  ON public.products (user_id, lower(name));


-- ============================================================
-- PARTE 4 — FUNCIÓN RPC: public.upsert_ingredient
-- ============================================================
-- Suma cantidad/precio si el ingrediente existe (mismo user y nombre,
-- ignorando mayúsculas) o inserta si es nuevo. Es atómica en DB:
-- dos peticiones simultáneas jamás generan duplicados.
--
-- Nota: usa auth.uid() internamente, así que NO se le pasa user_id
-- desde el cliente (evita que un usuario escriba filas ajenas).
-- Los índices UNIQUE de la Parte 3 son REQUISITO para el ON CONFLICT.
--
-- FIX definitivo de ambigüedad:
--   RETURNS TABLE (id, name, ...) crea variables PL/pgSQL que colisionan
--   con las columnas de la tabla dentro del ON CONFLICT (p.ej. lower(name)),
--   y el error "column reference "name" is ambiguous" (42702) no se puede
--   resolver con plpgsql.variable_conflict porque Supabase lo bloquea
--   (PGC_SUSET: "permission denied to set parameter", 42501).
--   Solución: RETURNS SETOF public.ingredients NO crea variables de salida;
--   los únicos identificadores son v_user_id y p_* (sin colisión con
--   columnas) y RETURNING * no necesita desambiguación. No requiere GUCs
--   ni permisos especiales.

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
  ON CONFLICT (user_id, lower(name))
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

COMMENT ON FUNCTION public.upsert_ingredient IS
  'Inserta un ingrediente o suma cantidad/precio si ya existe uno con el mismo nombre (insensible a mayusculas) para el usuario autenticado. Devuelve la fila completa de ingredients (SETOF).';


-- ============================================================
-- PARTE 5 — VERIFICACIÓN
-- ============================================================

-- 5A. No debe quedar ningún grupo duplicado
SELECT 'ingredients' AS tabla, COUNT(*) AS grupos_duplicados
FROM (
  SELECT user_id, lower(name)
  FROM public.ingredients
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'recipes', COUNT(*)
FROM (
  SELECT user_id, lower(name)
  FROM public.recipes
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'products', COUNT(*)
FROM (
  SELECT user_id, lower(name)
  FROM public.products
  GROUP BY user_id, lower(name)
  HAVING COUNT(*) > 1
) d;

-- 5B. Deben aparecer los 3 índices
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('ingredients_user_name_key', 'recipes_user_name_key', 'products_user_name_key')
ORDER BY tablename;

-- 5C. Definición viva de la función (debe mostrar "RETURNS SETOF public.ingredients"
--     y "RETURN QUERY ... RETURNING *") y su config (solo search_path=public,
--     SIN variable_conflict: Supabase no permite ese GUC)
SELECT pg_get_functiondef('public.upsert_ingredient'::regprocedure);

SELECT proname, proconfig
FROM pg_proc
WHERE proname = 'upsert_ingredient';

-- 5D. Prueba del RPC dentro de una transacción (no deja datos)
--     Reemplazá <TU_USER_ID> por tu id real (sale del primer SELECT).
--     El SQL Editor no tiene sesión de usuario, por eso emulamos el JWT.
BEGIN;

SELECT id FROM auth.users LIMIT 1;

SELECT set_config('request.jwt.claims',
                  json_build_object('sub', '<TU_USER_ID>')::text,
                  true);

-- 1ra llamada: INSERTA (cantidad 1, precio 100)
SELECT * FROM public.upsert_ingredient('__PRUEBA_DEDUPE__', 1, 'g', 100);

-- 2da llamada: debe SUMAR (cantidad 3, precio 300) y NO crear duplicado
SELECT * FROM public.upsert_ingredient('__PRUEBA_DEDUPE__', 2, 'g', 200);

ROLLBACK;