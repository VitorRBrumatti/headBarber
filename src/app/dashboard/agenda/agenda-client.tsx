'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Clock, Scissors, User, Phone, Mail, CheckCircle, XCircle, AlertTriangle, MessageSquare, Trash2, Copy, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  const formattedDateHeader = new Date(currentDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

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

  return (
    <div className="space-y-6">
      {/* Navigator Topbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-900 border border-neutral-800/80 p-4 sm:p-5 rounded-2xl gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/25">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight capitalize">{formattedDateHeader}</h1>
            <p className="text-xs text-neutral-400 font-medium">Controle diário da agenda e disponibilidades</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button 
            onClick={() => navigateDate(-1)} 
            className="flex-1 sm:flex-initial bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-white rounded-xl py-2 px-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs sm:inline hidden ml-1">Dia Anterior</span>
          </Button>
          
          <Button 
            onClick={() => {
              const today = new Date()
              const year = today.getFullYear()
              const month = String(today.getMonth() + 1).padStart(2, '0')
              const day = String(today.getDate()).padStart(2, '0')
              router.push(`/dashboard/agenda?date=${year}-${month}-${day}`)
            }}
            className="bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-white rounded-xl py-2 px-3 text-xs"
          >
            Hoje
          </Button>

          <Button 
            onClick={() => navigateDate(1)} 
            className="flex-1 sm:flex-initial bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-white rounded-xl py-2 px-3"
          >
            <span className="text-xs sm:inline hidden mr-1">Próximo Dia</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button 
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
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-2 px-4 text-xs shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Reservar
          </Button>
        </div>
      </div>

      {/* TIME GRID BOARD */}
      {initialBarbers.length === 0 ? (
        <Card className="bg-neutral-900 border-neutral-800 p-12 text-center text-neutral-500">
          Nenhum barbeiro ativo cadastrado. Cadastre barbeiros na seção de profissionais para gerenciar a agenda.
        </Card>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <div className="min-w-[800px] grid" style={{ gridTemplateColumns: `100px repeat(${initialBarbers.length}, 1fr)` }}>
              {/* HEADER CELLS (Barbers) */}
              <div className="bg-neutral-950 text-neutral-400 p-4 border-b border-r border-neutral-800 flex items-center justify-center font-mono font-bold text-xs uppercase tracking-widest">
                Hora
              </div>
              {initialBarbers.map((barber) => (
                <div key={barber.id} className="bg-neutral-950 text-white p-4 border-b border-neutral-800 flex items-center justify-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900">
                    {barber.avatar_url ? (
                      <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-400">
                        {barber.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-extrabold text-sm tracking-tight">{barber.name}</span>
                </div>
              ))}

              {/* GRID ROWS */}
              {timeSlots.map((time) => (
                <div key={time} className="contents">
                  {/* Time label column */}
                  <div className="bg-neutral-950/40 p-4 border-r border-b border-neutral-850 text-neutral-400 font-mono font-black text-sm flex items-center justify-center">
                    {time}
                  </div>

                  {/* Barber columns for this specific time */}
                  {initialBarbers.map((barber) => {
                    // Check if barber works at this slot (inside shifts and not lunch)
                    const shift = initialWorkHours.find(
                      (wh) => wh.barber_id === barber.id && 
                      wh.start_time.substring(0, 5) <= time && 
                      wh.end_time.substring(0, 5) > time
                    )
                    
                    const isLunch = shift && 
                      shift.lunch_start_time.substring(0, 5) <= time && 
                      shift.lunch_end_time.substring(0, 5) > time

                    const isWorking = shift && !isLunch

                    // Find if there is an appointment at this exact slot
                    const appt = initialAppointments.find(
                      (a) => a.barber_id === barber.id && 
                      new Date(a.start_at).toISOString().substring(11, 16) === time
                    )

                    // Styles based on status
                    let apptStyle = 'bg-neutral-950 border-neutral-800 text-neutral-400 opacity-60'
                    let apptStatusLabel = 'Pendente'

                    if (appt) {
                      switch (appt.status) {
                        case 'confirmed':
                          apptStyle = 'bg-amber-500/10 border-amber-500 text-amber-500 hover:bg-amber-500/20'
                          apptStatusLabel = 'Confirmado'
                          break
                        case 'completed':
                          apptStyle = 'bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500/20'
                          apptStatusLabel = 'Concluído'
                          break
                        case 'cancelled':
                          apptStyle = 'bg-red-500/10 border-red-500 text-red-500 line-through opacity-70 hover:bg-red-500/15'
                          apptStatusLabel = 'Cancelado'
                          break
                        case 'no_show':
                          apptStyle = 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-705'
                          apptStatusLabel = 'Faltou'
                          break
                      }
                    }

                    return (
                      <div 
                        key={`${barber.id}-${time}`} 
                        className={`p-2 border-b border-r border-neutral-850 flex items-stretch min-h-[75px] transition-colors relative ${
                          isLunch ? 'bg-neutral-950/20 shadow-inner' :
                          !isWorking ? 'bg-neutral-950/40 pattern-diagonal-lines' : 'bg-neutral-900/10'
                        }`}
                      >
                        {appt ? (
                          // Render appointment block
                          <button
                            onClick={() => {
                              setSelectedAppt(appt)
                              setErrorMsg('')
                              setIsDetailOpen(true)
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all select-none hover:scale-[1.01] ${apptStyle}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-xs tracking-tight truncate max-w-[120px]">
                                  {appt.clients?.name || 'Cliente Avulso'}
                                </span>
                                <Badge className={`text-[9px] uppercase tracking-widest scale-90 px-1 py-0 ${
                                  appt.status === 'confirmed' ? 'bg-amber-500 text-neutral-950' :
                                  appt.status === 'completed' ? 'bg-green-500 text-white' :
                                  appt.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-neutral-700 text-neutral-200'
                                }`}>
                                  {apptStatusLabel}
                                </Badge>
                              </div>
                              <p className="text-[10px] opacity-75 truncate">{appt.services?.name}</p>
                            </div>
                            
                            <div className="flex justify-between items-center text-[9px] font-mono opacity-80 pt-1 border-t border-current/10">
                              <span>30 min</span>
                              <span className="font-bold">{formatCurrency(appt.total_price)}</span>
                            </div>
                          </button>
                        ) : isLunch ? (
                          // Lunch break row
                          <div className="w-full flex items-center justify-center text-xs text-neutral-600 font-medium select-none italic">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Almoço
                          </div>
                        ) : !isWorking ? (
                          // Closed shifts
                          <div className="w-full flex items-center justify-center text-[10px] text-neutral-700 select-none uppercase tracking-widest font-mono">
                            Folga
                          </div>
                        ) : (
                          // Empty available slot (quick create click)
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
                            className="w-full h-full rounded-xl border border-dashed border-neutral-800 hover:border-amber-500/50 hover:bg-amber-500/[0.02] flex items-center justify-center text-neutral-700 hover:text-amber-500 transition-all group"
                          >
                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: APPOINTMENT DETAILS */}
      <Sheet 
        open={isDetailOpen} 
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedAppt(null)
        }}
        title="Ficha da Reserva"
        description="Gerencie o atendimento e os dados do cliente"
      >
        {selectedAppt && (
          <div className="py-6 space-y-6 text-zinc-900 dark:text-zinc-50 text-left">
            {/* Quick metrics */}
            <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850/80 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">✂️ Serviço</span>
                <span className="font-bold">{selectedAppt.services?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">💈 Barbeiro</span>
                <span className="font-medium">
                  {initialBarbers.find(b => b.id === selectedAppt.barber_id)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">⏰ Horário</span>
                <span className="font-mono text-amber-500 font-black text-base">
                  {new Date(selectedAppt.start_at).toISOString().substring(11, 16)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-500 font-bold">Valor Cobrado</span>
                <span className="text-lg font-black">{formatCurrency(selectedAppt.total_price)}</span>
              </div>
            </div>

            {/* Client Info */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-mono tracking-widest text-zinc-400 text-left border-b border-zinc-200 dark:border-zinc-800/40 pb-1">
                Dados do Cliente
              </h4>
              
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-550" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-zinc-500 font-mono">Nome</p>
                    <p className="text-sm font-semibold">{selectedAppt.clients?.name || 'Cliente Avulso'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-zinc-550" />
                  </div>
                  <div className="text-left flex-1 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-mono">WhatsApp</p>
                      <p className="text-sm font-semibold">{selectedAppt.clients?.phone || 'Não informado'}</p>
                    </div>
                    {selectedAppt.clients?.phone && (
                      <Button
                        onClick={() => copyToClipboard(selectedAppt.clients.phone)}
                        className="bg-zinc-250 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-850 hover:bg-zinc-200 p-2 h-8 w-8 rounded-lg"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                      </Button>
                    )}
                  </div>
                </div>

                {selectedAppt.clients?.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-zinc-550" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-zinc-500 font-mono">E-mail</p>
                      <p className="text-sm font-medium">{selectedAppt.clients.email}</p>
                    </div>
                  </div>
                )}

                {selectedAppt.notes && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center mt-1">
                      <MessageSquare className="w-4 h-4 text-zinc-550" />
                    </div>
                    <div className="text-left flex-1 bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-250 dark:border-zinc-850">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Notas do Agendamento</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">"{selectedAppt.notes}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex flex-col gap-2">
              {selectedAppt.status === 'confirmed' && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={() => handleStatusChange('completed')}
                    disabled={isUpdating}
                    className="bg-green-500 hover:bg-green-400 text-neutral-950 font-bold rounded-xl py-5"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Concluir
                  </Button>
                  
                  <Button
                    onClick={() => handleStatusChange('no_show')}
                    disabled={isUpdating}
                    className="bg-zinc-850 hover:bg-zinc-700 text-white font-bold rounded-xl py-5 border border-zinc-700"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    No-Show
                  </Button>
                </div>
              )}

              {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'no_show') && (
                <Button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isUpdating}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl py-5 mt-2"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancelar Reserva
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* MODAL 2: QUICK BOOKING CREATION */}
      <Sheet 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)}
        title="Nova Reserva Manual"
        description="Agende um cliente diretamente pelo painel (Walk-in)"
      >
        <form onSubmit={handleCreateBooking} className="py-6 space-y-4 text-zinc-900 dark:text-zinc-50 text-left">
          <div className="space-y-1 text-left">
            <label htmlFor="c_name" className="text-xs uppercase font-mono tracking-widest text-zinc-400">Nome do Cliente *</label>
            <Input
              id="c_name"
              type="text"
              placeholder="Ex: Carlos Silva"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-zinc-950 border-zinc-850 rounded-xl text-white py-5 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="c_phone" className="text-xs uppercase font-mono tracking-widest text-zinc-400">Telefone Celular *</label>
            <Input
              id="c_phone"
              type="text"
              placeholder="(11) 99999-9999"
              value={clientPhone}
              onChange={handlePhoneChange}
              maxLength={15}
              className="bg-zinc-950 border-zinc-850 rounded-xl text-white py-5 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="c_email" className="text-xs uppercase font-mono tracking-widest text-zinc-400">E-mail (Opcional)</label>
            <Input
              id="c_email"
              type="email"
              placeholder="carlos@email.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-850 rounded-xl text-white py-5 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-xs uppercase font-mono tracking-widest text-zinc-400">Barbeiro *</label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
              >
                <option value="" disabled>Selecionar</option>
                {initialBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>{barber.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs uppercase font-mono tracking-widest text-zinc-400">Horário *</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm font-mono"
              >
                <option value="" disabled>Selecionar</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs uppercase font-mono tracking-widest text-zinc-400">Serviço Principal *</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
            >
              <option value="" disabled>Selecionar</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({formatCurrency(service.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="c_notes" className="text-xs uppercase font-mono tracking-widest text-zinc-400">Notas Internas</label>
            <textarea
              id="c_notes"
              rows={2}
              placeholder="Observações ou demandas específicas..."
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isCreating}
            className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-6 mt-4 shadow-lg shadow-amber-500/10"
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
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
