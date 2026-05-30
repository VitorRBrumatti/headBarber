-- =============================================================
-- Correção de RLS na Tabela Barbershops para o Onboarding
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Remover a política antiga de visualização restrita
DROP POLICY IF EXISTS "Barbershop viewable by its own members" ON public.barbershops;

-- 2. Permitir que qualquer pessoa visualize as barbearias (SELECT público)
-- Isso é fundamental pois a página de agendamento online (/booking/[slug]) é pública 
-- e o cliente final (anon) precisa consultar os dados da barbearia.
-- Também resolve o erro do insert().select() no onboarding, onde o criador ainda não se vinculou.
CREATE POLICY "Barbershops are viewable by anyone"
  ON public.barbershops FOR SELECT
  USING (true);

-- 3. Restringir UPDATE nas barbearias apenas aos membros associados a ela
DROP POLICY IF EXISTS "Barbershops can be updated by members" ON public.barbershops;
CREATE POLICY "Barbershops can be updated by members"
  ON public.barbershops FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_barbershop_id(auth.uid())
  )
  WITH CHECK (
    id = public.get_user_barbershop_id(auth.uid())
  );
