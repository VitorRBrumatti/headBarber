'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient, updateClient } from '@/app/dashboard/clientes/actions'

interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

interface ClientFormProps {
  client?: Client
  onSuccess: () => void
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (client) {
          await updateClient(client.id, formData)
        } else {
          await createClient(formData)
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
        <label className="text-sm font-medium">Nome completo *</label>
        <Input
          name="name"
          defaultValue={client?.name}
          placeholder="Ex: João Souza"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Telefone / WhatsApp</label>
          <Input
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ''}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">E-mail</label>
          <Input
            name="email"
            type="email"
            defaultValue={client?.email ?? ''}
            placeholder="joao@exemplo.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Observações / Preferências</label>
        <Textarea
          name="notes"
          defaultValue={client?.notes ?? ''}
          placeholder="Ex: Prefere corte com tesoura, gosta de café sem açúcar..."
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Salvando...' : client ? 'Salvar alterações' : 'Cadastrar cliente'}
        </Button>
      </div>
    </form>
  )
}
