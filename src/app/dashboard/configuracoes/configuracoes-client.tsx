'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, CalendarClock, CalendarDays, Check, ChevronDown, Clock3, ListChecks, LoaderCircle, PlusCircle, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateBarbershopSettingsAction, createBarberBlock, getBarberBlocks, deleteBarberBlock } from './actions'

interface SettingsClientProps {
  initialSettings?: {
    whatsapp_reminder_hours?: number
    slot_interval_minutes?: number
    default_start_time?: string | null
    default_end_time?: string | null
    default_lunch_start?: string | null
    default_lunch_end?: string | null
  } | null
  barbers: { id: string; name: string }[]
}

interface BarberBlock {
  id: string
  reason?: string | null
  start_at: string
  end_at: string
}

const fieldLabelClassName = 'block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-[#47464b]'
const controlClassName = 'h-12 w-full rounded-lg border border-[#c8c5cb] bg-[#f8f9ff] px-4 font-inter text-sm text-[#181c21] outline-none transition-colors focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/15 disabled:cursor-not-allowed disabled:opacity-60'
const cardClassName = 'rounded-xl border border-[#e0e2e9] bg-white shadow-[0_4px_12px_rgba(26,26,29,0.04)]'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

export function ConfiguracoesClient({ initialSettings, barbers }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'blocked'>('agenda')
  const [whatsappReminderHours, setWhatsappReminderHours] = useState(initialSettings?.whatsapp_reminder_hours ?? 2)
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(initialSettings?.slot_interval_minutes ?? 30)
  const [defaultStartTime, setDefaultStartTime] = useState((initialSettings?.default_start_time || '09:00:00').substring(0, 5))
  const [defaultEndTime, setDefaultEndTime] = useState((initialSettings?.default_end_time || '19:00:00').substring(0, 5))
  const [defaultLunchStart, setDefaultLunchStart] = useState((initialSettings?.default_lunch_start || '12:00:00').substring(0, 5))
  const [defaultLunchEnd, setDefaultLunchEnd] = useState((initialSettings?.default_lunch_end || '13:00:00').substring(0, 5))
  const [selectedBarberBlock, setSelectedBarberBlock] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [activeBlocks, setActiveBlocks] = useState<BarberBlock[]>([])
  const [isLoadingBlocks, startLoadingBlocks] = useTransition()
  const [isSaving, startSaving] = useTransition()
  const [isBlocking, startBlocking] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchBlocksForBarber = useCallback((barberId: string) => {
    startLoadingBlocks(async () => {
      try {
        const blocks = await getBarberBlocks(barberId)
        setActiveBlocks(blocks)
      } catch (error: unknown) {
        console.error('Error fetching calendar blocks:', error)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedBarberBlock) {
      return
    }
    fetchBlocksForBarber(selectedBarberBlock)
  }, [fetchBlocksForBarber, selectedBarberBlock])

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault()
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
          defaultLunchEnd: `${defaultLunchEnd}:00`,
        })
        setSuccessMsg('Configurações salvas com sucesso!')
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error))
      }
    })
  }

  const handleAddBlock = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedBarberBlock || !blockStart || !blockEnd) {
      setErrorMsg('Preencha os campos obrigatórios para o bloqueio.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    const startIso = new Date(blockStart).toISOString()
    const endIso = new Date(blockEnd).toISOString()
    startBlocking(async () => {
      try {
        await createBarberBlock(selectedBarberBlock, startIso, endIso, blockReason)
        setSuccessMsg('Bloqueio de agenda criado com sucesso!')
        setBlockStart('')
        setBlockEnd('')
        setBlockReason('')
        fetchBlocksForBarber(selectedBarberBlock)
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error))
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    setErrorMsg('')
    setSuccessMsg('')
    startBlocking(async () => {
      try {
        await deleteBarberBlock(blockId)
        setSuccessMsg('Bloqueio excluído com sucesso!')
        if (selectedBarberBlock) fetchBlocksForBarber(selectedBarberBlock)
        setTimeout(() => setSuccessMsg(''), 4000)
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error))
      }
    })
  }

  const formatDateTime = (isoStr: string) => new Date(isoStr).toLocaleString('pt-BR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })

  const selectTab = (tab: 'agenda' | 'blocked') => {
    setActiveTab(tab)
    setErrorMsg('')
    setSuccessMsg('')
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="mb-7">
          <h1 className="font-montserrat text-2xl font-bold tracking-[-0.02em] text-[#181c21] sm:text-[32px]">Configurações</h1>
          <p className="mt-2 max-w-2xl font-inter text-sm leading-6 text-[#47464b] sm:text-base">Defina regras de agenda, horários e bloqueios da barbearia.</p>
        </header>

        <div role="tablist" aria-label="Seções das configurações" className="mb-8 flex gap-7 overflow-x-auto border-b border-[#e0e2e9]">
          <button id="agenda-tab" type="button" role="tab" aria-controls="agenda-panel" aria-selected={activeTab === 'agenda'} onClick={() => selectTab('agenda')} className={`relative shrink-0 px-0.5 pb-3 font-inter text-sm font-semibold transition-colors ${activeTab === 'agenda' ? 'text-[#181c21] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[#C79A4A]' : 'text-[#77767b] hover:text-[#181c21]'}`}>Agenda & Horários</button>
          <button id="blocked-tab" type="button" role="tab" aria-controls="blocked-panel" aria-selected={activeTab === 'blocked'} onClick={() => selectTab('blocked')} className={`relative shrink-0 px-0.5 pb-3 font-inter text-sm font-semibold transition-colors ${activeTab === 'blocked' ? 'text-[#181c21] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[#C79A4A]' : 'text-[#77767b] hover:text-[#181c21]'}`}>Bloqueios Excepcionais</button>
        </div>

        {successMsg ? <div role="status" className="mb-6 flex max-w-2xl items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-inter text-sm font-semibold text-emerald-800"><Check className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{successMsg}</span></div> : null}
        {errorMsg ? <div role="alert" className="mb-6 flex max-w-2xl items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm font-semibold text-red-800"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{errorMsg}</span></div> : null}

        {activeTab === 'agenda' ? (
          <div id="agenda-panel" role="tabpanel" aria-labelledby="agenda-tab">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className={cardClassName} aria-labelledby="scheduling-rules-title">
                  <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3fa] text-[#181c21]"><ListChecks className="h-5 w-5" aria-hidden="true" /></span><h2 id="scheduling-rules-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">Regras de Agendamento</h2></div>
                  <div className="space-y-6 p-5 sm:p-6">
                    <label className="block space-y-2"><span className={fieldLabelClassName}>Intervalo dos slots</span><span className="relative block"><select value={slotIntervalMinutes} onChange={(event) => setSlotIntervalMinutes(Number(event.target.value))} className={`${controlClassName} appearance-none pr-10`}><option value={15}>15 minutos</option><option value={30}>30 minutos (Recomendado)</option><option value={60}>1 hora</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77767b]" aria-hidden="true" /></span><span className="block font-inter text-xs leading-5 text-[#77767b]">Define a frequência de slots livres na página pública.</span></label>
                    <label className="block space-y-2"><span className={fieldLabelClassName}>Lembrete WhatsApp (antecedência)</span><span className="relative block"><select value={whatsappReminderHours} onChange={(event) => setWhatsappReminderHours(Number(event.target.value))} className={`${controlClassName} appearance-none pr-10`}><option value={1}>1 hora antes</option><option value={2}>2 horas antes (Recomendado)</option><option value={4}>4 horas antes</option><option value={24}>24 horas antes</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77767b]" aria-hidden="true" /></span><span className="block font-inter text-xs leading-5 text-[#77767b]">Antecedência da mensagem de lembrete do WhatsApp.</span></label>
                  </div>
                </section>

                <section className={cardClassName} aria-labelledby="business-hours-title">
                  <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3fa] text-[#181c21]"><Clock3 className="h-5 w-5" aria-hidden="true" /></span><h2 id="business-hours-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">Horários de Funcionamento</h2></div>
                  <div className="space-y-6 p-5 sm:p-6">
                    <div><h3 className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-[#47464b]">Expediente padrão</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={fieldLabelClassName}>Início</span><input type="time" value={defaultStartTime} onChange={(event) => setDefaultStartTime(event.target.value)} className={controlClassName} /></label><label className="space-y-2"><span className={fieldLabelClassName}>Fim</span><input type="time" value={defaultEndTime} onChange={(event) => setDefaultEndTime(event.target.value)} className={controlClassName} /></label></div></div>
                    <div className="border-t border-[#eceef4] pt-5"><h3 className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-[#47464b]">Horário de almoço</h3><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={fieldLabelClassName}>Início</span><input type="time" value={defaultLunchStart} onChange={(event) => setDefaultLunchStart(event.target.value)} className={controlClassName} /></label><label className="space-y-2"><span className={fieldLabelClassName}>Fim</span><input type="time" value={defaultLunchEnd} onChange={(event) => setDefaultLunchEnd(event.target.value)} className={controlClassName} /></label></div></div>
                  </div>
                </section>
              </div>
              <div className="flex justify-end border-t border-[#e0e2e9] pt-6"><Button type="submit" disabled={isSaving} className="h-12 gap-2 rounded-lg px-6 font-inter text-sm">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{isSaving ? 'Salvando...' : 'Salvar configurações'}</Button></div>
            </form>
          </div>
        ) : (
          <div id="blocked-panel" role="tabpanel" aria-labelledby="blocked-tab">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <section className={`${cardClassName} h-fit lg:col-span-5`} aria-labelledby="new-block-title">
                <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6"><PlusCircle className="h-5 w-5 text-[#C79A4A]" aria-hidden="true" /><h2 id="new-block-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">Novo Bloqueio</h2></div>
                <form onSubmit={handleAddBlock} className="space-y-5 p-5 sm:p-6">
                  <label className="block space-y-2"><span className={fieldLabelClassName}>Barbeiro</span><span className="relative block"><select value={selectedBarberBlock} onChange={(event) => setSelectedBarberBlock(event.target.value)} className={`${controlClassName} appearance-none pr-10`}><option value="" disabled>Selecionar barbeiro</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77767b]" aria-hidden="true" /></span></label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-2"><span className={fieldLabelClassName}>Início do bloqueio</span><input type="datetime-local" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} className={controlClassName} /></label><label className="space-y-2"><span className={fieldLabelClassName}>Fim do bloqueio</span><input type="datetime-local" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} className={controlClassName} /></label></div>
                  <label className="block space-y-2"><span className={fieldLabelClassName}>Motivo / observação</span><textarea rows={3} placeholder="Ex: Férias, folga médica, compromisso externo..." value={blockReason} onChange={(event) => setBlockReason(event.target.value)} className={`${controlClassName} min-h-28 resize-none py-3`} /></label>
                  <Button type="submit" disabled={isBlocking} className="h-12 w-full gap-2 rounded-lg font-inter text-sm">{isBlocking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarClock className="h-4 w-4" aria-hidden="true" />}{isBlocking ? 'Registrando bloqueio...' : 'Registrar bloqueio'}</Button>
                </form>
              </section>

              <section className={`${cardClassName} min-h-[420px] lg:col-span-7`} aria-labelledby="active-blocks-title">
                <div className="flex items-center justify-between gap-4 border-b border-[#eceef4] px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#77767b]" aria-hidden="true" /><h2 id="active-blocks-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">Bloqueios Ativos</h2></div>{selectedBarberBlock && !isLoadingBlocks ? <span className="rounded-full border border-[#e0e2e9] bg-[#eceef4] px-3 py-1 font-inter text-[11px] font-semibold text-[#47464b]">{activeBlocks.length} {activeBlocks.length === 1 ? 'bloqueio' : 'bloqueios'}</span> : null}</div>
                <div className="p-5 sm:p-6">
                  {!selectedBarberBlock ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><CalendarDays className="mb-3 h-9 w-9 text-[#c8c5cb]" aria-hidden="true" /><h3 className="font-montserrat text-base font-semibold text-[#181c21]">Selecione um barbeiro</h3><p className="mt-2 max-w-sm font-inter text-sm leading-6 text-[#77767b]">Escolha um profissional no painel ao lado para visualizar e gerenciar seus bloqueios.</p></div>
                  ) : isLoadingBlocks ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-[#77767b]"><LoaderCircle className="h-7 w-7 animate-spin text-[#C79A4A]" aria-hidden="true" /><span className="font-inter text-sm">Consultando bloqueios...</span></div>
                  ) : activeBlocks.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><Check className="mb-3 h-9 w-9 text-[#c8c5cb]" aria-hidden="true" /><h3 className="font-montserrat text-base font-semibold text-[#181c21]">Nenhum bloqueio ativo</h3><p className="mt-2 max-w-sm font-inter text-sm leading-6 text-[#77767b]">Este profissional não possui bloqueios excepcionais cadastrados.</p></div>
                  ) : (
                    <div className="space-y-3">{activeBlocks.map((block) => <article key={block.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#e0e2e9] bg-[#f8f9ff] p-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eceef4] text-[#47464b]"><CalendarClock className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-inter text-sm font-semibold text-[#181c21]">{block.reason || 'Bloqueio de agenda'}</h3><span className="rounded-full border border-[#e0e2e9] bg-white px-2 py-1 font-inter text-[9px] font-semibold uppercase tracking-[0.08em] text-[#47464b]">Bloqueado</span></div><p className="mt-1 font-inter text-xs leading-5 text-[#77767b]">{formatDateTime(block.start_at)} — {formatDateTime(block.end_at)}</p></div></div><button type="button" aria-label="Excluir bloqueio" onClick={() => handleDeleteBlock(block.id)} disabled={isBlocking} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#77767b] transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></article>)}</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
