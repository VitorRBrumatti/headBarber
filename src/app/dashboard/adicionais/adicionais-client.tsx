'use client'

import { useState, useTransition } from 'react'
import { AddOnForm } from '@/components/dashboard/add-on-form'
import { Dialog } from '@/components/ui/dialog'
import { Sheet } from '@/components/ui/sheet'
import {
  formatAddOnDurationRange,
  formatAddOnPriceRange,
} from './add-on-validation'
import type { AddOnBarber, AddOnCatalogItem } from './add-on-types'
import { deleteAddOn, toggleAddOnStatus } from './actions'

interface AdicionaisClientProps {
  addOns: AddOnCatalogItem[]
  barbers: AddOnBarber[]
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir.'
}

export function AdicionaisClient({
  addOns,
  barbers,
}: AdicionaisClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] =
    useState<AddOnCatalogItem | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function createNew() {
    setEditingAddOn(undefined)
    setSheetOpen(true)
  }

  function edit(addOn: AddOnCatalogItem) {
    setEditingAddOn(addOn)
    setSheetOpen(true)
  }

  function toggleStatus(addOn: AddOnCatalogItem) {
    setError('')
    startTransition(async () => {
      try {
        await toggleAddOnStatus(addOn.id, addOn.isActive)
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
        await deleteAddOn(deletingId)
      } catch (deleteError) {
        setError(errorMessage(deleteError))
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-montserrat text-3xl font-extrabold text-[#181c21]">
            Adicionais
          </h1>
          <p className="mt-2 text-sm text-[#47464b]">
            Configure preço, duração e disponibilidade de cada profissional.
          </p>
        </div>
        <button
          type="button"
          onClick={createNew}
          className="rounded-lg bg-[#7c5809] px-6 py-3 text-xs font-bold text-white"
        >
          Novo adicional
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {addOns.length === 0 ? (
        <div className="rounded-2xl border border-[#c8c5cb]/30 bg-white px-6 py-20 text-center">
          <h2 className="text-xl font-bold text-[#181c21]">
            Nenhum adicional cadastrado
          </h2>
          <p className="mt-2 text-sm text-[#47464b]">
            Crie o primeiro adicional e vincule ao menos um profissional.
          </p>
          <button
            type="button"
            onClick={createNew}
            className="mt-6 rounded-xl bg-[#7c5809] px-6 py-3 text-sm font-bold text-white"
          >
            Adicionar adicional
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {addOns.map((addOn) => {
            const availableCount = addOn.assignments.filter(
              (assignment) => assignment.isAvailable,
            ).length
            return (
              <article
                key={addOn.id}
                className={`overflow-hidden rounded-2xl border border-[#e0e2e9] bg-white shadow-sm ${
                  addOn.isActive ? '' : 'opacity-70'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-montserrat font-bold text-[#181c21]">
                      {addOn.name}
                    </h2>
                    <span className="rounded-md bg-[#f1f3fa] px-2 py-1 text-[10px] font-bold uppercase">
                      {addOn.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-5 text-xl font-extrabold text-[#181c21]">
                    {formatAddOnPriceRange(addOn.assignments)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#47464b]">
                    {formatAddOnDurationRange(addOn.assignments)}
                  </p>
                  <p className="mt-3 text-xs text-[#77767b]">
                    {availableCount}{' '}
                    {availableCount === 1 ? 'profissional' : 'profissionais'}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-[#e0e2e9] bg-[#f8f9ff] px-6 py-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={addOn.isActive}
                      disabled={isPending}
                      onChange={() => toggleStatus(addOn)}
                    />
                    Catálogo ativo
                  </label>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => edit(addOn)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(addOn.id)}
                      className="text-red-700"
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
        title={editingAddOn ? 'Editar Adicional' : 'Novo Adicional'}
        description="Defina o catálogo e a configuração de cada profissional."
      >
        <AddOnForm
          addOn={editingAddOn}
          barbers={barbers}
          onSuccess={() => setSheetOpen(false)}
        />
      </Sheet>

      <Dialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Excluir Adicional"
        description="Agendamentos históricos podem impedir a exclusão. Se isso acontecer, desative o adicional."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
