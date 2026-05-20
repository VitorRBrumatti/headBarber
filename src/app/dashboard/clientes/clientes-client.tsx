'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Search, User, Phone, Mail, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { ClientForm } from '@/components/dashboard/client-form'
import { deleteClient } from './actions'

interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

interface ClientesClientProps {
  clients: Client[]
}

export function ClientesClient({ clients }: ClientesClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreateNew = () => {
    setEditingClient(undefined)
    setSheetOpen(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setSheetOpen(true)
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
        await deleteClient(deletingId)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase()
    return (
      client.name.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query)) ||
      (client.email && client.email.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button onClick={handleCreateNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Os clientes cadastrados aparecerão aqui. Adicione o seu primeiro cliente agora."
          action={
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Cliente
            </Button>
          }
        />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={`Nenhum resultado para a busca "${searchQuery}". Tente pesquisar por outro termo.`}
          action={
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-zinc-900 dark:text-zinc-50">{client.name}</p>
                        {client.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5 max-w-[200px] truncate" title={client.notes}>
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{client.phone}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.email ? (
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                        <Mail className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="truncate max-w-[180px]">{client.email}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{formatDate(client.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        disabled={isPending}
                        title="Editar cliente"
                        className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(client.id)}
                        disabled={isPending}
                        title="Excluir cliente"
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
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        description={
          editingClient
            ? 'Atualize as informações de contato do cliente.'
            : 'Preencha os campos abaixo para cadastrar um novo cliente na sua lista.'
        }
      >
        <ClientForm
          client={editingClient}
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
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? O histórico associado a este cliente também poderá ser afetado. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
