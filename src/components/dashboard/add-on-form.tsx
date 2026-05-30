'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createAddOn, updateAddOn } from '@/app/dashboard/adicionais/actions'

interface AddOn {
  id: string
  name: string
  price: number
  duration_minutes: number
  is_active: boolean
}

interface AddOnFormProps {
  addOn?: AddOn
  onSuccess: () => void
}

const DURATION_OPTIONS = [
  { value: '0', label: 'Sem duração extra' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hora' },
]

export function AddOnForm({ addOn, onSuccess }: AddOnFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (addOn) {
          await updateAddOn(addOn.id, formData)
        } else {
          await createAddOn(formData)
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
        <label className="text-sm font-medium">Nome do adicional *</label>
        <Input
          name="name"
          defaultValue={addOn?.name}
          placeholder="Ex: Sobrancelha, Hidratação, Selagem"
          required
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
            defaultValue={addOn?.price ?? ''}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duração extra</label>
          <Select
            name="duration_minutes"
            defaultValue={String(addOn?.duration_minutes ?? '0')}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Adicionais são extras que o cliente pode escolher durante o agendamento, como sobrancelha, hidratação, pigmentação, etc.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Salvando...' : addOn ? 'Salvar alterações' : 'Criar adicional'}
        </Button>
      </div>
    </form>
  )
}
