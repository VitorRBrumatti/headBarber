'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
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

const getAddOnDescription = (name: string) => {
  const normalized = name.toLowerCase()
  if (normalized.includes('sobrancelha')) {
    return 'Alinhamento perfeito e limpeza dos fios indesejados para valorizar o olhar.'
  }
  if (normalized.includes('selagem')) {
    return 'Tratamento para redução de volume e alinhamento dos fios com brilho intenso.'
  }
  if (normalized.includes('hidrata')) {
    return 'Reposição de nutrientes e água para cabelos ou pele ressecados ou danificados.'
  }
  if (normalized.includes('pele') || normalized.includes('facial')) {
    return 'Remoção rápida de impurezas e revitalização facial pós-barba.'
  }
  if (normalized.includes('lavagem') || normalized.includes('lavar')) {
    return 'Shampoo especial e massagem capilar.'
  }
  return 'Item adicional para complementar e melhorar sua experiência no atendimento.'
}

const getAddOnIcon = (name: string) => {
  const normalized = name.toLowerCase()
  if (normalized.includes('sobrancelha')) return 'face_retouching_natural'
  if (normalized.includes('selagem')) return 'spa'
  if (normalized.includes('hidrata')) return 'water_drop'
  if (normalized.includes('pele') || normalized.includes('facial')) return 'clean_hands'
  if (normalized.includes('lavagem') || normalized.includes('lavar')) return 'wash'
  return 'extension'
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
        setDeleteDialogOpen(false)
        setDeletingId(null)
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
    <div className="p-6 md:p-8 space-y-6 flex flex-col flex-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 text-left">
        <div>
          <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21] mb-2">Adicionais</h1>
          <p className="text-sm md:text-base text-[#47464b]">
            Crie extras para aumentar o valor de cada atendimento.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-[#7c5809] text-white text-xs font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Novo adicional
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 text-left">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {addOns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-[#c8c5cb]/30 mt-8 shadow-sm text-center">
          <div className="w-24 h-24 bg-[#f1f3fa] rounded-full flex items-center justify-center mb-6 border-8 border-[#f8f9ff]">
            <span className="material-symbols-outlined text-4xl text-[#47464b]">dry_cleaning</span>
          </div>
          <h2 className="font-montserrat text-xl md:text-2xl font-bold text-[#181c21] mb-2">
            Nenhum adicional cadastrado
          </h2>
          <p className="text-sm md:text-base text-[#47464b] max-w-md mb-8">
            Adicione os serviços adicionais oferecidos na sua barbearia para começar a receber agendamentos. Exemplos: Design de Sobrancelha, Selagem Térmica, Hidratação.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-8 py-4 bg-[#7c5809] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-lg shadow-[#7c5809]/10"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Adicionar primeiro adicional
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addOns.map((addOn) => {
            const is_active = addOn.is_active
            return (
              <div
                key={addOn.id}
                className={`bg-white rounded-xl p-6 shadow-[0_4px_12px_rgba(26,26,29,0.04)] border border-[#e0e2e9] flex flex-col hover:border-[#7c5809] transition-all duration-300 ${
                  !is_active ? 'opacity-75 grayscale-[20%]' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-full bg-[#f1f3fa] flex items-center justify-center ${
                    is_active ? 'text-[#7c5809]' : 'text-[#47464b]'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">
                      {getAddOnIcon(addOn.name)}
                    </span>
                  </div>
                  {/* Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addOn.is_active}
                      onChange={() => handleToggleStatus(addOn.id, addOn.is_active)}
                      disabled={isPending}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[#e0e2e9] rounded-full peer peer-checked:bg-[#7c5809] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#c8c5cb] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
                <h3 className="font-montserrat text-lg font-bold text-[#181c21] mb-1 text-left">
                  {addOn.name}
                </h3>
                <p className="text-sm text-[#47464b] line-clamp-2 mb-4 flex-grow text-left">
                  {getAddOnDescription(addOn.name)}
                </p>
                <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e0e2e9]">
                  <div className="text-left">
                    <span className="text-[10px] text-[#47464b] block mb-1 uppercase tracking-wider font-semibold">Valor</span>
                    <span className={`font-montserrat text-lg font-bold ${
                      is_active ? 'text-[#7c5809]' : 'text-[#47464b]'
                    }`}>
                      {formatPrice(addOn.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[#47464b] text-xs font-semibold bg-[#f1f3fa] px-3 py-1.5 rounded-full">
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      {formatDuration(addOn.duration_minutes)}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(addOn)}
                        disabled={isPending}
                        className="text-[#47464b] hover:text-black transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(addOn.id)}
                        disabled={isPending}
                        className="text-[#47464b] hover:text-[#ba1a1a] transition-colors"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add New Placeholder Card */}
          <button
            onClick={handleCreateNew}
            className="bg-[#eceef4] border-2 border-dashed border-[#c8c5cb] rounded-xl flex flex-col items-center justify-center p-8 hover:bg-[#e6e8ef] hover:border-[#C79A4A] hover:text-[#C79A4A] transition-all group min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#e0e2e9] flex items-center justify-center mb-3 group-hover:bg-[#C79A4A]/20 transition-colors">
              <span className="material-symbols-outlined text-[#77767b] group-hover:text-[#C79A4A]">add</span>
            </div>
            <span className="font-montserrat text-sm font-bold text-[#47464b] group-hover:text-[#C79A4A]">
              Adicionar Adicional
            </span>
          </button>
        </div>
      )}

      {/* Slide-over Sheet for Create/Edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingAddOn ? 'Editar Adicional' : 'Novo Adicional'}
        description={
          editingAddOn
            ? 'Configure as opções para seus serviços.'
            : 'Configure as opções para seus serviços.'
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

