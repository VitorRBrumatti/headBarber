'use client'

import { useState, useTransition } from 'react'
import { createAddOn, updateAddOn } from '@/app/dashboard/adicionais/actions'
import type {
  AddOnAssignmentDraft,
  AddOnBarber,
  AddOnCatalogItem,
} from '@/app/dashboard/adicionais/add-on-types'
import { AddOnAssignmentsEditor } from './add-on-assignments-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddOnFormProps {
  addOn?: AddOnCatalogItem
  barbers: AddOnBarber[]
  onSuccess: () => void
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível salvar.'
}

export function AddOnForm({
  addOn,
  barbers,
  onSuccess,
}: AddOnFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isActive, setIsActive] = useState(addOn?.isActive ?? true)
  const [assignments, setAssignments] = useState<AddOnAssignmentDraft[]>(
    () =>
      barbers.map((barber) => {
        const current = addOn?.assignments.find(
          (assignment) => assignment.barberId === barber.id,
        )
        return {
          barberId: barber.id,
          barberName: barber.name,
          price: current?.price ?? '',
          durationMinutes: current?.durationMinutes ?? 0,
          isAvailable: current?.isAvailable ?? false,
        }
      }),
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    formData.set('is_active', String(isActive))
    formData.set(
      'assignments',
      JSON.stringify(
        assignments.map((assignment) => ({
          barberId: assignment.barberId,
          price: assignment.price,
          durationMinutes: assignment.durationMinutes,
          isAvailable: assignment.isAvailable,
        })),
      ),
    )

    startTransition(async () => {
      try {
        if (addOn) await updateAddOn(addOn.id, formData)
        else await createAddOn(formData)
        onSuccess()
      } catch (submitError) {
        setError(errorMessage(submitError))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome do adicional *</label>
        <Input
          name="name"
          defaultValue={addOn?.name}
          placeholder="Ex: Sobrancelha, hidratação, selagem"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Adicional ativo no catálogo
      </label>

      <AddOnAssignmentsEditor
        assignments={assignments}
        onChange={setAssignments}
      />

      <p className="text-xs text-zinc-500">
        Defina quais profissionais oferecem este adicional e o preço e a
        duração de cada um.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? 'Salvando...'
          : addOn
            ? 'Salvar alterações'
            : 'Criar adicional'}
      </Button>
    </form>
  )
}
