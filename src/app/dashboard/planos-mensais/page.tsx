import { CalendarClock, CheckCircle2, CreditCard } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { createBillingPortalSession } from '@/app/plans/actions'

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Período de teste',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
}

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_interval, current_period_end, cancel_at_period_end')
    .eq('user_id', user!.id)
    .maybeSingle()

  const renewalDate = subscription?.current_period_end
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(subscription.current_period_end))
    : 'Aguardando confirmação'

  return (
    <div>
      <PageHeader
        title="Assinatura"
        description="Consulte seu plano, cobranças e forma de pagamento."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-[#c8c5cb]/50 bg-white p-6 shadow-[0_12px_40px_rgba(26,26,29,0.04)] md:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#77767b]">Plano atual</p>
              <h2 className="mt-2 font-montserrat text-2xl font-semibold text-[#1A1A1D]">Plano Profissional</h2>
              <p className="mt-2 text-sm text-[#47464b]">
                Cobrança {subscription?.plan_interval === 'year' ? 'anual' : 'mensal'} com acesso completo.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {statusLabels[subscription?.status || ''] || 'Em processamento'}
            </span>
          </div>

          <div className="mt-8 flex items-start gap-3 border-t border-[#c8c5cb]/40 pt-6">
            <CalendarClock className="mt-0.5 h-5 w-5 text-[#C79A4A]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#77767b]">
                {subscription?.cancel_at_period_end ? 'Acesso disponível até' : 'Próxima renovação'}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1A1A1D]">{renewalDate}</p>
            </div>
          </div>
        </section>

        <aside className="rounded-xl bg-[#1A1A1D] p-6 text-white md:p-8">
          <CreditCard className="h-7 w-7 text-[#C79A4A]" />
          <h2 className="mt-5 font-montserrat text-xl font-semibold">Gerenciar cobrança</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#c8c6ca]">
            Atualize seu cartão, consulte faturas ou cancele a renovação pelo portal seguro da Stripe.
          </p>
          <form action={createBillingPortalSession} className="mt-7">
            <button className="w-full cursor-pointer rounded-lg bg-[#C79A4A] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#1A1A1D] transition-all hover:brightness-110">
              Abrir portal da Stripe
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}
