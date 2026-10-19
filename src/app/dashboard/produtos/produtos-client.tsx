'use client'
/* eslint-disable @next/next/no-img-element -- product images may be uploaded as data URLs */

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ProductForm } from '@/components/dashboard/product-form'
import { toggleProductStatus, deleteProduct, recordProductSaleAction } from './actions'
import { cn } from '@/lib/utils'

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

  // Client search states
  const [clientSearch, setClientSearch] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Dropdown menu state per card
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

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
        // Automatically close the dialog on error per rules
        setDeleteDialogOpen(false)
        setDeletingId(null)
      }
    })
  }

  const handleSellClick = (product: Product) => {
    setSellingProduct(product)
    setSellQuantity(1)
    setSellPaymentMethod('pix')
    setSellClientId('')
    setClientSearch('')
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

  const handleQuickSellHeaderClick = () => {
    const firstProd = products.find(p => p.is_active && p.stock_quantity > 0)
    setSellingProduct(firstProd)
    setSellQuantity(1)
    setSellPaymentMethod('pix')
    setSellClientId('')
    setClientSearch('')
    setSellSheetOpen(true)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  // Filter products client-side
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // List of active products with stock for Quick Sale dropdown
  const activeProductsWithStock = products.filter(p => p.is_active && p.stock_quantity > 0)

  // Filter clients client-side
  const filteredClients = clientSearch
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  // Unique categories in catalog
  const uniqueCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[]

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2 text-left">
        <div>
          <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#242321] mb-2">Produtos</h1>
          <p className="text-sm md:text-base text-[#625f59]">
            Controle estoque, preços e vendas da sua barbearia.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleQuickSellHeaderClick}
            className="bg-[#f1efeb] text-[#242321] hover:bg-[#e8e4de] text-xs font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-[#e8e4de] w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">point_of_sale</span>
            Venda Rápida
          </button>
          <button
            onClick={handleCreateNew}
            className="bg-[#C79A4A] text-[#20201f] hover:bg-[#b0863f] text-xs font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo produto
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#93000a] p-4 rounded-xl text-sm font-semibold flex items-center gap-2 text-left">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {/* Filters / Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-soft border border-[#e8e4de] flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#625f59]">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f6f5f2] border border-[#e8e4de] rounded-lg focus:outline-none focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] font-body-md transition-colors text-[#242321] placeholder-[#8b8379]"
            placeholder="Buscar produtos..."
          />
        </div>
        <div className="flex gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-[#e8e4de] rounded-lg focus:outline-none focus:border-[#C79A4A] font-body-md text-[#625f59]"
          >
            <option value="all">Todas as categorias</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre os produtos que sua barbearia vende, como pomadas, shampoos, óleos, pentes e acessórios."
          action={
            <Button onClick={handleCreateNew} className="gap-2 bg-[#C79A4A] text-[#20201f] hover:bg-[#b0863f]">
              <span className="material-symbols-outlined">add</span>
              Adicionar Primeiro Produto
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-dashed border-[#e8e4de] text-center">
          <span className="material-symbols-outlined text-[#625f59] text-4xl mb-2">search_off</span>
          <p className="text-sm font-semibold text-[#242321]">Nenhum produto corresponde aos filtros</p>
          <p className="text-xs text-[#625f59] mt-1">Tente ajustar a busca ou categoria selecionada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 3
            const isOutOfStock = product.stock_quantity <= 0

            return (
              <div
                key={product.id}
                className={cn(
                  "relative flex flex-col rounded-xl border border-[#dedad2] bg-white transition-colors hover:border-[#bfae91]",
                  !product.is_active && "opacity-75 grayscale-[30%]"
                )}
              >
                {/* Product Image Wrapper */}
                {product.image_url && (
                  <div className="relative flex h-48 items-center justify-center rounded-t-xl border-b border-[#e8e4de] bg-[#f6f5f2] p-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="object-contain h-full w-full max-w-[160px] drop-shadow-md mix-blend-multiply"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#625f59]">{product.category ? (CATEGORY_LABELS[product.category] || product.category) : 'Outros'}</span>
                    <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', product.is_active ? 'bg-[#e9f3ec] text-[#275c3c]' : 'bg-[#e8e4de] text-[#625f59]')}>{product.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <h3 className="font-montserrat text-sm md:text-base font-bold text-[#242321] mb-2 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="font-body-md text-xs md:text-sm text-[#625f59] mb-4 line-clamp-2 flex-1">
                    {product.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <span className="block text-[10px] font-bold text-[#8b8379] uppercase tracking-wider mb-1">Preço Venda</span>
                      <span className="font-montserrat text-lg font-bold text-[#242321]">
                        {formatPrice(product.sale_price)}
                      </span>
                    </div>
                    <div className="text-right">
                      {isLowStock ? (
                        <>
                          <span className="block text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wider mb-1">Estoque Baixo</span>
                          <span className="font-body-md text-xs font-semibold text-[#ba1a1a]">
                            {product.stock_quantity} un
                          </span>
                        </>
                      ) : isOutOfStock ? (
                        <>
                          <span className="block text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wider mb-1">Sem Estoque</span>
                          <span className="font-body-md text-xs font-semibold text-[#ba1a1a]">
                            0 un
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-[10px] font-bold text-[#8b8379] uppercase tracking-wider mb-1">Estoque</span>
                          <span className="font-body-md text-xs font-semibold text-[#242321]">
                            {product.stock_quantity} un
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex gap-2 mt-auto relative">
                    {isOutOfStock || !product.is_active ? (
                      <button
                        disabled
                        className="flex-1 bg-[#e8e4de] border border-[#c9c3b9] text-[#625f59] cursor-not-allowed font-body-md text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                      >
                        Indisponível
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSellClick(product)}
                        className="flex-1 bg-white border border-[#e8e4de] hover:border-[#20201f] text-[#20201f] font-body-md text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">point_of_sale</span>
                        Vender
                      </button>
                    )}

                    <div className="relative">
                      <button
                        aria-label={`Mais ações para ${product.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveDropdownId(activeDropdownId === product.id ? null : product.id)
                        }}
                        className="p-2 border border-[#e8e4de] rounded-lg text-[#625f59] hover:bg-[#f1efeb] transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-lg leading-none">more_vert</span>
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdownId === product.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveDropdownId(null)}
                          />
                          <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-lg shadow-lg border border-[#e8e4de] py-1 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <button
                              onClick={() => {
                                handleEdit(product)
                                setActiveDropdownId(null)
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#242321] hover:bg-[#f1efeb] transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                handleToggleStatus(product.id, product.is_active)
                                setActiveDropdownId(null)
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#242321] hover:bg-[#f1efeb] transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">power_settings_new</span>
                              {product.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteClick(product.id)
                                setActiveDropdownId(null)
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/20 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty State / Add New Card Placeholder */}
          <div
            onClick={handleCreateNew}
            className="bg-transparent border-2 border-dashed border-[#e8e4de] rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-[#f6f5f2] transition-colors duration-200 cursor-pointer min-h-[380px]"
          >
            <div className="w-16 h-16 rounded-full bg-[#C79A4A]/10 flex items-center justify-center mb-4 text-[#C79A4A]">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <h3 className="font-montserrat text-base font-bold text-[#20201f] mb-1">Adicionar Novo</h3>
            <p className="text-xs text-[#625f59]">Cadastre um novo produto no seu catálogo.</p>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
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

      {/* Quick Sell Sheet */}
      <Sheet
        open={sellSheetOpen}
        onClose={() => {
          setSellSheetOpen(false)
          setSellingProduct(undefined)
          setClientSearch('')
          setSellClientId('')
        }}
        title="Venda Rápida"
        description="Gerencie a venda de produtos direto do estoque."
      >
        <form onSubmit={handleSellSubmit} className="space-y-5 text-left">
          <div className="space-y-4">
            {/* Product selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8b8379] uppercase tracking-wider">Produto</label>
              {sellingProduct ? (
                <div className="relative">
                  <select
                    value={sellingProduct.id}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value)
                      if (prod) {
                        setSellingProduct(prod)
                        setSellQuantity(1)
                      }
                    }}
                    className="w-full appearance-none bg-[#f1efeb] border border-[#e8e4de] rounded-lg pl-4 pr-10 py-3 text-sm text-[#242321] focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] outline-none transition-colors"
                  >
                    {activeProductsWithStock.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#625f59] pointer-events-none">expand_more</span>
                </div>
              ) : (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 p-3 rounded-lg">
                  Não há produtos ativos com estoque disponível para realizar uma venda.
                </p>
              )}
            </div>

            {/* Price and Stock Stats */}
            {sellingProduct && (
              <div className="flex bg-[#f6f5f2] rounded-lg p-4 justify-between items-center border border-[#e8e4de] gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#8b8379] uppercase tracking-wider mb-1">Preço Unitário</span>
                  <span className="font-montserrat text-base font-bold text-[#242321]">{formatPrice(sellingProduct.sale_price)}</span>
                </div>
                <div className="h-8 w-[1px] bg-[#e8e4de]"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-[#8b8379] uppercase tracking-wider mb-1">Estoque</span>
                  <span className="text-xs font-semibold text-[#242321] flex items-center gap-1.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      sellingProduct.stock_quantity <= 3 ? "bg-[#ba1a1a]" : "bg-green-500"
                    )}></span>
                    {sellingProduct.stock_quantity} un.
                  </span>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {sellingProduct && (
              <div className="flex items-center justify-between py-2 border-b border-[#e8e4de]/60">
                <label className="text-xs font-bold text-[#8b8379] uppercase tracking-wider">Quantidade</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSellQuantity(q => Math.max(1, q - 1))}
                    disabled={sellQuantity <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded border border-[#e8e4de] text-[#242321] hover:bg-[#f1efeb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">remove</span>
                  </button>
                  <span className="w-12 text-center font-montserrat text-lg font-bold text-[#242321] select-none">
                    {sellQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSellQuantity(q => Math.min(sellingProduct.stock_quantity, q + 1))}
                    disabled={sellQuantity >= sellingProduct.stock_quantity}
                    className="w-8 h-8 flex items-center justify-center rounded border border-[#e8e4de] text-[#242321] hover:bg-[#f1efeb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                  </button>
                </div>
              </div>
            )}

            {/* Client input (Search-styled select dropdown) */}
            <div className="space-y-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8b8379] uppercase tracking-wider">Cliente (Opcional)</label>
                <span className="text-[10px] font-bold text-[#8b8379] uppercase tracking-wider">Vincular venda</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#625f59] text-[20px]">person_search</span>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setIsClientDropdownOpen(true)
                    if (sellClientId) {
                      setSellClientId('')
                    }
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-[#e8e4de] rounded-lg text-sm text-[#242321] focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] outline-none transition-colors placeholder-[#8b8379]"
                  placeholder="Buscar por nome..."
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearch('')
                      setSellClientId('')
                      setIsClientDropdownOpen(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#625f59] hover:text-[#242321] flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* Client dropdown results */}
              {isClientDropdownOpen && filteredClients.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsClientDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-[#e8e4de] rounded-lg shadow-lg z-40 py-1">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSellClientId(client.id)
                          setClientSearch(client.name)
                          setIsClientDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#242321] hover:bg-[#f1efeb] transition-colors"
                      >
                        {client.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8b8379] uppercase tracking-wider block">Método de Pagamento</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'credit_card', label: 'Cartão', icon: 'credit_card' },
                  { value: 'money', label: 'Dinheiro', icon: 'payments' },
                  { value: 'pix', label: 'Pix', icon: 'qr_code' }
                ].map((method) => (
                  <label key={method.value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={sellPaymentMethod === method.value}
                      onChange={() => setSellPaymentMethod(method.value)}
                      className="peer sr-only"
                    />
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#e8e4de] bg-white peer-checked:border-[#C79A4A] peer-checked:bg-[#C79A4A]/5 transition-all text-[#625f59] peer-checked:text-[#C79A4A] hover:bg-[#f6f5f2]">
                      <span className="material-symbols-outlined mb-1 text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {method.icon}
                      </span>
                      <span className="font-body-md text-[11px] font-bold text-center leading-tight">
                        {method.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Total & Register Button */}
          {sellingProduct && (
            <div className="pt-4 border-t border-[#e8e4de] space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-[#8b8379]">Total da Venda</span>
                <span className="font-montserrat text-2xl font-extrabold text-[#242321] leading-none tracking-tight">
                  {formatPrice(sellingProduct.sale_price * sellQuantity)}
                </span>
              </div>
              <button
                type="submit"
                disabled={isPending || sellingProduct.stock_quantity <= 0}
                className="w-full bg-[#C79A4A] hover:bg-[#b0863f] text-[#20201f] font-montserrat text-xs font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg leading-none">check_circle</span>
                {isPending ? 'Registrando...' : 'Registrar venda'}
              </button>
            </div>
          )}
        </form>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita e removerá o produto do catálogo."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
