'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Power, Calendar, Clock, Check, AlertTriangle, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-400">
          Total: {barbers.length} {barbers.length === 1 ? 'barbeiro' : 'barbeiros'}
        </h2>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Barbeiro
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {barbers.length === 0 ? (
        <EmptyState
          title="Nenhum barbeiro cadastrado"
          description="Cadastre os barbeiros e profissionais que atendem na sua barbearia."
          action={
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Barbeiro
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <Card key={barber.id} className="relative overflow-hidden p-6 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-300">
              <div>
                <div className="flex items-center gap-4">
                  {/* Avatar Container */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {barber.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={barber.avatar_url}
                        alt={barber.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                        {getInitials(barber.name)}
                      </span>
                    )}
                  </div>

                  {/* Header Text */}
                  <div className="space-y-1 text-left">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-none">
                      {barber.name}
                    </h3>
                    <Badge variant={barber.is_active ? 'default' : 'secondary'} className="mt-1">
                      {barber.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                {/* Bio text */}
                <p className="mt-4 text-sm text-left text-zinc-500 dark:text-zinc-400 line-clamp-3 min-h-[3.75rem]">
                  {barber.bio || 'Sem descrição ou biografia cadastrada para este profissional.'}
                </p>

                {/* Commission Rate */}
                <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Percent className="h-3.5 w-3.5 text-amber-500" />
                  <span>Comissão: <strong className="text-zinc-350">{barber.commission_percentage || 0}%</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleManageSchedule(barber)}
                  disabled={isPending}
                  title="Configurar expediente de trabalho"
                  className="text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleStatus(barber.id, barber.is_active)}
                  disabled={isPending}
                  title={barber.is_active ? 'Desativar barbeiro' : 'Ativar barbeiro'}
                  className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  <Power className={`h-4 w-4 ${barber.is_active ? 'text-emerald-500' : 'text-zinc-400'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(barber)}
                  disabled={isPending}
                  title="Editar barbeiro"
                  className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(barber.id)}
                  disabled={isPending}
                  title="Excluir barbeiro"
                  className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
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
        title={`Jornada de Trabalho — ${activeScheduleBarber?.name}`}
        description="Defina os dias, horários de expediente e de intervalo de almoço do profissional."
      >
        <div className="space-y-6 py-6 text-left text-white max-h-[75vh] overflow-y-auto pr-1">
          {barberShifts.length === 0 ? (
            <div className="text-center py-6 text-neutral-500 flex flex-col items-center gap-2">
              <Clock className="w-8 h-8 text-neutral-600" />
              <span className="text-sm">Carregando jornada de trabalho...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {barberShifts.map((shift, idx) => {
                return (
                  <div key={shift.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-sm text-zinc-100">{WEEKDAYS[shift.day_of_week]}</span>
                      
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shift.is_active}
                          onChange={(e) => handleShiftChange(idx, 'is_active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all peer-checked:bg-amber-500" />
                        <span className="ml-2 text-xs font-semibold text-zinc-350">{shift.is_active ? 'Trabalha' : 'Folga'}</span>
                      </label>
                    </div>

                    {shift.is_active && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/40">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block">Jornada</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={shift.start_time.substring(0, 5)}
                              onChange={(e) => handleShiftChange(idx, 'start_time', `${e.target.value}:00`)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                            <span className="text-zinc-650 text-xs">às</span>
                            <input
                              type="time"
                              value={shift.end_time.substring(0, 5)}
                              onChange={(e) => handleShiftChange(idx, 'end_time', `${e.target.value}:00`)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block">Intervalo de Almoço</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={shift.lunch_start_time.substring(0, 5)}
                              onChange={(e) => handleShiftChange(idx, 'lunch_start_time', `${e.target.value}:00`)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                            <span className="text-zinc-650 text-xs">às</span>
                            <input
                              type="time"
                              value={shift.lunch_end_time.substring(0, 5)}
                              onChange={(e) => handleShiftChange(idx, 'lunch_end_time', `${e.target.value}:00`)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSaveSchedule}
            disabled={isPending}
            className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl py-5"
          >
            {isPending ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </div>
            ) : (
              'Salvar Grade de Horários'
            )}
          </Button>
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
