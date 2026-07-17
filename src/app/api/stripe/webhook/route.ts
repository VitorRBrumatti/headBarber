import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { syncStripeSubscription } from '@/lib/stripe-subscriptions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return Response.json({ error: 'Stripe webhook is not configured' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    )
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Invalid Stripe webhook signature',
      error: error instanceof Error ? error.message : String(error),
    }))
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          await syncStripeSubscription(subscription, session.client_reference_id || undefined)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = await getStripe().subscriptions.retrieve(event.data.object.id)
        await syncStripeSubscription(subscription)
        break
      }
      default:
        break
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Stripe webhook processing failed',
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    }))
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
