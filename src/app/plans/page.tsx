import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, Crown, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createCheckoutSession } from './actions'
import { formatPlanAmount, hasProductAccess, PLAN_DETAILS, type BillingPlan } from '@/lib/plans'

const features = [
  'Todas as funcionalidades inclusas',
  'Até 2 barbeiros inclusos',
  'Agenda, financeiro e clientes em um só lugar',
]

const messages: Record<string, string> = {
  'invalid-plan': 'Escolha um plano válido para continuar.',
  checkout: 'Não foi possível iniciar o pagamento. Tente novamente.',
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (hasProductAccess(subscription?.status)) {
    redirect('/dashboard')
  }

  const billingReady = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_MONTHLY_PRICE_ID &&
    process.env.STRIPE_ANNUAL_PRICE_ID &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  return (
    <main className="min-h-screen bg-[#f8f9ff] text-[#181c21]">
      <header className="border-b border-[#c8c5cb]/40 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" aria-label="HeadBarber" className="flex items-center gap-3">
            <Image src="/brand/logo-horizontal.png" alt="HeadBarber" width={180} height={48} className="h-9 w-auto" priority />
          </Link>
          <form action="/auth/signout" method="post">
            <button className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#47464b] transition-colors hover:text-[#1A1A1D]">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C79A4A]/30 bg-[#C79A4A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#7c5809]">
            <Sparkles className="h-4 w-4" />
            Etapa 2 de 3
          </div>
          <h1 className="font-montserrat text-3xl font-bold tracking-[-0.02em] text-[#1A1A1D] md:text-4xl">
            Escolha como investir na sua gestão
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#47464b]">
            Sua conta está pronta. Selecione a recorrência para liberar a configuração da barbearia e todo o painel HeadBarber.
          </p>
        </div>

        {(params.error || params.checkout === 'cancelled' || !billingReady) && (
          <div role="alert" className="mx-auto mb-8 max-w-3xl rounded-lg border border-[#C79A4A]/30 bg-[#ffdeaa]/35 px-4 py-3 text-sm text-[#5f4100]">
            {!billingReady
              ? 'O pagamento ainda não está configurado. Adicione as variáveis Stripe na Vercel para liberar as assinaturas.'
              : params.checkout === 'cancelled'
                ? 'Pagamento cancelado. Nenhuma cobrança foi realizada; escolha um plano quando estiver pronto.'
                : messages[params.error || 'checkout']}
          </div>
        )}

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-center">
          {(['monthly', 'annual'] as BillingPlan[]).map((plan) => {
            const details = PLAN_DETAILS[plan]
            const annual = plan === 'annual'

            return (
              <article
                key={plan}
                className={annual
                  ? 'relative overflow-hidden rounded-2xl border border-[#C79A4A] bg-[#1A1A1D] p-8 text-white shadow-[0_16px_48px_rgba(26,26,29,0.16)] md:scale-[1.03] md:p-10'
                  : 'rounded-2xl border border-[#c8c5cb] bg-white p-8 shadow-[0_12px_40px_rgba(26,26,29,0.04)] md:p-10'}
              >
                {annual && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#C79A4A] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#1A1A1D]">
                    Melhor valor
                  </div>
                )}

                <p className={`text-xs font-semibold uppercase tracking-widest ${annual ? 'text-[#C79A4A]' : 'text-[#47464b]'}`}>
                  {details.eyebrow}
                </p>
                <h2 className="mt-2 font-montserrat text-2xl font-semibold">{details.name}</h2>
                <div className="mt-7 flex items-end gap-2">
                  <span className="pb-1 text-lg font-semibold">R$</span>
                  <strong className="font-montserrat text-5xl font-bold tracking-tight">
                    {formatPlanAmount(details.amount).replace('R$', '').trim()}
                  </strong>
                  <span className={`pb-1 text-sm ${annual ? 'text-[#c8c6ca]' : 'text-[#47464b]'}`}>
                    {details.suffix}
                  </span>
                </div>

                {annual && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#C79A4A]/30 bg-[#C79A4A]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#C79A4A]">
                    <Crown className="h-4 w-4" />
                    2 meses grátis
                  </div>
                )}

                <ul className="my-8 space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#C79A4A]" />
                      <span className={annual ? 'text-white' : 'text-[#181c21]'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <form action={createCheckoutSession}>
                  <input type="hidden" name="plan" value={plan} />
                  <button
                    type="submit"
                    disabled={!billingReady}
                    className={annual
                      ? 'w-full cursor-pointer rounded-lg bg-[#C79A4A] px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#1A1A1D] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
                      : 'w-full cursor-pointer rounded-lg border border-[#1A1A1D] bg-transparent px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#1A1A1D] transition-colors hover:bg-[#1A1A1D] hover:text-white disabled:cursor-not-allowed disabled:opacity-50'}
                  >
                    Escolher plano {plan === 'annual' ? 'anual' : 'mensal'}
                  </button>
                </form>
              </article>
            )
          })}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl items-center justify-center gap-3 text-center text-xs leading-relaxed text-[#77767b]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#C79A4A]" />
          Pagamento processado com segurança pela Stripe. O acesso é liberado somente após a confirmação da assinatura.
        </div>
      </section>
    </main>
  )
}
