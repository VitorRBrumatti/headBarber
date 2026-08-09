'use client'

import { useState, useTransition } from 'react'
import { createService, updateService } from '@/app/dashboard/servicos/actions'
import type {
  ServiceAssignmentDraft,
  ServiceBarber,
  ServiceCatalogItem,
} from '@/app/dashboard/servicos/service-types'
import { ServiceAssignmentsEditor } from '@/components/dashboard/service-assignments-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface ServiceFormProps {
  service?: ServiceCatalogItem
  barbers: ServiceBarber[]
  onSuccess: () => void
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível salvar.'
}

export function ServiceForm({
  service,
  barbers,
  onSuccess,
}: ServiceFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [assignments, setAssignments] = useState<ServiceAssignmentDraft[]>(
    () =>
      barbers.map((barber) => {
        const current = service?.assignments.find(
          (assignment) => assignment.barberId === barber.id,
        )
        return {
          barberId: barber.id,
          barberName: barber.name,
          price: current?.price ?? '',
          durationMinutes: current?.durationMinutes ?? 30,
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
        if (service) await updateService(service.id, formData)
        else await createService(formData)
        onSuccess()
      } catch (submitError) {
        setError(errorMessage(submitError))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome do serviço *</label>
        <Input
          name="name"
          defaultValue={service?.name}
          placeholder="Ex: Corte de cabelo"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <Textarea
          name="description"
          defaultValue={service?.description ?? ''}
          placeholder="Descreva o serviço brevemente..."
          rows={3}
        />
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        Serviço ativo no catálogo
      </label>

      <ServiceAssignmentsEditor
        assignments={assignments}
        onChange={setAssignments}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? 'Salvando...'
          : service
            ? 'Salvar alterações'
            : 'Criar serviço'}
      </Button>
    </form>
  )
}
