'use client'

import { useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { ServiceForm } from '@/components/dashboard/service-form'
import { toggleServiceStatus, deleteService } from './actions'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  is_active: boolean
}

interface ServicesClientProps {
  services: Service[]
}

export function ServicesClient({ services }: ServicesClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreateNew = () => {
    setEditingService(undefined)
    setSheetOpen(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setSheetOpen(true)
  }

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    setError('')
    startTransition(async () => {
      try {
        await toggleServiceStatus(id, currentStatus)
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
        await deleteService(deletingId)
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
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col flex-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 text-left">
        <div>
          <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21] mb-2">Serviços</h1>
          <p className="text-sm md:text-base text-[#47464b]">
            Configure os serviços que seus clientes poderão agendar.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-[#7c5809] text-white text-xs font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo serviço
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 text-left">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {services.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-[#c8c5cb]/30 mt-8 shadow-sm text-center">
          <div className="w-24 h-24 bg-[#f1f3fa] rounded-full flex items-center justify-center mb-6 border-8 border-[#f8f9ff]">
            <span className="material-symbols-outlined text-4xl text-[#47464b]">dry_cleaning</span>
          </div>
          <h2 className="font-montserrat text-xl md:text-2xl font-bold text-[#181c21] mb-2">
            Nenhum serviço cadastrado
          </h2>
          <p className="text-sm md:text-base text-[#47464b] max-w-md mb-8">
            Adicione os serviços oferecidos na sua barbearia para começar a receber agendamentos. Exemplos: Corte, Barba, Sobrancelha, Pigmentação.
          </p>
          <button
            onClick={handleCreateNew}
            className="px-8 py-4 bg-[#7c5809] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#5f4100] transition-colors shadow-lg shadow-[#7c5809]/10"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-2xl border border-[#e0e2e9] shadow-sm flex flex-col overflow-hidden hover:-translate-y-0.5 transition-all duration-300 ${
                !service.is_active ? 'opacity-75 grayscale-[20%]' : ''
              }`}
            >
              <div className="p-6 flex-1 text-left flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4 gap-2">
                  <h3 className="font-montserrat text-base font-bold text-[#181c21] line-clamp-2 leading-tight">
                    {service.name}
                  </h3>
                  {service.is_active ? (
                    <span className="px-2 py-1 bg-[#E6F4EA] text-[#137333] text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0">
                      Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-[#e0e2e9] text-[#47464b] text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0">
                      Inativo
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-montserrat text-xl md:text-2xl font-extrabold text-[#181c21]">
                    {formatPrice(service.price)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[#47464b] mt-2">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span className="text-xs font-semibold">{formatDuration(service.duration_minutes)}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#e0e2e9] bg-[#f8f9ff] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={service.is_active}
                      onChange={() => handleToggleStatus(service.id, service.is_active)}
                      disabled={isPending}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[#e0e2e9] rounded-full peer peer-checked:bg-[#2E7D32] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#c8c5cb] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEdit(service)}
                    disabled={isPending}
                    className="text-[#47464b] hover:text-black transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(service.id)}
                    disabled={isPending}
                    className="text-[#47464b] hover:text-[#ba1a1a] transition-colors"
                    title="Excluir"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Placeholder Card */}
          <button
            onClick={handleCreateNew}
            className="bg-[#eceef4] border-2 border-dashed border-[#c8c5cb] rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-[#e6e8ef] hover:border-[#C79A4A] hover:text-[#C79A4A] transition-all group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#e0e2e9] flex items-center justify-center mb-3 group-hover:bg-[#C79A4A]/20 transition-colors">
              <span className="material-symbols-outlined text-[#77767b] group-hover:text-[#C79A4A]">add</span>
            </div>
            <span className="font-montserrat text-sm font-bold text-[#47464b] group-hover:text-[#C79A4A]">
              Adicionar Serviço
            </span>
          </button>
        </div>
      )}

      {/* Slide-over Sheet for Create/Edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        description={
          editingService
            ? 'Atualize as informações do serviço preenchendo os campos abaixo.'
            : 'Preencha os campos abaixo para cadastrar um novo serviço.'
        }
      >
        <ServiceForm
          service={editingService}
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
        title="Excluir Serviço"
        description="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}

