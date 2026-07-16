import type Stripe from 'stripe'
import { createAdminClient } from '@/utils/supabase/admin'

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end
  return itemPeriodEnd ? new Date(itemPeriodEnd * 1000).toISOString() : null
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  explicitUserId?: string,
) {
  const admin = createAdminClient()
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id
  const userId = explicitUserId || subscription.metadata.supabase_user_id

  if (!userId) {
    throw new Error(`Subscription ${subscription.id} has no Supabase user metadata`)
  }

  const item = subscription.items.data[0]
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price.id ?? null,
    plan_interval: item?.price.recurring?.interval ?? null,
    status: subscription.status,
    current_period_end: subscriptionPeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'user_id' })

  if (error) {
    throw new Error(`Could not persist Stripe subscription: ${error.message}`)
  }
}
