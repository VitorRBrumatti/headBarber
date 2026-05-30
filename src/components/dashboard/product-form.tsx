'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { createProduct, updateProduct } from '@/app/dashboard/produtos/actions'

interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  sale_price: number
  cost_price: number | null
  stock_quantity: number
  is_active: boolean
  image_url: string | null
}

interface ProductFormProps {
  product?: Product
  onSuccess: () => void
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Selecionar categoria...' },
  { value: 'pomada', label: 'Pomada' },
  { value: 'shampoo', label: 'Shampoo' },
  { value: 'condicionador', label: 'Condicionador' },
  { value: 'oleo', label: 'Óleo para barba' },
  { value: 'balm', label: 'Balm' },
  { value: 'gel', label: 'Gel' },
  { value: 'cera', label: 'Cera' },
  { value: 'acessorio', label: 'Acessório' },
  { value: 'ferramenta', label: 'Ferramenta' },
  { value: 'outro', label: 'Outro' },
]

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (product) {
          await updateProduct(product.id, formData)
        } else {
          await createProduct(formData)
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
        <label className="text-sm font-medium">Nome do produto *</label>
        <Input
          name="name"
          defaultValue={product?.name}
          placeholder="Ex: Pomada Matte, Shampoo Antiqueda"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <Textarea
          name="description"
          defaultValue={product?.description ?? ''}
          placeholder="Descreva o produto brevemente..."
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Categoria</label>
        <Select
          name="category"
          defaultValue={product?.category ?? ''}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Preço de venda (R$) *</label>
          <Input
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.sale_price ?? ''}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Custo (R$)</label>
          <Input
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.cost_price ?? ''}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estoque</label>
          <Input
            name="stock_quantity"
            type="number"
            min="0"
            defaultValue={product?.stock_quantity ?? 0}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Imagem (URL)</label>
          <Input
            name="image_url"
            type="url"
            defaultValue={product?.image_url ?? ''}
            placeholder="https://..."
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Salvando...' : product ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </div>
    </form>
  )
}
