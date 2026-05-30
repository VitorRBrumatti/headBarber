'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Scissors, User, Plus, Check, ChevronRight, ChevronLeft, 
  Calendar, Sparkles, Phone, Mail, UserCheck, AlertTriangle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPublicSlotsAction, createPublicBooking } from './actions'

interface BookingClientProps {
  barbershop: {
    id: string
    name: string
    slug: string
  }
  services: {
    id: string
    name: string
    description: string | null
    price: number
    duration_minutes: number
  }[]
  barbers: {
    id: string
    name: string
    bio: string | null
    avatar_url: string | null
  }[]
  addOns: {
    id: string
    name: string
    price: number
  }[]
}

const STEPS = [
  { id: 1, name: 'Serviço', desc: 'Escolha o serviço principal' },
  { id: 2, name: 'Profissional', desc: 'Escolha quem vai te atender' },
  { id: 3, name: 'Adicionais', desc: 'Turbine seu atendimento' },
  { id: 4, name: 'Data e Hora', desc: 'Selecione o melhor momento' },
  { id: 5, name: 'Dados', desc: 'Preencha suas informações' },
  { id: 6, name: 'Confirmação', desc: 'Revise e confirme tudo' }
]

export function BookingClient({ barbershop, services, barbers, addOns }: BookingClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  
  // Selected state
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  // Client details
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientNotes, setClientNotes] = useState('')

  // slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, startLoadingSlots] = useTransition()
  
  // Booking mutation state
  const [isSubmitting, startSubmitting] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null)

  // Calendar dates generation (Next 14 days)
  const [calendarDays, setCalendarDays] = useState<{ dateStr: string; dayName: string; dayNum: number; month: string }[]>([])

  useEffect(() => {
    const days = []
    const today = new Date()
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    for (let i = 0; i < 14; i++) {
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + i)
      
      // Formatting ISO local string (YYYY-MM-DD)
      const year = nextDate.getFullYear()
      const month = String(nextDate.getMonth() + 1).padStart(2, '0')
      const day = String(nextDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      days.push({
        dateStr,
        dayName: weekdays[nextDate.getDay()],
        dayNum: nextDate.getDate(),
        month: months[nextDate.getMonth()]
      })
    }
    setCalendarDays(days)
    
    // Auto-select today
    if (days.length > 0) {
      setSelectedDate(days[0].dateStr)
    }
  }, [])

  // Reactively fetch slots when selected date or barber changes
  useEffect(() => {
    if (!selectedDate || !selectedBarber) return

    setAvailableSlots([])
    setSelectedTime(null)

    startLoadingSlots(async () => {
      try {
        const slots = await getPublicSlotsAction(barbershop.id, selectedBarber, selectedDate)
        setAvailableSlots(slots)
      } catch (err) {
        console.error('Error fetching available slots:', err)
      }
    })
  }, [selectedDate, selectedBarber, barbershop.id])

  // Helpers
  const serviceObj = services.find(s => s.id === selectedService)
  const barberObj = barbers.find(b => b.id === selectedBarber)
  const addOnsObj = addOns.filter(a => selectedAddOns.includes(a.id))

  // Calculations
  const totalPrice = (serviceObj?.price || 0) + addOnsObj.reduce((acc, curr) => acc + curr.price, 0)

  // Toggle add-on
  const toggleAddOn = (id: string) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(item => item !== id))
    } else {
      setSelectedAddOns([...selectedAddOns, id])
    }
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1 && !selectedService) return
    if (currentStep === 2 && !selectedBarber) return
    // Step 3 (add-ons) is optional
    if (currentStep === 4 && (!selectedDate || !selectedTime)) return
    if (currentStep === 5) {
      if (!clientName.trim() || !clientPhone.trim()) {
        setErrorMsg('Nome e Celular são obrigatórios.')
        return
      }
      setErrorMsg('')
    }
    setCurrentStep(prev => prev + 1)
  }

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1)
  }

  // Final booking dispatch
  const handleConfirmBooking = () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return

    setErrorMsg('')
    
    // Construct start timestamp (in UTC representation for RPC mapping)
    // E.g. "YYYY-MM-DDT[selectedTime]:00.000Z"
    const startAtStr = `${selectedDate}T${selectedTime}:00.000Z`

    startSubmitting(async () => {
      const response = await createPublicBooking({
        barbershopId: barbershop.id,
        clientName,
        clientPhone,
        clientEmail: clientEmail.trim() || undefined,
        barberId: selectedBarber,
        serviceId: selectedService,
        startAt: startAtStr,
        notes: clientNotes.trim() || undefined,
        addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined
      })

      if (response.error) {
        setErrorMsg(response.error)
      } else if (response.success && response.appointmentId) {
        setSuccessBookingId(response.appointmentId)
      }
    })
  }

  // Formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Mask Phone Input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    let masked = rawVal
    if (rawVal.length > 0) {
      masked = `(${rawVal.substring(0, 2)}`
    }
    if (rawVal.length > 2) {
      masked = `${masked}) ${rawVal.substring(2, 7)}`
    }
    if (rawVal.length > 7) {
      masked = `${masked}-${rawVal.substring(7, 11)}`
    }
    setClientPhone(masked)
  }

  // RENDER: SUCCESS SCREEN
  if (successBookingId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50 mb-8 animate-bounce">
          <Check className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-center text-amber-500 mb-2 tracking-tight">Agendado com Sucesso!</h1>
        <p className="text-neutral-400 text-center text-sm mb-8">
          Sua reserva foi criada com status <span className="text-green-500 font-semibold uppercase">Confirmada</span>. Enviamos uma notificação de confirmação para o seu WhatsApp!
        </p>

        <Card className="w-full bg-neutral-900 border-neutral-800/80 shadow-2xl backdrop-blur-md mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <span className="text-xs text-neutral-500 uppercase tracking-widest">Estabelecimento</span>
              <span className="text-sm font-semibold text-white">{barbershop.name}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">✂️ Serviço:</span>
                <span className="font-medium text-white">{serviceObj?.name}</span>
              </div>

              {barberObj && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">💈 Barbeiro:</span>
                  <span className="font-medium text-white">{barberObj.name}</span>
                </div>
              )}

              {addOnsObj.length > 0 && (
                <div className="flex flex-col space-y-1 pt-1 text-sm border-t border-neutral-800/40">
                  <span className="text-neutral-400">➕ Adicionais:</span>
                  <span className="text-xs text-amber-500 text-right">{addOnsObj.map(a => a.name).join(', ')}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm border-t border-neutral-800/40 pt-2">
                <span className="text-neutral-400">📅 Data:</span>
                <span className="font-medium text-white">
                  {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">⏰ Horário:</span>
                <span className="font-bold text-amber-500">{selectedTime}</span>
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-neutral-400">Total Pago:</span>
              <span className="text-lg font-bold text-white">{formatCurrency(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-xl py-6"
          onClick={() => {
            // Reset
            setSuccessBookingId(null)
            setSelectedService(null)
            setSelectedBarber(null)
            setSelectedAddOns([])
            setSelectedTime(null)
            setClientName('')
            setClientPhone('')
            setClientEmail('')
            setClientNotes('')
            setCurrentStep(1)
          }}
        >
          Agendar Outro Serviço
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs uppercase tracking-widest text-amber-500/80 font-bold">Agendamento Online</span>
        <h1 className="text-4xl font-extrabold text-white mt-1 tracking-tight">{barbershop.name}</h1>
        <p className="text-xs text-neutral-500 mt-2 font-mono">{STEPS[currentStep - 1].desc}</p>
      </div>

      {/* Progress Steps Indicators */}
      <div className="hidden sm:flex justify-between items-center mb-8 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800/40 shadow-inner">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          return (
            <div key={step.id} className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                isActive ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20' :
                isCompleted ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' :
                'bg-neutral-950 border-neutral-800 text-neutral-600'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className={`text-xs font-semibold ${isActive ? 'text-amber-500' : isCompleted ? 'text-neutral-300' : 'text-neutral-600'}`}>
                {step.name}
              </span>
              {step.id < 6 && <div className="w-6 h-[1px] bg-neutral-800" />}
            </div>
          )
        })}
      </div>

      <div className="sm:hidden flex items-center justify-between mb-6 bg-neutral-900/80 px-4 py-3 rounded-xl border border-neutral-850">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Etapa {currentStep} de 6</span>
        <span className="text-sm font-semibold text-white">{STEPS[currentStep - 1].name}</span>
      </div>

      {/* STEP BODY */}
      <div className="min-h-[40vh] mb-8">
        {/* STEP 1: SERVICES */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 gap-4">
            {services.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">Nenhum serviço ativo encontrado.</div>
            ) : (
              services.map((service) => {
                const isSelected = selectedService === service.id
                return (
                  <div
                    key={service.id}
                    className={`cursor-pointer rounded-2xl p-5 border text-left transition-all duration-300 transform hover:scale-[1.01] flex justify-between items-center ${
                      isSelected ? 'bg-amber-500/5 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <div className="space-y-1 pr-4">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        {service.name}
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      </h3>
                      {service.description && <p className="text-sm text-neutral-400 line-clamp-2">{service.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>30 min (Duração Fixa)</span>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <span className="text-xl font-extrabold text-white">{formatCurrency(service.price)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* STEP 2: BARBERS */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Any Available Option */}
            <div
              className={`cursor-pointer rounded-2xl p-5 border text-left transition-all duration-300 flex items-center space-x-4 ${
                selectedBarber === 'any' ? 'bg-amber-500/5 border-amber-500' : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
              }`}
              onClick={() => setSelectedBarber('any')}
            >
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/40 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Qualquer Profissional</h3>
                <p className="text-xs text-neutral-400">Aumenta a disponibilidade e escolhe o primeiro livre</p>
              </div>
            </div>

            {barbers.map((barber) => {
              const isSelected = selectedBarber === barber.id
              return (
                <div
                  key={barber.id}
                  className={`cursor-pointer rounded-2xl p-5 border text-left transition-all duration-300 flex items-center space-x-4 ${
                    isSelected ? 'bg-amber-500/5 border-amber-500 shadow-lg' : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                  onClick={() => setSelectedBarber(barber.id)}
                >
                  <div className="w-14 h-14 bg-neutral-850 rounded-full overflow-hidden border border-neutral-800 flex-shrink-0">
                    {barber.avatar_url ? (
                      <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-450 font-bold bg-neutral-800">
                        {barber.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-white text-base truncate">{barber.name}</h3>
                    {barber.bio && <p className="text-xs text-neutral-400 truncate mt-0.5">{barber.bio}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* STEP 3: ADD-ONS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {addOns.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                Nenhum serviço adicional disponível no momento.
                <div className="mt-4">
                  <Button onClick={handleNext} className="bg-amber-500 text-neutral-950 font-bold rounded-xl px-6 py-2">
                    Avançar Etapa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {addOns.map((add_on) => {
                  const isChecked = selectedAddOns.includes(add_on.id)
                  return (
                    <div
                      key={add_on.id}
                      className={`cursor-pointer rounded-2xl p-4 border text-left transition-all duration-350 flex justify-between items-center select-none ${
                        isChecked ? 'bg-amber-500/5 border-amber-500' : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                      onClick={() => toggleAddOn(add_on.id)}
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-amber-500 border-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-950'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                        <span className="font-bold text-white text-base">{add_on.name}</span>
                      </div>
                      <div className="text-right pl-4">
                        <span className="text-base font-semibold text-neutral-300">+{formatCurrency(add_on.price)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: DATE & SLOTS */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Horizontal Day Picker */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-mono tracking-widest text-neutral-450 block text-left">Escolha o Dia</label>
              <div className="flex space-x-3 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x">
                {calendarDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr
                  return (
                    <div
                      key={day.dateStr}
                      className={`snap-center cursor-pointer min-w-[70px] flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-300 ${
                        isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-lg shadow-amber-500/10' : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:border-neutral-700'
                      }`}
                      onClick={() => setSelectedDate(day.dateStr)}
                    >
                      <span className="text-[10px] uppercase font-mono tracking-widest font-semibold opacity-75">{day.dayName}</span>
                      <span className="text-xl font-black mt-1">{day.dayNum}</span>
                      <span className="text-[9px] uppercase font-mono tracking-widest mt-1 opacity-75">{day.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time Slot Grid */}
            <div className="space-y-3">
              <label className="text-xs uppercase font-mono tracking-widest text-neutral-450 block text-left">Horários Disponíveis</label>
              
              {isLoadingSlots ? (
                <div className="text-center py-12 text-neutral-500 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Consultando horários livres...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-8 text-center text-neutral-500 flex flex-col items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-neutral-600 mb-2" />
                  <span className="text-sm font-semibold">Sem horários disponíveis neste dia.</span>
                  <span className="text-xs text-neutral-600 mt-1">Tente selecionar outro profissional ou outra data no seletor acima.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot
                    return (
                      <div
                        key={slot}
                        className={`cursor-pointer p-3.5 rounded-xl border text-center font-mono font-bold text-sm transition-all duration-200 ${
                          isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-md shadow-amber-500/10 scale-105' : 'bg-neutral-900/60 border-neutral-800/80 text-white hover:border-neutral-700'
                        }`}
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: CLIENT DETAILS */}
        {currentStep === 5 && (
          <div className="max-w-md mx-auto space-y-4 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80">
            <div className="space-y-1 text-left">
              <label htmlFor="name" className="text-xs uppercase font-mono tracking-widest text-neutral-450">Nome Completo *</label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-neutral-950 border-neutral-850 rounded-xl focus:border-amber-500 text-white py-6"
              />
            </div>

            <div className="space-y-1 text-left">
              <label htmlFor="phone" className="text-xs uppercase font-mono tracking-widest text-neutral-450">Celular (WhatsApp) *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-neutral-600" />
                <Input
                  id="phone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className="bg-neutral-950 border-neutral-850 rounded-xl focus:border-amber-500 text-white pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label htmlFor="email" className="text-xs uppercase font-mono tracking-widest text-neutral-450">E-mail (Opcional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-neutral-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-850 rounded-xl focus:border-amber-500 text-white pl-10 py-6"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label htmlFor="notes" className="text-xs uppercase font-mono tracking-widest text-neutral-450">Observações (Opcional)</label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Ex: Tenho alergia a algum produto, prefiro corte tesoura..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
              />
            </div>
            
            {errorMsg && (
              <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: CHECKOUT CONFIRM */}
        {currentStep === 6 && (
          <div className="max-w-md mx-auto space-y-6">
            <Card className="bg-neutral-900 border-neutral-800/80 shadow-2xl backdrop-blur-md">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-extrabold text-xl text-white border-b border-neutral-800 pb-3 text-left">Resumo do Agendamento</h3>
                
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">✂️ Serviço:</span>
                    <span className="font-bold text-white">{serviceObj?.name}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">💈 Barbeiro:</span>
                    <span className="font-medium text-white">{barberObj?.name || 'Qualquer um disponível'}</span>
                  </div>

                  {addOnsObj.length > 0 && (
                    <div className="flex justify-between items-start text-sm border-t border-neutral-800/40 pt-2">
                      <span className="text-neutral-400">➕ Adicionais:</span>
                      <span className="font-medium text-amber-500 text-right max-w-[200px]">{addOnsObj.map(a => a.name).join(', ')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm border-t border-neutral-800/40 pt-2.5">
                    <span className="text-neutral-400">📅 Data Escolhida:</span>
                    <span className="font-semibold text-white">
                      {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">⏰ Horário Agendado:</span>
                    <span className="font-black text-amber-500 text-base">{selectedTime}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-t border-neutral-800/40 pt-2.5">
                    <span className="text-neutral-400">👤 Cliente:</span>
                    <span className="font-medium text-white">{clientName}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">📞 WhatsApp:</span>
                    <span className="font-mono text-white">{clientPhone}</span>
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-neutral-400">Preço Total (no local):</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(totalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {errorMsg && (
              <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center justify-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-between items-center border-t border-neutral-800 pt-6">
        {currentStep > 1 && (
          <Button
            onClick={handlePrev}
            disabled={isSubmitting}
            className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-xl py-6 px-6 font-semibold flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>
        )}

        <div className="ml-auto">
          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !selectedService) ||
                (currentStep === 2 && !selectedBarber) ||
                (currentStep === 4 && (!selectedDate || !selectedTime)) ||
                (currentStep === 5 && (!clientName || !clientPhone))
              }
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-6 px-8 flex items-center gap-2 shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl py-6 px-10 flex items-center gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Agendando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  <span>Confirmar Agendamento</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
