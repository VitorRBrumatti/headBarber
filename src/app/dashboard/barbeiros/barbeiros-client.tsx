'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { BarberForm } from '@/components/dashboard/barber-form'
import { toggleBarberStatus, deleteBarber, getBarberWorkHours, updateBarberWorkHours } from './actions'

interface Barber {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  commission_percentage: number
}

interface BarbeirosClientProps {
  barbers: Barber[]
}

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
]

export function BarbeirosClient({ barbers }: BarbeirosClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Work Hours Shift management state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [activeScheduleBarber, setActiveScheduleBarber] = useState<Barber | null>(null)
  const [barberShifts, setBarberShifts] = useState<any[]>([])

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreateNew = () => {
    setEditingBarber(undefined)
    setSheetOpen(true)
  }

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber)
    setSheetOpen(true)
  }

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    setError('')
    startTransition(async () => {
      try {
        await toggleBarberStatus(id, currentStatus)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deletingId) return
    setError('')
    startTransition(async () => {
      try {
        await deleteBarber(deletingId)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } catch (err: any) {
        setError(err.message)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      }
    })
  }

  // Opens schedule sheet and loads their data
  const handleManageSchedule = (barber: Barber) => {
    setActiveScheduleBarber(barber)
    setError('')
    startTransition(async () => {
      try {
        const shifts = await getBarberWorkHours(barber.id)
        setBarberShifts(shifts)
        setIsScheduleOpen(true)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  // Handle shift toggle/input changes
  const handleShiftChange = (index: number, field: string, val: any) => {
    const updated = [...barberShifts]
    updated[index] = { ...updated[index], [field]: val }
    setBarberShifts(updated)
  }

  // Save shifts to database
  const handleSaveSchedule = () => {
    if (!activeScheduleBarber) return
    setError('')
    startTransition(async () => {
      try {
        await updateBarberWorkHours(activeScheduleBarber.id, barberShifts)
        setIsScheduleOpen(false)
        setActiveScheduleBarber(null)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-[#e2ded7] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-montserrat text-[25px] font-bold leading-tight tracking-tight text-[#242321] sm:text-[28px]">Barbeiros</h1>
          <p className="mt-1 text-xs text-[#69655f]">
            Equipe, comissões e horários de atendimento
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[5px] bg-[#c79a4a] px-4 text-xs font-bold text-[#171614] transition-colors hover:bg-[#d6aa5b]"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
          Novo barbeiro
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {barbers.length === 0 ? (
        <EmptyState
          title="Nenhum barbeiro cadastrado"
          description="Cadastre os barbeiros e profissionais que atendem na sua barbearia."
          action={
            <button
              onClick={handleCreateNew}
              className="bg-[#7c5809] text-white text-xs font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-[#5f4100] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Adicionar Primeiro Barbeiro
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-[#e2ded7] overflow-hidden rounded-md border border-[#e2ded7] bg-white">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-5 md:px-5"
            >
              <div className="min-w-0 flex-1 md:flex md:items-center md:gap-5">
                <div className="flex items-center gap-3 md:min-w-[190px]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e2ded7] bg-[#f2f0ec]">
                      {barber.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={barber.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-montserrat text-xs font-bold text-[#625f59]">
                          {getInitials(barber.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <h2 className="truncate font-montserrat text-sm font-bold text-[#242321]">{barber.name}</h2>
                      <span className="text-xs font-medium text-[#625e58]">{barber.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                </div>

                <div className="mt-3 min-w-0 text-left md:mt-0 md:flex-1">
                  <p className="truncate text-xs text-[#625e58]">
                    {barber.bio || 'Sem descrição cadastrada'}
                  </p>
                  <div className="mt-1">
                    <span className="text-xs text-[#625e58]">
                      Comissão: <strong className="tabular-nums text-[#242321]">{barber.commission_percentage}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[#e2ded7] pt-3 md:border-t-0 md:pt-0">
                {barber.is_active ? (
                  <button
                    onClick={() => handleManageSchedule(barber)}
                    disabled={isPending}
                    className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[5px] border border-[#d9d3ca] px-3 text-xs font-semibold text-[#473c29] transition-colors hover:bg-[#f4f1ec] md:flex-none"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
                    Expediente
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex min-h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-[5px] border border-[#e2ded7] px-3 text-xs font-semibold text-[#69655f] md:flex-none"
                  >
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Expediente
                  </button>
                )}

                <div className="flex gap-1">
                  {/* Status Toggle (Power symbol) */}
                  <button
                    onClick={() => handleToggleStatus(barber.id, barber.is_active)}
                    disabled={isPending}
                    aria-label={`${barber.is_active ? 'Desativar' : 'Ativar'} ${barber.name}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-[5px] border transition-colors ${
                      barber.is_active
                        ? 'border-[#2E7D32]/30 text-[#2E7D32] hover:bg-[#E8F5E9] hover:border-[#2E7D32]'
                        : 'border-[#c9c3b9] text-[#625f59] hover:text-[#242321] hover:border-[#242321]'
                    }`}
                    title={barber.is_active ? 'Desativar barbeiro' : 'Ativar barbeiro'}
                  >
                    <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(barber)}
                    disabled={isPending}
                    aria-label={`Editar ${barber.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#d9d3ca] text-[#625f59] transition-colors hover:bg-[#f4f1ec]"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteClick(barber.id)}
                    disabled={isPending}
                    aria-label={`Excluir ${barber.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#d9d3ca] text-[#625f59] transition-colors hover:border-[#ba1a1a] hover:text-[#ba1a1a]"
                    title="Excluir"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Sheet for Create/Edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
        description={
          editingBarber
            ? 'Atualize as informações do profissional preenchendo os campos abaixo.'
            : 'Preencha os campos abaixo para cadastrar um novo barbeiro.'
        }
      >
        <BarberForm
          barber={editingBarber}
          onSuccess={() => setSheetOpen(false)}
        />
      </Sheet>

      {/* Slide-over Sheet for Work Schedule Grade */}
      <Sheet
        open={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false)
          setActiveScheduleBarber(null)
        }}
        title="Configurar Jornada"
        description={activeScheduleBarber?.name || ''}
      >
        <div className="space-y-6 py-4 flex flex-col h-[calc(100vh-180px)] text-left">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 drawer-scroll">
            {barberShifts.length === 0 ? (
              <div className="text-center py-6 text-[#625f59] flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
                <span className="text-sm">Carregando jornada de trabalho...</span>
              </div>
            ) : (
              barberShifts.map((shift, idx) => {
                return (
                  <div
                    key={shift.id}
                    className={`bg-[#f6f5f2] rounded-xl border border-[#dedad2] p-5 transition-opacity ${
                      shift.is_active ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-[#242321] uppercase tracking-wider font-bold">
                        {WEEKDAYS[shift.day_of_week]}
                      </span>
                      
                      {/* Custom Switch Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shift.is_active}
                          onChange={(e) => handleShiftChange(idx, 'is_active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-[#dedad2] rounded-full peer peer-checked:bg-[#7c5809] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#c9c3b9] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>

                    {shift.is_active ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[#625f59] mb-1.5 font-medium">Início</label>
                          <input
                            type="time"
                            value={shift.start_time.substring(0, 5)}
                            onChange={(e) => handleShiftChange(idx, 'start_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c9c3b9] text-[#242321] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#625f59] mb-1.5 font-medium">Fim</label>
                          <input
                            type="time"
                            value={shift.end_time.substring(0, 5)}
                            onChange={(e) => handleShiftChange(idx, 'end_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c9c3b9] text-[#242321] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#625f59] mb-1.5 font-medium">Início Almoço</label>
                          <input
                            type="time"
                            value={shift.lunch_start_time ? shift.lunch_start_time.substring(0, 5) : '12:00'}
                            onChange={(e) => handleShiftChange(idx, 'lunch_start_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c9c3b9] text-[#242321] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#625f59] mb-1.5 font-medium">Fim Almoço</label>
                          <input
                            type="time"
                            value={shift.lunch_end_time ? shift.lunch_end_time.substring(0, 5) : '13:00'}
                            onChange={(e) => handleShiftChange(idx, 'lunch_end_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c9c3b9] text-[#242321] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#625f59] mt-3 font-medium">Folga programada.</p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#dedad2] bg-white shrink-0">
            <button
              onClick={handleSaveSchedule}
              disabled={isPending}
              className="w-full bg-[#7c5809] text-white text-xs font-bold py-4 rounded-lg hover:bg-[#5f4100] transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando jornada...</span>
                </>
              ) : (
                'Salvar jornada'
              )}
            </button>
          </div>
        </div>
      </Sheet>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Excluir Barbeiro"
        description="Tem certeza que deseja excluir este barbeiro? Todas as configurações deste profissional serão apagadas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}


