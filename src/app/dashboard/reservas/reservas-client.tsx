'use client'

import { useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import type { AppointmentStatus } from '../agenda/agenda-rules'
import type { AppointmentDetails } from '../agenda/agenda-types'

interface ReservasClientProps {
  initialAppointments: AppointmentDetails[]
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const compactDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(value))
    .replace('.', '')

const fullDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(value))
    .replace('.', '')

const time = (value: string) => value.substring(11, 16)

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'C'

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string; stripe: string }
> = {
  pending: {
    label: 'Pendente',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    stripe: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    stripe: 'bg-blue-500',
  },
  completed: {
    label: 'Concluída',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    stripe: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-red-200 bg-red-50 text-red-700',
    stripe: 'bg-red-400',
  },
  no_show: {
    label: 'Não compareceu',
    className: 'border-zinc-300 bg-zinc-100 text-zinc-700',
    stripe: 'bg-zinc-400',
  },
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef4] font-montserrat text-xs font-bold text-[#181c21]">
      {initials(name)}
    </span>
  )
}

export function ReservasClient({ initialAppointments }: ReservasClientProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | AppointmentStatus>('all')
  const [selected, setSelected] = useState<AppointmentDetails | null>(null)

  const appointments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return initialAppointments.filter(
      (appointment) =>
        (status === 'all' || appointment.status === status) &&
        (appointment.client.name.toLocaleLowerCase('pt-BR').includes(term) ||
          appointment.client.phone.includes(search.trim())),
    )
  }, [initialAppointments, search, status])

  const selectedProducts = selected
    ? selected.products.filter(
        (product) =>
          product.status !== 'cancelled' && product.status !== 'released',
      )
    : []

  const productSubtotal = selectedProducts.reduce(
    (total, product) => total + product.quantity * product.unitPrice,
    0,
  )

  const selectAppointment = (appointment: AppointmentDetails) =>
    setSelected(appointment)

  return (
    <div className="min-h-full bg-[#f8f9ff] font-inter text-[#181c21]">
      <header className="border-b border-[#c8c5cb]/30 bg-[#f8f9ff] px-4 py-7 sm:px-6 md:px-8">
        <div className="mb-2 flex items-center gap-2 text-[#9a6c19]">
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
            Reservas
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-montserrat text-2xl font-extrabold tracking-[-0.02em] text-black md:text-[32px]">
              Histórico de reservas
            </h1>
            <p className="mt-1 text-sm text-[#47464b]">
              Consulte, filtre e revise todos os atendimentos registrados.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#eceef4] px-3 py-1.5 text-xs font-semibold text-[#47464b]">
            {appointments.length} reservas encontradas
          </span>
        </div>
      </header>

      <main className="space-y-5 px-4 py-5 sm:px-6 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:max-w-xl">
            <span className="sr-only">Buscar reservas</span>
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#77767b]">
              search
            </span>
            <input
              aria-label="Buscar reservas"
              className="h-11 w-full rounded-lg border border-[#c8c5cb]/80 bg-white pl-12 pr-4 text-sm text-[#181c21] shadow-sm outline-none transition placeholder:text-[#858387] focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou telefone do cliente"
              type="search"
              value={search}
            />
          </label>

          <label className="relative sm:w-52">
            <span className="sr-only">Filtrar por status</span>
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#77767b]">
              filter_list
            </span>
            <select
              aria-label="Filtrar reservas por status"
              className="h-11 w-full appearance-none rounded-lg border border-[#c8c5cb]/80 bg-white pl-10 pr-10 text-sm font-medium text-[#47464b] shadow-sm outline-none transition focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/20"
              onChange={(event) =>
                setStatus(event.target.value as 'all' | AppointmentStatus)
              }
              value={status}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
              <option value="no_show">Não compareceu</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[#77767b]">
              expand_more
            </span>
          </label>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#c8c5cb]/50 bg-white shadow-[0_4px_12px_rgba(27,27,30,0.04)]">
          {appointments.length > 0 ? (
            <>
              <table className="hidden md:table w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#c8c5cb]/50 bg-[#f1f3fa] text-[10px] font-bold uppercase tracking-[0.08em] text-[#47464b]">
                    <th className="w-[13%] px-5 py-4">Data e hora</th>
                    <th className="w-[25%] px-4 py-4">Cliente</th>
                    <th className="w-[18%] px-4 py-4">Serviço</th>
                    <th className="w-[14%] px-4 py-4">Profissional</th>
                    <th className="w-[13%] px-4 py-4 text-right">Valor</th>
                    <th className="w-[13%] px-4 py-4 text-center">Status</th>
                    <th className="w-[4%] py-4 pr-4">
                      <span className="sr-only">Abrir</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c5cb]/30">
                  {appointments.map((appointment) => {
                    const config = statusConfig[appointment.status]
                    return (
                      <tr
                        aria-label={`Abrir reserva de ${appointment.client.name}`}
                        className={`group relative cursor-pointer outline-none transition-colors hover:bg-[#f8f9ff] focus-visible:bg-[#f1f3fa] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C79A4A] ${
                          appointment.status === 'cancelled' ? 'opacity-70' : ''
                        }`}
                        key={appointment.id}
                        onClick={() => selectAppointment(appointment)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            selectAppointment(appointment)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="relative px-5 py-4 align-middle">
                          <span
                            className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${config.stripe}`}
                          />
                          <span className="block font-montserrat text-sm font-bold text-black">
                            {compactDate(appointment.startAt)}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#47464b]">
                            {time(appointment.startAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex min-w-0 items-center gap-3">
                            <ClientAvatar name={appointment.client.name} />
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#181c21]">
                                {appointment.client.name}
                              </span>
                              <span className="block truncate text-xs text-[#77767b]">
                                {appointment.client.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="truncate px-4 py-4 text-sm text-[#181c21]">
                          {appointment.serviceName}
                        </td>
                        <td className="truncate px-4 py-4 text-sm text-[#181c21]">
                          {appointment.barberName}
                        </td>
                        <td className="px-4 py-4 text-right font-montserrat text-sm font-bold text-black">
                          {money(appointment.attendanceTotal)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <StatusBadge status={appointment.status} />
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <span className="material-symbols-outlined text-[20px] text-[#77767b] transition group-hover:translate-x-0.5 group-hover:text-black">
                            chevron_right
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="divide-y divide-[#c8c5cb]/30 md:hidden">
                {appointments.map((appointment) => {
                  const config = statusConfig[appointment.status]
                  return (
                    <button
                      aria-label={`Abrir reserva de ${appointment.client.name}`}
                      className={`relative w-full p-4 text-left outline-none transition-colors hover:bg-[#f8f9ff] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C79A4A] ${
                        appointment.status === 'cancelled' ? 'opacity-70' : ''
                      }`}
                      key={appointment.id}
                      onClick={() => selectAppointment(appointment)}
                      type="button"
                    >
                      <span
                        className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${config.stripe}`}
                      />
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <ClientAvatar name={appointment.client.name} />
                          <span className="min-w-0">
                            <span className="block truncate font-montserrat text-sm font-bold text-black">
                              {appointment.client.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#47464b]">
                              {appointment.serviceName} · {appointment.barberName}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-montserrat text-sm font-bold text-black">
                            {compactDate(appointment.startAt)}
                          </span>
                          <span className="block text-xs text-[#47464b]">
                            {time(appointment.startAt)}
                          </span>
                        </span>
                      </span>
                      <span className="mt-4 flex items-center justify-between gap-3 pl-[52px]">
                        <StatusBadge status={appointment.status} />
                        <span className="flex items-center gap-1 font-montserrat text-sm font-bold text-black">
                          {money(appointment.attendanceTotal)}
                          <span className="material-symbols-outlined text-[18px] text-[#77767b]">
                            chevron_right
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-14 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f3fa] text-[#77767b]">
                <span className="material-symbols-outlined text-[26px]">
                  search_off
                </span>
              </span>
              <h2 className="font-montserrat text-base font-bold text-[#181c21]">
                Nenhuma reserva encontrada
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#47464b]">
                Ajuste a busca ou o status para encontrar outros atendimentos.
              </p>
            </div>
          )}
        </section>
      </main>

      <Sheet
        description="Dados registrados no momento do atendimento."
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title="Detalhes da reserva"
      >
        {selected && (
          <div className="space-y-7 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffdeaa]/50 font-montserrat text-lg font-bold text-[#7c5809]">
                  {initials(selected.client.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-montserrat text-base font-bold text-[#181c21]">
                    {selected.client.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#47464b]">
                    {selected.client.phone}
                  </p>
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77767b]">
                  Serviço
                </dt>
                <dd className="mt-1 font-semibold text-[#181c21]">
                  {selected.serviceName}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77767b]">
                  Profissional
                </dt>
                <dd className="mt-1 font-semibold text-[#181c21]">
                  {selected.barberName}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77767b]">
                  Horário
                </dt>
                <dd className="mt-1 text-[#181c21]">
                  {fullDate(selected.startAt)} · {time(selected.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77767b]">
                  Duração
                </dt>
                <dd className="mt-1 text-[#181c21]">
                  {selected.totalDurationMinutes} min
                </dd>
              </div>
            </dl>

            <section>
              <h3 className="mb-3 font-montserrat text-sm font-bold text-[#181c21]">
                Atendimento
              </h3>
              <dl className="space-y-3 rounded-xl border border-[#c8c5cb]/30 bg-[#f8f9ff] p-4">
                <div className="flex justify-between gap-4 text-[#47464b]">
                  <dt>Preço do serviço</dt>
                  <dd>{money(selected.servicePrice)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#181c21]">Adicionais</dt>
                  <dd className="mt-2 space-y-2">
                    {selected.addOns.length === 0 ? (
                      <span className="text-[#77767b]">Nenhum adicional</span>
                    ) : (
                      selected.addOns.map((item, index) => (
                        <span
                          className="flex justify-between gap-4 text-[#47464b]"
                          key={`${item.name}-${index}`}
                        >
                          <span>
                            {item.name} (+{item.durationMinutes} min)
                          </span>
                          <span>{money(item.price)}</span>
                        </span>
                      ))
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#c8c5cb]/30 pt-3 font-bold text-[#181c21]">
                  <dt>Total do atendimento</dt>
                  <dd className="font-montserrat">
                    {money(selected.attendanceTotal)}
                  </dd>
                </div>
              </dl>
            </section>

            {(selected.subscriptionPlanName ||
              selected.subscriptionCoverageStatus !== 'none') && (
              <section className="rounded-xl bg-gradient-to-br from-[#1b1b1e] to-[#303036] p-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-outlined text-[19px] text-[#ffdeaa]">
                      workspace_premium
                    </span>
                    <h3 className="truncate font-montserrat text-sm font-bold">
                      {selected.subscriptionPlanName ?? 'Assinatura'}
                    </h3>
                  </div>
                  <span className="rounded bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#ffdeaa]">
                    {selected.subscriptionCoverageStatus === 'waiting' ||
                    selected.subscriptionCoverageStatus === 'awaiting_cycle'
                      ? 'Aguardando benefício'
                      : 'Benefício aplicado'}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-4 text-white/70">
                    <dt>Coberto pela assinatura</dt>
                    <dd>- {money(selected.subscriptionCoveredTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-bold">
                    <dt>A pagar pelo atendimento</dt>
                    <dd className="font-montserrat text-[#ffdeaa]">
                      {money(selected.amountDue)}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section>
              <h3 className="mb-3 font-montserrat text-sm font-bold text-[#181c21]">
                Produtos
              </h3>
              <div className="rounded-xl border border-[#c8c5cb]/30 bg-[#f8f9ff] p-4">
                {selectedProducts.length === 0 ? (
                  <p className="text-[#77767b]">Nenhum produto registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProducts.map((product, index) => (
                      <div
                        className="flex justify-between gap-4 text-[#47464b]"
                        key={`${product.name}-${index}`}
                      >
                        <span>
                          {product.name} ({product.quantity}×)
                        </span>
                        <span>
                          {money(product.quantity * product.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-between gap-4 border-t border-[#c8c5cb]/30 pt-3 font-bold text-[#181c21]">
                  <span>Subtotal dos produtos</span>
                  <span className="font-montserrat">
                    {money(productSubtotal)}
                  </span>
                </div>
              </div>
            </section>

            <section className="flex items-center justify-between gap-4 rounded-xl border border-[#c8c5cb]/40 bg-[#eceef4] p-4">
              <span className="font-montserrat text-sm font-bold text-[#181c21]">
                Total na barbearia
              </span>
              <span className="font-montserrat text-xl font-extrabold text-black">
                {money(selected.amountDue + productSubtotal)}
              </span>
            </section>

            {selected.notes && (
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#77767b]">
                  Observações
                </h3>
                <p className="rounded-lg border border-[#c8c5cb]/30 bg-[#f8f9ff] p-3 text-sm italic leading-relaxed text-[#47464b]">
                  {selected.notes}
                </p>
              </section>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
