'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Power, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { BarberForm } from '@/components/dashboard/barber-form'
import { toggleBarberStatus, deleteBarber } from './actions'

interface Barber {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
}

interface BarbeirosClientProps {
  barbers: Barber[]
}

export function BarbeirosClient({ barbers }: BarbeirosClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
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
                  <div className="space-y-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-none">
                      {barber.name}
                    </h3>
                    <Badge variant={barber.is_active ? 'default' : 'secondary'} className="mt-1">
                      {barber.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                {/* Bio text */}
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 min-h-[3.75rem]">
                  {barber.bio || 'Sem descrição ou biografia cadastrada para este profissional.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end gap-2">
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
