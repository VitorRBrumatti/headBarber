'use client'

import { useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import type { AppointmentDetails } from '../agenda/agenda-types'

interface ReservasClientProps {
  initialAppointments: AppointmentDetails[]
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export function ReservasClient({ initialAppointments }: ReservasClientProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<AppointmentDetails | null>(null)

  const appointments = useMemo(() => {
    const term = search.toLocaleLowerCase('pt-BR')
    return initialAppointments.filter(
      (appointment) =>
        (status === 'all' || appointment.status === status) &&
        (appointment.client.name.toLocaleLowerCase('pt-BR').includes(term) ||
          appointment.client.phone.includes(search)),
    )
  }, [initialAppointments, search, status])

  const productSubtotal = selected
    ? selected.products
        .filter((product) => product.status !== 'cancelled')
        .reduce(
          (total, product) => total + product.quantity * product.unitPrice,
          0,
        )
    : 0

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-extrabold">Histórico de reservas</h1>
        <p className="text-sm text-zinc-600">
          Consulte os dados registrados em cada atendimento.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          className="min-w-64 flex-1 rounded-lg border bg-white p-3"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou telefone do cliente"
          value={search}
        />
        <select
          className="rounded-lg border bg-white p-3"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="confirmed">Confirmados</option>
          <option value="completed">Concluídos</option>
          <option value="cancelled">Cancelados</option>
          <option value="no_show">Não compareceu</option>
        </select>
      </div>
      <div className="space-y-3">
        {appointments.map((appointment) => (
          <button
            className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4 text-left"
            key={appointment.id}
            onClick={() => setSelected(appointment)}
            type="button"
          >
            <span>
              <span className="block font-bold">{appointment.client.name}</span>
              <span className="text-sm text-zinc-600">
                {appointment.serviceName} com {appointment.barberName}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-bold">
                {new Date(appointment.startAt).toLocaleDateString('pt-BR', {
                  timeZone: 'UTC',
                })}
              </span>
              <span className="text-sm text-zinc-600">
                {appointment.startAt.substring(11, 16)}
              </span>
            </span>
          </button>
        ))}
        {appointments.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-zinc-500">
            Nenhuma reserva encontrada.
          </div>
        )}
      </div>

      <Sheet
        description="Ficha financeira preservada da reserva."
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title="Detalhes da reserva"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-bold">{selected.client.name}</p>
              <p className="text-zinc-600">{selected.client.phone}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="font-bold">{selected.serviceName}</p>
              <p className="text-zinc-600">
                {selected.barberName} · {selected.totalDurationMinutes} min
              </p>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <dt>Preço do serviço</dt>
                  <dd>{money(selected.servicePrice)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Adicionais</dt>
                  <dd className="mt-1 space-y-1">
                    {selected.addOns.length === 0 ? (
                      <span className="text-zinc-500">Nenhum</span>
                    ) : (
                      selected.addOns.map((item, index) => (
                        <span
                          className="flex justify-between"
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
                <div className="flex justify-between border-t pt-2 font-bold">
                  <dt>Total do atendimento</dt>
                  <dd>{money(selected.attendanceTotal)}</dd>
                </div>
                {(selected.subscriptionPlanName ||
                  selected.subscriptionCoverageStatus !== 'none') && (
                  <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                    <dt>Assinatura {selected.subscriptionPlanName}</dt>
                    <dd>
                      {selected.subscriptionCoverageStatus === 'waiting'
                        ? 'Aguardando disponibilidade'
                        : 'Benefício aplicado'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-emerald-800">
                  <dt>Coberto pela assinatura</dt>
                  <dd>- {money(selected.subscriptionCoveredTotal)}</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>A pagar pelo atendimento</dt>
                  <dd>{money(selected.amountDue)}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border p-4">
              {selected.products.map((product, index) => (
                <div
                  className="flex justify-between"
                  key={`${product.name}-${index}`}
                >
                  <span>
                    {product.quantity}× {product.name}
                  </span>
                  <span>{money(product.quantity * product.unitPrice)}</span>
                </div>
              ))}
              <div className="mt-3 flex justify-between border-t pt-2 font-bold">
                <span>Subtotal dos produtos</span>
                <span>{money(productSubtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-extrabold">
                <span>Total na barbearia</span>
                <span>{money(selected.amountDue + productSubtotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
