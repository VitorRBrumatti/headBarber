-- =============================================================
-- Fase 5: Tabelas Financeiras (Receitas, Despesas e Triggers)
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. ADICIONAR COMISSÃO À TABELA DE BARBEIROS
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 
CONSTRAINT chk_commission CHECK (commission_percentage BETWEEN 0 AND 100);


-- 2. TABELA REVENUES (Ledger de Receitas)
CREATE TABLE IF NOT EXISTS public.revenues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('service', 'product', 'monthly_plan', 'manual_adjustment')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id UUID, -- Referência opcional para appointments, product_sales, etc.
  payment_method TEXT CHECK (payment_method IN ('money', 'pix', 'credit_card', 'debit_card', 'other')) DEFAULT 'pix',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;


-- 3. TABELA EXPENSES (Ledger de Despesas)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('rent', 'energy', 'water', 'internet', 'products', 'commission', 'maintenance', 'marketing', 'other')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;


-- 3b. TABELA PRODUCT_SALES (Registro de Venda de Produtos)
CREATE TABLE IF NOT EXISTS public.product_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  payment_method TEXT CHECK (payment_method IN ('money', 'pix', 'credit_card', 'debit_card', 'other')) DEFAULT 'pix',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ProductSales: members can view own barbershop"
  ON public.product_sales FOR SELECT
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "ProductSales: members can insert"
  ON public.product_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "ProductSales: members can update"
  ON public.product_sales FOR UPDATE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "ProductSales: members can delete"
  ON public.product_sales FOR DELETE
  TO authenticated
  USING (
    barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_product_sales_barbershop_id ON public.product_sales(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON public.product_sales(product_id);


-- =============================================================
-- 4. TIMESTAMPS AUTOMÁTICOS
-- =============================================================
CREATE OR REPLACE TRIGGER update_revenues_updated_at
  BEFORE UPDATE ON public.revenues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_product_sales_updated_at
  BEFORE UPDATE ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================================
-- 5. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA DE AGENDAMENTOS CONCLUÍDOS
-- =============================================================
CREATE OR REPLACE FUNCTION public.sync_appointment_to_revenue()
RETURNS trigger AS $$
DECLARE
  v_description TEXT;
  v_client_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Se mudou para completed, insere/atualiza receita
    IF new.status = 'completed' AND (old.status IS NULL OR old.status != 'completed') THEN
      SELECT name INTO v_client_name FROM public.clients WHERE id = new.client_id;
      v_description := 'Atendimento concluído: ' || COALESCE(v_client_name, 'Cliente Avulso');
      
      INSERT INTO public.revenues (barbershop_id, category, description, amount, date, reference_id, payment_method)
      VALUES (new.barbershop_id, 'service', v_description, new.total_price, new.start_at::DATE, new.id, 'pix');
    
    -- Se saiu de completed, remove a receita correspondente
    ELSIF new.status != 'completed' AND old.status = 'completed' THEN
      DELETE FROM public.revenues WHERE reference_id = new.id AND category = 'service';
    END IF;
    
    -- Se continuar completed mas o valor ou data mudou, atualiza a receita
    IF new.status = 'completed' AND old.status = 'completed' AND (new.total_price != old.total_price OR new.start_at != old.start_at) THEN
      SELECT name INTO v_client_name FROM public.clients WHERE id = new.client_id;
      v_description := 'Atendimento concluído: ' || COALESCE(v_client_name, 'Cliente Avulso');
      
      UPDATE public.revenues
      SET amount = new.total_price, 
          date = new.start_at::DATE,
          description = v_description
      WHERE reference_id = new.id AND category = 'service';
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_appointment_revenue_sync
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_to_revenue();

-- Trigger para deletar receita se o agendamento for excluído do sistema
CREATE OR REPLACE FUNCTION public.delete_appointment_revenue()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.revenues WHERE reference_id = old.id AND category = 'service';
  RETURN old;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_appointment_revenue_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.delete_appointment_revenue();


-- =============================================================
-- 6. POLÍCITAS DE RLS (Tenant Isolation)
-- =============================================================

-- POLICIES: revenues
CREATE POLICY "Revenues viewable by members of same barbershop" 
  ON public.revenues FOR SELECT
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Revenues managed by members of same barbershop" 
  ON public.revenues FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

-- POLICIES: expenses
CREATE POLICY "Expenses viewable by members of same barbershop" 
  ON public.expenses FOR SELECT
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Expenses managed by members of same barbershop" 
  ON public.expenses FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));


-- =============================================================
-- 7. GRANTS DE EXECUÇÃO
-- =============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales TO authenticated;
