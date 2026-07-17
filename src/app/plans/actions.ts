'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAppUrl, getStripe } from '@/lib/stripe'
import { getPriceId, hasProductAccess, isBillingPlan } from '@/lib/plans'

export async function createCheckoutSession(formData: FormData) {
  const plan = formData.get('plan')
  if (!isBillingPlan(plan)) {
    redirect('/plans?error=invalid-plan')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: currentSubscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subscriptionError) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Stripe checkout blocked because the subscription store is unavailable',
      code: subscriptionError.code,
    }))
    redirect('/plans?error=billing-unavailable')
  }

  if (hasProductAccess(currentSubscription?.status)) {
    redirect('/dashboard')
  }

  const stripe = getStripe()
  let customerId = currentSubscription?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    const { error } = await admin.from('subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      status: 'incomplete',
    }, { onConflict: 'user_id' })

    if (error) {
      throw new Error(`Could not save Stripe customer: ${error.message}`)
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${getAppUrl()}/subscription/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/plans?checkout=cancelled`,
    metadata: {
      supabase_user_id: user.id,
      billing_plan: plan,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        billing_plan: plan,
      },
    },
  })

  if (!session.url) {
    throw new Error('Stripe Checkout did not return a URL')
  }

  redirect(session.url)
}

export async function createBillingPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!subscription?.stripe_customer_id) {
    redirect('/plans')
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${getAppUrl()}/dashboard/planos-mensais`,
  })

  redirect(session.url)
}
