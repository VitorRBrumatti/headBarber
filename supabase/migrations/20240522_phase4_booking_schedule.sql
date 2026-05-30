-- =============================================================
-- Fase 4: Tabelas de Reservas, Agenda, Expedientes e Configurações
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. NORMALIZAÇÃO DE TELEFONE EM CLIENTES
-- Adicionar coluna normalized_phone
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

-- Função para normalizar telefone (remover caracteres não-numéricos)
CREATE OR REPLACE FUNCTION public.normalize_client_phone()
RETURNS trigger AS $$
BEGIN
  IF new.phone IS NOT NULL THEN
    new.normalized_phone := regexp_replace(new.phone, '\D', '', 'g');
  ELSE
    new.normalized_phone := NULL;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manter normalized_phone sempre atualizado
CREATE OR REPLACE TRIGGER on_client_phone_normalize
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.normalize_client_phone();

-- Executar retroativamente em clientes existentes
UPDATE public.clients 
SET normalized_phone = regexp_replace(phone, '\D', '', 'g') 
WHERE phone IS NOT NULL AND normalized_phone IS NULL;

-- Criar constraint unique para (barbershop_id, normalized_phone)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_barbershop_id_normalized_phone_key;
ALTER TABLE public.clients ADD CONSTRAINT clients_barbershop_id_normalized_phone_key UNIQUE (barbershop_id, normalized_phone);


-- 2. TABELA BARBER WORK HOURS (Expediente Individual)
CREATE TABLE IF NOT EXISTS public.barber_work_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  lunch_start_time TIME NOT NULL,
  lunch_end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Validações de horários coerentes
  CONSTRAINT chk_times CHECK (
    start_time < end_time AND 
    lunch_start_time > start_time AND 
    lunch_end_time < end_time AND 
    lunch_start_time < lunch_end_time
  )
);

ALTER TABLE public.barber_work_hours ENABLE ROW LEVEL SECURITY;

-- 3. TABELA BARBER BLOCKED TIMES (Bloqueios Excepcionais)
CREATE TABLE IF NOT EXISTS public.barber_blocked_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT chk_blocked_times CHECK (start_at < end_at)
);

ALTER TABLE public.barber_blocked_times ENABLE ROW LEVEL SECURITY;


-- 4. TABELA APPOINTMENTS (Reservas)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'confirmed',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  whatsapp_confirmation_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT chk_app_times CHECK (start_at < end_at)
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Criar índices de busca frequente para garantir performance
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON public.appointments (barber_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments (barbershop_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments (client_id);


-- 5. TABELA APPOINTMENT ADD-ONS (Adicionais Selecionados)
CREATE TABLE IF NOT EXISTS public.appointment_add_ons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES public.add_ons(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.appointment_add_ons ENABLE ROW LEVEL SECURITY;


-- 6. TABELA BARBERSHOP SETTINGS (Configurações da Barbearia)
CREATE TABLE IF NOT EXISTS public.barbershop_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  whatsapp_reminder_hours INTEGER NOT NULL DEFAULT 2,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  default_start_time TIME NOT NULL DEFAULT '09:00:00',
  default_end_time TIME NOT NULL DEFAULT '19:00:00',
  default_lunch_start TIME NOT NULL DEFAULT '12:00:00',
  default_lunch_end TIME NOT NULL DEFAULT '13:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 7. TIMESTAMPS AUTOMÁTICOS
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_barber_work_hours_updated_at
  BEFORE UPDATE ON public.barber_work_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_barbershop_settings_updated_at
  BEFORE UPDATE ON public.barbershop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================================
-- 8. RLS POLICIES (Segurança Isolada Multi-tenant)
-- =============================================================

-- POLICIES: barber_work_hours
CREATE POLICY "Work hours viewable by anyone" 
  ON public.barber_work_hours FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Work hours managed by members of same barbershop" 
  ON public.barber_work_hours FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

-- POLICIES: barber_blocked_times
CREATE POLICY "Blocked times viewable by anyone" 
  ON public.barber_blocked_times FOR SELECT 
  USING (true);

CREATE POLICY "Blocked times managed by members of same barbershop" 
  ON public.barber_blocked_times FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

-- POLICIES: appointments (ANÔNIMOS NÃO PODEM LER DIRETAMENTE)
CREATE POLICY "Appointments viewable by members of same barbershop" 
  ON public.appointments FOR SELECT
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Appointments managed by members of same barbershop" 
  ON public.appointments FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

-- POLICIES: appointment_add_ons
CREATE POLICY "Appointment add-ons viewable by members of same barbershop" 
  ON public.appointment_add_ons FOR SELECT
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Appointment add-ons managed by members of same barbershop" 
  ON public.appointment_add_ons FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));

-- POLICIES: barbershop_settings
CREATE POLICY "Settings viewable by anyone" 
  ON public.barbershop_settings FOR SELECT 
  USING (true);

CREATE POLICY "Settings managed by members of same barbershop" 
  ON public.barbershop_settings FOR ALL
  TO authenticated
  USING (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (barbershop_id = (SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()));


-- =============================================================
-- 9. RPC SECURE QUERIES (SECURITY DEFINER)
-- =============================================================

-- RPC 1: get_public_available_slots
-- Retorna os slots livres de 30 min para um barbeiro e data específicos
CREATE OR REPLACE FUNCTION public.get_public_available_slots(
  p_barbershop_id UUID,
  p_barber_id UUID,
  p_date DATE
)
RETURNS TABLE (available_time TIME)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_work_start TIME;
  v_work_end TIME;
  v_lunch_start TIME;
  v_lunch_end TIME;
  v_slot_interval INTERVAL;
  v_current_slot TIME;
  v_slot_start_timestamptz TIMESTAMPTZ;
  v_slot_end_timestamptz TIMESTAMPTZ;
  v_slot_blocked BOOLEAN;
BEGIN
  -- 1. Determinar o dia da semana (0 = Domingo, 1 = Segunda, etc.)
  v_day_of_week := EXTRACT(dow FROM p_date)::INTEGER;

  -- 2. Buscar intervalo padrão das configurações (default 30 min)
  SELECT (slot_interval_minutes || ' minutes')::INTERVAL INTO v_slot_interval
  FROM public.barbershop_settings
  WHERE barbershop_id = p_barbershop_id;

  IF v_slot_interval IS NULL THEN
    v_slot_interval := '30 minutes'::INTERVAL;
  END IF;

  -- 3. Obter jornada de expediente do barbeiro para o dia da semana
  SELECT start_time, end_time, lunch_start_time, lunch_end_time
  INTO v_work_start, v_work_end, v_lunch_start, v_lunch_end
  FROM public.barber_work_hours
  WHERE barbershop_id = p_barbershop_id
    AND barber_id = p_barber_id
    AND day_of_week = v_day_of_week
    AND is_active = true;

  -- Se o barbeiro não trabalha nesse dia, retornar vazio
  IF v_work_start IS NULL THEN
    RETURN;
  END IF;

  -- 4. Iterar e gerar os slots de 30 em 30 min
  v_current_slot := v_work_start;
  WHILE v_current_slot + v_slot_interval <= v_work_end LOOP
    -- Pular slot se estiver dentro do intervalo de almoço
    IF v_current_slot >= v_lunch_start AND v_current_slot + v_slot_interval <= v_lunch_end THEN
      v_current_slot := v_current_slot + v_slot_interval;
      CONTINUE;
    END IF;

    -- Construir timestamps UTC exatos baseados na data e no slot horário
    v_slot_start_timestamptz := (p_date::TEXT || ' ' || v_current_slot::TEXT)::TIMESTAMPTZ;
    v_slot_end_timestamptz := v_slot_start_timestamptz + v_slot_interval;

    -- Validar se o slot está livre em appointments ativos (não cancelados/no_show)
    SELECT EXISTS (
      SELECT 1 FROM public.appointments
      WHERE barber_id = p_barber_id
        AND status NOT IN ('cancelled', 'no_show')
        AND start_at < v_slot_end_timestamptz
        AND end_at > v_slot_start_timestamptz
    ) INTO v_slot_blocked;

    -- Validar se o slot coincide com algum bloqueio excepcional de jornada
    IF NOT v_slot_blocked THEN
      SELECT EXISTS (
        SELECT 1 FROM public.barber_blocked_times
        WHERE barber_id = p_barber_id
          AND start_at < v_slot_end_timestamptz
          AND end_at > v_slot_start_timestamptz
      ) INTO v_slot_blocked;
    END IF;

    -- Se o slot estiver inteiramente livre, retornar para o frontend
    IF NOT v_slot_blocked THEN
      available_time := v_current_slot;
      RETURN NEXT;
    END IF;

    v_current_slot := v_current_slot + v_slot_interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- RPC 2: create_public_appointment_with_client
-- Insere reservas de forma atômica e segura (resolvendo concorrência com Advisory Locks)
CREATE OR REPLACE FUNCTION public.create_public_appointment_with_client(
  p_barbershop_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_client_email TEXT,
  p_barber_id UUID,
  p_service_id UUID,
  p_start_at TIMESTAMPTZ,
  p_notes TEXT,
  p_add_on_ids UUID[]
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_appointment_id UUID;
  v_end_at TIMESTAMPTZ;
  v_day_of_week INTEGER;
  v_work_hours_exist BOOLEAN;
  v_has_conflict BOOLEAN;
  v_total_price NUMERIC(10,2);
  v_service_price NUMERIC(10,2);
  v_add_ons_price NUMERIC(10,2);
  v_start_time TIME;
  v_end_time TIME;
  v_normalized_phone TEXT;
BEGIN
  -- 1. ADVISORY LOCK transacional: Enfileirar solicitações simultâneas para o mesmo barbeiro
  PERFORM pg_advisory_xact_lock(hashtext(p_barber_id::text));

  -- 2. Consistência multi-tenant: Verificar se serviço e barbeiro pertencem à barbearia ativa
  IF NOT EXISTS (
    SELECT 1 FROM public.services WHERE id = p_service_id AND barbershop_id = p_barbershop_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Serviço inválido ou inativo para esta barbearia.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.barbers WHERE id = p_barber_id AND barbershop_id = p_barbershop_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Barbeiro inválido ou inativo para esta barbearia.';
  END IF;

  -- Consistência de adicionais com a barbearia
  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 
      FROM unnest(p_add_on_ids) AS a_id
      LEFT JOIN public.add_ons AS ao ON ao.id = a_id
      WHERE ao.id IS NULL OR ao.barbershop_id <> p_barbershop_id OR ao.is_active = false
    ) THEN
      RAISE EXCEPTION 'Um ou mais adicionais selecionados são inválidos ou inativos.';
    END IF;
  END IF;

  -- 3. Calcular end_at (duração fixa de 30 minutos)
  v_end_at := p_start_at + INTERVAL '30 minutes';
  
  v_start_time := p_start_at::TIME;
  v_end_time := v_end_at::TIME;
  v_day_of_week := EXTRACT(dow FROM p_start_at)::INTEGER;

  -- 4. Validar se o horário está na grade regular de expediente do barbeiro e fora do almoço
  SELECT EXISTS (
    SELECT 1 FROM public.barber_work_hours
    WHERE barber_id = p_barber_id
      AND day_of_week = v_day_of_week
      AND is_active = true
      AND start_time <= v_start_time
      AND end_time >= v_end_time
      AND NOT (v_start_time >= lunch_start_time AND v_end_time <= lunch_end_time)
  ) INTO v_work_hours_exist;

  IF NOT v_work_hours_exist THEN
    RAISE EXCEPTION 'O barbeiro não trabalha neste dia/horário ou o agendamento coincide com o horário de almoço.';
  END IF;

  -- 5. Validar conflito de horários (Sobreposição com agendamentos ativos)
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE barber_id = p_barber_id
      AND status NOT IN ('cancelled', 'no_show')
      AND start_at < v_end_at
      AND end_at > p_start_at
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'Este horário já está ocupado por outro agendamento.';
  END IF;

  -- Validar conflito com bloqueios excepcionais
  SELECT EXISTS (
    SELECT 1 FROM public.barber_blocked_times
    WHERE barber_id = p_barber_id
      AND start_at < v_end_at
      AND end_at > p_start_at
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'Este horário está bloqueado pelo barbeiro.';
  END IF;

  -- 6. Calcular o preço total exclusivamente no backend
  SELECT price INTO v_service_price FROM public.services WHERE id = p_service_id;
  v_total_price := v_service_price;

  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_add_ons_price
    FROM public.add_ons
    WHERE id = ANY(p_add_on_ids);
    
    v_total_price := v_total_price + v_add_ons_price;
  END IF;

  -- 7. Obter ou criar o cadastro do cliente (Normalização segura)
  v_normalized_phone := regexp_replace(p_client_phone, '\D', '', 'g');

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE barbershop_id = p_barbershop_id
    AND normalized_phone = v_normalized_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (barbershop_id, name, phone, email)
    VALUES (p_barbershop_id, p_client_name, p_client_phone, p_client_email)
    RETURNING id INTO v_client_id;
  END IF;

  -- 8. Gravar o agendamento
  INSERT INTO public.appointments (
    barbershop_id,
    client_id,
    barber_id,
    service_id,
    start_at,
    end_at,
    status,
    total_price,
    notes
  ) VALUES (
    p_barbershop_id,
    v_client_id,
    p_barber_id,
    p_service_id,
    p_start_at,
    v_end_at,
    'confirmed',
    v_total_price,
    p_notes
  ) RETURNING id INTO v_appointment_id;

  -- 9. Vincular adicionais selecionados
  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) > 0 THEN
    INSERT INTO public.appointment_add_ons (
      barbershop_id,
      appointment_id,
      add_on_id,
      price
    )
    SELECT p_barbershop_id, v_appointment_id, id, price
    FROM public.add_ons
    WHERE id = ANY(p_add_on_ids);
  END IF;

  RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- 10. GRANTS DE EXECUÇÃO
-- =============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_work_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_blocked_times TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_add_ons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershop_settings TO authenticated;

-- Grants para anon/authenticated acessarem as RPCs
GRANT EXECUTE ON FUNCTION public.get_public_available_slots(UUID, UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_appointment_with_client(UUID, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TEXT, UUID[]) TO anon, authenticated;
