-- ============================================================
-- COSTO REPOSTERO — Migracion 017: Orders
-- Tabla de pedidos (orders) con estados, JSONB de recetas/gastos y RLS.
-- ============================================================

CREATE TYPE estado_pedido AS ENUM ('pendiente', 'en_preparacion', 'entregado');

CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  title TEXT,
  recipes JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  sale_price NUMERIC(12, 2) DEFAULT 0.00,
  total_cost NUMERIC(12, 2) DEFAULT 0.00,
  deposit NUMERIC(12, 2) DEFAULT 0.00,
  status estado_pedido DEFAULT 'pendiente'::estado_pedido NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios pedidos" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden crear sus propios pedidos" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden actualizar sus propios pedidos" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden eliminar sus propios pedidos" ON public.orders FOR DELETE USING (auth.uid() = user_id);
