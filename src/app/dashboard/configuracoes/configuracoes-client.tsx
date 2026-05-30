'use client'

import { useState, useEffect, useTransition } from 'react'
import { 
  Settings, Clock, Bell, Calendar, Plus, Trash2, 
  Check, AlertTriangle, Shield, CalendarDays, ClipboardList
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  updateBarbershopSettingsAction, createBarberBlock, 
  getBarberBlocks, deleteBarberBlock 
} from './actions'

interface SettingsClientProps {
  initialSettings?: {
    whatsapp_reminder_hours?: number
    slot_interval_minutes?: number
    default_start_time?: string | null
    default_end_time?: string | null
    default_lunch_start?: string | null
    default_lunch_end?: string | null
  } | null
  barbers: {
    id: string
    name: string
  }[]
}

export function ConfiguracoesClient({ initialSettings, barbers }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'blocked'>('agenda')

  // Form State: settings
  const [whatsappReminderHours, setWhatsappReminderHours] = useState(initialSettings?.whatsapp_reminder_hours ?? 2)
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(initialSettings?.slot_interval_minutes ?? 30)
  const [defaultStartTime, setDefaultStartTime] = useState((initialSettings?.default_start_time || '09:00:00').substring(0, 5))
  const [defaultEndTime, setDefaultEndTime] = useState((initialSettings?.default_end_time || '19:00:00').substring(0, 5))
  const [defaultLunchStart, setDefaultLunchStart] = useState((initialSettings?.default_lunch_start || '12:00:00').substring(0, 5))
  const [defaultLunchEnd, setDefaultLunchEnd] = useState((initialSettings?.default_lunch_end || '13:00:00').substring(0, 5))

  // Form State: blocks
  const [selectedBarberBlock, setSelectedBarberBlock] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')
  
  // List of active blocks for chosen barber
  const [activeBlocks, setActiveBlocks] = useState<any[]>([])
  const [isLoadingBlocks, startLoadingBlocks] = useTransition()

  const [isSaving, startSaving] = useTransition()
  const [isBlocking, startBlocking] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Reactively fetch calendar blocks when the barber changes in the dropdown
  useEffect(() => {
    if (!selectedBarberBlock) {
      setActiveBlocks([])
      return
    }

    fetchBlocksForBarber(selectedBarberBlock)
  }, [selectedBarberBlock])

  const fetchBlocksForBarber = (barberId: string) => {
    startLoadingBlocks(async () => {
      try {
        const blocks = await getBarberBlocks(barberId)
        setActiveBlocks(blocks)
      } catch (err: any) {
        console.error('Error fetching calendar blocks:', err)
      }
    })
  }

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    startSaving(async () => {
      try {
        await updateBarbershopSettingsAction({
          whatsappReminderHours: Number(whatsappReminderHours),
          slotIntervalMinutes: Number(slotIntervalMinutes),
          defaultStartTime: `${defaultStartTime}:00`,
          defaultEndTime: `${defaultEndTime}:00`,
          defaultLunchStart: `${defaultLunchStart}:00`,
          defaultLunchEnd: `${defaultLunchEnd}:00`
        })
        setSuccessMsg('Configurações salvas com sucesso!')
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  // Add Calendar Block
  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBarberBlock || !blockStart || !blockEnd) {
      setErrorMsg('Preencha os campos obrigatórios para o bloqueio.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')

    // Parse input strings to ISO timestamps
    const startIso = new Date(blockStart).toISOString()
    const endIso = new Date(blockEnd).toISOString()

    startBlocking(async () => {
      try {
        await createBarberBlock(selectedBarberBlock, startIso, endIso, blockReason)
        setSuccessMsg('Bloqueio de agenda criado com sucesso!')
        
        // Reset block form
        setBlockStart('')
        setBlockEnd('')
        setBlockReason('')

        // Reload
        fetchBlocksForBarber(selectedBarberBlock)
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  // Delete Calendar Block
  const handleDeleteBlock = (blockId: string) => {
    setErrorMsg('')
    setSuccessMsg('')

    startBlocking(async () => {
      try {
        await deleteBarberBlock(blockId)
        setSuccessMsg('Bloqueio excluído com sucesso!')
        
        // Reload
        if (selectedBarberBlock) {
          fetchBlocksForBarber(selectedBarberBlock)
        }
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (err: any) {
        setErrorMsg(err.message)
      }
    })
  }

  // format date time
  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleString('pt-BR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Configurações do Sistema</h1>
        <p className="text-sm text-neutral-400">Gerencie parâmetros de agendamento, expedientes e regras da barbearia</p>
      </div>

      {/* Navigation tabs */}
      <div className="flex space-x-2 bg-neutral-900 border border-neutral-800/80 p-1.5 rounded-xl max-w-sm">
        <button
          onClick={() => {
            setActiveTab('agenda')
            setErrorMsg('')
            setSuccessMsg('')
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'agenda' ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Agenda & Slots
        </button>

        <button
          onClick={() => {
            setActiveTab('blocked')
            setErrorMsg('')
            setSuccessMsg('')
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'blocked' ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4 inline mr-1" />
          Bloqueios Excepcionais
        </button>
      </div>

      {/* Success / Error feedbacks */}
      {successMsg && (
        <div className="max-w-xl bg-green-500/10 border border-green-500/30 text-green-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="max-w-xl bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: AGENDA & SLOTS SETTINGS */}
      {activeTab === 'agenda' && (
        <Card className="bg-neutral-900 border-neutral-800/80 shadow-2xl max-w-2xl rounded-2xl">
          <CardHeader className="border-b border-neutral-800 pb-4 text-left">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              Parâmetros de Agenda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Slot Interval */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs uppercase font-mono tracking-widest text-neutral-400">Intervalo dos Slots *</label>
                  <select
                    value={slotIntervalMinutes}
                    onChange={(e) => setSlotIntervalMinutes(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos (Recomendado)</option>
                    <option value={60}>1 hora</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 font-medium">Define a frequência de slots livres na página pública.</p>
                </div>

                {/* Reminder hours */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs uppercase font-mono tracking-widest text-neutral-400">Lembrete WhatsApp (Antecedência) *</label>
                  <select
                    value={whatsappReminderHours}
                    onChange={(e) => setWhatsappReminderHours(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
                  >
                    <option value={1}>1 hora antes</option>
                    <option value={2}>2 horas antes (Recomendado)</option>
                    <option value={4}>4 horas antes</option>
                    <option value={24}>24 horas antes</option>
                  </select>
                  <p className="text-[10px] text-neutral-500 font-medium">Antecedência da mensagem de lembrete do WhatsApp.</p>
                </div>
              </div>

              {/* Default Commercial shift */}
              <div className="space-y-4 pt-4 border-t border-neutral-800/40">
                <h4 className="text-xs uppercase font-mono tracking-widest text-amber-500 font-bold text-left">
                  Expediente Padrão para novos profissionais
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Início de Expediente</label>
                    <input
                      type="time"
                      value={defaultStartTime}
                      onChange={(e) => setDefaultStartTime(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Término de Expediente</label>
                    <input
                      type="time"
                      value={defaultEndTime}
                      onChange={(e) => setDefaultEndTime(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Início de Almoço</label>
                    <input
                      type="time"
                      value={defaultLunchStart}
                      onChange={(e) => setDefaultLunchStart(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Término de Almoço</label>
                    <input
                      type="time"
                      value={defaultLunchEnd}
                      onChange={(e) => setDefaultLunchEnd(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-5 px-8 shadow-lg shadow-amber-500/10"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: EXCEPTIONAL CALENDAR BLOCKS */}
      {activeTab === 'blocked' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Creation Block Form */}
          <Card className="bg-neutral-900 border-neutral-800/80 shadow-2xl rounded-2xl h-fit">
            <CardHeader className="border-b border-neutral-800 pb-4 text-left">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Bloquear Horário Excepcional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddBlock} className="space-y-4">
                
                <div className="space-y-1.5 text-left">
                  <label className="text-xs uppercase font-mono tracking-widest text-neutral-400">Escolha o Barbeiro *</label>
                  <select
                    value={selectedBarberBlock}
                    onChange={(e) => setSelectedBarberBlock(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
                  >
                    <option value="" disabled>Selecionar Barbeiro</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Início do Bloqueio *</label>
                    <input
                      type="datetime-local"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">Fim do Bloqueio *</label>
                    <input
                      type="datetime-local"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-semibold">Motivo do Bloqueio</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Férias, Folga médica, Compromisso externo..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-white text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isBlocking}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-5 shadow-md shadow-amber-500/10"
                >
                  {isBlocking ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Inserindo Bloqueio...</span>
                    </div>
                  ) : (
                    'Adicionar Bloqueio de Agenda'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List of Active Blocks */}
          <Card className="bg-neutral-900 border-neutral-800/80 shadow-2xl rounded-2xl">
            <CardHeader className="border-b border-neutral-800 pb-4 text-left">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Bloqueios Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!selectedBarberBlock ? (
                <div className="text-center py-12 text-neutral-500 italic text-sm">
                  Selecione um barbeiro no painel ao lado para visualizar e gerenciar seus bloqueios ativos.
                </div>
              ) : isLoadingBlocks ? (
                <div className="text-center py-12 text-neutral-500 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Consultando bloqueios...</span>
                </div>
              ) : activeBlocks.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 italic text-sm">
                  Nenhum bloqueio excepcional de data encontrado para este profissional.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl flex justify-between items-center hover:border-neutral-750 transition-all gap-4"
                    >
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-white">
                            {block.reason || 'Bloqueio de Agenda'}
                          </span>
                          <Badge variant="secondary" className="text-[9px] uppercase tracking-widest px-1.5 py-0 bg-neutral-900 border-neutral-800 text-neutral-400">
                            Bloqueado
                          </Badge>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          {formatDateTime(block.start_at)} às {formatDateTime(block.end_at)}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={isBlocking}
                        className="bg-red-500/10 hover:bg-red-500/20 hover:text-red-500 border border-red-500/25 p-2 h-9 w-9 rounded-xl flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
