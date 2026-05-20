-- Migrations para o HeadBarber (Supabase Cloud)

-- 1. Tabela Barbershops (Tenants)
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- 2. Tabela Profiles (Usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT DEFAULT 'barber' CHECK (role IN ('owner', 'admin', 'barber', 'receptionist')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Função para criar perfil automaticamente via trigger (opcional, pode ser feito no app)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. RLS Policies (Isolamento Multi-Tenant)

-- Barbershops: Apenas perfis associados à barbearia podem visualizá-la.
CREATE POLICY "Barbershop viewable by its own members" 
  ON public.barbershops FOR SELECT 
  USING (
    id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Permitir qualquer pessoa ler barbershops por enquanto para o self-service?
-- Para o MVP de self-service, quem cadastra a barbearia precisa poder inserir
CREATE POLICY "Anyone can insert a barbershop"
  ON public.barbershops FOR INSERT
  WITH CHECK (true);

-- Profiles: Usuários só podem ver perfis da MESMA barbearia.
CREATE POLICY "Profiles are viewable by users in the same barbershop" 
  ON public.profiles FOR SELECT 
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    ) OR id = auth.uid()
  );

-- Profiles: Usuários podem atualizar apenas seu próprio perfil (a menos que seja admin, algo pra futura iteração).
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (id = auth.uid());

-- Permitir que a própria pessoa recém-cadastrada se associe à barbearia
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
