'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createBarber, updateBarber } from '@/app/dashboard/barbeiros/actions'

interface Barber {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
}

interface BarberFormProps {
  barber?: Barber
  onSuccess: () => void
}

export function BarberForm({ barber, onSuccess }: BarberFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (barber) {
          await updateBarber(barber.id, formData)
        } else {
          await createBarber(formData)
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
        <label className="text-sm font-medium">Nome do barbeiro *</label>
        <Input
          name="name"
          defaultValue={barber?.name}
          placeholder="Ex: Carlos Silva"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Link do Avatar (Opcional)</label>
        <Input
          name="avatar_url"
          type="url"
          defaultValue={barber?.avatar_url ?? ''}
          placeholder="https://exemplo.com/avatar.jpg"
        />
        <p className="text-xs text-zinc-500">
          Insira uma URL direta para a foto do profissional.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Biografia / Especialidade</label>
        <Textarea
          name="bio"
          defaultValue={barber?.bio ?? ''}
          placeholder="Descreva as especialidades do barbeiro (ex: especialista em cortes degradê e barba terapia)..."
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Salvando...' : barber ? 'Salvar alterações' : 'Criar profissional'}
        </Button>
      </div>
    </form>
  )
}
