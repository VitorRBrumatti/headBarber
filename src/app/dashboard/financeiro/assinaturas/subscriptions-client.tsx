'use client'

import { FormEvent, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import {
  createClientSubscriptionAction,
  registerSubscriptionPaymentAction,
  saveSubscriptionPlanAction,
  scheduleSubscriptionPlanAction,
  setSubscriptionPlanActiveAction,
  setSubscriptionStatusAction,
} from './actions'
import type {
  ClientSubscriber,
  SaveSubscriptionPlanInput,
  SubscriptionActionResult,
  SubscriptionCatalogOption,
  SubscriptionCycle,
  SubscriptionPaymentMethod,
  SubscriptionPlan,
  SubscriptionStatus,
} from './types'

type Tab = 'overview' | 'plans' | 'subscribers' | 'billing'

interface SubscriptionsClientProps {
  enabled: boolean
  plans: SubscriptionPlan[]
  subscribers: ClientSubscriber[]
  cycles: SubscriptionCycle[]
  clients: SubscriptionCatalogOption[]
  services: SubscriptionCatalogOption[]
  addOns: SubscriptionCatalogOption[]
}

interface BenefitDraft {
  selected: boolean
  limit: string
}

interface PlanDraft {
  id: string | null
  name: string
  description: string
  monthlyPrice: string
  benefits: Record<string, BenefitDraft>
}

interface Confirmation {
  title: string
  description: string
  label: string
  destructive?: boolean
  run: () => Promise<SubscriptionActionResult<unknown>>
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

const statusLabels: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
}

const paymentLabels: Record<SubscriptionPaymentMethod, string> = {
  money: 'Dinheiro',
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  other: 'Outro',
}

const emptyDraft: PlanDraft = {
  id: null,
  name: '',
  description: '',
  monthlyPrice: '',
  benefits: {},
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

function resultError(result: SubscriptionActionResult<unknown>) {
  return result.success ? '' : result.error
}

export function SubscriptionsClient({
  enabled,
  plans,
  subscribers,
  cycles,
  clients,
  services,
  addOns,
}: SubscriptionsClientProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [planEditorOpen, setPlanEditorOpen] = useState(false)
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyDraft)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [newSubscriber, setNewSubscriber] = useState({
    clientId: '',
    planId: '',
    startedOn: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [scheduledPlans, setScheduledPlans] = useState<Record<string, string>>({})
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, SubscriptionPaymentMethod>
  >({})

  if (!enabled) {
    return (
      <div className="p-6 md:p-8">
        <header>
          <h1 className="font-montserrat text-3xl font-extrabold text-[#181c21]">
            Assinaturas de clientes
          </h1>
          <p className="mt-2 text-sm text-[#47464b]">
            Planos recorrentes administrados pela sua barbearia.
          </p>
        </header>
        <section className="mt-8 rounded-2xl border border-[#c8c5cb]/50 bg-white px-6 py-16 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-[#7c5809]">
            card_membership
          </span>
          <h2 className="mt-4 font-montserrat text-xl font-bold text-[#181c21]">
            Assinaturas ainda não ativadas para esta barbearia
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#47464b]">
            A estrutura está preparada, mas os controles permanecem bloqueados até a
            ativação segura da funcionalidade.
          </p>
        </section>
      </div>
    )
  }

  const activePlans = plans.filter((plan) => plan.isActive)
  const activeSubscribers = subscribers.filter(
    (subscriber) => subscriber.status === 'active',
  )
  const monthlyRevenue = cycles
    .filter((cycle) => cycle.status === 'paid')
    .reduce((total, cycle) => total + cycle.amount, 0)

  function openNewPlan() {
    setPlanDraft(emptyDraft)
    setPlanEditorOpen(true)
  }

  function openPlan(plan: SubscriptionPlan) {
    const benefits: Record<string, BenefitDraft> = {}
    for (const item of plan.items) {
      const key = `${item.itemType}:${item.serviceId ?? item.addOnId}`
      benefits[key] = {
        selected: true,
        limit: item.monthlyLimit?.toString() ?? '',
      }
    }
    setPlanDraft({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? '',
      monthlyPrice: plan.monthlyPrice.toString(),
      benefits,
    })
    setPlanEditorOpen(true)
  }

  function runAction(action: () => Promise<SubscriptionActionResult<unknown>>) {
    setError('')
    startTransition(async () => {
      const result = await action()
      setError(resultError(result))
    })
  }

  function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const items: SaveSubscriptionPlanInput['items'] = []
    for (const service of services) {
      const draft = planDraft.benefits[`service:${service.id}`]
      if (draft?.selected) {
        items.push({
          itemType: 'service',
          serviceId: service.id,
          addOnId: null,
          monthlyLimit: draft.limit ? Number(draft.limit) : null,
        })
      }
    }
    for (const addOn of addOns) {
      const draft = planDraft.benefits[`add_on:${addOn.id}`]
      if (draft?.selected) {
        items.push({
          itemType: 'add_on',
          serviceId: null,
          addOnId: addOn.id,
          monthlyLimit: draft.limit ? Number(draft.limit) : null,
        })
      }
    }

    setError('')
    startTransition(async () => {
      const result = await saveSubscriptionPlanAction({
        planId: planDraft.id,
        name: planDraft.name,
        description: planDraft.description || null,
        monthlyPrice: Number(planDraft.monthlyPrice),
        items,
      })
      setError(resultError(result))
      if (result.success) setPlanEditorOpen(false)
    })
  }

  function toggleBenefit(key: string, selected: boolean) {
    setPlanDraft((current) => ({
      ...current,
      benefits: {
        ...current.benefits,
        [key]: {
          selected,
          limit: current.benefits[key]?.limit ?? '',
        },
      },
    }))
  }

  function updateBenefitLimit(key: string, limit: string) {
    setPlanDraft((current) => ({
      ...current,
      benefits: {
        ...current.benefits,
        [key]: { selected: true, limit },
      },
    }))
  }

  function submitSubscriber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    runAction(() =>
      createClientSubscriptionAction({
        clientId: newSubscriber.clientId,
        planId: newSubscriber.planId,
        startedOn: newSubscriber.startedOn,
        notes: newSubscriber.notes || null,
      }),
    )
  }

  function requestStatus(subscriber: ClientSubscriber, status: SubscriptionStatus) {
    const isCancellation = status === 'cancelled'
    setConfirmation({
      title: isCancellation ? 'Cancelar assinatura' : 'Pausar assinatura',
      description: isCancellation
        ? `A assinatura de ${subscriber.clientName} será encerrada. Ciclos já pagos serão preservados.`
        : `A assinatura de ${subscriber.clientName} ficará pausada sem alterar ciclos já pagos.`,
      label: isCancellation ? 'Cancelar assinatura' : 'Pausar',
      destructive: isCancellation,
      run: () =>
        setSubscriptionStatusAction({ subscriptionId: subscriber.id, status }),
    })
  }

  function requestPayment(subscriber: ClientSubscriber) {
    const paymentMethod = paymentMethods[subscriber.id] ?? 'pix'
    setConfirmation({
      title: 'Registrar pagamento',
      description: `Confirmar ${currency.format(
        plans.find((plan) => plan.id === (subscriber.pendingPlanId ?? subscriber.planId))
          ?.monthlyPrice ?? 0,
      )} para o ciclo iniciado em ${formatDate(subscriber.nextBillingDate)} via ${paymentLabels[paymentMethod]}?`,
      label: 'Registrar pagamento',
      run: () =>
        registerSubscriptionPaymentAction({
          subscriptionId: subscriber.id,
          periodStart: subscriber.nextBillingDate,
          paymentMethod,
        }),
    })
  }

  function confirmOperation() {
    if (!confirmation) return
    setError('')
    startTransition(async () => {
      const result = await confirmation.run()
      setError(resultError(result))
      setConfirmation(null)
    })
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'plans', label: 'Planos' },
    { id: 'subscribers', label: 'Assinantes' },
    { id: 'billing', label: 'Cobranças' },
  ]

  return (
    <div className="flex flex-1 flex-col space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-montserrat text-3xl font-extrabold text-[#181c21]">
            Assinaturas de clientes
          </h1>
          <p className="mt-2 text-sm text-[#47464b]">
            Planos, adesões, mensalidades e benefícios em um só lugar.
          </p>
        </div>
        <Button type="button" onClick={openNewPlan} disabled={isPending}>
          Novo plano
        </Button>
      </header>

      <nav
        aria-label="Áreas de assinaturas"
        className="flex gap-2 overflow-x-auto border-b border-[#c8c5cb]/60"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === item.id
                ? 'border-[#7c5809] text-[#7c5809]'
                : 'border-transparent text-[#77767b]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ['Planos ativos', activePlans.length.toString()],
              ['Assinantes ativos', activeSubscribers.length.toString()],
              ['Mensalidades registradas', currency.format(monthlyRevenue)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-[#c8c5cb]/50 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[#77767b]">{label}</p>
                <p className="mt-3 text-2xl font-extrabold text-[#181c21]">{value}</p>
              </article>
            ))}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#c8c5cb]/50 bg-white p-6">
              <h2 className="font-montserrat font-bold">Planos</h2>
              <div className="mt-4 space-y-3">
                {plans.length ? plans.slice(0, 4).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-xl bg-[#f8f9ff] p-4">
                    <span className="font-semibold">{plan.name}</span>
                    <span>{currency.format(plan.monthlyPrice)}</span>
                  </div>
                )) : <p className="text-sm text-[#77767b]">Nenhum plano cadastrado.</p>}
              </div>
            </article>
            <article className="rounded-2xl border border-[#c8c5cb]/50 bg-white p-6">
              <h2 className="font-montserrat font-bold">Assinantes recentes</h2>
              <div className="mt-4 space-y-3">
                {subscribers.length ? subscribers.slice(0, 4).map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center justify-between rounded-xl bg-[#f8f9ff] p-4">
                    <div><p className="font-semibold">{subscriber.clientName}</p><p className="text-xs text-[#77767b]">{subscriber.planName}</p></div>
                    <span className="text-xs font-bold">{statusLabels[subscriber.status]}</span>
                  </div>
                )) : <p className="text-sm text-[#77767b]">Nenhum assinante cadastrado.</p>}
              </div>
            </article>
          </section>
        </div>
      ) : null}

      {tab === 'plans' ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`rounded-2xl border border-[#c8c5cb]/50 bg-white p-6 shadow-sm ${plan.isActive ? '' : 'opacity-65'}`}>
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-montserrat text-lg font-bold">{plan.name}</h2><p className="mt-1 text-xs text-[#77767b]">{plan.isActive ? 'Ativo' : 'Arquivado'}</p></div>
                <strong>{currency.format(plan.monthlyPrice)}</strong>
              </div>
              <p className="mt-4 min-h-10 text-sm text-[#47464b]">{plan.description || 'Sem descrição.'}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.items.map((item) => <li key={item.id}>• {item.targetName} — {item.monthlyLimit ?? 'ilimitado'}</li>)}
              </ul>
              <div className="mt-6 flex gap-2 border-t border-[#e0e2e9] pt-4">
                <Button type="button" size="sm" variant="outline" onClick={() => openPlan(plan)} disabled={isPending}>Editar</Button>
                <Button
                  type="button"
                  size="sm"
                  variant={plan.isActive ? 'ghost' : 'secondary'}
                  disabled={isPending}
                  onClick={() => {
                    if (plan.isActive) {
                      setConfirmation({
                        title: 'Arquivar plano',
                        description: 'O plano deixará de aceitar novas adesões. Assinantes e ciclos existentes serão preservados.',
                        label: 'Arquivar',
                        run: () => setSubscriptionPlanActiveAction({ planId: plan.id, isActive: false }),
                      })
                    } else {
                      runAction(() => setSubscriptionPlanActiveAction({ planId: plan.id, isActive: true }))
                    }
                  }}
                >{plan.isActive ? 'Arquivar' : 'Reativar'}</Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {tab === 'subscribers' ? (
        <div className="space-y-6">
          <form onSubmit={submitSubscriber} className="grid gap-4 rounded-2xl border border-[#c8c5cb]/50 bg-white p-6 md:grid-cols-4">
            <div><label className="text-xs font-bold" htmlFor="subscription-client">Cliente</label><Select id="subscription-client" required value={newSubscriber.clientId} onChange={(event) => setNewSubscriber((current) => ({ ...current, clientId: event.target.value }))}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></div>
            <div><label className="text-xs font-bold" htmlFor="subscription-plan">Plano</label><Select id="subscription-plan" required value={newSubscriber.planId} onChange={(event) => setNewSubscriber((current) => ({ ...current, planId: event.target.value }))}><option value="">Selecione</option>{activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></div>
            <div><label className="text-xs font-bold" htmlFor="subscription-start">Início</label><Input id="subscription-start" type="date" required value={newSubscriber.startedOn} onChange={(event) => setNewSubscriber((current) => ({ ...current, startedOn: event.target.value }))} /></div>
            <div className="flex items-end"><Button type="submit" className="w-full" disabled={isPending}>Adicionar assinante</Button></div>
          </form>

          <section className="space-y-4">
            {subscribers.map((subscriber) => (
              <article key={subscriber.id} className="rounded-2xl border border-[#c8c5cb]/50 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div><h2 className="font-bold">{subscriber.clientName}</h2><p className="text-sm text-[#47464b]">{subscriber.planName} · {statusLabels[subscriber.status]}</p><p className="mt-1 text-xs text-[#77767b]">Próxima cobrança: {formatDate(subscriber.nextBillingDate)}</p>{subscriber.pendingPlanName ? <p className="mt-1 text-xs font-semibold text-[#7c5809]">Próximo plano: {subscriber.pendingPlanName}</p> : null}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {subscriber.status !== 'cancelled' ? <><Select aria-label={`Próximo plano de ${subscriber.clientName}`} className="w-40" value={scheduledPlans[subscriber.id] ?? ''} onChange={(event) => setScheduledPlans((current) => ({ ...current, [subscriber.id]: event.target.value }))}><option value="">Trocar plano</option>{activePlans.filter((plan) => plan.id !== subscriber.planId).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select><Button type="button" size="sm" variant="outline" disabled={isPending || !scheduledPlans[subscriber.id]} onClick={() => runAction(() => scheduleSubscriptionPlanAction({ subscriptionId: subscriber.id, planId: scheduledPlans[subscriber.id] }))}>Agendar troca</Button></> : null}
                    {subscriber.status === 'active' ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => requestStatus(subscriber, 'paused')}>Pausar</Button> : null}
                    {subscriber.status === 'paused' ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => runAction(() => setSubscriptionStatusAction({ subscriptionId: subscriber.id, status: 'active' }))}>Reativar</Button> : null}
                    {subscriber.status !== 'cancelled' ? <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => requestStatus(subscriber, 'cancelled')}>Cancelar</Button> : null}
                    {subscriber.status === 'active' ? <><Select aria-label={`Forma de pagamento de ${subscriber.clientName}`} className="w-40" value={paymentMethods[subscriber.id] ?? 'pix'} onChange={(event) => setPaymentMethods((current) => ({ ...current, [subscriber.id]: event.target.value as SubscriptionPaymentMethod }))}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Button type="button" size="sm" disabled={isPending} onClick={() => requestPayment(subscriber)}>Registrar pagamento</Button></> : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {tab === 'billing' ? (
        <section className="overflow-hidden rounded-2xl border border-[#c8c5cb]/50 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f1f3fa] text-xs uppercase text-[#47464b]"><tr><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Plano</th><th className="px-5 py-4">Período</th><th className="px-5 py-4">Valor</th><th className="px-5 py-4">Pagamento</th></tr></thead><tbody className="divide-y divide-[#e0e2e9]">{cycles.map((cycle) => <tr key={cycle.id}><td className="px-5 py-4 font-semibold">{cycle.clientName}</td><td className="px-5 py-4">{cycle.planName}</td><td className="px-5 py-4">{formatDate(cycle.periodStart)} a {formatDate(cycle.periodEnd)}</td><td className="px-5 py-4">{currency.format(cycle.amount)}</td><td className="px-5 py-4">{cycle.paymentMethod ? paymentLabels[cycle.paymentMethod] : 'Pendente'}</td></tr>)}</tbody></table></div>
          {cycles.length === 0 ? <p className="p-10 text-center text-sm text-[#77767b]">Nenhuma cobrança registrada.</p> : null}
        </section>
      ) : null}

      <Sheet open={planEditorOpen} onClose={() => setPlanEditorOpen(false)} title={planDraft.id ? 'Editar plano' : 'Novo plano'} description="Defina o preço e os benefícios mensais.">
        <form onSubmit={submitPlan} className="space-y-5">
          <div><label htmlFor="plan-name" className="text-xs font-bold">Nome</label><Input id="plan-name" required maxLength={120} value={planDraft.name} onChange={(event) => setPlanDraft((current) => ({ ...current, name: event.target.value }))} /></div>
          <div><label htmlFor="plan-description" className="text-xs font-bold">Descrição</label><Input id="plan-description" value={planDraft.description} onChange={(event) => setPlanDraft((current) => ({ ...current, description: event.target.value }))} /></div>
          <div><label htmlFor="plan-price" className="text-xs font-bold">Mensalidade</label><Input id="plan-price" type="number" min="0" step="0.01" required value={planDraft.monthlyPrice} onChange={(event) => setPlanDraft((current) => ({ ...current, monthlyPrice: event.target.value }))} /></div>
          <fieldset className="space-y-3"><legend className="text-sm font-bold">Benefícios</legend>{[...services.map((item) => ({ ...item, type: 'service' as const })), ...addOns.map((item) => ({ ...item, type: 'add_on' as const }))].map((item) => { const key = `${item.type}:${item.id}`; const benefit = planDraft.benefits[key]; return <div key={key} className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-xl border border-[#e0e2e9] p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={benefit?.selected ?? false} onChange={(event) => toggleBenefit(key, event.target.checked)} />{item.name}</label><Input aria-label={`Limite de ${item.name}`} type="number" min="1" placeholder="Ilimitado" disabled={!benefit?.selected} value={benefit?.limit ?? ''} onChange={(event) => updateBenefitLimit(key, event.target.value)} /></div>})}</fieldset>
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar plano'}</Button>
        </form>
      </Sheet>

      <Dialog open={Boolean(confirmation)} onClose={() => setConfirmation(null)} onConfirm={confirmOperation} title={confirmation?.title ?? ''} description={confirmation?.description} confirmLabel={confirmation?.label} confirmVariant={confirmation?.destructive ? 'destructive' : 'default'} loading={isPending} />
    </div>
  )
}
