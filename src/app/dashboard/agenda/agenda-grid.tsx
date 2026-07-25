import {
  CalendarOff,
  Clock3,
  LockKeyhole,
  Plus,
  Utensils,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgendaSettings } from './agenda-schedule-mappers'
import type { AgendaBarber, AppointmentDetails } from './agenda-types'
import {
  generateAgendaSlots,
  getAgendaCellState,
  getAppointmentSpan,
  shouldShowUnavailableLabel,
  type AgendaBlock,
  type AgendaCellState,
  type AgendaWorkHour,
} from './agenda-grid-utils'
import type { AppointmentStatus } from './agenda-rules'

interface AgendaGridProps {
  appointments: AppointmentDetails[]
  barbers: AgendaBarber[]
  blocks: AgendaBlock[]
  currentDate: string
  settings: AgendaSettings
  workHours: AgendaWorkHour[]
  onSelectAppointment: (appointment: AppointmentDetails) => void
  onSelectSlot: (barberId: string, time: string) => void
}

const statusPresentation: Record<
  AppointmentStatus,
  { label: string; className: string; badgeClassName: string }
> = {
  confirmed: {
    label: 'Confirmada',
    className:
      'border-[#C79A4A] bg-[#fff7e8] text-[#3c2a0b] hover:bg-[#ffefcf]',
    badgeClassName: 'bg-[#f0bf6b] text-[#3c2a0b]',
  },
  pending: {
    label: 'Pendente',
    className:
      'border-[#c8c5cb] bg-[#f8f9ff] text-[#47464b] hover:bg-[#eceef4]',
    badgeClassName: 'bg-[#e0e2e9] text-[#47464b]',
  },
  completed: {
    label: 'Concluída',
    className:
      'border-emerald-600 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
    badgeClassName: 'bg-emerald-700 text-white',
  },
  cancelled: {
    label: 'Cancelada',
    className:
      'border-dashed border-[#c8c5cb] bg-white text-[#77767b] opacity-75 line-through',
    badgeClassName: 'bg-[#e0e2e9] text-[#77767b]',
  },
  no_show: {
    label: 'Não compareceu',
    className:
      'border-red-600 bg-red-50 text-red-950 hover:bg-red-100',
    badgeClassName: 'bg-red-700 text-white',
  },
}

const unavailablePresentation: Record<
  Exclude<AgendaCellState, 'available'>,
  { label: string; icon: typeof Clock3 }
> = {
  lunch: { label: 'Almoço', icon: Utensils },
  blocked: { label: 'Bloqueado', icon: LockKeyhole },
  off: { label: 'Fora do expediente', icon: CalendarOff },
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)

function timeFromIso(value: string) {
  return value.substring(11, 16)
}

export function AgendaGrid({
  appointments,
  barbers,
  blocks,
  currentDate,
  settings,
  workHours,
  onSelectAppointment,
  onSelectSlot,
}: AgendaGridProps) {
  const slots = generateAgendaSlots(
    settings.defaultStartTime,
    settings.defaultEndTime,
    settings.slotIntervalMinutes,
  )
  const minWidth = Math.max(720, 72 + barbers.length * 240)

  if (barbers.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e0e2e9] bg-white px-6 py-16 text-center">
        <CalendarOff
          className="mx-auto h-8 w-8 text-[#C79A4A]"
          aria-hidden="true"
        />
        <h2 className="mt-4 font-montserrat text-lg font-bold text-[#181c21]">
          Nenhum profissional ativo
        </h2>
        <p className="mt-2 text-sm text-[#77767b]">
          Cadastre ou ative um barbeiro para começar a montar a agenda.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-[#e0e2e9] bg-white shadow-[0_12px_36px_-28px_rgba(24,28,33,0.42)]">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `72px repeat(${barbers.length}, minmax(240px, 1fr))`,
          gridTemplateRows: `56px repeat(${slots.length}, 64px)`,
          minWidth,
        }}
      >
        <div className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-[#e0e2e9] bg-[#f8f9ff]">
          <Clock3 className="h-4 w-4 text-[#77767b]" aria-hidden="true" />
        </div>

        {barbers.map((barber, barberIndex) => (
          <div
            className="sticky top-0 z-20 flex items-center justify-center gap-2.5 border-b border-r border-[#e0e2e9] bg-[#f8f9ff] px-3"
            key={barber.id}
            style={{ gridColumn: barberIndex + 2, gridRow: 1 }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e0e2e9] bg-white font-montserrat text-[11px] font-bold text-[#47464b]">
              {barber.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={barber.avatarUrl}
                />
              ) : (
                barber.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="truncate font-montserrat text-sm font-bold text-[#181c21]">
              {barber.name}
            </span>
          </div>
        ))}

        {slots.map((time, slotIndex) => (
          <div
            className="sticky left-0 z-10 flex items-start justify-center border-b border-r border-[#eceef4] bg-white pt-2.5 font-mono text-[11px] font-semibold text-[#47464b]"
            key={time}
            style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
          >
            {time}
          </div>
        ))}

        {barbers.flatMap((barber, barberIndex) => {
          const barberAppointments = appointments.filter(
            (appointment) => appointment.barberId === barber.id,
          )
          const workHour = workHours.find(
            (item) => item.barberId === barber.id,
          )

          return slots.map((time, slotIndex) => {
            const slotStart = Date.parse(`${currentDate}T${time}:00.000Z`)
            const appointment = barberAppointments.find(
              (item) => Date.parse(item.startAt) === slotStart,
            )
            const coveredByEarlierAppointment = barberAppointments.some(
              (item) =>
                Date.parse(item.startAt) < slotStart &&
                Date.parse(item.endAt) > slotStart,
            )

            if (coveredByEarlierAppointment) return null

            if (appointment) {
              const presentation = statusPresentation[appointment.status]
              const span = Math.min(
                getAppointmentSpan(
                  appointment.startAt,
                  appointment.endAt,
                  settings.slotIntervalMinutes,
                ),
                slots.length - slotIndex,
              )

              return (
                <div
                  className="border-b border-r border-[#eceef4] p-1"
                  key={appointment.id}
                  style={{
                    gridColumn: barberIndex + 2,
                    gridRow: `${slotIndex + 2} / span ${span}`,
                  }}
                >
                  <button
                    aria-label={`Ver reserva de ${appointment.client.name} às ${time}`}
                    className={cn(
                      'flex h-full w-full min-w-0 flex-col justify-start overflow-hidden rounded-lg border-l-[3px] px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] focus-visible:ring-offset-1 active:scale-[0.99]',
                      presentation.className,
                    )}
                    onClick={() => onSelectAppointment(appointment)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold leading-4">
                        {appointment.client.name}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase leading-3 tracking-[0.06em] no-underline',
                          presentation.badgeClassName,
                        )}
                      >
                        {presentation.label}
                      </span>
                    </span>
                    <span className="mt-1 flex min-w-0 items-center justify-between gap-3 text-[10px] font-semibold leading-3 no-underline">
                      <span className="min-w-0 truncate opacity-75">
                        {appointment.serviceName} ·{' '}
                        {timeFromIso(appointment.startAt)}–
                        {timeFromIso(appointment.endAt)}
                      </span>
                      <span className="shrink-0">
                        {money(appointment.attendanceTotal)}
                      </span>
                    </span>
                  </button>
                </div>
              )
            }

            const cellState = getAgendaCellState({
              barberId: barber.id,
              date: currentDate,
              time,
              intervalMinutes: settings.slotIntervalMinutes,
              workHour,
              blocks,
            })
            const previousTime = slots[slotIndex - 1]
            const previousSlotStart = previousTime
              ? Date.parse(`${currentDate}T${previousTime}:00.000Z`)
              : null
            const previousHasAppointment =
              previousSlotStart !== null &&
              barberAppointments.some(
                (item) =>
                  Date.parse(item.startAt) <= previousSlotStart &&
                  Date.parse(item.endAt) > previousSlotStart,
              )
            const previousState =
              previousTime && !previousHasAppointment
                ? getAgendaCellState({
                    barberId: barber.id,
                    date: currentDate,
                    time: previousTime,
                    intervalMinutes: settings.slotIntervalMinutes,
                    workHour,
                    blocks,
                  })
                : undefined

            return (
              <div
                className={cn(
                  'border-b border-r border-[#eceef4] p-1',
                  cellState !== 'available' && 'pattern-diagonal bg-[#f8f9ff]',
                )}
                key={`${barber.id}-${time}`}
                style={{
                  gridColumn: barberIndex + 2,
                  gridRow: slotIndex + 2,
                }}
              >
                {cellState === 'available' ? (
                  <button
                    aria-label={`Agendar com ${barber.name} às ${time}`}
                    className="group flex h-full w-full items-center justify-center rounded-md border border-dashed border-transparent text-[#C79A4A] transition-colors hover:border-[#d7b77d] hover:bg-[#fffaf0] focus-visible:border-[#C79A4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A]/30 active:scale-[0.99]"
                    onClick={() => onSelectSlot(barber.id, time)}
                    type="button"
                  >
                    <Plus
                      className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <UnavailableCell
                    showLabel={shouldShowUnavailableLabel(
                      cellState,
                      previousState,
                    )}
                    state={cellState}
                  />
                )}
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}

function UnavailableCell({
  showLabel,
  state,
}: {
  showLabel: boolean
  state: Exclude<AgendaCellState, 'available'>
}) {
  if (!showLabel) return null

  const presentation = unavailablePresentation[state]
  const Icon = presentation.icon

  return (
    <div className="flex h-full items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9a989d]">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{presentation.label}</span>
    </div>
  )
}
