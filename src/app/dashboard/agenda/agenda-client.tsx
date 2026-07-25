'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BarberServiceOption } from '@/app/booking/[slug]/booking-types'
import { Sheet } from '@/components/ui/sheet'
import {
  createAdminAppointment,
  getAdminBarberServicesAction,
  getAdminSlotsAction,
  updateAppointmentStatus,
} from './actions'
import {
  getAllowedAppointmentTransitions,
  type AppointmentStatus,
} from './agenda-rules'
import type { AgendaBarber, AppointmentDetails } from './agenda-types'

interface AgendaClientProps {
  initialBarbers: AgendaBarber[]
  initialAppointments: AppointmentDetails[]
  currentDate: string
}

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

function AppointmentFinancialDetails({
  appointment,
}: {
  appointment: AppointmentDetails
}) {
  const productSubtotal = appointment.products
    .filter((product) => product.status !== 'cancelled')
    .reduce(
      (total, product) => total + product.unitPrice * product.quantity,
      0,
    )

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-zinc-500">Cliente</p>
        <p className="font-bold">{appointment.client.name}</p>
        <p className="text-zinc-600">{appointment.client.phone}</p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="font-bold">{appointment.serviceName}</p>
        <p className="text-zinc-600">
          {appointment.barberName} · {appointment.serviceDurationMinutes} min
        </p>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between">
            <dt>Preço do serviço</dt>
            <dd>{money(appointment.servicePrice)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Adicionais</dt>
            <dd className="mt-1 space-y-1">
              {appointment.addOns.length === 0 ? (
                <span className="text-zinc-500">Nenhum</span>
              ) : (
                appointment.addOns.map((item, index) => (
                  <span
                    className="flex justify-between"
                    key={`${item.name}-${index}`}
                  >
                    <span>{item.name}</span>
                    <span>{money(item.price)}</span>
                  </span>
                ))
              )}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <dt>Total do atendimento</dt>
            <dd>{money(appointment.attendanceTotal)}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border p-4">
        <p className="font-semibold">Produtos</p>
        {appointment.products.length === 0 ? (
          <p className="mt-1 text-zinc-500">Nenhum produto reservado.</p>
        ) : (
          <div className="mt-2 space-y-1">
            {appointment.products.map((product, index) => (
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
          </div>
        )}
        <div className="mt-3 flex justify-between border-t pt-2 font-bold">
          <span>Subtotal dos produtos</span>
          <span>{money(productSubtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-base font-extrabold">
          <span>Total na barbearia</span>
          <span>{money(appointment.attendanceTotal + productSubtotal)}</span>
        </div>
      </div>
    </div>
  )
}

export function AgendaClient({
  initialBarbers,
  initialAppointments,
  currentDate,
}: AgendaClientProps) {
  const router = useRouter()
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [services, setServices] = useState<BarberServiceOption[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null)
  const [isPending, startTransition] = useTransition()
  const serviceRequest = useRef(0)
  const slotRequest = useRef(0)

  const loadServices = async (barberId: string) => {
    const request = ++serviceRequest.current
    setServices([])
    setSelectedServiceId('')
    setSlots([])
    setSelectedTime('')
    if (!barberId) return
    const result = await getAdminBarberServicesAction(barberId)
    if (request !== serviceRequest.current) return
    if (!result.success) {
      setMessage(result.error)
      return
    }
    setServices(result.services)
    if (result.services.length === 0) {
      setMessage('Este profissional não possui serviços disponíveis.')
    }
  }

  const loadSlots = async (barberServiceId: string) => {
    const request = ++slotRequest.current
    setSlots([])
    setSelectedTime('')
    if (!barberServiceId) return
    const result = await getAdminSlotsAction(barberServiceId, currentDate)
    if (request !== slotRequest.current) return
    if (!result.success) {
      setMessage(result.error)
      return
    }
    setSlots(result.slots)
    if (result.slots.length === 0) {
      setMessage('Não há horários disponíveis nesta data.')
    }
  }

  const handleCreate = () => {
    const service = services.find((item) => item.id === selectedServiceId)
    if (!service || !selectedTime || !clientName || !clientPhone) {
      setMessage('Preencha profissional, serviço, horário, nome e telefone.')
      return
    }

    setMessage('')
    startTransition(async () => {
      const result = await createAdminAppointment({
        clientName,
        clientPhone,
        clientEmail,
        barberServiceId: service.id,
        configurationVersion: service.configurationVersion,
        startAt: `${currentDate}T${selectedTime}:00.000Z`,
      })

      if (!result.success) {
        setMessage(result.error)
        if (
          result.code === 'CONFIG_CHANGED' ||
          result.code === 'INVALID_BARBER_SERVICE'
        ) {
          await loadServices(selectedBarberId)
        } else if (result.code === 'SLOT_UNAVAILABLE') {
          await loadSlots(selectedServiceId)
        }
        return
      }

      setClientName('')
      setClientPhone('')
      setClientEmail('')
      setSelectedTime('')
      setMessage(
        `Reserva criada: ${result.receipt.serviceName} com ${result.receipt.barberName}.`,
      )
      await loadSlots(selectedServiceId)
      router.refresh()
    })
  }

  const changeStatus = (appointment: AppointmentDetails, status: AppointmentStatus) => {
    setMessage('')
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointment.id, status)
        setSelectedAppointment(null)
        router.refresh()
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Não foi possível atualizar.',
        )
      }
    })
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Agenda</h1>
          <p className="text-sm text-zinc-600">
            Crie e acompanhe os atendimentos do dia.
          </p>
        </div>
        <input
          aria-label="Data da agenda"
          className="rounded-lg border bg-white px-3 py-2"
          onChange={(event) =>
            router.push(`/dashboard/agenda?date=${event.target.value}`)
          }
          type="date"
          value={currentDate}
        />
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Nova reserva manual</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold">
            Profissional
            <select
              className="mt-1 w-full rounded-lg border p-2.5"
              onChange={(event) => {
                const barberId = event.target.value
                setMessage('')
                setSelectedBarberId(barberId)
                void loadServices(barberId)
              }}
              value={selectedBarberId}
            >
              <option value="">Selecione</option>
              {initialBarbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Serviço
            <select
              className="mt-1 w-full rounded-lg border p-2.5"
              disabled={!selectedBarberId}
              onChange={(event) => {
                const serviceId = event.target.value
                setMessage('')
                setSelectedServiceId(serviceId)
                void loadSlots(serviceId)
              }}
              value={selectedServiceId}
            >
              <option value="">Selecione</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {money(service.price)} ·{' '}
                  {service.durationMinutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Horário disponível
            <select
              className="mt-1 w-full rounded-lg border p-2.5"
              disabled={!selectedServiceId}
              onChange={(event) => setSelectedTime(event.target.value)}
              value={selectedTime}
            >
              <option value="">Selecione</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <input
            className="rounded-lg border p-2.5"
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Nome do cliente"
            value={clientName}
          />
          <input
            className="rounded-lg border p-2.5"
            onChange={(event) => setClientPhone(event.target.value)}
            placeholder="Telefone"
            value={clientPhone}
          />
          <input
            className="rounded-lg border p-2.5"
            onChange={(event) => setClientEmail(event.target.value)}
            placeholder="E-mail (opcional)"
            type="email"
            value={clientEmail}
          />
        </div>
        <button
          className="mt-4 rounded-lg bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          disabled={isPending}
          onClick={handleCreate}
          type="button"
        >
          {isPending ? 'Salvando…' : 'Criar reserva'}
        </button>
        {message && (
          <p className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm">{message}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Atendimentos</h2>
        {initialAppointments.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-zinc-500">
            Nenhum atendimento nesta data.
          </div>
        ) : (
          initialAppointments.map((appointment) => (
            <article
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4"
              key={appointment.id}
            >
              <div>
                <p className="font-bold">
                  {appointment.startAt.substring(11, 16)} ·{' '}
                  {appointment.client.name}
                </p>
                <p className="text-sm text-zinc-600">
                  {appointment.serviceName} com {appointment.barberName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">
                  {statusLabels[appointment.status]}
                </span>
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-bold"
                  onClick={() => setSelectedAppointment(appointment)}
                  type="button"
                >
                  Detalhes
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <Sheet
        description="Valores registrados no momento da reserva."
        onClose={() => setSelectedAppointment(null)}
        open={Boolean(selectedAppointment)}
        title="Detalhes do atendimento"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <AppointmentFinancialDetails appointment={selectedAppointment} />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {getAllowedAppointmentTransitions(selectedAppointment.status).map(
                (status) => (
                  <button
                    className="rounded-lg border px-3 py-2 text-xs font-bold"
                    disabled={isPending}
                    key={status}
                    onClick={() => changeStatus(selectedAppointment, status)}
                    type="button"
                  >
                    {statusLabels[status]}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
