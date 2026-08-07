'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/image-upload'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createBarber, updateBarber } from '@/app/dashboard/barbeiros/actions'

interface Barber {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  commission_percentage: number
}

interface BarberFormProps {
  barber?: Barber
  onSuccess: () => void
}

export function BarberForm({ barber, onSuccess }: BarberFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
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

      <ImageUpload
        key={barber?.id ?? 'new-barber'}
        name="avatar_url"
        label="Foto do profissional"
        initialUrl={barber?.avatar_url ?? null}
        shape="circle"
        onUploadingChange={setIsUploading}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Porcentagem de Comissão (%) *</label>
        <Input
          name="commission_percentage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          defaultValue={barber?.commission_percentage ?? 0}
          placeholder="Ex: 30"
          required
        />
        <p className="text-xs text-zinc-500">
          Taxa de comissão do barbeiro sobre os atendimentos concluídos.
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
        <Button type="submit" disabled={isPending || isUploading} className="flex-1">
          {isUploading
            ? 'Enviando imagem...'
            : isPending
              ? 'Salvando...'
              : barber
                ? 'Salvar alterações'
                : 'Criar profissional'}
        </Button>
      </div>
    </form>
  )
}
