-- ============================================================
-- COSTO REPOSTERO — Migracion 007: Perfiles y monetizacion
-- Tabla profiles (1:1 con auth.users) para soportar el Plan Pro
-- integrado con Mercado Pago (Checkout Pro, pago unico 30 dias).
-- ============================================================

-- 1. TABLA: profiles
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type       text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  pro_valid_until timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 2. TRIGGER: crear fila automaticamente al registrar un usuario nuevo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. BACKFILL: usuarios existentes (no tienen fila en profiles)
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 4. RLS: lectura propia si, escritura solo backend (service_role)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Sin policy de UPDATE/INSERT/INSERT para el cliente:
-- - UPDATE de plan_type / pro_valid_until queda bloqueado para el frontend
-- - El backend (service_role) bypasea RLS nativamente para actualizar
-- - El INSERT legitimo lo hace el trigger handle_new_user (SECURITY DEFINER)