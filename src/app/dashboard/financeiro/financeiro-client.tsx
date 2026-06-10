'use client'

import React, { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  ShoppingBag,
  Plus,
  Trash2,
  CalendarRange,
  ChevronDown,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Dialog } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import {
  FinancialOverview,
  createExpenseAction,
  deleteExpenseAction,
  createManualRevenueAction,
  deleteManualRevenueAction
} from './actions'

interface FinanceiroClientProps {
  overview: FinancialOverview
  initialStartDate: string
  initialEndDate: string
}

const REV_CATEGORY_LABELS: Record<string, string> = {
  service: 'Serviços',
  product: 'Produtos',
  monthly_plan: 'Planos Mensais',
  manual_adjustment: 'Ajustes Manuais',
}

const EXP_CATEGORY_LABELS: Record<string, string> = {
  rent: 'Aluguel',
  energy: 'Energia Elétrica',
  water: 'Água',
  internet: 'Internet',
  products: 'Produtos / Estoque',
  commission: 'Comissões (Provisionadas)',
  maintenance: 'Manutenção',
  marketing: 'Marketing',
  other: 'Outros despesas',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  money: 'Dinheiro',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  other: 'Outro',
}

export function FinanceiroClient({
  overview,
  initialStartDate,
  initialEndDate,
}: FinanceiroClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Date picker states
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  // Sheets/Dialogs states
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [revenueSheetOpen, setRevenueSheetOpen] = useState(false)
  
  // Delete ledger states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: 'revenue' | 'expense' } | null>(null)

  // Form states - Expense
  const [expCategory, setExpCategory] = useState('other')
  const [expDescription, setExpDescription] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expRecurring, setExpRecurring] = useState(false)

  // Form states - Revenue
  const [revCategory, setRevCategory] = useState('manual_adjustment')
  const [revDescription, setRevDescription] = useState('')
  const [revAmount, setRevAmount] = useState('')
  const [revDate, setRevDate] = useState(new Date().toISOString().split('T')[0])
  const [revPaymentMethod, setRevPaymentMethod] = useState('pix')

  // Tab state for transactions lists
  const [activeTab, setActiveTab] = useState<'revenues' | 'expenses'>('revenues')

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUrlDates(startDate, endDate)
  }

  const updateUrlDates = (start: string, end: string) => {
    const params = new URLSearchParams()
    params.set('start', start)
    params.set('end', end)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleQuickRange = (rangeType: 'this_month' | 'last_30' | 'this_year') => {
    const today = new Date()
    let startStr = ''
    let endStr = today.toISOString().split('T')[0]

    if (rangeType === 'this_month') {
      const y = today.getFullYear()
      const m = today.getMonth()
      startStr = new Date(y, m, 1).toISOString().split('T')[0]
      endStr = new Date(y, m + 1, 0).toISOString().split('T')[0]
    } else if (rangeType === 'last_30') {
      const prev = new Date()
      prev.setDate(today.getDate() - 30)
      startStr = prev.toISOString().split('T')[0]
    } else if (rangeType === 'this_year') {
      const y = today.getFullYear()
      startStr = `${y}-01-01`
    }

    setStartDate(startStr)
    setEndDate(endStr)
    updateUrlDates(startStr, endStr)
  }

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await createExpenseAction({
          category: expCategory,
          description: expDescription,
          amount: parseFloat(expAmount),
          date: expDate,
          is_recurring: expRecurring,
        })
        setExpenseSheetOpen(false)
        setExpDescription('')
        setExpAmount('')
        setExpCategory('other')
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleCreateRevenue = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await createManualRevenueAction({
          category: revCategory,
          description: revDescription,
          amount: parseFloat(revAmount),
          date: revDate,
          payment_method: revPaymentMethod,
        })
        setRevenueSheetOpen(false)
        setRevDescription('')
        setRevAmount('')
        setRevCategory('manual_adjustment')
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleDeleteClick = (id: string, type: 'revenue' | 'expense') => {
    setDeleteItem({ id, type })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteItem) return
    setError('')
    startTransition(async () => {
      try {
        if (deleteItem.type === 'revenue') {
          await deleteManualRevenueAction(deleteItem.id)
        } else {
          await deleteExpenseAction(deleteItem.id)
        }
        setDeleteConfirmOpen(false)
        setDeleteItem(null)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  // --- Graph processing ---
  const datePoints: { label: string; revenue: number; expense: number }[] = []
  const start = new Date(initialStartDate + 'T00:00:00')
  const end = new Date(initialEndDate + 'T23:59:59')
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 35) {
    let curr = new Date(start)
    while (curr <= end) {
      const dStr = curr.toISOString().split('T')[0]
      const label = curr.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      let dayRev = 0
      let dayExp = 0

      overview.recentRevenues.forEach((r) => {
        if (r.date === dStr) dayRev += Number(r.amount)
      })

      overview.recentExpenses.forEach((e) => {
        if (e.date === dStr) dayExp += Number(e.amount)
      })

      const dayServiceRev = overview.recentRevenues
        .filter((r) => r.date === dStr && r.category === 'service')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      const totalServiceRev = overview.recentRevenues
        .filter((r) => r.category === 'service')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      if (totalServiceRev > 0) {
        const proportion = dayServiceRev / totalServiceRev
        dayExp += proportion * overview.provisionedCommissions
      }

      datePoints.push({ label, revenue: dayRev, expense: dayExp })
      curr.setDate(curr.getDate() + 1)
    }
  } else {
    const interval = Math.ceil(diffDays / 6)
    let curr = new Date(start)
    for (let i = 0; i < 6; i++) {
      const chunkStart = new Date(curr)
      const chunkEnd = new Date(curr)
      chunkEnd.setDate(chunkEnd.getDate() + interval)
      if (chunkEnd > end) chunkEnd.setTime(end.getTime())

      const label = `${chunkStart.toLocaleDateString('pt-BR', { day: 'numeric' })} - ${chunkEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
      let revenue = 0
      let expense = 0

      overview.recentRevenues.forEach((r) => {
        const rDate = new Date(r.date + 'T12:00:00')
        if (rDate >= chunkStart && rDate <= chunkEnd) revenue += Number(r.amount)
      })

      overview.recentExpenses.forEach((e) => {
        const eDate = new Date(e.date + 'T12:00:00')
        if (eDate >= chunkStart && eDate <= chunkEnd) expense += Number(e.amount)
      })

      const chunkServiceRev = overview.recentRevenues
        .filter((r) => {
          const rDate = new Date(r.date + 'T12:00:00')
          return r.category === 'service' && rDate >= chunkStart && rDate <= chunkEnd
        })
        .reduce((sum, r) => sum + Number(r.amount), 0)

      const totalServiceRev = overview.recentRevenues
        .filter((r) => r.category === 'service')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      if (totalServiceRev > 0) {
        const proportion = chunkServiceRev / totalServiceRev
        expense += proportion * overview.provisionedCommissions
      }

      datePoints.push({ label, revenue, expense })
      curr.setDate(curr.getDate() + interval + 1)
    }
  }

  // Draw chart path properties
  const maxVal = Math.max(...datePoints.map((p) => Math.max(p.revenue, p.expense)), 100)
  const chartWidth = 600
  const chartHeight = 200
  const paddingLeft = 50
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 30

  const getCoordinates = (index: number, value: number) => {
    const totalPoints = datePoints.length
    const x = paddingLeft + (index * (chartWidth - paddingLeft - paddingRight)) / Math.max(1, totalPoints - 1)
    const y = chartHeight - paddingBottom - (value / maxVal) * (chartHeight - paddingTop - paddingBottom)
    return { x, y }
  }

  // Build path strings
  let revenuePathStr = ''
  let expensePathStr = ''
  let revenueAreaStr = ''
  let expenseAreaStr = ''

  if (datePoints.length > 0) {
    // Revenue Path
    const startPtRev = getCoordinates(0, datePoints[0].revenue)
    revenuePathStr = `M ${startPtRev.x} ${startPtRev.y}`
    revenueAreaStr = `M ${startPtRev.x} ${chartHeight - paddingBottom} L ${startPtRev.x} ${startPtRev.y}`

    // Expense Path
    const startPtExp = getCoordinates(0, datePoints[0].expense)
    expensePathStr = `M ${startPtExp.x} ${startPtExp.y}`
    expenseAreaStr = `M ${startPtExp.x} ${chartHeight - paddingBottom} L ${startPtExp.x} ${startPtExp.y}`

    for (let i = 1; i < datePoints.length; i++) {
      const ptRev = getCoordinates(i, datePoints[i].revenue)
      revenuePathStr += ` L ${ptRev.x} ${ptRev.y}`
      revenueAreaStr += ` L ${ptRev.x} ${ptRev.y}`

      const ptExp = getCoordinates(i, datePoints[i].expense)
      expensePathStr += ` L ${ptExp.x} ${ptExp.y}`
      expenseAreaStr += ` L ${ptExp.x} ${ptExp.y}`
    }

    const lastPtRev = getCoordinates(datePoints.length - 1, datePoints[datePoints.length - 1].revenue)
    revenueAreaStr += ` L ${lastPtRev.x} ${chartHeight - paddingBottom} Z`

    const lastPtExp = getCoordinates(datePoints.length - 1, datePoints[datePoints.length - 1].expense)
    expenseAreaStr += ` L ${lastPtExp.x} ${chartHeight - paddingBottom} Z`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="Painel Financeiro"
          description="Acompanhe o faturamento, despesas de caixa e comissões da sua barbearia."
        />

        {/* Date Filters Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange('this_month')}
            className="text-xs font-semibold border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300"
          >
            Este Mês
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange('last_30')}
            className="text-xs font-semibold border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300"
          >
            Últimos 30 dias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange('this_year')}
            className="text-xs font-semibold border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300"
          >
            Este Ano
          </Button>

          {/* Manual Date Filter Dropdown Form */}
          <form onSubmit={handleFilterSubmit} className="flex items-center gap-2 border border-zinc-800/80 bg-zinc-950 p-1.5 rounded-lg">
            <CalendarRange className="h-4 w-4 text-zinc-500 ml-1.5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-0 text-xs text-zinc-350 focus:outline-none focus:ring-0 max-w-[115px] p-0"
            />
            <span className="text-zinc-650 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-0 text-xs text-zinc-350 focus:outline-none focus:ring-0 max-w-[115px] p-0"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold py-1 px-2.5 h-7 rounded"
            >
              Filtrar
            </Button>
          </form>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Primary Indicators Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Revenues */}
        <Card className="relative overflow-hidden p-6 bg-zinc-950 border border-zinc-900 shadow-md group hover:border-amber-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Faturamento Total</p>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-50 font-mono">
              {formatPrice(overview.totalRevenues)}
            </h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Serviços:</span>
                <span className="font-mono text-zinc-300">
                  {formatPrice(overview.revenuesByCategory.find(c => c.category === 'service')?.value || 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Produtos:</span>
                <span className="font-mono text-zinc-300">
                  {formatPrice(overview.revenuesByCategory.find(c => c.category === 'product')?.value || 0)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Metric 2: Expenses */}
        <Card className="relative overflow-hidden p-6 bg-zinc-950 border border-zinc-900 shadow-md group hover:border-red-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Saídas e Custos</p>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-50 font-mono">
              {formatPrice(overview.totalExpenses)}
            </h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Despesas Fixas/Variáveis:</span>
                <span className="font-mono text-zinc-300">
                  {formatPrice(overview.totalExpenses - overview.provisionedCommissions)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Comissões Prov.:</span>
                <span className="font-mono text-zinc-300">
                  {formatPrice(overview.provisionedCommissions)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Metric 3: Profit */}
        <Card className={`relative overflow-hidden p-6 bg-zinc-950 border shadow-md group transition-all duration-300 ${overview.netProfit >= 0 ? 'border-emerald-500/10 hover:border-emerald-500/30' : 'border-rose-500/10 hover:border-rose-500/30'}`}>
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Lucro Líquido</p>
            <div className={`p-2 rounded-lg ${overview.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold font-mono ${overview.netProfit >= 0 ? 'text-emerald-400' : 'text-red-450'}`}>
              {formatPrice(overview.netProfit)}
            </h3>
            <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              <span>Descontado a comissão dos barbeiros.</span>
            </p>
          </div>
        </Card>

        {/* Metric 4: Ticket & Efficiency */}
        <Card className="relative overflow-hidden p-6 bg-zinc-950 border border-zinc-900 shadow-md group hover:border-amber-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Produtividade</p>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-50 font-mono">
              {formatPrice(overview.averageTicket)}
            </h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Atendimentos Concluídos:</span>
                <span className="font-mono text-zinc-300">{overview.completedAppointmentsCount}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Produtos Vendidos:</span>
                <span className="font-mono text-zinc-300">{overview.productsSoldQuantity} un</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Cashflow evolution chart */}
      <Card className="p-6 bg-zinc-950 border border-zinc-900 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-zinc-200">Evolução do Caixa</h3>
            <p className="text-xs text-zinc-500">Visualização de faturamento e despesas ao longo do período selecionado.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-amber-500 inline-block" />
              <span className="text-zinc-400">Faturamento</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-rose-500 inline-block" />
              <span className="text-zinc-400">Custos / Despesas</span>
            </span>
          </div>
        </div>

        {datePoints.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            Selecione um período maior para visualizar a linha do tempo.
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible"
              aria-label="Evolução do Caixa"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingLeft} y1={paddingTop} x2={chartWidth - paddingRight} y2={paddingTop} stroke="#27272a" strokeWidth={0.5} />
              <line x1={paddingLeft} y1={(chartHeight - paddingBottom - paddingTop) / 2 + paddingTop} x2={chartWidth - paddingRight} y2={(chartHeight - paddingBottom - paddingTop) / 2 + paddingTop} stroke="#27272a" strokeWidth={0.5} />
              <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="#3f3f46" strokeWidth={1} />

              {/* Chart Areas */}
              <path d={revenueAreaStr} fill="url(#revenueGrad)" />
              <path d={expenseAreaStr} fill="url(#expenseGrad)" />

              {/* Chart Lines */}
              <path d={revenuePathStr} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
              <path d={expensePathStr} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />

              {/* Labels */}
              {/* Max Val on Y-axis */}
              <text x={paddingLeft - 10} y={paddingTop + 4} textAnchor="end" className="text-[10px] font-mono fill-zinc-500">
                {formatPrice(maxVal)}
              </text>
              <text x={paddingLeft - 10} y={chartHeight - paddingBottom + 4} textAnchor="end" className="text-[10px] font-mono fill-zinc-500">
                R$ 0
              </text>

              {/* X-axis labels (render up to 6 labels to avoid text overlap) */}
              {datePoints.map((pt, i) => {
                const step = Math.ceil(datePoints.length / 6)
                if (i % step !== 0 && i !== datePoints.length - 1) return null
                const coords = getCoordinates(i, 0)
                return (
                  <text
                    key={i}
                    x={coords.x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className="text-[9px] fill-zinc-500 font-semibold"
                  >
                    {pt.label}
                  </text>
                )
              })}
            </svg>
          </div>
        )}
      </Card>

      {/* Ledger Lists / Recent transactions section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Share break down */}
        <Card className="p-6 bg-zinc-950 border border-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-200 mb-4">Fontes e Distribuição</h3>

            {/* Revenue Break down list */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Detalhamento das Receitas</span>
                <div className="space-y-2">
                  {overview.revenuesByCategory.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">{REV_CATEGORY_LABELS[cat.category] || cat.category}</span>
                        <span className="font-mono font-bold text-zinc-350">{formatPrice(cat.value)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${overview.totalRevenues > 0 ? (cat.value / overview.totalRevenues) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense breakdown list */}
              <div className="pt-4 border-t border-zinc-900">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Detalhamento de Custos e Comissões</span>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {overview.expensesByCategory
                    .filter((c) => c.value > 0)
                    .map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{EXP_CATEGORY_LABELS[cat.category] || cat.category}</span>
                          <span className="font-mono font-bold text-zinc-350">{formatPrice(cat.value)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${overview.totalExpenses > 0 ? (cat.value / overview.totalExpenses) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  {overview.expensesByCategory.filter((c) => c.value > 0).length === 0 && (
                    <p className="text-xs text-zinc-500 italic">Nenhuma despesa ou comissão no período.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-900 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setRevenueSheetOpen(true)}
              className="w-full flex-1 gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-200"
            >
              <Plus className="h-4 w-4 text-emerald-500" />
              Ajuste de Receita
            </Button>
            <Button
              onClick={() => setExpenseSheetOpen(true)}
              className="w-full flex-1 gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-200"
            >
              <Plus className="h-4 w-4 text-red-500" />
              Lançar Despesa
            </Button>
          </div>
        </Card>

        {/* Recent Ledger ledger list */}
        <Card className="lg:col-span-2 p-6 bg-zinc-950 border border-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-zinc-200">Extrato de Caixa</h3>
              {/* Tab Selector */}
              <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-850">
                <button
                  onClick={() => setActiveTab('revenues')}
                  className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${activeTab === 'revenues' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-450 hover:text-zinc-200'}`}
                >
                  Entradas ({overview.recentRevenues.length})
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${activeTab === 'expenses' ? 'bg-amber-500 text-zinc-950 shadow' : 'text-zinc-450 hover:text-zinc-200'}`}
                >
                  Saídas ({overview.recentExpenses.length})
                </button>
              </div>
            </div>

            {/* List entries */}
            <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1">
              {activeTab === 'revenues' ? (
                <>
                  {overview.recentRevenues.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 bg-zinc-900/40 border border-zinc-900/60 rounded-lg flex items-center justify-between hover:border-zinc-800 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            {REV_CATEGORY_LABELS[rev.category] || rev.category}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            {new Date(rev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-200 leading-snug">{rev.description}</p>
                        {rev.payment_method && (
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                            Forma: {PAYMENT_METHOD_LABELS[rev.payment_method] || rev.payment_method}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          +{formatPrice(rev.amount)}
                        </span>
                        {!rev.reference_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(rev.id, 'revenue')}
                            className="h-7 w-7 text-zinc-500 hover:text-red-500 hover:bg-zinc-800/50"
                            title="Remover lançamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {overview.recentRevenues.length === 0 && (
                    <p className="text-sm text-zinc-500 italic text-center py-8">Nenhuma receita registrada neste período.</p>
                  )}
                </>
              ) : (
                <>
                  {overview.recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 bg-zinc-900/40 border border-zinc-900/60 rounded-lg flex items-center justify-between hover:border-zinc-800 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-455">
                            {EXP_CATEGORY_LABELS[exp.category] || exp.category}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-200 leading-snug">{exp.description}</p>
                        {exp.is_recurring && (
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                            Recorrente mensal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-rose-455 font-mono">
                          -{formatPrice(exp.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(exp.id, 'expense')}
                          className="h-7 w-7 text-zinc-500 hover:text-red-500 hover:bg-zinc-800/50"
                          title="Remover despesa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {overview.recentExpenses.length === 0 && (
                    <p className="text-sm text-zinc-500 italic text-center py-8">Nenhuma despesa de caixa registrada neste período.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Slide-over Sheet for manual expense registration */}
      <Sheet
        open={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        title="Lançar Despesa de Caixa"
        description="Lançamento manual de custos de operação, aluguel, produtos etc."
      >
        <form onSubmit={handleCreateExpense} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="exp-category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Categoria *
              </label>
              <select
                id="exp-category"
                required
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
              >
                <option value="other">Outros</option>
                <option value="rent">Aluguel / Imóvel</option>
                <option value="energy">Energia Elétrica</option>
                <option value="water">Água</option>
                <option value="internet">Internet / Telefone</option>
                <option value="products">Produtos / Estoque</option>
                <option value="maintenance">Manutenção / Reparos</option>
                <option value="marketing">Marketing / Anúncios</option>
              </select>
            </div>

            <div>
              <label htmlFor="exp-description" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Descrição / Favorecido *
              </label>
              <input
                id="exp-description"
                type="text"
                required
                placeholder="Ex: Conta de energia elétrica de Maio"
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="exp-amount" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Valor (R$) *
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-650 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="exp-date" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Data de Pagamento *
                </label>
                <input
                  id="exp-date"
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="exp-recurring"
                type="checkbox"
                checked={expRecurring}
                onChange={(e) => setExpRecurring(e.target.checked)}
                className="rounded border-zinc-800 bg-zinc-950 text-amber-500 focus:ring-0"
              />
              <label htmlFor="exp-recurring" className="text-sm text-zinc-400 cursor-pointer select-none">
                Esta despesa se repete todo mês (Despesa Recorrente)
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseSheetOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 shadow-md shadow-amber-500/10"
            >
              {isPending ? 'Lançando...' : 'Lançar Despesa'}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Slide-over Sheet for manual revenue adjustment */}
      <Sheet
        open={revenueSheetOpen}
        onClose={() => setRevenueSheetOpen(false)}
        title="Lançar Ajuste Manual / Entrada"
        description="Inserção manual de valores no caixa que não são de agendamentos."
      >
        <form onSubmit={handleCreateRevenue} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="rev-category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Categoria *
              </label>
              <select
                id="rev-category"
                required
                value={revCategory}
                onChange={(e) => setRevCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
              >
                <option value="manual_adjustment">Ajuste Manual / Outros</option>
                <option value="service">Avulso de Serviço</option>
                <option value="product">Venda Manual de Produto</option>
              </select>
            </div>

            <div>
              <label htmlFor="rev-description" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Descrição do Lançamento *
              </label>
              <input
                id="rev-description"
                type="text"
                required
                placeholder="Ex: Entrada de patrocínio ou venda de curso"
                value={revDescription}
                onChange={(e) => setRevDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rev-amount" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Valor (R$) *
                </label>
                <input
                  id="rev-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-650 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="rev-date" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Data de Recebimento *
                </label>
                <input
                  id="rev-date"
                  type="date"
                  required
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rev-payment" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Forma de Recebimento *
              </label>
              <select
                id="rev-payment"
                required
                value={revPaymentMethod}
                onChange={(e) => setRevPaymentMethod(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-amber-500 rounded-lg p-3 text-zinc-200 focus:outline-none transition-colors"
              >
                <option value="pix">Pix</option>
                <option value="money">Dinheiro</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevenueSheetOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 shadow-md shadow-amber-500/10"
            >
              {isPending ? 'Lançando...' : 'Confirmar Lançamento'}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeleteItem(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Remover Lançamento"
        description="Tem certeza que deseja estornar este lançamento financeiro manual? Esta operação é irreversível."
        confirmLabel="Confirmar Estorno"
        confirmVariant="destructive"
        loading={isPending}
      />
    </div>
  )
}
