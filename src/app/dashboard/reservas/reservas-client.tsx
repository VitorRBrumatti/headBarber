'use client'

import { useState, useTransition } from 'react'
import { 
  Briefcase, Calendar, Clock, Search, SlidersHorizontal, User, 
  MessageSquare, Phone, Mail, Copy, Check, Info, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { updateAppointmentStatus } from '../agenda/actions'

interface ReservasClientProps {
  initialAppointments: any[]
}

export function ReservasClient({ initialAppointments }: ReservasClientProps) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Detail modal state
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [isUpdating, startUpdating] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')

  // Filter and search logic
  const filteredAppointments = appointments.filter((appt) => {
    const clientName = appt.clients?.name || ''
    const clientPhone = appt.clients?.phone || ''
    const matchesSearch = 
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientPhone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))

    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Action status changer
  const handleStatusChange = (apptId: string, status: string) => {
    setErrorMsg('')
    startUpdating(async () => {
      try {
        await updateAppointmentStatus(apptId, status)
        
        // Update local state reactively
        setAppointments(prev => 
          prev.map(a => a.id === apptId ? { ...a, status } : a)
        )
        
        setIsDetailOpen(false)
        setSelectedAppt(null)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Format start_at date
  const formatDateTime = (startAtStr: string) => {
    const dateObj = new Date(startAtStr)
    const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    })
    const timeFormatted = startAtStr.substring(11, 16)
    return { dateFormatted, timeFormatted }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Histórico de Reservas</h1>
          <p className="text-sm text-neutral-400">Gerencie todos os agendamentos realizados no estabelecimento</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 bg-neutral-900 border border-neutral-800/85 p-4 rounded-2xl shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Pesquisar por nome ou celular do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-950 border-neutral-850 rounded-xl text-white pl-10 py-5 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-neutral-450 md:inline hidden" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
            <option value="no_show">Faltas (No-Show)</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS CARDS / LISTING */}
      {filteredAppointments.length === 0 ? (
        <Card className="bg-neutral-900 border-neutral-800/80 p-16 text-center text-neutral-500 rounded-2xl flex flex-col items-center justify-center">
          <Briefcase className="w-12 h-12 text-neutral-700 mb-2" />
          <span className="text-base font-semibold">Nenhuma reserva encontrada.</span>
          <span className="text-xs text-neutral-600 mt-1">Nenhum agendamento corresponde aos filtros aplicados.</span>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAppointments.map((appt) => {
            const { dateFormatted, timeFormatted } = formatDateTime(appt.start_at)
            
            // Status style
            let badgeStyle = 'bg-neutral-950 border-neutral-800 text-neutral-400'
            let statusLabel = 'Pendente'

            switch (appt.status) {
              case 'confirmed':
                badgeStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                statusLabel = 'Confirmado'
                break
              case 'completed':
                badgeStyle = 'bg-green-500/10 border-green-500/30 text-green-500'
                statusLabel = 'Concluído'
                break
              case 'cancelled':
                badgeStyle = 'bg-red-500/10 border-red-500/30 text-red-500'
                statusLabel = 'Cancelado'
                break
              case 'no_show':
                badgeStyle = 'bg-neutral-800 border-neutral-700 text-neutral-400'
                statusLabel = 'Faltou (No-Show)'
                break
            }

            return (
              <div 
                key={appt.id}
                className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 hover:border-neutral-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:scale-[1.005]"
              >
                {/* Client info & timing */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Calendar Widget */}
                  <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl text-center min-w-[75px] font-mono flex flex-col items-center">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{timeFormatted}</span>
                    <span className="text-xs font-bold text-white mt-1">{dateFormatted}</span>
                  </div>

                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-lg tracking-tight">{appt.clients?.name || 'Cliente Avulso'}</h3>
                      <Badge className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeStyle}`}>
                        {statusLabel}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 font-medium">
                      <span>✂️ {appt.services?.name}</span>
                      <span>💈 {appt.barbers?.name}</span>
                      {appt.clients?.phone && <span className="font-mono text-neutral-500">📞 {appt.clients.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Price and Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-none border-neutral-800/60 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Valor Cobrado</span>
                    <p className="text-xl font-black text-white mt-0.5">{formatCurrency(appt.total_price)}</p>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedAppt(appt)
                      setErrorMsg('')
                      setIsDetailOpen(true)
                    }}
                    className="bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 text-white rounded-xl py-5 px-4 text-xs font-semibold"
                  >
                    <Info className="w-4 h-4 mr-1 text-amber-500" />
                    Gerenciar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* DETAIL DRAWER MODAL */}
      <Sheet 
        open={isDetailOpen} 
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedAppt(null)
        }}
        title="Ficha do Agendamento"
        description="Visualize dados e configure o status da reserva"
      >
        {selectedAppt && (
          <div className="py-6 space-y-6 text-zinc-900 dark:text-zinc-50 text-left">
            {/* Quick specs */}
            <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850/80 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">✂️ Serviço</span>
                <span className="font-bold">{selectedAppt.services?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">💈 Barbeiro</span>
                <span className="font-medium">{selectedAppt.barbers?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">⏰ Horário</span>
                <span className="font-mono text-amber-500 font-black text-sm">
                  {formatDateTime(selectedAppt.start_at).timeFormatted} no dia {formatDateTime(selectedAppt.start_at).dateFormatted}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-500 font-bold">Valor Cobrado</span>
                <span className="text-lg font-black">{formatCurrency(selectedAppt.total_price)}</span>
              </div>
            </div>

            {/* Client specifications */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-mono tracking-widest text-zinc-400 text-left border-b border-zinc-200 dark:border-zinc-800/40 pb-1">
                Contato do Cliente
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
                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Notas da Reserva</p>
                      <p className="text-xs text-zinc-650 dark:text-zinc-300 italic">"{selectedAppt.notes}"</p>
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
                    onClick={() => handleStatusChange(selectedAppt.id, 'completed')}
                    disabled={isUpdating}
                    className="bg-green-500 hover:bg-green-400 text-neutral-950 font-bold rounded-xl py-5"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Concluir
                  </Button>
                  
                  <Button
                    onClick={() => handleStatusChange(selectedAppt.id, 'no_show')}
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
                  onClick={() => handleStatusChange(selectedAppt.id, 'cancelled')}
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
    </div>
  )
}
