'use client'

import { useState, useTransition } from 'react'
import { ServiceForm } from '@/components/dashboard/service-form'
import { Dialog } from '@/components/ui/dialog'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  formatDurationRange,
  formatPriceRange,
} from './service-validation'
import type { ServiceBarber, ServiceCatalogItem } from './service-types'
import { deleteService, toggleServiceStatus } from './actions'

interface ServicesClientProps {
  services: ServiceCatalogItem[]
  barbers: ServiceBarber[]
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir.'
}

export function ServicesClient({
  services,
  barbers,
}: ServicesClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingService, setEditingService] =
    useState<ServiceCatalogItem | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function createNew() {
    setEditingService(undefined)
    setSheetOpen(true)
  }

  function edit(service: ServiceCatalogItem) {
    setEditingService(service)
    setSheetOpen(true)
  }

  function toggleStatus(service: ServiceCatalogItem) {
    setError('')
    startTransition(async () => {
      try {
        await toggleServiceStatus(service.id, service.isActive)
      } catch (toggleError) {
        setError(errorMessage(toggleError))
      }
    })
  }

  function confirmDelete() {
    if (!deletingId) return
    setError('')
    startTransition(async () => {
      try {
        await deleteService(deletingId)
        setDeletingId(null)
      } catch (deleteError) {
        setError(errorMessage(deleteError))
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-montserrat text-3xl font-extrabold text-[#181c21]">
            Serviços
          </h1>
          <p className="mt-2 text-sm text-[#47464b]">
            Configure disponibilidade, preço e duração para cada profissional.
          </p>
        </div>
        <button
          type="button"
          onClick={createNew}
          className="rounded-lg bg-[#7c5809] px-6 py-3 text-xs font-bold text-white"
        >
          Novo serviço
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-2xl border border-[#c8c5cb]/30 bg-white px-6 py-20 text-center">
          <h2 className="text-xl font-bold text-[#181c21]">
            Nenhum serviço cadastrado
          </h2>
          <p className="mt-2 text-sm text-[#47464b]">
            Crie o primeiro serviço e vincule ao menos um profissional.
          </p>
          <button
            type="button"
            onClick={createNew}
            className="mt-6 rounded-xl bg-[#7c5809] px-6 py-3 text-sm font-bold text-white"
          >
            Adicionar serviço
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const availableCount = service.assignments.filter(
              (assignment) => assignment.isAvailable,
            ).length
            const availabilityLabel =
              availableCount === 0
                ? 'Sem profissionais'
                : `${availableCount} ${availableCount === 1 ? 'profissional' : 'profissionais'}`

            return (
              <article
                key={service.id}
                className={`flex flex-col overflow-hidden rounded-2xl border border-[#e0e2e9] bg-white shadow-sm ${
                  service.isActive ? '' : 'opacity-70'
                }`}
              >
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-montserrat font-bold text-[#181c21]">
                      {service.name}
                    </h2>
                    <span className="rounded-md bg-[#f1f3fa] px-2 py-1 text-[10px] font-bold uppercase">
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-5 text-xl font-extrabold text-[#181c21]">
                    {formatPriceRange(service.assignments)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#47464b]">
                    {formatDurationRange(service.assignments)}
                  </p>
                  <p className="mt-3 text-xs text-[#77767b]">
                    {availabilityLabel}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-[#e0e2e9] bg-[#f8f9ff] px-6 py-4">
                  <label className="flex items-center gap-1 text-xs font-semibold text-[#47464b]">
                    <Switch
                      checked={service.isActive}
                      disabled={isPending}
                      onCheckedChange={() => toggleStatus(service)}
                    />
                    Catálogo ativo
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => edit(service)}
                      disabled={isPending}
                      aria-label={`Editar ${service.name}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(service.id)}
                      disabled={isPending}
                      className="text-red-700"
                      aria-label={`Excluir ${service.name}`}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        description="Defina o catálogo e a configuração de cada profissional."
      >
        <ServiceForm
          service={editingService}
          barbers={barbers}
          onSuccess={() => setSheetOpen(false)}
        />
      </Sheet>

      <Dialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Excluir Serviço"
        description="Agendamentos históricos podem impedir a exclusão. Se isso acontecer, desative o serviço."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
