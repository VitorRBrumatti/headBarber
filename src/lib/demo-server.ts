import { createAdminClient } from '@/utils/supabase/admin'

// Only the service-role registry authorizes demo entry/reset.
export async function getConfiguredDemo(admin = createAdminClient()) {
  const email = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase()
  const slug = process.env.DEMO_BOOKING_SLUG || 'headbarber-demo'
  if (!email) throw new Error('Demo email is not configured')
  const { data: demo, error } = await admin.from('demo_accounts')
    .select('user_id, barbershop_id').eq('singleton', true).maybeSingle()
  if (error || !demo) throw new Error('Demo registry is unavailable')

  const [profile, shop, account, subscription] = await Promise.all([
    admin.from('profiles').select('demo_mode, barbershop_id, role').eq('id', demo.user_id).single(),
    admin.from('barbershops').select('slug').eq('id', demo.barbershop_id).single(),
    admin.auth.admin.getUserById(demo.user_id),
    admin.from('subscriptions').select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', demo.user_id).maybeSingle(),
  ])
  if (profile.error || shop.error || account.error || subscription.error
    || profile.data?.demo_mode !== true || profile.data.role !== 'owner'
    || profile.data.barbershop_id !== demo.barbershop_id || shop.data?.slug !== slug
    || account.data.user?.email?.toLowerCase() !== email
    || !account.data.user?.email_confirmed_at
    || (account.data.user?.factors?.length ?? 0) > 0
    || subscription.data?.stripe_customer_id || subscription.data?.stripe_subscription_id) {
    throw new Error('Demo identity does not match its configuration')
  }
  return demo
}
