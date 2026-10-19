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
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[#e2ded7] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-montserrat text-[25px] font-bold leading-tight tracking-tight text-[#242321] sm:text-[28px]">
            Serviços
          </h1>
          <p className="mt-1 text-xs text-[#69655f]">
            Preço, duração e disponibilidade por profissional
          </p>
        </div>
        <button
          type="button"
          onClick={createNew}
          className="min-h-10 rounded-[5px] bg-[#c79a4a] px-4 text-xs font-bold text-[#171614] transition-colors hover:bg-[#d6aa5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a641f]"
        >
          Novo serviço
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-md border border-[#e2ded7] bg-white px-5 py-10">
          <h2 className="text-sm font-bold text-[#242321]">
            Nenhum serviço cadastrado
          </h2>
          <p className="mt-1 text-xs text-[#69655f]">
            Crie o primeiro serviço e vincule ao menos um profissional.
          </p>
          <button
            type="button"
            onClick={createNew}
            className="mt-4 min-h-10 rounded-[5px] bg-[#c79a4a] px-4 text-xs font-bold text-[#171614]"
          >
            Adicionar serviço
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-[#e2ded7] bg-white">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[#e2ded7] bg-[#f8f7f5] px-5 py-3 text-[11px] font-semibold text-[#625e58] md:grid">
            <span>Serviço</span><span>Preço</span><span>Duração e equipe</span><span className="w-[260px]">Catálogo e ações</span>
          </div>
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
                className="grid gap-3 border-b border-[#e9e5df] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-4"
              >
                <h2 className="min-w-0 text-sm font-semibold text-[#242321]">{service.name}</h2>
                <div>
                  <span className="mb-1 block text-[11px] text-[#69655f] md:hidden">Preço</span>
                  <p className="text-sm font-semibold tabular-nums text-[#242321]">
                    {formatPriceRange(service.assignments)}
                  </p>
                </div>
                <div className="text-xs text-[#625e58]">
                  <span className="mb-1 block text-[11px] text-[#69655f] md:hidden">Duração e equipe</span>
                  <p className="font-medium text-[#242321]">{formatDurationRange(service.assignments)}</p>
                  <p className="mt-0.5">{availabilityLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#e9e5df] pt-3 md:w-[260px] md:border-t-0 md:pt-0">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#47423c]">
                    <Switch
                      aria-label={`${service.isActive ? 'Desativar' : 'Ativar'} ${service.name} no catálogo`}
                      checked={service.isActive}
                      disabled={isPending}
                      onCheckedChange={() => toggleStatus(service)}
                    />
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </label>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => edit(service)}
                      disabled={isPending}
                      aria-label={`Editar ${service.name}`}
                      className="min-h-10 rounded px-2 text-xs font-semibold text-[#72511f] hover:bg-[#f4f1ec] focus-visible:outline-2 focus-visible:outline-[#8a641f]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(service.id)}
                      disabled={isPending}
                      className="min-h-10 rounded px-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
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
