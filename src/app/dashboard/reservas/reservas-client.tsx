'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
  
  // Detail sheet state
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [isUpdating, startUpdating] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')

  // Filter and search logic
  const filteredAppointments = appointments.filter((appt) => {
    const clientName = (appt.clients as any)?.name || ''
    const clientPhone = (appt.clients as any)?.phone || ''
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
        
        // Update local state
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

  // Format start_at date UTC-safe
  const formatDateTimeProto = (startAtStr: string) => {
    const dateObj = new Date(startAtStr)
    const day = dateObj.getUTCDate()
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const monthStr = months[dateObj.getUTCMonth()]
    
    // Day and Month formatted (e.g. 24 Out)
    const dayAndMonth = `${day} ${monthStr}`
    
    // Time formatted (e.g. 14:30)
    const time = startAtStr.substring(11, 16)
    
    // Full date formatted for drawer (e.g. 24 de Outubro)
    const fullMonths = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    const fullDateStr = `${day} de ${fullMonths[dateObj.getUTCMonth()]}`

    return { dayAndMonth, time, fullDateStr }
  }

  // Get client initials
  const getInitials = (name: string) => {
    if (!name) return 'C'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Filter pills configurations
  const filterPills = [
    { label: 'Todos', value: 'all' },
    { label: 'Confirmados', value: 'confirmed' },
    { label: 'Concluídos', value: 'completed' },
    { label: 'Cancelados', value: 'cancelled' },
    { label: 'No-show', value: 'no_show' },
  ]

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header Section */}
      <div className="text-left">
        <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21] mb-1.5">
          Histórico de Reservas
        </h1>
        <p className="text-sm text-[#47464b] font-medium">
          Gerencie todos os agendamentos realizados no estabelecimento.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative w-full max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#77767b] text-xl">
            search
          </span>
          <input 
            className="w-full bg-white border border-[#c8c5cb]/40 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-colors font-body-md text-xs font-semibold text-[#181c21] placeholder:text-[#858387]" 
            placeholder="Pesquisar por nome ou celular do cliente..." 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 pt-1">
          {filterPills.map((pill) => {
            const active = statusFilter === pill.value
            return (
              <button
                key={pill.value}
                onClick={() => setStatusFilter(pill.value)}
                className={`px-4 py-2 rounded-full font-semibold text-[11px] tracking-wide transition-colors border cursor-pointer ${
                  active
                    ? 'bg-[#1b1b1e] text-white border-[#1b1b1e]'
                    : 'bg-white text-[#47464b] border-[#c8c5cb]/40 hover:bg-[#eceef4]'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Booking List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white border border-[#eceef4] p-16 text-center text-[#77767b] rounded-2xl flex flex-col items-center justify-center shadow-xs max-w-md mx-auto my-8">
          <span className="material-symbols-outlined text-4xl text-[#858387] mb-3">event_busy</span>
          <span className="text-sm font-bold text-[#181c21]">Nenhuma reserva encontrada</span>
          <span className="text-xs text-[#47464b] mt-1 font-medium">Nenhum agendamento corresponde aos filtros aplicados.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const { dayAndMonth, time, fullDateStr } = formatDateTimeProto(appt.start_at)
            const clientName = (appt.clients as any)?.name || 'Cliente Avulso'
            const clientPhone = (appt.clients as any)?.phone || 'Sem telefone'
            const serviceName = (appt.services as any)?.name || 'Serviço'
            const barberName = (appt.barbers as any)?.name || 'Profissional'
            
            // Status style configs
            let stripeBg = 'bg-zinc-400'
            let badgeBgClass = 'bg-zinc-100 text-zinc-800'
            let statusText = 'Pendente'

            switch (appt.status) {
              case 'confirmed':
                stripeBg = 'bg-blue-500'
                badgeBgClass = 'bg-blue-100 text-blue-800'
                statusText = 'Confirmada'
                break
              case 'completed':
                stripeBg = 'bg-green-500'
                badgeBgClass = 'bg-green-100 text-green-800'
                statusText = 'Concluída'
                break
              case 'cancelled':
                stripeBg = 'bg-[#ba1a1a]'
                badgeBgClass = 'bg-red-50 text-red-800 border border-red-200/50'
                statusText = 'Cancelada'
                break
              case 'no_show':
                stripeBg = 'bg-[#e65100]'
                badgeBgClass = 'bg-orange-100 text-orange-850'
                statusText = 'No-show'
                break
            }

            return (
              <div 
                key={appt.id}
                className="bg-white rounded-xl custom-shadow-card flex relative overflow-hidden group hover:border-[#c8c5cb] border border-transparent transition-all"
              >
                {/* Left stripe */}
                <div className={`status-stripe ${stripeBg} absolute left-0 top-0 bottom-0`}></div>

                <div className="flex flex-1 p-5 items-center justify-between flex-col md:flex-row gap-4">
                  {/* Left block: Date/Time */}
                  <div className="flex md:flex-col items-center justify-center min-w-[90px] border-r border-[#eceef4] pr-5 mr-1 text-left w-full md:w-auto">
                    <span className="font-montserrat text-sm font-extrabold text-[#181c21] uppercase">
                      {dayAndMonth}
                    </span>
                    <span className="text-[10px] font-bold text-[#47464b] mt-0.5 md:mt-1 ml-2 md:ml-0">
                      {time}
                    </span>
                  </div>

                  {/* Main Grid Details */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                    <div>
                      <h3 className={`font-montserrat font-bold text-sm mb-1 ${appt.status === 'cancelled' || appt.status === 'completed' ? 'line-through text-[#77767b]' : 'text-black'}`}>
                        {clientName}
                      </h3>
                      <p className="text-[11px] text-[#47464b] flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-sm">content_cut</span> 
                        {serviceName}
                      </p>
                    </div>

                    <div className="flex flex-col justify-center">
                      <p className="text-[11px] text-[#47464b] flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-sm">person</span> 
                        {barberName}
                      </p>
                      <p className="text-[10px] text-[#47464b] font-mono flex items-center gap-1 mt-1 font-semibold">
                        <span className="material-symbols-outlined text-sm">call</span> 
                        {clientPhone}
                      </p>
                    </div>

                    <div className="flex flex-col justify-center md:items-end">
                      <span className={`font-montserrat text-sm font-extrabold ${appt.status === 'cancelled' ? 'line-through text-[#77767b]' : 'text-black'}`}>
                        {formatCurrency(appt.total_price)}
                      </span>
                      {/* Status Badge */}
                      <div className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${badgeBgClass}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div> 
                        {statusText}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="md:ml-5 md:pl-5 border-t md:border-t-0 md:border-l border-[#eceef4] pt-3 md:pt-0 flex items-center justify-end w-full md:w-auto">
                    <button 
                      onClick={() => {
                        setSelectedAppt(appt)
                        setErrorMsg('')
                        setIsDetailOpen(true)
                      }}
                      className="bg-transparent border border-[#77767b]/50 text-[#181c21] hover:bg-[#eceef4] text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors cursor-pointer w-full md:w-auto text-center"
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* DETAIL DRAWER SHEET */}
      <Sheet 
        open={isDetailOpen} 
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedAppt(null)
        }}
        title="Detalhes da Reserva"
        description="Ficha financeira e controle do agendamento"
      >
        {selectedAppt && (() => {
          const { time, fullDateStr } = formatDateTimeProto(selectedAppt.start_at)
          const clientName = (selectedAppt.clients as any)?.name || 'Cliente Avulso'
          const clientPhone = (selectedAppt.clients as any)?.phone || 'Sem telefone'
          const serviceName = (selectedAppt.services as any)?.name || 'Serviço'
          const barberName = (selectedAppt.barbers as any)?.name || 'Profissional'
          
          let alertBannerClass = 'bg-zinc-50 border-zinc-200 text-zinc-800'
          let alertIcon = 'schedule'
          let alertLabel = 'Agendamento'

          switch (selectedAppt.status) {
            case 'confirmed':
              alertBannerClass = 'bg-blue-50 border-blue-200 text-blue-800'
              alertIcon = 'schedule'
              alertLabel = 'Confirmada'
              break
            case 'completed':
              alertBannerClass = 'bg-green-50 border-green-200 text-green-800'
              alertIcon = 'check_circle'
              alertLabel = 'Concluída'
              break
            case 'cancelled':
              alertBannerClass = 'bg-red-50 border-red-200 text-red-800'
              alertIcon = 'cancel'
              alertLabel = 'Cancelada'
              break
            case 'no_show':
              alertBannerClass = 'bg-orange-50 border-orange-200 text-orange-800'
              alertIcon = 'person_off'
              alertLabel = 'No-show'
              break
          }

          return (
            <div className="py-4 space-y-6 text-zinc-950 text-left">
              {/* Status Alert Banner */}
              <div className={`border rounded-lg p-3.5 flex items-center gap-3 ${alertBannerClass}`}>
                <span className="material-symbols-outlined text-xl">{alertIcon}</span>
                <div>
                  <p className="text-[9px] uppercase tracking-wider font-bold opacity-80">Status Atual</p>
                  <p className="text-xs font-bold">{alertLabel}</p>
                </div>
              </div>

              {/* Client specifications */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-[#77767b] uppercase tracking-wider border-b border-[#eceef4] pb-2">
                  Cliente
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#eceef4] flex items-center justify-center text-[#181c21] font-bold text-sm border border-[#c8c5cb]/30">
                    {getInitials(clientName)}
                  </div>
                  <div>
                    <h4 className="font-montserrat text-sm font-bold text-black leading-tight">{clientName}</h4>
                    <p className="text-xs text-[#47464b] font-mono mt-0.5">{clientPhone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#eceef4]/60">
                  <div>
                    <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Tipo de Registro</p>
                    <p className="text-xs text-black font-semibold">Cliente Estabelecimento</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider mb-0.5">Celular Principal</p>
                    <p className="text-xs text-black font-mono">{clientPhone}</p>
                  </div>
                </div>
              </section>

              {/* Service Details */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-[#77767b] uppercase tracking-wider border-b border-[#eceef4] pb-2">
                  Serviço Agendado
                </h3>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-black font-bold">{serviceName}</p>
                    <p className="text-[10px] text-[#47464b] font-semibold mt-0.5">Duração: 30 minutos</p>
                  </div>
                  <p className="text-sm font-extrabold text-black">{formatCurrency(selectedAppt.total_price)}</p>
                </div>

                <div className="bg-[#f8f9ff] rounded-xl p-4 space-y-3.5 border border-[#eceef4]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#77767b] text-lg">calendar_today</span>
                    <div>
                      <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider">Data e Hora</p>
                      <p className="text-xs text-black font-bold mt-0.5">{fullDateStr}, às {time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#77767b] text-lg">content_cut</span>
                    <div>
                      <p className="text-[9px] text-[#77767b] font-bold uppercase tracking-wider">Profissional</p>
                      <p className="text-xs text-black font-bold mt-0.5">{barberName}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Financial Summary */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-[#77767b] uppercase tracking-wider border-b border-[#eceef4] pb-2">
                  Resumo Financeiro
                </h3>
                <div className="space-y-2 text-xs font-semibold text-[#47464b]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedAppt.total_price)}</span>
                  </div>
                  <div className="flex justify-between text-[#ba1a1a]">
                    <span>Descontos</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#eceef4] mt-2 text-black font-bold">
                    <span className="font-montserrat text-sm font-extrabold">Total Cobrado</span>
                    <span className="font-montserrat text-sm font-extrabold">{formatCurrency(selectedAppt.total_price)}</span>
                  </div>
                  
                  {selectedAppt.status === 'completed' && (
                    <div className="flex justify-end mt-2">
                      <span className="text-[9px] font-bold bg-[#eceef4] px-2.5 py-1 rounded-md text-[#77767b] uppercase tracking-wider">
                        Pago no Estabelecimento
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {errorMsg && (
                <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Drawer Actions */}
              <div className="p-6 border-t border-[#eceef4] bg-white pt-6 flex flex-col gap-2">
                {selectedAppt.status === 'confirmed' ? (
                  <>
                    <button 
                      onClick={() => handleStatusChange(selectedAppt.id, 'completed')}
                      disabled={isUpdating}
                      className="w-full bg-[#1b5e20] hover:bg-[#1b5e20]/90 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Marcar como Concluído
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button 
                        onClick={() => handleStatusChange(selectedAppt.id, 'no_show')}
                        disabled={isUpdating}
                        className="w-full bg-transparent border border-[#77767b]/50 text-[#181c21] hover:bg-[#eceef4] font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">person_off</span>
                        No-show
                      </button>
                      <button 
                        onClick={() => handleStatusChange(selectedAppt.id, 'cancelled')}
                        disabled={isUpdating}
                        className="w-full bg-transparent border border-[#ba1a1a]/40 text-[#ba1a1a] hover:bg-[#ffdad6]/20 font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">cancel</span>
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <button 
                    disabled
                    className="w-full bg-[#eceef4] text-[#77767b] font-bold py-3.5 rounded-xl cursor-not-allowed text-xs uppercase tracking-wider text-center"
                  >
                    Atendimento Encerrado
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
