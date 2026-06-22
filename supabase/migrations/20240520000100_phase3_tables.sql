-- =============================================================
-- Fase 3: Tabelas de Serviços, Barbeiros e Clientes
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. SERVIÇOS
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services: members can view own barbershop"
  ON public.services FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Services: members can insert"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Services: members can update"
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Services: members can delete"
  ON public.services FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 2. BARBEIROS
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers: members can view own barbershop"
  ON public.barbers FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Barbers: members can insert"
  ON public.barbers FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Barbers: members can update"
  ON public.barbers FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Barbers: members can delete"
  ON public.barbers FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients: members can view own barbershop"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Clients: members can insert"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Clients: members can update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Clients: members can delete"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Garantir acesso via Data API (REST) para o role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
