'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { AgendaGrid } from './agenda-grid'
import type {
  AgendaBlock,
  AgendaWorkHour,
} from './agenda-grid-utils'
import type { AgendaSettings } from './agenda-schedule-mappers'
import {
  ManualBookingSheet,
  type ManualBookingSelection,
} from './manual-booking-sheet'
import { updateAppointmentStatus } from './actions'
import {
  getAllowedAppointmentTransitions,
  type AppointmentStatus,
} from './agenda-rules'
import type { AgendaBarber, AppointmentDetails } from './agenda-types'

interface AgendaClientProps {
  initialBarbers: AgendaBarber[]
  initialAppointments: AppointmentDetails[]
  initialSettings: AgendaSettings
  initialWorkHours: AgendaWorkHour[]
  initialBlocks: AgendaBlock[]
  currentDate: string
}

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const statusActionClassNames: Record<AppointmentStatus, string> = {
  pending: 'border-[#d8dae0] bg-white text-[#47464b] hover:bg-[#f1f3fa]',
  confirmed:
    'border-[#d7b77d] bg-[#fff7e8] text-[#795506] hover:bg-[#ffefcf]',
  completed:
    'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
  cancelled: 'border-red-700 bg-red-700 text-white hover:bg-red-800',
  no_show: 'border-orange-700 bg-orange-700 text-white hover:bg-orange-800',
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

function dateWithOffset(dateStr: string, offset: number) {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    <div className="space-y-6 text-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff4dc] font-montserrat text-lg font-bold text-[#795506]">
          {appointment.client.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-montserrat text-lg font-bold text-[#181c21]">
            {appointment.client.name}
          </p>
          <p className="text-[#77767b]">{appointment.client.phone}</p>
          {appointment.client.email && (
            <p className="truncate text-xs text-[#9a989d]">
              {appointment.client.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-[#eceef4] py-5">
        <DetailItem label="Serviço" value={appointment.serviceName} />
        <DetailItem label="Barbeiro" value={appointment.barberName} />
        <DetailItem
          label="Horário"
          value={`${appointment.startAt.substring(11, 16)}–${appointment.endAt.substring(11, 16)}`}
        />
        <DetailItem
          label="Duração"
          value={`${appointment.totalDurationMinutes} min`}
        />
      </div>

      <div className="rounded-xl border border-[#e0e2e9] bg-[#f8f9ff] p-4">
        <p className="font-montserrat text-sm font-bold text-[#181c21]">
          Atendimento
        </p>
        <dl className="mt-4 space-y-2.5">
          <div className="flex justify-between text-[#47464b]">
            <dt>Preço do serviço</dt>
            <dd>{money(appointment.servicePrice)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#47464b]">Adicionais</dt>
            <dd className="mt-1.5 space-y-1 text-[#47464b]">
              {appointment.addOns.length === 0 ? (
                <span className="text-[#9a989d]">Nenhum</span>
              ) : (
                appointment.addOns.map((item, index) => (
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
          <div className="flex justify-between border-t border-[#e0e2e9] pt-2.5 font-bold text-[#181c21]">
            <dt>Total do atendimento</dt>
            <dd>{money(appointment.attendanceTotal)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[#e0e2e9] p-4">
        <p className="font-montserrat text-sm font-bold text-[#181c21]">
          Produtos
        </p>
        {appointment.products.length === 0 ? (
          <p className="mt-2 text-[#9a989d]">Nenhum produto reservado.</p>
        ) : (
          <div className="mt-3 space-y-2 text-[#47464b]">
            {appointment.products.map((product, index) => (
              <div
                className="flex justify-between gap-4"
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
        <div className="mt-3 flex justify-between border-t border-[#eceef4] pt-3 font-bold text-[#47464b]">
          <span>Subtotal dos produtos</span>
          <span>{money(productSubtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between text-base font-extrabold text-[#181c21]">
          <span>Total na barbearia</span>
          <span>{money(appointment.attendanceTotal + productSubtotal)}</span>
        </div>
      </div>

      {appointment.notes && (
        <div className="rounded-xl bg-[#f1f3fa] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#77767b]">
            Observações
          </p>
          <p className="mt-2 leading-6 text-[#47464b]">{appointment.notes}</p>
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9a989d]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[#181c21]">{value}</p>
    </div>
  )
}

export function AgendaClient({
  initialBarbers,
  initialAppointments,
  initialSettings,
  initialWorkHours,
  initialBlocks,
  currentDate,
}: AgendaClientProps) {
  const router = useRouter()
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null)
  const [createSelection, setCreateSelection] =
    useState<ManualBookingSelection | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const navigateToDate = (date: string) => {
    router.push(`/dashboard/agenda?date=${date}`, { scroll: false })
  }

  const openCreateForSlot = (barberId: string, time: string) => {
    setCreateSelection({ barberId, time })
    setIsCreateOpen(true)
  }

  const openBlankCreate = () => {
    setCreateSelection({ barberId: '', time: '' })
    setIsCreateOpen(true)
  }

  const closeCreate = () => {
    setIsCreateOpen(false)
    setCreateSelection(null)
  }

  const changeStatus = (
    appointment: AppointmentDetails,
    status: AppointmentStatus,
  ) => {
    setMessage('')
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointment.id, status)
        setSelectedAppointment(null)
        router.refresh()
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o atendimento.',
        )
      }
    })
  }

  const formattedDate = new Date(
    `${currentDate}T00:00:00`,
  ).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
  const activeAppointments = initialAppointments.filter(
    (appointment) => appointment.status !== 'cancelled',
  ).length

  return (
    <div className="w-full min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[#e0e2e9] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#C79A4A]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.1em]">
              Agenda
            </span>
          </div>
          <h1 className="mt-2 font-montserrat text-2xl font-extrabold tracking-tight text-[#181c21] sm:text-3xl">
            {displayDate}
          </h1>
          <p className="mt-1 text-sm text-[#77767b]">
            {activeAppointments}{' '}
            {activeAppointments === 1
              ? 'reserva agendada'
              : 'reservas agendadas'}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <div className="flex w-full items-center justify-between rounded-xl border border-[#d8dae0] bg-white p-1 shadow-sm sm:w-auto sm:justify-start">
            <button
              aria-label="Dia anterior"
              className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#47464b] transition-colors hover:bg-[#f1f3fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] active:scale-[0.98]"
              onClick={() => navigateToDate(dateWithOffset(currentDate, -1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <button
              className="h-9 rounded-lg bg-[#f1f3fa] px-3 text-xs font-bold text-[#181c21] transition-colors hover:bg-[#e6e8ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] active:scale-[0.98]"
              onClick={() => navigateToDate(localIsoDate(new Date()))}
              type="button"
            >
              Hoje
            </button>
            <button
              aria-label="Próximo dia"
              className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#47464b] transition-colors hover:bg-[#f1f3fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] active:scale-[0.98]"
              onClick={() => navigateToDate(dateWithOffset(currentDate, 1))}
              type="button"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="relative block w-full sm:w-auto">
            <span className="sr-only">Data da agenda</span>
            <input
              aria-label="Data da agenda"
              className="h-11 w-full rounded-xl border border-[#d8dae0] bg-white px-3 text-xs font-semibold text-[#47464b] outline-none transition-colors focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/15 sm:w-auto"
              onChange={(event) => navigateToDate(event.target.value)}
              type="date"
              value={currentDate}
            />
          </label>

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b1b1e] px-4 text-xs font-bold text-white transition-colors hover:bg-[#303034] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] focus-visible:ring-offset-2 active:scale-[0.98] sm:w-auto"
            onClick={openBlankCreate}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova reserva
          </button>
        </div>
      </header>

      {message && (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {message}
        </p>
      )}

      <AgendaGrid
        appointments={initialAppointments}
        barbers={initialBarbers}
        blocks={initialBlocks}
        currentDate={currentDate}
        onSelectAppointment={setSelectedAppointment}
        onSelectSlot={openCreateForSlot}
        settings={initialSettings}
        workHours={initialWorkHours}
      />

      <ManualBookingSheet
        key={`${isCreateOpen}-${createSelection?.barberId}-${createSelection?.time}`}
        barbers={initialBarbers}
        currentDate={currentDate}
        initialSelection={createSelection}
        onClose={closeCreate}
        onCreated={() => {
          closeCreate()
          router.refresh()
        }}
        open={isCreateOpen}
      />

      <Sheet
        description="Dados registrados no momento da reserva."
        onClose={() => setSelectedAppointment(null)}
        open={Boolean(selectedAppointment)}
        title="Detalhes do atendimento"
      >
        {selectedAppointment && (
          <div className="space-y-6 pb-4">
            <AppointmentFinancialDetails appointment={selectedAppointment} />
            <div className="flex flex-col gap-2 border-t border-[#eceef4] pt-5">
              {getAllowedAppointmentTransitions(selectedAppointment.status).map(
                (status) => (
                  <button
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-50 ${statusActionClassNames[status]}`}
                    disabled={isPending}
                    key={status}
                    onClick={() => changeStatus(selectedAppointment, status)}
                    type="button"
                  >
                    Marcar como {statusLabels[status].toLowerCase()}
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
