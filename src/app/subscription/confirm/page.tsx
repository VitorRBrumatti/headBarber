import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock3 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { getStripe } from '@/lib/stripe'
import { hasProductAccess } from '@/lib/plans'
import { syncStripeSubscription } from '@/lib/stripe-subscriptions'

export default async function SubscriptionConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!sessionId) redirect('/plans')

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.client_reference_id !== user.id) {
    redirect('/plans?error=checkout')
  }

  if (session.subscription) {
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await syncStripeSubscription(subscription, user.id)

    if (hasProductAccess(subscription.status)) {
      redirect('/onboarding')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#c8c5cb]/60 bg-white p-8 text-center shadow-[0_12px_40px_rgba(26,26,29,0.04)]">
        <Clock3 className="mx-auto h-10 w-10 text-[#C79A4A]" />
        <h1 className="mt-5 font-montserrat text-2xl font-semibold text-[#1A1A1D]">Confirmando assinatura</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#47464b]">
          A Stripe ainda está processando a confirmação. Aguarde alguns segundos e tente novamente.
        </p>
        <Link href={`/subscription/confirm?session_id=${sessionId}`} className="mt-6 inline-flex rounded-lg bg-[#C79A4A] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#1A1A1D]">
          Verificar novamente
        </Link>
      </div>
    </main>
  )
}
