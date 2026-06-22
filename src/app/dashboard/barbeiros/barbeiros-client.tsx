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
    <div className="p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21] mb-2">Barbeiros</h1>
          <p className="text-sm md:text-base text-[#47464b]">
            Gerencie sua equipe, comissões e horários de atendimento.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-[#7c5809] text-white text-xs font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Novo barbeiro
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2">
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
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className={`bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#e0e2e9] flex flex-col justify-between relative group hover:border-[#c8c5cb] transition-colors ${
                !barber.is_active ? 'opacity-75 grayscale-[20%]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#eceef4] overflow-hidden shrink-0 flex items-center justify-center border border-[#e0e2e9]">
                      {barber.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={barber.avatar_url}
                          alt={barber.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-bold text-[#47464b] font-montserrat">
                          {getInitials(barber.name)}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-montserrat text-lg font-bold text-[#181c21]">{barber.name}</h3>
                      {barber.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span className="text-xs font-semibold leading-none">Ativo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e0e2e9] text-[#47464b] mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span className="text-xs font-semibold leading-none">Inativo</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex-1 text-left">
                  <p className="text-sm text-[#47464b] mb-3 line-clamp-2 min-h-[2.5rem]">
                    {barber.bio || 'Sem descrição ou biografia cadastrada para este profissional.'}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-[#f8f9ff] p-2 rounded-lg border border-[#e0e2e9]">
                    <span className="material-symbols-outlined text-[#7c5809] text-[18px]">percent</span>
                    <span className="text-xs font-semibold text-[#181c21]">
                      Comissão: <span className="text-[#7c5809] font-bold">{barber.commission_percentage}%</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e0e2e9] flex items-center justify-between gap-2">
                {barber.is_active ? (
                  <button
                    onClick={() => handleManageSchedule(barber)}
                    disabled={isPending}
                    className="flex-1 bg-[#ffcd77]/20 text-[#7c5809] hover:bg-[#ffcd77]/30 transition-colors py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Expediente
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-[#e0e2e9] text-[#47464b] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    Expediente
                  </button>
                )}

                <div className="flex gap-2">
                  {/* Status Toggle (Power symbol) */}
                  <button
                    onClick={() => handleToggleStatus(barber.id, barber.is_active)}
                    disabled={isPending}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                      barber.is_active
                        ? 'border-[#2E7D32]/30 text-[#2E7D32] hover:bg-[#E8F5E9] hover:border-[#2E7D32]'
                        : 'border-[#c8c5cb] text-[#47464b] hover:text-[#181c21] hover:border-[#181c21]'
                    }`}
                    title={barber.is_active ? 'Desativar barbeiro' : 'Ativar barbeiro'}
                  >
                    <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(barber)}
                    disabled={isPending}
                    className="w-9 h-9 rounded-lg border border-[#c8c5cb] text-[#47464b] hover:text-[#181c21] hover:border-[#181c21] flex items-center justify-center transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteClick(barber.id)}
                    disabled={isPending}
                    className="w-9 h-9 rounded-lg border border-[#c8c5cb] text-[#47464b] hover:text-[#ba1a1a] hover:border-[#ba1a1a] flex items-center justify-center transition-colors"
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
              <div className="text-center py-6 text-[#47464b] flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
                <span className="text-sm">Carregando jornada de trabalho...</span>
              </div>
            ) : (
              barberShifts.map((shift, idx) => {
                return (
                  <div
                    key={shift.id}
                    className={`bg-[#f8f9ff] rounded-xl border border-[#e0e2e9] p-5 transition-opacity ${
                      shift.is_active ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-[#181c21] uppercase tracking-wider font-bold">
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
                        <div className="w-10 h-5 bg-[#e0e2e9] rounded-full peer peer-checked:bg-[#7c5809] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#c8c5cb] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>

                    {shift.is_active ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[#47464b] mb-1.5 font-medium">Início</label>
                          <input
                            type="time"
                            value={shift.start_time.substring(0, 5)}
                            onChange={(e) => handleShiftChange(idx, 'start_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c8c5cb] text-[#181c21] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#47464b] mb-1.5 font-medium">Fim</label>
                          <input
                            type="time"
                            value={shift.end_time.substring(0, 5)}
                            onChange={(e) => handleShiftChange(idx, 'end_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c8c5cb] text-[#181c21] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#47464b] mb-1.5 font-medium">Início Almoço</label>
                          <input
                            type="time"
                            value={shift.lunch_start_time ? shift.lunch_start_time.substring(0, 5) : '12:00'}
                            onChange={(e) => handleShiftChange(idx, 'lunch_start_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c8c5cb] text-[#181c21] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#47464b] mb-1.5 font-medium">Fim Almoço</label>
                          <input
                            type="time"
                            value={shift.lunch_end_time ? shift.lunch_end_time.substring(0, 5) : '13:00'}
                            onChange={(e) => handleShiftChange(idx, 'lunch_end_time', `${e.target.value}:00`)}
                            className="w-full bg-white border border-[#c8c5cb] text-[#181c21] text-sm rounded-lg px-3 py-2 focus:border-[#7c5809] focus:ring-1 focus:ring-[#7c5809] outline-none transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#47464b] mt-3 font-medium">Folga programada.</p>
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

          <div className="pt-4 border-t border-[#e0e2e9] bg-white shrink-0">
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


