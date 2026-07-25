'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Mail,
  Phone,
  Scissors,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'

import {
  createPublicBooking,
  getBarberServicesAction,
  getPublicSlotsAction,
} from './actions'
import { getBarberAddOnsAction } from './booking-add-on-actions'
import {
  selectedAddOnPayload,
  toggleAddOnSelection,
  type BarberAddOnOption,
} from './booking-add-ons'
import type {
  BarberServiceOption,
  BookingProduct,
  CreatedBookingReceipt,
  ProductSelection,
} from './booking-types'
import {
  clampSelectionsToStock,
  formatCurrency,
  getBookingTotals,
  toSelectedProducts,
} from './booking-utils'
import { BookingProductStep } from './booking-product-step'
import { BookingProgress } from './booking-progress'
import { BookingSuccess } from './booking-success'
import { BookingSummaryBar } from './booking-summary-bar'

type Barber = {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
}

type BookingClientProps = {
  barbershop: { id: string; name: string; slug: string }
  barbers: Barber[]
  products: BookingProduct[]
}

const STEPS = [
  { id: 1, name: 'Profissional' },
  { id: 2, name: 'Serviço' },
  { id: 3, name: 'Adicionais' },
  { id: 4, name: 'Produtos' },
  { id: 5, name: 'Data e Hora' },
  { id: 6, name: 'Dados' },
  { id: 7, name: 'Confirmação' },
]

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '')
}

function isoDate(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${
        selected
          ? 'border-[#C79A4A] bg-[#C79A4A] text-[#1A1A1D]'
          : 'border-white/20 text-transparent'
      }`}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#C79A4A]">
        {eyebrow}
      </p>
      <h1 className="font-[var(--font-montserrat)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
    </div>
  )
}

export function BookingClient({
  barbershop,
  barbers,
  products,
}: BookingClientProps) {
  const router = useRouter()
  const serviceRequestRef = useRef(0)
  const addOnRequestRef = useRef(0)
  const slotRequestRef = useRef(0)
  const selectedBarberRef = useRef('')
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedBarber, setSelectedBarber] = useState('')
  const [barberServices, setBarberServices] = useState<BarberServiceOption[]>(
    [],
  )
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [loadingServices, setLoadingServices] = useState(false)
  const [servicesError, setServicesError] = useState('')
  const [barberAddOns, setBarberAddOns] = useState<BarberAddOnOption[]>([])
  const [loadingAddOns, setLoadingAddOns] = useState(false)
  const [addOnsError, setAddOnsError] = useState('')
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection>({})
  const [unavailableProducts, setUnavailableProducts] = useState<Set<string>>(
    new Set(),
  )
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [submitting, startSubmitting] = useTransition()
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<CreatedBookingReceipt | null>(null)

  const calendarDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date()
        date.setHours(12, 0, 0, 0)
        date.setDate(date.getDate() + index)
        return { value: isoDate(date), label: formatDate(date) }
      }),
    [],
  )

  const service = barberServices.find((item) => item.id === selectedServiceId)
  const barber = barbers.find((item) => item.id === selectedBarber)
  const selectedAddOnItems = barberAddOns.filter((item) =>
    selectedAddOns.includes(item.id),
  )
  const selectedProductItems = products.filter(
    (item) => (selectedProducts[item.id] ?? 0) > 0,
  )
  const totals = getBookingTotals(
    service?.price ?? 0,
    selectedAddOnItems.map((item) => item.price),
    products,
    selectedProducts,
  )

  async function loadBarberServices(barberId: string) {
    const requestId = ++serviceRequestRef.current
    setLoadingServices(true)
    setServicesError('')

    const response = await getBarberServicesAction(barbershop.id, barberId)
    if (
      requestId !== serviceRequestRef.current ||
      selectedBarberRef.current !== barberId
    ) {
      return
    }

    setLoadingServices(false)
    if (!response.success) {
      setBarberServices([])
      setServicesError(response.error)
      return
    }
    setBarberServices(response.services)
  }

  async function loadBarberAddOns(barberId: string) {
    const requestId = ++addOnRequestRef.current
    setLoadingAddOns(true)
    setAddOnsError('')

    const response = await getBarberAddOnsAction(barbershop.id, barberId)
    if (
      requestId !== addOnRequestRef.current ||
      selectedBarberRef.current !== barberId
    ) {
      return
    }

    setLoadingAddOns(false)
    if (!response.success) {
      setBarberAddOns([])
      setAddOnsError(response.error)
      return
    }
    setBarberAddOns(response.addOns)
  }

  async function loadSlots(date: string, barberServiceId = selectedServiceId) {
    if (!date || !barberServiceId) return
    const requestId = ++slotRequestRef.current
    setLoadingSlots(true)
    setSlotsError('')
    const response = await getPublicSlotsAction(
      barbershop.id,
      barberServiceId,
      selectedAddOnPayload(selectedAddOns, barberAddOns),
      date,
    )
    if (requestId !== slotRequestRef.current) return

    setLoadingSlots(false)
    if (!response.success) {
      setSlots([])
      setSlotsError(response.error)
      if (
        response.code === 'CONFIG_CHANGED' ||
        response.code === 'INVALID_ADD_ON'
      ) {
        setSelectedAddOns([])
        setSelectedDate('')
        setSelectedTime('')
        setCurrentStep(3)
        void loadBarberAddOns(selectedBarber)
      }
      return
    }
    setSlots(response.slots)
  }

  function chooseBarber(barberId: string) {
    selectedBarberRef.current = barberId
    slotRequestRef.current += 1
    addOnRequestRef.current += 1
    setSelectedBarber(barberId)
    setSelectedServiceId('')
    setBarberServices([])
    setBarberAddOns([])
    setSelectedAddOns([])
    setSelectedDate('')
    setSelectedTime('')
    setSlots([])
    setSlotsError('')
    setAddOnsError('')
    setError('')
    void loadBarberServices(barberId)
    void loadBarberAddOns(barberId)
  }

  function chooseService(item: BarberServiceOption) {
    slotRequestRef.current += 1
    setSelectedServiceId(item.id)
    setSelectedDate('')
    setSelectedTime('')
    setSlots([])
    setSlotsError('')
    setError('')
  }

  function chooseDate(date: string) {
    setSelectedDate(date)
    setSelectedTime('')
    setSlots([])
    setError('')
    void loadSlots(date)
  }

  const canContinue = (() => {
    if (currentStep === 1) return Boolean(selectedBarber)
    if (currentStep === 2) {
      return Boolean(selectedServiceId) && !loadingServices
    }
    if (currentStep === 5) return Boolean(selectedDate && selectedTime)
    if (currentStep === 6) {
      return Boolean(clientName.trim() && clientPhone.trim())
    }
    return true
  })()

  function validateStep() {
    if (currentStep === 1 && !selectedBarber) {
      return 'Escolha um profissional para continuar.'
    }
    if (currentStep === 2 && !selectedServiceId) {
      return 'Escolha um serviço para continuar.'
    }
    if (currentStep === 5 && (!selectedDate || !selectedTime)) {
      return 'Escolha uma data e um horário.'
    }
    if (currentStep === 6 && (!clientName.trim() || !clientPhone.trim())) {
      return 'Nome e celular são obrigatórios.'
    }
    return ''
  }

  function handleNext() {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setCurrentStep((step) => Math.min(step + 1, STEPS.length))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setError('')
    setCurrentStep((step) => Math.max(step - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleAddOn(id: string) {
    const next = toggleAddOnSelection(
      {
        selectedIds: selectedAddOns,
        date: selectedDate,
        time: selectedTime,
        slots,
      },
      id,
    )
    setSelectedAddOns(next.selectedIds)
    slotRequestRef.current += 1
    setSelectedDate(next.date)
    setSelectedTime(next.time)
    setSlots(next.slots)
    setSlotsError('')
    setError('')
  }

  function updateProduct(productId: string, quantity: number) {
    setUnavailableProducts((items) => {
      const next = new Set(items)
      next.delete(productId)
      return next
    })
    setSelectedProducts((items) => {
      const next = { ...items }
      if (quantity <= 0) delete next[productId]
      else next[productId] = quantity
      return next
    })
  }

  function resetBooking() {
    serviceRequestRef.current += 1
    addOnRequestRef.current += 1
    slotRequestRef.current += 1
    selectedBarberRef.current = ''
    setCurrentStep(1)
    setSelectedBarber('')
    setSelectedServiceId('')
    setBarberServices([])
    setBarberAddOns([])
    setSelectedAddOns([])
    setLoadingAddOns(false)
    setAddOnsError('')
    setSelectedProducts({})
    setUnavailableProducts(new Set())
    setSelectedDate('')
    setSelectedTime('')
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setNotes('')
    setSlots([])
    setServicesError('')
    setSlotsError('')
    setError('')
    setReceipt(null)
  }

  function handleConfirm() {
    if (!service) return
    setError('')
    startSubmitting(async () => {
      const response = await createPublicBooking({
        barbershopId: barbershop.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        barberServiceId: service.id,
        configurationVersion: service.configurationVersion,
        startAt: `${selectedDate}T${selectedTime}:00.000Z`,
        notes: notes.trim() || undefined,
        addOns: selectedAddOnPayload(selectedAddOns, barberAddOns),
        products: toSelectedProducts(selectedProducts),
      })

      if ('error' in response) {
        if (response.code === 'INSUFFICIENT_STOCK') {
          const unavailable = response.unavailableProducts ?? []
          setSelectedProducts((items) =>
            clampSelectionsToStock(items, unavailable),
          )
          setUnavailableProducts(
            new Set(unavailable.map((item) => item.productId)),
          )
          setCurrentStep(4)
        } else if (
          response.code === 'CONFIG_CHANGED' ||
          response.code === 'INVALID_BARBER_SERVICE' ||
          response.code === 'INVALID_ADD_ON'
        ) {
          setSelectedDate('')
          setSelectedTime('')
          setSlots([])
          if (response.code === 'INVALID_BARBER_SERVICE') {
            setSelectedServiceId('')
            setCurrentStep(2)
            if (selectedBarber) void loadBarberServices(selectedBarber)
          } else {
            setSelectedAddOns([])
            setCurrentStep(3)
            if (selectedBarber) void loadBarberAddOns(selectedBarber)
          }
        } else if (response.code === 'SLOT_UNAVAILABLE') {
          setSelectedTime('')
          setCurrentStep(5)
          if (selectedDate) void loadSlots(selectedDate)
        }
        setError(
          response.error ??
            'Não foi possível concluir o agendamento. Tente novamente.',
        )
        return
      }

      if (response.success) setReceipt(response.receipt)
    })
  }

  if (receipt) {
    return (
      <BookingSuccess
        barbershopName={barbershop.name}
        receipt={receipt}
        onReset={resetBooking}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-[#1A1A1D] text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#1A1A1D]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-3 text-left"
            aria-label={`Sair do agendamento de ${barbershop.name}`}
          >
            <span className="grid size-9 place-items-center rounded-full border border-[#C79A4A]/45 bg-[#C79A4A]/10 text-[#C79A4A]">
              <Scissors className="size-4" />
            </span>
            <span className="font-[var(--font-montserrat)] text-sm font-semibold">
              {barbershop.name}
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/60"
          >
            <X className="size-3.5" />
            Sair
          </button>
        </div>
      </header>

      <div className="fixed inset-x-0 top-16 z-30 border-b border-white/10 bg-[#1A1A1D]/95 backdrop-blur-xl">
        <BookingProgress steps={STEPS} currentStep={currentStep} />
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-36 sm:px-6 sm:pt-40">
        {currentStep === 1 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 01"
              title="Escolha seu profissional"
              description="O preço, a duração e os serviços disponíveis dependem do profissional."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {barbers.map((item) => {
                const selected = selectedBarber === item.id
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => chooseBarber(item.id)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-[#C79A4A] bg-[#C79A4A]/10'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/25'
                    }`}
                  >
                    {item.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.avatar_url}
                        alt=""
                        className="size-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/5 text-white/45">
                        <UserRound className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-[var(--font-montserrat)] text-sm font-semibold">
                        {item.name}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">
                        {item.bio || 'Profissional da equipe'}
                      </span>
                    </span>
                    <SelectionMark selected={selected} />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 02"
              title="Escolha o serviço"
              description={`Veja os serviços configurados para ${barber?.name || 'o profissional selecionado'}.`}
            />
            {loadingServices ? (
              <div aria-live="polite" className="grid gap-3 sm:grid-cols-2">
                <span className="sr-only">Carregando serviços</span>
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl bg-white/5"
                  />
                ))}
              </div>
            ) : servicesError ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-6 text-center">
                <p className="text-sm text-red-100">{servicesError}</p>
                <button
                  type="button"
                  onClick={() => void loadBarberServices(selectedBarber)}
                  className="mt-4 rounded-xl border border-red-200/25 px-4 py-2 text-sm font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : barberServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/55">
                Este profissional não possui serviços disponíveis.
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="mx-auto mt-4 block font-semibold text-[#C79A4A]"
                >
                  Trocar profissional
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {barberServices.map((item) => {
                  const selected = selectedServiceId === item.id
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => chooseService(item)}
                      className={`flex min-h-40 flex-col rounded-2xl border p-5 text-left transition ${
                        selected
                          ? 'border-[#C79A4A] bg-[#C79A4A]/10'
                          : 'border-white/10 bg-white/[0.035] hover:border-white/25'
                      }`}
                    >
                      <span className="flex w-full items-start justify-between">
                        <Scissors className="size-5 text-[#C79A4A]" />
                        <SelectionMark selected={selected} />
                      </span>
                      <span className="mt-5 font-[var(--font-montserrat)] font-semibold">
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="mt-1 line-clamp-2 text-xs text-white/45">
                          {item.description}
                        </span>
                      )}
                      <span className="mt-auto flex items-end justify-between gap-4 pt-4">
                        <span className="flex items-center gap-1.5 text-xs text-white/45">
                          <Clock3 className="size-3.5" />
                          {item.durationMinutes} min
                        </span>
                        <span className="font-semibold text-[#C79A4A]">
                          {formatCurrency(item.price)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {currentStep === 3 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 03 · Opcional"
              title="Quer complementar o serviço?"
              description="Adicione quantos itens quiser ou continue sem adicionais."
            />
            {loadingAddOns ? (
              <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/45">
                Carregando adicionais deste profissional...
              </div>
            ) : addOnsError ? (
              <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">
                {addOnsError}
              </div>
            ) : barberAddOns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                Nenhum adicional disponível para este agendamento.
              </div>
            ) : (
              <div className="space-y-3">
                {barberAddOns.map((item) => {
                  const selected = selectedAddOns.includes(item.id)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleAddOn(item.id)}
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                        selected
                          ? 'border-[#C79A4A] bg-[#C79A4A]/10'
                          : 'border-white/10 bg-white/[0.035]'
                      }`}
                    >
                      <Sparkles className="size-4 text-[#C79A4A]" />
                      <span className="flex-1 text-sm font-semibold">
                        {item.name}
                      </span>
                      <span className="flex flex-col items-end gap-1 text-sm">
                        <span className="text-[#C79A4A]">
                          + {formatCurrency(item.price)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/45">
                          <Clock3 className="size-3" />+ {item.durationMinutes}{' '}
                          min
                        </span>
                      </span>
                      <SelectionMark selected={selected} />
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {currentStep === 4 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 04 · Opcional"
              title="Quer levar algo com você?"
              description="Reserve agora e pague somente na retirada."
            />
            <BookingProductStep
              products={products}
              quantities={selectedProducts}
              unavailableProductIds={unavailableProducts}
              onQuantityChange={(product, quantity) =>
                updateProduct(product.id, quantity)
              }
              onSkip={handleNext}
            />
          </section>
        )}

        {currentStep === 5 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 05"
              title="Quando você quer vir?"
              description="Escolha uma data e um horário que comporte o atendimento completo."
            />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              {calendarDays.map((day) => {
                const selected = selectedDate === day.value
                const [weekday, date, month] = day.label.split(' ')
                return (
                  <button
                    type="button"
                    key={day.value}
                    onClick={() => chooseDate(day.value)}
                    className={`flex min-w-20 flex-col items-center rounded-2xl border px-3 py-4 ${
                      selected
                        ? 'border-[#C79A4A] bg-[#C79A4A] text-[#1A1A1D]'
                        : 'border-white/10 bg-white/[0.035]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-60">
                      {weekday}
                    </span>
                    <span className="mt-1 text-xl font-semibold">{date}</span>
                    <span className="text-[10px] uppercase opacity-60">
                      {month}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              <Clock3 className="size-4 text-[#C79A4A]" />
              Horários disponíveis
            </div>
            {loadingSlots ? (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => (
                  <div
                    key={index}
                    className="h-11 animate-pulse rounded-xl bg-white/5"
                  />
                ))}
              </div>
            ) : slotsError ? (
              <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 p-6 text-center">
                <p className="text-sm text-red-100">{slotsError}</p>
                <button
                  type="button"
                  onClick={() => void loadSlots(selectedDate)}
                  className="mt-4 rounded-xl border border-red-200/25 px-4 py-2 text-sm font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : !selectedDate ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                <CalendarDays className="mx-auto mb-3 size-6 text-[#C79A4A]" />
                Selecione uma data para consultar os horários.
              </div>
            ) : slots.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                Não há horários disponíveis nesta data.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => {
                      setSelectedTime(slot)
                      setError('')
                    }}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                      selectedTime === slot
                        ? 'border-[#C79A4A] bg-[#C79A4A] text-[#1A1A1D]'
                        : 'border-white/10 bg-white/[0.035]'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {currentStep === 6 && (
          <section>
            <SectionHeading
              eyebrow="Etapa 06"
              title="Como podemos falar com você?"
              description="Usaremos estes dados para identificar e confirmar seu agendamento."
            />
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
                  <UserRound className="size-3.5 text-[#C79A4A]" />
                  Nome completo *
                </span>
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  autoComplete="name"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#111113] px-4 text-sm outline-none focus:border-[#C79A4A]"
                />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
                  <Phone className="size-3.5 text-[#C79A4A]" />
                  Celular *
                </span>
                <input
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#111113] px-4 text-sm outline-none focus:border-[#C79A4A]"
                />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
                  <Mail className="size-3.5 text-[#C79A4A]" />
                  E-mail (opcional)
                </span>
                <input
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#111113] px-4 text-sm outline-none focus:border-[#C79A4A]"
                />
              </label>
              <label className="block">
                <span className="mb-2 text-xs font-semibold text-white/60">
                  Observações (opcional)
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#111113] px-4 py-3 text-sm outline-none focus:border-[#C79A4A]"
                />
              </label>
            </div>
          </section>
        )}

        {currentStep === 7 && service && (
          <section>
            <SectionHeading
              eyebrow="Etapa 07"
              title="Tudo certo para confirmar?"
              description="Confira os detalhes antes de criar o agendamento."
            />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <div className="border-b border-white/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C79A4A]">
                  Atendimento
                </p>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {barber?.name} · {service.durationMinutes} min
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(service.price)}
                  </p>
                </div>
                {selectedAddOnItems.map((item) => (
                  <div
                    key={item.id}
                    className="mt-3 flex justify-between text-sm text-white/60"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
              {selectedProductItems.length > 0 && (
                <div className="border-b border-white/10 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C79A4A]">
                    Produtos reservados
                  </p>
                  {selectedProductItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-3 flex justify-between text-sm"
                    >
                      <span className="text-white/65">
                        {selectedProducts[item.id]}× {item.name}
                      </span>
                      <span>
                        {formatCurrency(
                          item.sale_price * selectedProducts[item.id],
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-5 border-b border-white/10 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#C79A4A]">
                    Data e hora
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'long',
                      timeZone: 'UTC',
                    }).format(new Date(`${selectedDate}T12:00:00Z`))}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    às {selectedTime}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#C79A4A]">
                    Cliente
                  </p>
                  <p className="mt-2 text-sm font-semibold">{clientName}</p>
                  <p className="mt-1 text-sm text-white/50">{clientPhone}</p>
                </div>
              </div>
              <div className="space-y-2 p-5">
                <div className="flex justify-between text-sm text-white/50">
                  <span>Serviço e adicionais</span>
                  <span>{formatCurrency(totals.serviceSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-white/50">
                  <span>Produtos</span>
                  <span>{formatCurrency(totals.productSubtotal)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-semibold">
                  <span>Total na barbearia</span>
                  <span className="text-[#C79A4A]">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </main>

      <BookingSummaryBar
        currentStep={currentStep}
        totalSteps={STEPS.length}
        isSubmitting={submitting}
        canContinue={canContinue}
        serviceSubtotal={totals.serviceSubtotal}
        productSubtotal={totals.productSubtotal}
        total={totals.total}
        onBack={handleBack}
        onNext={handleNext}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
