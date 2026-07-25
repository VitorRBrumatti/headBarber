'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { CalendarDays, Clock3, Scissors, UserRound } from 'lucide-react'
import type { BarberServiceOption } from '@/app/booking/[slug]/booking-types'
import { Sheet } from '@/components/ui/sheet'
import type { AgendaBarber } from './agenda-types'
import {
  createAdminAppointment,
  getAdminBarberServicesAction,
  getAdminSlotsAction,
} from './actions'

export interface ManualBookingSelection {
  barberId: string
  time: string
}

interface ManualBookingSheetProps {
  barbers: AgendaBarber[]
  currentDate: string
  initialSelection: ManualBookingSelection | null
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const controlClassName =
  'mt-1.5 w-full rounded-xl border border-[#d8dae0] bg-white px-3.5 py-3 text-sm text-[#181c21] outline-none transition-colors focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/15 disabled:cursor-not-allowed disabled:bg-[#f1f3fa] disabled:text-[#9a989d]'

export function ManualBookingSheet({
  barbers,
  currentDate,
  initialSelection,
  open,
  onClose,
  onCreated,
}: ManualBookingSheetProps) {
  const [selectedBarberId, setSelectedBarberId] = useState(
    initialSelection?.barberId || '',
  )
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedTime, setSelectedTime] = useState(initialSelection?.time || '')
  const [services, setServices] = useState<BarberServiceOption[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const serviceRequest = useRef(0)
  const slotRequest = useRef(0)

  useEffect(() => {
    if (!open) return

    let active = true
    const request = ++serviceRequest.current
    const barberId = initialSelection?.barberId || ''

    if (barberId) {
      void getAdminBarberServicesAction(barberId).then((result) => {
        if (!active || request !== serviceRequest.current) return
        if (result.success) {
          setServices(result.services)
          if (result.services.length === 0) {
            setMessage('Este profissional não possui serviços disponíveis.')
          }
        } else {
          setMessage(result.error)
        }
      })
    }

    return () => {
      active = false
    }
  }, [initialSelection?.barberId, initialSelection?.time, open])

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  )

  const loadServices = async (barberId: string) => {
    const request = ++serviceRequest.current
    setServices([])
    setSelectedServiceId('')
    setSlots([])
    setMessage('')
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

  const loadSlots = async (
    barberServiceId: string,
    preferredTime = selectedTime,
  ) => {
    const request = ++slotRequest.current
    setSlots([])
    setMessage('')
    if (!barberServiceId) return

    const result = await getAdminSlotsAction(barberServiceId, currentDate)
    if (request !== slotRequest.current) return
    if (!result.success) {
      setMessage(result.error)
      return
    }

    setSlots(result.slots)
    if (preferredTime && result.slots.includes(preferredTime)) {
      setSelectedTime(preferredTime)
    } else {
      setSelectedTime('')
    }
    if (result.slots.length === 0) {
      setMessage('Não há horários disponíveis nesta data.')
    }
  }

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) {
      setClientPhone(digits ? `(${digits}` : '')
      return
    }
    if (digits.length <= 7) {
      setClientPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`)
      return
    }
    setClientPhone(
      `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !selectedService ||
      !selectedTime ||
      !clientName.trim() ||
      !clientPhone.trim()
    ) {
      setMessage('Preencha serviço, horário, nome e telefone.')
      return
    }

    setMessage('')
    startTransition(async () => {
      const result = await createAdminAppointment({
        clientName: clientName.trim(),
        clientPhone,
        clientEmail: clientEmail.trim() || undefined,
        barberServiceId: selectedService.id,
        configurationVersion: selectedService.configurationVersion,
        startAt: `${currentDate}T${selectedTime}:00.000Z`,
        notes: notes.trim() || undefined,
      })

      if ('error' in result) {
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

      onCreated()
    })
  }

  const dateLabel = new Date(`${currentDate}T00:00:00`).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  )

  return (
    <Sheet
      description="Cadastre um atendimento diretamente na agenda."
      onClose={onClose}
      open={open}
      title="Nova reserva manual"
    >
      <form className="space-y-5 pb-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-xl border border-[#eceef4] bg-[#f8f9ff] px-4 py-3 text-sm text-[#47464b]">
          <CalendarDays className="h-4 w-4 text-[#C79A4A]" aria-hidden="true" />
          <span className="font-semibold">{dateLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#47464b]">
            Profissional
            <select
              className={controlClassName}
              onChange={(event) => {
                const barberId = event.target.value
                setSelectedBarberId(barberId)
                void loadServices(barberId)
              }}
              required
              value={selectedBarberId}
            >
              <option value="">Selecione</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-[#47464b]">
            Horário
            <select
              className={controlClassName}
              disabled={!selectedServiceId}
              onChange={(event) => setSelectedTime(event.target.value)}
              required
              value={selectedTime}
            >
              <option value="">Selecione</option>
              {selectedTime && !slots.includes(selectedTime) && (
                <option value={selectedTime}>{selectedTime}</option>
              )}
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-semibold text-[#47464b]">
          Serviço
          <select
            className={controlClassName}
            disabled={!selectedBarberId}
            onChange={(event) => {
              const serviceId = event.target.value
              setSelectedServiceId(serviceId)
              void loadSlots(serviceId)
            }}
            required
            value={selectedServiceId}
          >
            <option value="">Selecione um serviço</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMinutes} min ·{' '}
                {money(service.price)}
              </option>
            ))}
          </select>
        </label>

        {selectedService && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#eadbbf] bg-[#fffaf0] p-4 text-sm">
            <span className="flex items-center gap-2 text-[#795506]">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {selectedService.durationMinutes} minutos
            </span>
            <span className="flex items-center justify-end gap-2 font-bold text-[#3c2a0b]">
              <Scissors className="h-4 w-4" aria-hidden="true" />
              {money(selectedService.price)}
            </span>
          </div>
        )}

        <div className="border-t border-[#eceef4] pt-5">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#C79A4A]" aria-hidden="true" />
            <h3 className="font-montserrat text-sm font-bold text-[#181c21]">
              Dados do cliente
            </h3>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[#47464b]">
              Nome do cliente
              <input
                className={controlClassName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nome completo"
                required
                value={clientName}
              />
            </label>
            <label className="block text-xs font-semibold text-[#47464b]">
              Telefone
              <input
                className={controlClassName}
                inputMode="tel"
                onChange={(event) => handlePhoneChange(event.target.value)}
                placeholder="(51) 99999-9999"
                required
                value={clientPhone}
              />
            </label>
            <label className="block text-xs font-semibold text-[#47464b]">
              E-mail <span className="font-normal text-[#9a989d]">(opcional)</span>
              <input
                className={controlClassName}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="cliente@email.com"
                type="email"
                value={clientEmail}
              />
            </label>
            <label className="block text-xs font-semibold text-[#47464b]">
              Observações{' '}
              <span className="font-normal text-[#9a989d]">(opcional)</span>
              <textarea
                className={controlClassName}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Preferências ou informações importantes"
                rows={3}
                value={notes}
              />
            </label>
          </div>
        </div>

        {message && (
          <p
            aria-live="polite"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {message}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-[#1b1b1e] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#303034] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4A] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Criando reserva…' : 'Confirmar agendamento'}
        </button>
      </form>
    </Sheet>
  )
}
