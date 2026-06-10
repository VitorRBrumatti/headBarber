'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit, Trash2, Power, Package, DollarSign, Box, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductForm } from '@/components/dashboard/product-form'
import { toggleProductStatus, deleteProduct, recordProductSaleAction } from './actions'

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

interface ClientOption {
  id: string
  name: string
}

interface ProdutosClientProps {
  products: Product[]
  clients: ClientOption[]
}

const CATEGORY_LABELS: Record<string, string> = {
  pomada: 'Pomada',
  shampoo: 'Shampoo',
  condicionador: 'Condicionador',
  oleo: 'Óleo',
  balm: 'Balm',
  gel: 'Gel',
  cera: 'Cera',
  acessorio: 'Acessório',
  ferramenta: 'Ferramenta',
  outro: 'Outro',
}

export function ProdutosClient({ products, clients }: ProdutosClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sell product states
  const [sellSheetOpen, setSellSheetOpen] = useState(false)
  const [sellingProduct, setSellingProduct] = useState<Product | undefined>(undefined)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPaymentMethod, setSellPaymentMethod] = useState('pix')
  const [sellClientId, setSellClientId] = useState('')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreateNew = () => {
    setEditingProduct(undefined)
    setSheetOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setSheetOpen(true)
  }

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    setError('')
    startTransition(async () => {
      try {
        await toggleProductStatus(id, currentStatus)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deletingId) return
    setError('')
    startTransition(async () => {
      try {
        await deleteProduct(deletingId)
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleSellClick = (product: Product) => {
    setSellingProduct(product)
    setSellQuantity(1)
    setSellPaymentMethod('pix')
    setSellClientId('')
    setSellSheetOpen(true)
  }

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sellingProduct) return
    setError('')
    startTransition(async () => {
      try {
        await recordProductSaleAction(
          sellingProduct.id,
          sellQuantity,
          sellPaymentMethod,
          sellClientId || undefined
        )
        setSellSheetOpen(false)
        setSellingProduct(undefined)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-400">
          Total: {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </h2>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre os produtos que sua barbearia vende, como pomadas, shampoos, óleos, pentes e acessórios."
          action={
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Produto
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="relative overflow-hidden p-6 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-300">
              <div>
                {/* Product image or fallback */}
                <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  )}
                </div>

                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                      {product.name}
                    </h3>
                    <Badge variant={product.is_active ? 'default' : 'secondary'} className="shrink-0">
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {product.category && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                  )}

                  {product.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Price & Stock */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {formatPrice(product.sale_price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                    <Box className="h-3.5 w-3.5" />
                    <span>{product.stock_quantity} em estoque</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSellClick(product)}
                  disabled={isPending || !product.is_active || product.stock_quantity <= 0}
                  className="mr-auto gap-1 text-xs font-semibold border-amber-500/20 hover:border-amber-500/50 text-amber-500 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Vender
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleStatus(product.id, product.is_active)}
                  disabled={isPending}
                  title={product.is_active ? 'Desativar produto' : 'Ativar produto'}
                  className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  <Power className={`h-4 w-4 ${product.is_active ? 'text-emerald-500' : 'text-zinc-400'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(product)}
                  disabled={isPending}
                  title="Editar produto"
                  className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(product.id)}
                  disabled={isPending}
                  title="Excluir produto"
                  className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slide-over Sheet for Create/Edit */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        description={
          editingProduct
            ? 'Atualize as informações do produto preenchendo os campos abaixo.'
            : 'Preencha os campos abaixo para cadastrar um novo produto.'
        }
      >
        <ProductForm
          product={editingProduct}
          onSuccess={() => setSheetOpen(false)}
        />
      </Sheet>

      {/* Slide-over Sheet for Quick Sell */}
      <Sheet
        open={sellSheetOpen}
        onClose={() => {
          setSellSheetOpen(false)
          setSellingProduct(undefined)
        }}
        title="Registrar Venda"
        description={`Venda rápida do produto: ${sellingProduct?.name || ''}`}
      >
        {sellingProduct && (
          <form onSubmit={handleSellSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Produto
                </label>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-250">
                  {sellingProduct.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Preço Unitário
                  </label>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-250">
                    {formatPrice(sellingProduct.sale_price)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Em Estoque
                  </label>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-255">
                    {sellingProduct.stock_quantity} un
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="sell-quantity" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Quantidade *
                </label>
                <input
                  id="sell-quantity"
                  type="number"
                  required
                  min={1}
                  max={sellingProduct.stock_quantity}
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(Math.max(1, Math.min(sellingProduct.stock_quantity, parseInt(e.target.value) || 1)))}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="sell-payment" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Forma de Pagamento *
                </label>
                <select
                  id="sell-payment"
                  required
                  value={sellPaymentMethod}
                  onChange={(e) => setSellPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
                >
                  <option value="pix">Pix</option>
                  <option value="money">Dinheiro</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label htmlFor="sell-client" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Cliente (Opcional)
                </label>
                <select
                  id="sell-client"
                  value={sellClientId}
                  onChange={(e) => setSellClientId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
                >
                  <option value="">Cliente Avulso (Não identificado)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-800/60">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-zinc-400">VALOR TOTAL:</span>
                  <span className="text-xl font-bold text-amber-500">
                    {formatPrice(sellingProduct.sale_price * sellQuantity)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSellSheetOpen(false)
                  setSellingProduct(undefined)
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || sellingProduct.stock_quantity <= 0}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 shadow-md shadow-amber-500/10"
              >
                {isPending ? 'Gravando...' : 'Confirmar Venda'}
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
