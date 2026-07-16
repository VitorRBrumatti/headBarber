-- Stripe subscriptions are the source of truth for application access.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (
    status IN (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Writes are intentionally restricted to the service role used by Stripe handlers.
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx
  ON public.subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_idx
  ON public.subscriptions (stripe_subscription_id);

CREATE OR REPLACE FUNCTION public.set_subscription_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_subscription_updated_at();

-- Defense in depth: authenticated users cannot access operational data without
-- an active subscription, even if they call Supabase REST directly.
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing')
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;

DO $$
DECLARE
  table_name TEXT;
  protected_tables TEXT[] := ARRAY[
    'profiles',
    'barbershops',
    'services',
    'barbers',
    'clients',
    'add_ons',
    'products',
    'barber_work_hours',
    'barber_blocked_times',
    'appointments',
    'appointment_add_ons',
    'barbershop_settings',
    'revenues',
    'expenses',
    'product_sales'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS subscription_required_for_authenticated_access ON public.%I',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY subscription_required_for_authenticated_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_active_subscription()) WITH CHECK (public.has_active_subscription())',
      table_name
    );
  END LOOP;
END;
$$;