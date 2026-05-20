'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { createService, updateService } from '@/app/dashboard/servicos/actions'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  is_active: boolean
}

interface ServiceFormProps {
  service?: Service
  onSuccess: () => void
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2 horas' },
]

export function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (service) {
          await updateService(service.id, formData)
        } else {
          await createService(formData)
        }
        onSuccess()
      } catch (err: any) {
        setError(err.message)
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Preço (R$) *</label>
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={service?.price ?? ''}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duração *</label>
          <Select
            name="duration_minutes"
            defaultValue={String(service?.duration_minutes ?? '30')}
            required
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Salvando...' : service ? 'Salvar alterações' : 'Criar serviço'}
        </Button>
      </div>
    </form>
  )
}
