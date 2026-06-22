'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { updateAppointmentStatus, createAdminAppointment } from './actions'

interface AgendaClientProps {
  initialBarbers: {
    id: string
    name: string
    avatar_url: string | null
  }[]
  initialSettings?: {
    slot_interval_minutes?: number
    default_start_time?: string | null
    default_end_time?: string | null
    default_lunch_start?: string | null
    default_lunch_end?: string | null
  } | null
  initialAppointments: any[]
  initialWorkHours: any[]
  currentDate: string
  services: {
    id: string
    name: string
    price: number
  }[]
}

export function AgendaClient({ 
  initialBarbers, 
  initialSettings, 
  initialAppointments, 
  initialWorkHours, 
  currentDate,
  services
}: AgendaClientProps) {
  const router = useRouter()
  
  // Sheet toggles
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Create form state
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')

  const [isUpdating, startUpdating] = useTransition()
  const [isCreating, startCreating] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // Date navigation
  const navigateDate = (offset: number) => {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    router.push(`/dashboard/agenda?date=${year}-${month}-${day}`)
  }

  // Capitalize helper
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  const dateObj = new Date(currentDate + 'T00:00:00')
  const formattedDay = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const weekday = capitalize(dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }))

  // Time grid generation
  const generateTimeSlots = () => {
    const slots = []
    const interval = initialSettings?.slot_interval_minutes || 30
    
    // Parse times
    const startTimeStr = initialSettings?.default_start_time || '09:00:00'
    const endTimeStr = initialSettings?.default_end_time || '19:00:00'
    const [startH, startM] = startTimeStr.split(':').map(Number)
    const [endH, endM] = endTimeStr.split(':').map(Number)
    
    let current = new Date(2000, 0, 1, startH, startM)
    const end = new Date(2000, 0, 1, endH, endM)
    
    while (current < end) {
      const h = String(current.getHours()).padStart(2, '0')
      const m = String(current.getMinutes()).padStart(2, '0')
      slots.push(`${h}:${m}`)
      current.setMinutes(current.getMinutes() + interval)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Status handler
  const handleStatusChange = (status: string) => {
    if (!selectedAppt) return
    startUpdating(async () => {
      try {
        await updateAppointmentStatus(selectedAppt.id, status)
        setIsDetailOpen(false)
        setSelectedAppt(null)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  // Create submission
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !clientPhone.trim() || !selectedService || !selectedBarber || !selectedTime) {
      setErrorMsg('Preencha todos os campos obrigatórios (*).')
      return
    }
    setErrorMsg('')

    const startAtIso = `${currentDate}T${selectedTime}:00.000Z`

    startCreating(async () => {
      const response = await createAdminAppointment({
        clientName,
        clientPhone,
        clientEmail: clientEmail.trim() || undefined,
        barberId: selectedBarber,
        serviceId: selectedService,
        startAt: startAtIso,
        notes: bookingNotes.trim() || undefined
      })

      if (response.error) {
        setErrorMsg(response.error)
      } else if (response.success) {
        // Reset form and close
        setIsCreateOpen(false)
        setClientName('')
        setClientPhone('')
        setClientEmail('')
        setSelectedService('')
        setSelectedBarber('')
        setSelectedTime('')
        setBookingNotes('')
      }
    })
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Get user initials
  const getInitials = (name: string) => {
    if (!name) return 'C'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // General lunch bounds
  const lunchStart = initialSettings?.default_lunch_start?.substring(0, 5) || '12:00'
  const lunchEnd = initialSettings?.default_lunch_end?.substring(0, 5) || '13:00'

  return (
    <div className="space-y-6">
      {/* HEADER DATE NAV */}
      <section className="bg-white p-6 rounded-2xl border border-[#eceef4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="font-montserrat text-xl md:text-2xl font-black text-[#181c21] capitalize">
            {formattedDay}
          </h1>
          <p className="text-xs text-[#47464b] font-medium mt-1">
            {weekday} • {initialAppointments.length} reservas agendadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Nav buttons */}
          <div className="flex items-center bg-white border border-[#c8c5cb]/30 rounded-xl p-1 shadow-xs">
            <button 
              onClick={() => navigateDate(-1)}
              className="px-3.5 py-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#47464b] hover:bg-[#eceef4] transition-colors rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span> 
              <span className="hidden xs:inline">Dia anterior</span>
            </button>
            <div className="w-px h-5 bg-[#c8c5cb]/30 mx-1"></div>
            <button 
              onClick={() => {
                const today = new Date()
                const year = today.getFullYear()
                const month = String(today.getMonth() + 1).padStart(2, '0')
                const day = String(today.getDate()).padStart(2, '0')
                router.push(`/dashboard/agenda?date=${year}-${month}-${day}`)
              }}
              className="px-4 py-1.5 text-[11px] font-bold text-[#181c21] bg-[#eceef4] hover:bg-[#e6e8ef] transition-colors rounded-lg cursor-pointer"
            >
              Hoje
            </button>
            <div className="w-px h-5 bg-[#c8c5cb]/30 mx-1"></div>
            <button 
              onClick={() => navigateDate(1)}
              className="px-3.5 py-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#47464b] hover:bg-[#eceef4] transition-colors rounded-lg cursor-pointer"
            >
              <span className="hidden xs:inline">Próximo dia</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Reservar CTA */}
          <button
            onClick={() => {
              setErrorMsg('')
              setSelectedBarber('')
              setSelectedTime('')
              setClientName('')
              setClientPhone('')
              setClientEmail('')
              setBookingNotes('')
              setIsCreateOpen(true)
            }}
            className="bg-[#C79A4A] hover:brightness-105 text-black font-bold rounded-xl py-2.5 px-4 text-xs shadow-md shadow-[#C79A4A]/10 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Reservar
          </button>
        </div>
      </section>

      {/* CALENDAR GRID BOARD */}
      {initialBarbers.length === 0 ? (
        <div className="bg-white border border-[#eceef4] rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs space-y-6 flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 bg-[#C79A4A]/20 rounded-full flex items-center justify-center text-[#C79A4A]">
            <span className="material-symbols-outlined text-3xl font-fill-1">content_cut</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-montserrat text-lg font-bold text-[#181c21]">Nenhum barbeiro ativo</h3>
            <p className="text-xs text-[#47464b] max-w-xs leading-relaxed font-medium">
              Para gerenciar a sua agenda de reservas, você precisa cadastrar pelo menos um barbeiro ativo na sua equipe.
            </p>
          </div>
          <Link href="/dashboard/barbeiros">
            <button className="px-6 py-3 bg-black hover:bg-[#C79A4A] hover:text-black text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-300 text-xs uppercase tracking-wider cursor-pointer border-none shadow-md shadow-[#C79A4A]/5">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Cadastrar Barbeiro
            </button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#eceef4] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scroll">
            <div className="min-w-[1000px] bg-white relative">
              
              {/* Header labels */}
              <div 
                className="grid border-b border-[#eceef4] bg-[#f1f3fa]/30 sticky top-0 z-10" 
                style={{ gridTemplateColumns: `80px repeat(${initialBarbers.length}, 1fr)` }}
              >
                <div className="h-14 border-r border-[#eceef4]"></div>
                {initialBarbers.map((barber) => (
                  <div key={barber.id} className="h-14 flex items-center justify-center border-r border-[#eceef4] gap-2 px-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-[#c8c5cb]/30 bg-zinc-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#47464b]">
                      {barber.avatar_url ? (
                        <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                      ) : (
                        barber.name.substring(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="font-montserrat text-sm font-bold text-black truncate">{barber.name}</span>
                  </div>
                ))}
              </div>

              {/* Time grid rows */}
              <div className="divide-y divide-[#eceef4]">
                {timeSlots.map((time) => {
                  const isGeneralLunch = time >= lunchStart && time < lunchEnd

                  // 1. Render General Lunch full-span row
                  if (isGeneralLunch) {
                    return (
                      <div 
                        key={time}
                        className="grid h-16 bg-[#f1f3fa]" 
                        style={{ gridTemplateColumns: `80px repeat(${initialBarbers.length}, 1fr)` }}
                      >
                        <div className="flex items-center justify-center border-r border-[#eceef4] bg-white">
                          <span className="font-semibold text-xs text-[#77767b]">{time}</span>
                        </div>
                        <div 
                          className="flex items-center justify-center gap-2 uppercase tracking-widest text-[#77767b] text-[10px] font-bold" 
                          style={{ gridColumn: `span ${initialBarbers.length}` }}
                        >
                          <span className="material-symbols-outlined text-base">restaurant</span> 
                          Intervalo de Almoço
                        </div>
                      </div>
                    )
                  }

                  // 2. Render Normal Slot row
                  return (
                    <div 
                      key={time}
                      className="grid h-24 divide-x divide-[#eceef4]" 
                      style={{ gridTemplateColumns: `80px repeat(${initialBarbers.length}, 1fr)` }}
                    >
                      {/* Left time label */}
                      <div className="flex flex-col items-center justify-start pt-4">
                        <span className="font-semibold text-xs text-[#181c21]">{time}</span>
                        {time.endsWith(':00') && (
                          <span className="text-[9px] text-[#77767b] font-bold uppercase mt-0.5">
                            {parseInt(time.split(':')[0]) < 12 ? 'AM' : 'PM'}
                          </span>
                        )}
                      </div>

                      {/* Barber Cells */}
                      {initialBarbers.map((barber) => {
                        const shift = initialWorkHours.find(
                          (wh) => wh.barber_id === barber.id && 
                          wh.start_time.substring(0, 5) <= time && 
                          wh.end_time.substring(0, 5) > time
                        )
                        
                        const isBarberLunch = shift && 
                          shift.lunch_start_time.substring(0, 5) <= time && 
                          shift.lunch_end_time.substring(0, 5) > time

                        const isWorking = shift && !isBarberLunch

                        // Find appointment
                        const appt = initialAppointments.find(
                          (a) => a.barber_id === barber.id && 
                          new Date(a.start_at).toISOString().substring(11, 16) === time
                        )

                        // Styling classes by status
                        let apptStyle = ''
                        let badgeBg = ''
                        let badgeText = ''
                        let statusText = 'PENDENTE'
                        let iconName = 'schedule'

                        if (appt) {
                          switch (appt.status) {
                            case 'confirmed':
                              apptStyle = 'bg-[#ffdeaa]/20 border-[#ffdeaa] text-[#7c5809] hover:bg-[#ffdeaa]/30'
                              badgeBg = 'bg-[#ffcd77]'
                              badgeText = 'text-[#795506]'
                              statusText = 'CONFIRMADA'
                              iconName = 'schedule'
                              break
                            case 'completed':
                              apptStyle = 'bg-[#eceef4] border-[#77767b]/40 text-[#77767b] opacity-60'
                              badgeBg = 'bg-[#c8c5cb]'
                              badgeText = 'text-[#47464b]'
                              statusText = 'CONCLUÍDO'
                              iconName = 'check_circle'
                              break
                            case 'cancelled':
                              apptStyle = 'border-[#c8c5cb] border-dashed opacity-50 text-[#77767b]/70'
                              badgeBg = 'bg-[#c8c5cb]/40'
                              badgeText = 'text-[#77767b]'
                              statusText = 'CANCELADA'
                              iconName = 'cancel'
                              break
                            case 'no_show':
                              apptStyle = 'bg-[#ffdad6]/20 border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/35'
                              badgeBg = 'bg-[#ba1a1a]'
                              badgeText = 'text-white'
                              statusText = 'NO-SHOW'
                              iconName = 'person_off'
                              break
                          }
                        }

                        return (
                          <div 
                            key={`${barber.id}-${time}`}
                            className={`p-1 flex items-stretch transition-colors ${
                              isBarberLunch ? 'bg-[#f1f3fa]/20' : 
                              !isWorking ? 'bg-[#f1f3fa]/40' : 'bg-transparent'
                            }`}
                          >
                            {appt ? (
                              // Render Appointment
                              <button
                                onClick={() => {
                                  setSelectedAppt(appt)
                                  setErrorMsg('')
                                  setIsDetailOpen(true)
                                }}
                                className={`w-full p-2.5 rounded-lg border-l-4 border-y border-r flex flex-col justify-between text-left transition-all hover:scale-[1.01] select-none cursor-pointer ${apptStyle}`}
                              >
                                <div>
                                  <div className="flex justify-between items-start gap-1">
                                    <p className={`font-bold text-xs truncate max-w-[100px] ${appt.status === 'completed' || appt.status === 'cancelled' ? 'line-through' : 'text-black'}`}>
                                      {appt.clients?.name || 'Cliente Avulso'}
                                    </p>
                                    <span className={`text-[8px] font-bold px-1 rounded flex-shrink-0 ${badgeBg} ${badgeText}`}>
                                      {statusText}
                                    </span>
                                  </div>
                                  <p className={`text-[10px] truncate ${appt.status === 'completed' || appt.status === 'cancelled' ? 'text-[#77767b]/60' : 'text-[#47464b]'}`}>
                                    {appt.services?.name}
                                  </p>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                  <span className={`text-[10px] font-bold ${appt.status === 'completed' || appt.status === 'cancelled' ? 'text-[#77767b]/60' : 'text-black'}`}>
                                    {formatCurrency(appt.total_price)}
                                  </span>
                                  <span className="material-symbols-outlined text-xs">
                                    {iconName}
                                  </span>
                                </div>
                              </button>
                            ) : isBarberLunch ? (
                              <div className="w-full flex items-center justify-center text-[10px] text-[#77767b] font-medium italic select-none">
                                Almoço
                              </div>
                            ) : !isWorking ? (
                              // shift off (folga)
                              <div className="w-full h-full pattern-diagonal rounded-lg flex items-center justify-center select-none">
                                <span className="text-[9px] font-bold text-[#77767b]/40 uppercase tracking-wider">
                                  Bloqueado
                                </span>
                              </div>
                            ) : (
                              // Clickable empty slot
                              <button
                                onClick={() => {
                                  setSelectedBarber(barber.id)
                                  setSelectedTime(time)
                                  setClientName('')
                                  setClientPhone('')
                                  setClientEmail('')
                                  setBookingNotes('')
                                  setErrorMsg('')
                                  setIsCreateOpen(true)
                                }}
                                className="w-full h-full rounded-lg border border-dashed border-[#c8c5cb]/30 hover:border-[#C79A4A]/50 hover:bg-[#C79A4A]/[0.02] flex items-center justify-center text-[#c8c5cb] hover:text-[#C79A4A] transition-all group cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 transition-opacity">
                                  add
                                </span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: APPOINTMENT DETAILS DRAWER */}
      <Sheet 
        open={isDetailOpen} 
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedAppt(null)
        }}
        title="Detalhes da Reserva"
        description="Ficha do cliente e controle do atendimento"
      >
        {selectedAppt && (
          <div className="py-4 space-y-6 text-zinc-950 text-left">
            
            {/* Header info */}
            <div className="flex items-center gap-4 border-b border-[#eceef4] pb-4">
              <div className="w-14 h-14 rounded-full bg-[#ffdeaa]/30 flex items-center justify-center text-[#7c5809] font-bold text-xl flex-shrink-0">
                {getInitials(selectedAppt.clients?.name || 'Cliente Avulso')}
              </div>
              <div className="min-w-0">
                <h2 className="font-montserrat text-base font-extrabold text-[#181c21] truncate leading-tight">
                  {selectedAppt.clients?.name || 'Cliente Avulso'}
                </h2>
                <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">
                  {selectedAppt.clients?.phone || 'Telefone não informado'}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-5 bg-[#f8f9ff] p-4 rounded-xl border border-[#eceef4]">
              <div>
                <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Serviço</p>
                <p className="font-bold text-sm text-black leading-snug">{selectedAppt.services?.name}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Valor</p>
                <p className="font-bold text-sm text-[#7c5809]">{formatCurrency(selectedAppt.total_price)}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Barbeiro</p>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-[#c8c5cb]/30 bg-zinc-200 flex-shrink-0 flex items-center justify-center font-bold text-[9px] text-[#47464b]">
                    {initialBarbers.find(b => b.id === selectedAppt.barber_id)?.avatar_url ? (
                      <img 
                        src={initialBarbers.find(b => b.id === selectedAppt.barber_id)!.avatar_url!} 
                        alt="Barber avatar" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      initialBarbers.find(b => b.id === selectedAppt.barber_id)?.name.substring(0, 1).toUpperCase() || 'B'
                    )}
                  </div>
                  <span className="font-bold text-xs text-black truncate">
                    {initialBarbers.find(b => b.id === selectedAppt.barber_id)?.name.split(' ')[0] || 'Profissional'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Horário</p>
                <p className="font-bold text-xs text-black leading-snug">
                  {selectedAppt.start_at ? selectedAppt.start_at.substring(11, 16) : '--:--'}
                </p>
              </div>
            </div>

            {/* Observações */}
            {selectedAppt.notes && (
              <div className="bg-[#f1f3fa] rounded-xl p-4 space-y-1.5 border border-[#eceef4]">
                <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider">Observações</p>
                <p className="text-xs text-[#47464b] italic leading-relaxed font-medium">
                  &quot;{selectedAppt.notes}&quot;
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Drawer Actions */}
            <div className="border-t border-[#eceef4] pt-6 flex flex-col gap-2">
              {selectedAppt.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                  className="w-full bg-[#1b5e20] hover:opacity-90 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Concluir Atendimento
                </button>
              )}

              {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'no_show') && (
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => handleStatusChange('no_show')}
                    disabled={isUpdating}
                    className="bg-[#e65100] hover:opacity-90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">person_off</span>
                    No-show
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isUpdating}
                    className="bg-[#ba1a1a] hover:opacity-90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* MODAL 2: MANUAL BOOKING CREATION */}
      <Sheet 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)}
        title="Nova Reserva Manual"
        description="Agende um cliente diretamente pelo painel (Walk-in)"
      >
        <form onSubmit={handleCreateBooking} className="py-4 space-y-4 text-zinc-900 text-left">
          
          <div className="space-y-1">
            <label htmlFor="c_name" className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Nome do Cliente *</label>
            <Input
              id="c_name"
              type="text"
              placeholder="Ex: Carlos Silva"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-white border-[#eceef4] text-[#181c21] rounded-xl py-5 focus:border-[#C79A4A] focus:ring-[#C79A4A]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="c_phone" className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Telefone Celular *</label>
            <Input
              id="c_phone"
              type="text"
              placeholder="(11) 99999-9999"
              value={clientPhone}
              onChange={handlePhoneChange}
              maxLength={15}
              className="bg-white border-[#eceef4] text-[#181c21] rounded-xl py-5 focus:border-[#C79A4A] focus:ring-[#C79A4A]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="c_email" className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">E-mail (Opcional)</label>
            <Input
              id="c_email"
              type="email"
              placeholder="carlos@email.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="bg-white border-[#eceef4] text-[#181c21] rounded-xl py-5 focus:border-[#C79A4A] focus:ring-[#C79A4A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Barbeiro *</label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="w-full bg-white border border-[#eceef4] rounded-xl p-3 focus:outline-none focus:border-[#C79A4A] text-[#181c21] text-xs font-semibold h-11"
              >
                <option value="" disabled>Selecionar</option>
                {initialBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>{barber.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Horário *</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-white border border-[#eceef4] rounded-xl p-3 focus:outline-none focus:border-[#C79A4A] text-[#181c21] text-xs font-mono font-semibold h-11"
              >
                <option value="" disabled>Selecionar</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Serviço Principal *</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-white border border-[#eceef4] rounded-xl p-3 focus:outline-none focus:border-[#C79A4A] text-[#181c21] text-xs font-semibold h-11"
            >
              <option value="" disabled>Selecionar</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({formatCurrency(service.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="c_notes" className="text-[10px] uppercase font-mono tracking-widest text-[#77767b] font-bold">Notas Internas</label>
            <textarea
              id="c_notes"
              rows={2}
              placeholder="Observações ou demandas específicas..."
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="w-full bg-white border border-[#eceef4] rounded-xl p-3 focus:outline-none focus:border-[#C79A4A] text-[#181c21] text-xs font-semibold"
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isCreating}
            className="w-full bg-[#C79A4A] hover:brightness-105 text-black font-bold rounded-xl py-6 mt-4 shadow-lg shadow-[#C79A4A]/10 transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs cursor-pointer border-none"
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Criando Reserva...</span>
              </div>
            ) : (
              'Confirmar Agendamento'
            )}
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
