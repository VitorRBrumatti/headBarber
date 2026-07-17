'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  DollarSign,
  Info,
  Percent,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FinancialEntryDrawer } from './financial-entry-drawer'
import { FinancialOverview, deleteExpenseAction, deleteManualRevenueAction } from './actions'

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
  commission: 'Comissões provisionadas',
  maintenance: 'Manutenção',
  marketing: 'Marketing',
  other: 'Outras despesas',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  money: 'Dinheiro',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  other: 'Outro',
}

const financeSurface = 'border !border-[#e0e2e9] !bg-white !text-[#181c21] shadow-[0_4px_12px_rgba(27,27,30,0.04)] dark:!border-[#e0e2e9] dark:!bg-white dark:!text-[#181c21] dark:!backdrop-blur-none'
const financeTitle = 'font-montserrat font-semibold text-[#181c21]'
const financeLabel = 'text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]'

export function FinanceiroClient({ overview, initialStartDate, initialEndDate }: FinanceiroClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: 'revenue' | 'expense' } | null>(null)
  const [activeTab, setActiveTab] = useState<'revenues' | 'expenses'>('revenues')

  const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)

  const updateUrlDates = (start: string, end: string) => {
    const params = new URLSearchParams({ start, end })
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateUrlDates(startDate, endDate)
  }

  const handleQuickRange = (rangeType: 'this_month' | 'last_30' | 'this_year') => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    let start = ''
    let end = currentDate.toISOString().split('T')[0]

    if (rangeType === 'this_month') {
      start = new Date(year, month, 1).toISOString().split('T')[0]
      end = new Date(year, month + 1, 0).toISOString().split('T')[0]
    } else if (rangeType === 'last_30') {
      const previous = new Date(currentDate)
      previous.setDate(currentDate.getDate() - 30)
      start = previous.toISOString().split('T')[0]
    } else {
      start = `${year}-01-01`
    }

    setStartDate(start)
    setEndDate(end)
    updateUrlDates(start, end)
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
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Não foi possível estornar o lançamento.')
      }
    })
  }

  const datePoints: { label: string; revenue: number; expense: number }[] = []
  const periodStart = new Date(`${initialStartDate}T00:00:00`)
  const periodEnd = new Date(`${initialEndDate}T23:59:59`)
  const diffDays = Math.ceil(Math.abs(periodEnd.getTime() - periodStart.getTime()) / 86_400_000)
  const totalServiceRevenue = overview.recentRevenues
    .filter((revenue) => revenue.category === 'service')
    .reduce((sum, revenue) => sum + Number(revenue.amount), 0)

  if (diffDays <= 35) {
    const current = new Date(periodStart)
    while (current <= periodEnd) {
      const date = current.toISOString().split('T')[0]
      const revenue = overview.recentRevenues
        .filter((item) => item.date === date)
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const serviceRevenue = overview.recentRevenues
        .filter((item) => item.date === date && item.category === 'service')
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const cashExpenses = overview.recentExpenses
        .filter((item) => item.date === date)
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const commission = totalServiceRevenue > 0
        ? (serviceRevenue / totalServiceRevenue) * overview.provisionedCommissions
        : 0
      datePoints.push({
        label: current.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
        revenue,
        expense: cashExpenses + commission,
      })
      current.setDate(current.getDate() + 1)
    }
  } else {
    const interval = Math.ceil(diffDays / 6)
    const current = new Date(periodStart)
    for (let index = 0; index < 6 && current <= periodEnd; index += 1) {
      const chunkStart = new Date(current)
      const chunkEnd = new Date(current)
      chunkEnd.setDate(chunkEnd.getDate() + interval)
      if (chunkEnd > periodEnd) chunkEnd.setTime(periodEnd.getTime())
      const inChunk = (date: string) => {
        const parsed = new Date(`${date}T12:00:00`)
        return parsed >= chunkStart && parsed <= chunkEnd
      }
      const revenue = overview.recentRevenues
        .filter((item) => inChunk(item.date))
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const serviceRevenue = overview.recentRevenues
        .filter((item) => item.category === 'service' && inChunk(item.date))
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const cashExpenses = overview.recentExpenses
        .filter((item) => inChunk(item.date))
        .reduce((sum, item) => sum + Number(item.amount), 0)
      const commission = totalServiceRevenue > 0
        ? (serviceRevenue / totalServiceRevenue) * overview.provisionedCommissions
        : 0
      datePoints.push({
        label: `${chunkStart.toLocaleDateString('pt-BR', { day: 'numeric' })}–${chunkEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`,
        revenue,
        expense: cashExpenses + commission,
      })
      current.setDate(current.getDate() + interval + 1)
    }
  }

  const chartWidth = 720
  const chartHeight = 280
  const chartLeft = 68
  const chartRight = 18
  const chartTop = 28
  const chartBottom = 46
  const rawMaxValue = Math.max(...datePoints.map((point) => Math.max(point.revenue, point.expense)), 0)
  const maxValue = Math.max(rawMaxValue * 1.12, 100)
  const hasChartActivity = datePoints.some((point) => point.revenue > 0 || point.expense > 0)
  const coordinates = (index: number, value: number) => ({
    x: chartLeft + (index * (chartWidth - chartLeft - chartRight)) / Math.max(datePoints.length - 1, 1),
    y: chartHeight - chartBottom - (value / maxValue) * (chartHeight - chartTop - chartBottom),
  })
  const linePath = (key: 'revenue' | 'expense') => datePoints
    .map((point, index) => {
      const { x, y } = coordinates(index, point[key])
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
  const areaPath = (key: 'revenue' | 'expense') => {
    if (datePoints.length === 0) return ''
    const first = coordinates(0, datePoints[0][key])
    const last = coordinates(datePoints.length - 1, datePoints[datePoints.length - 1][key])
    return `M ${first.x} ${chartHeight - chartBottom} ${linePath(key).replace(/^M/, 'L')} L ${last.x} ${chartHeight - chartBottom} Z`
  }

  const revenueCategories = overview.revenuesByCategory.filter((category) => category.value > 0)
  const expenseCategories = overview.expensesByCategory.filter((category) => category.value > 0)

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 bg-white p-4 font-inter text-[#181c21] [color-scheme:light] sm:p-6 lg:p-8">
      <header className="flex flex-col gap-5 border-b border-[#e0e2e9] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold tracking-[-0.02em] sm:text-[32px]">Financeiro</h1>
          <p className="mt-2 text-sm text-[#47464b]">Acompanhe receitas, despesas e o desempenho da sua barbearia.</p>
        </div>
        <button type="button" onClick={() => setEntryDrawerOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#C79A4A] px-5 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#1b1b1e] transition-all hover:bg-[#d7aa5a] active:translate-y-px sm:w-auto">
          <Plus className="h-4 w-4" strokeWidth={2} />Novo Lançamento
        </button>
      </header>

      <section aria-label="Filtros financeiros" className="flex flex-col gap-3 rounded-lg border border-[#e0e2e9] bg-white p-3 shadow-[0_4px_12px_rgba(27,27,30,0.04)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ['this_month', 'Mês atual'],
            ['last_30', 'Últimos 30 dias'],
            ['this_year', 'Ano atual'],
          ].map(([range, label]) => (
            <button key={range} type="button" onClick={() => handleQuickRange(range as 'this_month' | 'last_30' | 'this_year')} className="rounded-full border border-[#c8c5cb] bg-white px-3 py-2 text-xs font-semibold text-[#47464b] transition-all hover:bg-[#eceef4] active:translate-y-px">
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={handleFilterSubmit} className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <CalendarRange className="hidden h-4 w-4 text-[#47464b] sm:block" strokeWidth={2} />
          <input aria-label="Data inicial" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full min-w-0 rounded-md border border-[#c8c5cb] bg-white px-3 py-2 text-xs outline-none focus:border-[#C79A4A] sm:w-auto" />
          <span className="text-xs text-[#47464b]">até</span>
          <input aria-label="Data final" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full min-w-0 rounded-md border border-[#c8c5cb] bg-white px-3 py-2 text-xs outline-none focus:border-[#C79A4A] sm:w-auto" />
          <button type="submit" disabled={isPending} className="col-span-3 rounded-md border border-[#1b1b1e] px-4 py-2 text-xs font-semibold text-[#1b1b1e] transition-colors hover:bg-[#eceef4] disabled:opacity-60 sm:col-auto">Filtrar</button>
        </form>
      </section>

      {error && <p role="alert" className="rounded-lg border border-[#ba1a1a]/20 bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={`${financeSurface} p-6 transition-transform hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between"><p className={financeLabel}>Faturamento total</p><span className="rounded-md bg-[#e5f5ed] p-2 text-[#047857]"><TrendingUp className="h-4 w-4" /></span></div>
          <h3 data-testid="metric-total-revenues" className="mt-4 font-montserrat text-2xl font-bold text-[#047857]">{formatPrice(overview.totalRevenues)}</h3>
          <div className="mt-4 space-y-2 border-t border-[#e0e2e9] pt-3 text-xs text-[#47464b]">
            <div className="flex justify-between gap-4"><span>Serviços</span><strong className="text-[#181c21]">{formatPrice(overview.revenuesByCategory.find((item) => item.category === 'service')?.value || 0)}</strong></div>
            <div className="flex justify-between gap-4"><span>Produtos</span><strong className="text-[#181c21]">{formatPrice(overview.revenuesByCategory.find((item) => item.category === 'product')?.value || 0)}</strong></div>
          </div>
        </Card>

        <Card className={`${financeSurface} p-6 transition-transform hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between"><p className={financeLabel}>Saídas e custos</p><span className="rounded-md bg-[#ffdad6] p-2 text-[#ba1a1a]"><TrendingDown className="h-4 w-4" /></span></div>
          <h3 data-testid="metric-total-expenses" className="mt-4 font-montserrat text-2xl font-bold text-[#ba1a1a]">{formatPrice(overview.totalExpenses)}</h3>
          <div className="mt-4 space-y-2 border-t border-[#e0e2e9] pt-3 text-xs text-[#47464b]">
            <div className="flex justify-between gap-4"><span>Fixas e variáveis</span><strong className="text-[#181c21]">{formatPrice(overview.totalExpenses - overview.provisionedCommissions)}</strong></div>
            <div className="flex justify-between gap-4"><span>Comissões</span><strong className="text-[#181c21]">{formatPrice(overview.provisionedCommissions)}</strong></div>
          </div>
        </Card>

        <Card className={`${financeSurface} p-6 transition-transform hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between"><p className={financeLabel}>Lucro líquido</p><span className="rounded-md bg-[#f4ead7] p-2 text-[#795506]"><DollarSign className="h-4 w-4" /></span></div>
          <h3 className={`mt-4 font-montserrat text-2xl font-bold ${overview.netProfit >= 0 ? 'text-[#181c21]' : 'text-[#ba1a1a]'}`}>{formatPrice(overview.netProfit)}</h3>
          <p className="mt-4 flex items-center gap-1 border-t border-[#e0e2e9] pt-3 text-xs text-[#47464b]">
            {overview.netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-[#047857]" /> : <ArrowDownRight className="h-4 w-4 text-[#ba1a1a]" />}
            Resultado após despesas e comissões
          </p>
        </Card>

        <Card className={`${financeSurface} p-6 transition-transform hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between"><p className={financeLabel}>Produtividade</p><span className="rounded-md bg-[#eceef4] p-2 text-[#47464b]"><Percent className="h-4 w-4" /></span></div>
          <h3 className="mt-4 font-montserrat text-2xl font-bold">{formatPrice(overview.averageTicket)}</h3>
          <p className="mt-1 text-xs text-[#47464b]">Ticket médio de serviços</p>
          <div className="mt-4 flex items-center justify-between border-t border-[#e0e2e9] pt-3 text-xs text-[#47464b]"><span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />Produtos vendidos</span><strong className="text-[#181c21]">{overview.productsSoldQuantity}</strong></div>
        </Card>
      </div>

      <Card className={`${financeSurface} p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className={financeTitle}>Receitas vs. despesas</h2><p className="mt-1 text-xs text-[#47464b]">Evolução financeira no período selecionado</p></div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#47464b]"><span className="flex items-center gap-2 rounded-full border border-[#e0e2e9] bg-white px-3 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#C79A4A]" />Receitas</span><span className="flex items-center gap-2 rounded-full border border-[#e0e2e9] bg-white px-3 py-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ba1a1a]" />Despesas</span></div>
        </div>
        {hasChartActivity ? (
          <div className="mt-6 overflow-x-auto rounded-lg border border-[#eceef4] bg-white px-2 py-3 sm:px-4">
            <svg role="img" aria-label="Gráfico de receitas e despesas" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[280px] min-w-[680px] w-full bg-white">
              <defs>
                <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C79A4A" stopOpacity="0.2" /><stop offset="100%" stopColor="#C79A4A" stopOpacity="0" /></linearGradient>
                <linearGradient id="expense-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.12" /><stop offset="100%" stopColor="#ba1a1a" stopOpacity="0" /></linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - chartBottom - ratio * (chartHeight - chartTop - chartBottom)
                return <g key={ratio}><line x1={chartLeft} x2={chartWidth - chartRight} y1={y} y2={y} stroke="#eceef4" strokeWidth="1" /><text x={chartLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="500" fill="#47464b">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(maxValue * ratio)}</text></g>
              })}
              <path d={areaPath('revenue')} fill="url(#revenue-area)" />
              <path d={areaPath('expense')} fill="url(#expense-area)" />
              <path d={linePath('revenue')} fill="none" stroke="#C79A4A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d={linePath('expense')} fill="none" stroke="#ba1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {datePoints.flatMap((point, index) => {
                const revenuePoint = coordinates(index, point.revenue)
                const expensePoint = coordinates(index, point.expense)
                return [
                  <circle key={`revenue-${index}`} cx={revenuePoint.x} cy={revenuePoint.y} r={point.revenue > 0 ? 4 : 0} fill="#ffffff" stroke="#C79A4A" strokeWidth="2.5" />,
                  <circle key={`expense-${index}`} cx={expensePoint.x} cy={expensePoint.y} r={point.expense > 0 ? 4 : 0} fill="#ffffff" stroke="#ba1a1a" strokeWidth="2.5" />,
                ]
              })}
              {datePoints.map((point, index) => {
                const { x } = coordinates(index, 0)
                const show = datePoints.length <= 8 || index % Math.ceil(datePoints.length / 7) === 0 || index === datePoints.length - 1
                return show ? <text key={`${point.label}-${index}`} x={x} y={chartHeight - 12} textAnchor="middle" fontSize="11" fontWeight="500" fill="#47464b">{point.label}</text> : null
              })}
            </svg>
          </div>
        ) : (
          <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-[#d8dbe3] bg-white px-6 text-center">
            <div><TrendingUp className="mx-auto h-6 w-6 text-[#C79A4A]" /><p className="mt-3 font-montserrat text-sm font-semibold text-[#181c21]">Nenhuma movimentação no período</p><p className="mt-1 text-xs text-[#47464b]">Receitas e despesas aparecerão aqui quando forem registradas.</p></div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className={`${financeSurface} p-5 sm:p-6`}>
          <div className="flex items-center justify-between"><h2 className={financeTitle}>Composição</h2><Info className="h-4 w-4 text-[#77767b]" /></div>
          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#047857]"><ArrowUpRight className="h-4 w-4" />Receitas</div>
              <div className="space-y-3">
                {revenueCategories.map((category) => <div key={category.category}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="text-[#47464b]">{REV_CATEGORY_LABELS[category.category] || category.category}</span><strong>{formatPrice(category.value)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eceef4]"><div className="h-full rounded-full bg-[#C79A4A]" style={{ width: `${overview.totalRevenues > 0 ? (category.value / overview.totalRevenues) * 100 : 0}%` }} /></div></div>)}
                {revenueCategories.length === 0 && <p className="rounded-md bg-white p-3 text-xs text-[#77767b]">Nenhuma receita no período.</p>}
              </div>
            </div>
            <div className="border-t border-[#e0e2e9] pt-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#ba1a1a]"><ArrowDownRight className="h-4 w-4" />Despesas</div>
              <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                {expenseCategories.map((category) => <div key={category.category}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="text-[#47464b]">{EXP_CATEGORY_LABELS[category.category] || category.category}</span><strong>{formatPrice(category.value)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eceef4]"><div className="h-full rounded-full bg-[#ba1a1a]" style={{ width: `${overview.totalExpenses > 0 ? (category.value / overview.totalExpenses) * 100 : 0}%` }} /></div></div>)}
                {expenseCategories.length === 0 && <p className="rounded-md bg-white p-3 text-xs text-[#77767b]">Nenhuma despesa no período.</p>}
              </div>
            </div>
          </div>
        </Card>

        <Card className={`${financeSurface} p-5 sm:p-6 lg:col-span-2`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className={financeTitle}>Extrato de caixa</h2><p className="mt-1 text-xs text-[#47464b]">Movimentações recentes do período</p></div>
            <div className="grid grid-cols-2 rounded-lg bg-[#eceef4] p-1">
              <button type="button" onClick={() => setActiveTab('revenues')} aria-pressed={activeTab === 'revenues'} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'revenues' ? 'bg-white text-[#181c21] shadow-sm' : 'text-[#47464b]'}`}>Entradas ({overview.recentRevenues.length})</button>
              <button type="button" onClick={() => setActiveTab('expenses')} aria-pressed={activeTab === 'expenses'} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'expenses' ? 'bg-white text-[#181c21] shadow-sm' : 'text-[#47464b]'}`}>Saídas ({overview.recentExpenses.length})</button>
            </div>
          </div>

          <div className="mt-5 max-h-[470px] space-y-2 overflow-y-auto pr-1">
            {activeTab === 'revenues' ? (
              overview.recentRevenues.length > 0 ? overview.recentRevenues.map((revenue) => (
                <div key={revenue.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#e0e2e9] bg-white p-4 transition-colors hover:border-[#c8c5cb]">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e5f5ed] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#047857]">{REV_CATEGORY_LABELS[revenue.category] || revenue.category}</span><span className="text-xs text-[#47464b]">{new Date(`${revenue.date}T12:00:00`).toLocaleDateString('pt-BR')}</span></div><p className="mt-2 truncate text-sm font-semibold text-[#181c21]">{revenue.description}</p>{revenue.payment_method && <p className="mt-1 text-[10px] uppercase tracking-wide text-[#47464b]">Forma: {PAYMENT_METHOD_LABELS[revenue.payment_method] || revenue.payment_method}</p>}</div>
                  <div className="flex shrink-0 items-center gap-2"><strong className="font-montserrat text-sm text-[#047857]">+{formatPrice(revenue.amount)}</strong>{!revenue.reference_id && <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(revenue.id, 'revenue')} className="h-8 w-8 text-[#77767b] hover:bg-[#ffdad6] hover:text-[#ba1a1a]" title="Remover lançamento"><Trash2 className="h-4 w-4" /></Button>}</div>
                </div>
              )) : <div className="rounded-lg border border-dashed border-[#c8c5cb] bg-white px-5 py-12 text-center"><TrendingUp className="mx-auto h-6 w-6 text-[#C79A4A]" /><p className="mt-3 text-sm font-semibold">Nenhuma receita registrada</p><p className="mt-1 text-xs text-[#47464b]">Crie um lançamento para preencher o extrato.</p></div>
            ) : (
              overview.recentExpenses.length > 0 ? overview.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#e0e2e9] bg-white p-4 transition-colors hover:border-[#c8c5cb]">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#ffdad6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ba1a1a]">{EXP_CATEGORY_LABELS[expense.category] || expense.category}</span><span className="text-xs text-[#47464b]">{new Date(`${expense.date}T12:00:00`).toLocaleDateString('pt-BR')}</span></div><p className="mt-2 truncate text-sm font-semibold text-[#181c21]">{expense.description}</p>{expense.is_recurring && <p className="mt-1 text-[10px] uppercase tracking-wide text-[#47464b]">Recorrente mensal</p>}</div>
                  <div className="flex shrink-0 items-center gap-2"><strong className="font-montserrat text-sm text-[#ba1a1a]">-{formatPrice(expense.amount)}</strong><Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense.id, 'expense')} className="h-8 w-8 text-[#77767b] hover:bg-[#ffdad6] hover:text-[#ba1a1a]" title="Remover despesa"><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              )) : <div className="rounded-lg border border-dashed border-[#c8c5cb] bg-white px-5 py-12 text-center"><TrendingDown className="mx-auto h-6 w-6 text-[#ba1a1a]" /><p className="mt-3 text-sm font-semibold">Nenhuma despesa registrada</p><p className="mt-1 text-xs text-[#47464b]">As saídas manuais aparecerão aqui.</p></div>
            )}
          </div>
        </Card>
      </div>

      <FinancialEntryDrawer open={entryDrawerOpen} onClose={() => setEntryDrawerOpen(false)} />
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteItem(null) }}
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
