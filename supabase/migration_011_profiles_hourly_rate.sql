-- ============================================================
-- COSTO REPOSTERO — Migracion 011: Valor hora en profiles
-- Agrega hourly_rate a profiles para configurar la tarifa por
-- hora (ARS) usada en el calculo de mano de obra de recetas y
-- subproductos.
-- ============================================================
-- NOTA: profiles solo tiene policy de SELECT para el cliente
-- (migration_007). Las escrituras van por service_role o por
-- funciones SECURITY DEFINER. Por eso se crea la funcion RPC
-- public.update_user_hourly_rate, que solo modifica hourly_rate
-- del usuario autenticado y deja protegidos plan_type y
-- pro_valid_until.

-- 1. Columna hourly_rate (numeric, default 0)
ALTER TABLE profiles
  ADD COLUMN hourly_rate numeric NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0);

COMMENT ON COLUMN profiles.hourly_rate IS 'Tarifa por hora en ARS para calcular mano de obra en recetas y subproductos.';

-- 2. Funcion RPC segura: actualiza solo hourly_rate del usuario autenticado
CREATE OR REPLACE FUNCTION public.update_user_hourly_rate(p_rate numeric)
RETURNS void
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

  IF p_rate IS NULL OR p_rate < 0 THEN
    RAISE EXCEPTION 'El valor hora no puede ser negativo';
  END IF;

  UPDATE public.profiles
  SET hourly_rate = p_rate
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, hourly_rate)
    VALUES (v_user_id, p_rate);
  END IF;
END;
$$;

-- Seguridad: solo usuarios autenticados pueden llamarla
REVOKE ALL ON FUNCTION public.update_user_hourly_rate(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_hourly_rate(numeric) TO authenticated;

COMMENT ON FUNCTION public.update_user_hourly_rate IS 'Actualiza el valor hora (ARS) del perfil del usuario autenticado. Crea el perfil si no existe.';