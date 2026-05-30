-- =============================================================
-- Correção de Recorrência Infinita na Política de RLS de Profiles
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Remover a política antiga recursiva
DROP POLICY IF EXISTS "Profiles are viewable by users in the same barbershop" ON public.profiles;

-- 2. Criar função auxiliar SECURITY DEFINER
-- Funções SECURITY DEFINER rodam ignorando RLS (com privilégios de superuser),
-- quebrando a recursividade infinita de querying na mesma tabela com RLS ativa.
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id FROM public.profiles WHERE id = p_user_id;
$$ LANGUAGE sql;

-- 3. Criar a nova política sem recursão
CREATE POLICY "Profiles are viewable by users in the same barbershop" 
  ON public.profiles FOR SELECT 
  USING (
    barbershop_id = public.get_user_barbershop_id(auth.uid()) OR id = auth.uid()
  );

-- Garantir privilégio de execução para o público
GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id(UUID) TO authenticated, anon;
