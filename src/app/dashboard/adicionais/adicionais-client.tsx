'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Power, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { AddOnForm } from '@/components/dashboard/add-on-form'
import { toggleAddOnStatus, deleteAddOn } from './actions'

interface AddOn {
  id: string
  name: string
  price: number
  duration_minutes: number
  is_active: boolean
}

interface AdicionaisClientProps {
  addOns: AddOn[]
}

export function AdicionaisClient({ addOns }: AdicionaisClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] = useState<AddOn | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreateNew = () => {
    setEditingAddOn(undefined)
    setSheetOpen(true)
  }

  const handleEdit = (addOn: AddOn) => {
    setEditingAddOn(addOn)
    setSheetOpen(true)
  }

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    setError('')
    startTransition(async () => {
      try {
        await toggleAddOnStatus(id, currentStatus)
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
        await deleteAddOn(deletingId)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '—'
    if (minutes < 60) return `+${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `+${hours}h ${mins}m` : `+${hours}h`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-400">
          Total: {addOns.length} {addOns.length === 1 ? 'adicional' : 'adicionais'}
        </h2>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Adicional
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {addOns.length === 0 ? (
        <EmptyState
          title="Nenhum adicional cadastrado"
          description="Adicionais são extras que o cliente pode escolher no agendamento, como sobrancelha, hidratação, pigmentação, selagem, etc."
          action={
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Adicional
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Duração Extra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addOns.map((addOn) => (
                <TableRow key={addOn.id}>
                  <TableCell className="font-medium">
                    <p className="text-zinc-900 dark:text-zinc-50">{addOn.name}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                      <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                      {formatPrice(addOn.price)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      {formatDuration(addOn.duration_minutes)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={addOn.is_active ? 'default' : 'secondary'}>
                      {addOn.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(addOn.id, addOn.is_active)}
                        disabled={isPending}
                        title={addOn.is_active ? 'Desativar adicional' : 'Ativar adicional'}
                        className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                      >
                        <Power className={`h-4 w-4 ${addOn.is_active ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(addOn)}
                        disabled={isPending}
                        title="Editar adicional"
                        className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(addOn.id)}
                        disabled={isPending}
                        title="Excluir adicional"
                        className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Slide-over Sheet for Create/Edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingAddOn ? 'Editar Adicional' : 'Novo Adicional'}
        description={
          editingAddOn
            ? 'Atualize as informações do adicional preenchendo os campos abaixo.'
            : 'Preencha os campos abaixo para cadastrar um novo adicional.'
        }
      >
        <AddOnForm
          addOn={editingAddOn}
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
        title="Excluir Adicional"
        description="Tem certeza que deseja excluir este adicional? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
