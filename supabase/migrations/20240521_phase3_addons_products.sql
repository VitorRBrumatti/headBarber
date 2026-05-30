-- =============================================================
-- Fase 3: Tabelas de Adicionais (Add-ons) e Produtos
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. ADICIONAIS (ADD-ONS)
CREATE TABLE IF NOT EXISTS public.add_ons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AddOns: members can view own barbershop"
  ON public.add_ons FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "AddOns: members can insert"
  ON public.add_ons FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "AddOns: members can update"
  ON public.add_ons FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "AddOns: members can delete"
  ON public.add_ons FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 2. PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2),
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products: members can view own barbershop"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Products: members can insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Products: members can update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Products: members can delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3. Garantir acesso via Data API (REST) para o role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_ons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_add_ons_barbershop_id ON public.add_ons(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_products_barbershop_id ON public.products(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
