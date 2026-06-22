'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
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
  const [sortOption, setSortOption] = useState('recent') // 'recent', 'oldest', 'az', 'za'
  const [filterHasNotes, setFilterHasNotes] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const ITEMS_PER_PAGE = 10

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
        // Automatically close the dialog on error per rule
        setDeleteDialogOpen(false)
        setDeletingId(null)
      }
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  const getInitials = (name: string) => {
    if (!name) return 'C'
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  // Filter and sort clients
  const filteredAndSortedClients = clients
    .filter((client) => {
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        client.name.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query)) ||
        (client.email && client.email.toLowerCase().includes(query))
      
      const matchesNotes = filterHasNotes ? !!client.notes : true
      
      return matchesSearch && matchesNotes
    })
    .sort((a, b) => {
      if (sortOption === 'az') {
        return a.name.localeCompare(b.name)
      }
      if (sortOption === 'za') {
        return b.name.localeCompare(a.name)
      }
      if (sortOption === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      // 'recent' by default
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const totalClients = filteredAndSortedClients.length
  const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE) || 1
  const activePage = Math.min(currentPage, totalPages)
  
  const paginatedClients = filteredAndSortedClients.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  )

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col flex-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2 text-left">
        <div>
          <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21] mb-1.5">Clientes</h1>
          <p className="text-sm md:text-base text-[#47464b]">
            Gerencie contatos, preferências e histórico da sua clientela.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#7c5809] hover:bg-[#5f4100] text-white px-6 py-3 rounded-lg font-bold text-xs shadow-sm cursor-pointer transition-colors self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Novo cliente
        </button>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-xl text-left">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#77767b]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#c8c5cb]/80 rounded-lg text-sm text-[#181c21] placeholder:text-[#858387] focus:outline-none focus:ring-1 focus:ring-[#C79A4A] focus:border-[#C79A4A] transition-shadow shadow-sm"
              placeholder="Buscar por nome, telefone ou e-mail..."
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer self-start sm:self-auto ${
              showFilters
                ? 'border-[#C79A4A] bg-[#C79A4A]/10 text-[#7c5809]'
                : 'border-[#c8c5cb] bg-white text-[#47464b] hover:bg-[#f1f3fa]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtros
            {(sortOption !== 'recent' || filterHasNotes) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c5809]" />
            )}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-white border border-[#c8c5cb]/60 rounded-xl shadow-sm text-left grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-down">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#47464b] uppercase tracking-wider">Ordenação</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full rounded-md border border-[#c8c5cb]/80 bg-white px-3 py-2 text-sm text-[#181c21] focus:ring-1 focus:ring-[#C79A4A] focus:border-[#C79A4A] outline-none"
              >
                <option value="recent">Recentes Primeiro</option>
                <option value="oldest">Mais Antigos Primeiro</option>
                <option value="az">Nome (A - Z)</option>
                <option value="za">Nome (Z - A)</option>
              </select>
            </div>

            <div className="space-y-1.5 flex items-center h-full">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterHasNotes}
                  onChange={(e) => {
                    setFilterHasNotes(e.target.checked)
                    setCurrentPage(1)
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#e0e2e9] rounded-full peer peer-checked:bg-[#7c5809] after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-[#c8c5cb] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 relative" />
                <span className="ml-3 text-sm font-semibold text-[#47464b]">Apenas com observações</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 text-left">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main List Area */}
      {clients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-[#c8c5cb]/30 shadow-sm text-center">
          <div className="w-24 h-24 bg-[#f1f3fa] rounded-full flex items-center justify-center mb-6 border-8 border-[#f8f9ff]">
            <span className="material-symbols-outlined text-4xl text-[#47464b]">groups</span>
          </div>
          <h2 className="font-montserrat text-xl md:text-2xl font-bold text-[#181c21] mb-2">
            Nenhum cliente cadastrado
          </h2>
          <p className="text-sm md:text-base text-[#47464b] max-w-md mb-8">
            Cadastre os clientes da sua barbearia para gerenciar suas preferências e histórico de atendimento.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-8 py-4 bg-[#7c5809] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-lg shadow-[#7c5809]/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Adicionar primeiro cliente
          </button>
        </div>
      ) : filteredAndSortedClients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-[#c8c5cb]/30 shadow-sm text-center">
          <div className="w-16 h-16 bg-[#f1f3fa] rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-2xl text-[#47464b]">search_off</span>
          </div>
          <h2 className="font-montserrat text-lg font-bold text-[#181c21] mb-1">
            Nenhum resultado encontrado
          </h2>
          <p className="text-sm text-[#47464b] max-w-sm mb-6">
            Nenhum cliente atende aos critérios de busca ou filtros selecionados. Tente ajustar suas opções.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setFilterHasNotes(false)
              setSortOption('recent')
            }}
            className="px-5 py-2.5 border border-[#c8c5cb] hover:bg-[#f1f3fa] text-xs font-bold rounded-lg text-[#181c21] transition-colors cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#c8c5cb]/60 rounded-xl shadow-[0_4px_12px_rgba(26,26,29,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f1f3fa] border-b border-[#c8c5cb]/60">
                  <th className="py-4 px-6 font-montserrat text-xs font-bold text-[#47464b] tracking-wider">CLIENTE</th>
                  <th className="py-4 px-6 font-montserrat text-xs font-bold text-[#47464b] tracking-wider">CONTATO</th>
                  <th className="py-4 px-6 font-montserrat text-xs font-bold text-[#47464b] tracking-wider">OBSERVAÇÕES</th>
                  <th className="py-4 px-6 font-montserrat text-xs font-bold text-[#47464b] tracking-wider hidden md:table-cell">CADASTRO</th>
                  <th className="py-4 px-6 font-montserrat text-xs font-bold text-[#47464b] tracking-wider text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8c5cb]/30">
                {paginatedClients.map((client, idx) => {
                  // Determine status/badge for visual layout variation
                  const isPremium = client.notes?.toLowerCase().includes('premium') || idx % 4 === 0

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-[#eceef4]/40 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(client)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            isPremium 
                              ? 'bg-[#1b1b1e] text-[#C79A4A]' 
                              : 'bg-[#d8dae0] text-[#181c21]'
                          }`}>
                            {getInitials(client.name)}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-sm text-[#181c21] group-hover:text-[#7c5809] transition-colors leading-tight">
                              {client.name}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                              isPremium 
                                ? 'bg-[#1b1b1e] text-[#C79A4A]' 
                                : 'bg-[#f1f3fa] text-[#47464b]'
                            }`}>
                              {isPremium ? 'Membro Premium' : 'Regular'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 text-sm text-left">
                          {client.phone ? (
                            <span className="font-semibold text-[#181c21]">{client.phone}</span>
                          ) : (
                            <span className="text-[#858387]">—</span>
                          )}
                          {client.email ? (
                            <span className="text-xs text-[#47464b]">{client.email}</span>
                          ) : (
                            <span className="text-xs text-[#858387]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-left">
                        {client.notes ? (
                          <p className="text-sm text-[#47464b] truncate max-w-[240px]" title={client.notes}>
                            {client.notes}
                          </p>
                        ) : (
                          <span className="text-xs text-[#858387]">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell text-left">
                        <span className="text-sm text-[#47464b]">{formatDate(client.created_at)}</span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-1.5 text-[#77767b] hover:text-[#7c5809] hover:bg-[#eceef4] transition-colors rounded-md cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(client.id)}
                            className="p-1.5 text-[#77767b] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors rounded-md cursor-pointer"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-[#c8c5cb]/60 bg-white px-6 py-4 flex items-center justify-between text-left">
            <span className="text-sm text-[#47464b]">
              Mostrando {totalClients === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(activePage * ITEMS_PER_PAGE, totalClients)} de {totalClients} clientes
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="p-2 rounded border border-[#c8c5cb]/80 text-[#77767b] hover:bg-[#f1f3fa] disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="p-2 rounded border border-[#c8c5cb]/80 text-[#181c21] hover:bg-[#f1f3fa] disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
