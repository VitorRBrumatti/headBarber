'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export interface FinancialRevenue {
  id: string
  category: string
  description: string | null
  amount: number
  date: string
  payment_method: string | null
  reference_id: string | null
  source: string
}

export interface FinancialExpense {
  id: string
  category: string
  description: string | null
  amount: number
  date: string
  is_recurring: boolean
}
export interface FinancialOverview {
  totalRevenues: number
  totalExpenses: number
  netProfit: number
  averageTicket: number
  completedAppointmentsCount: number
  productsSoldQuantity: number
  provisionedCommissions: number
  subscriptionRevenue: number
  activeSubscribers: number
  renewalsDue: number
  coveredAppointmentsCount: number
  coveredAttendanceValue: number
  averageConsumptionPerSubscriber: number
  averageRevenuePerSubscriber: number
  revenuesByCategory: { category: string; value: number }[]
  expensesByCategory: { category: string; value: number }[]
  recentRevenues: FinancialRevenue[]
  recentExpenses: FinancialExpense[]
}

export async function getFinancialOverview(
  startDateStr: string,
  endDateStr: string,
): Promise<FinancialOverview> {
  const { supabase, barbershopId } = await getBarbershopId()
  const startTimestamp = `${startDateStr}T00:00:00`
  const endTimestamp = `${endDateStr}T23:59:59`

  const [
    revenuesResult,
    expensesResult,
    appointmentsResult,
    productSalesResult,
    subscriptionsResult,
    allocationsResult,
  ] = await Promise.all([
    supabase
      .from('revenues')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false }),
    supabase
      .from('appointments')
      .select('id, total_price, subscription_covered_total, commission_amount')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .gte('start_at', startTimestamp)
      .lte('start_at', endTimestamp),
    supabase
      .from('product_sales')
      .select('quantity')
      .eq('barbershop_id', barbershopId)
      .gte('created_at', startTimestamp)
      .lte('created_at', endTimestamp),
    supabase
      .from('client_subscriptions')
      .select('id, status, next_billing_date')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'active'),
    supabase
      .from('appointment_subscription_allocations')
      .select('appointment_id, covered_amount, status')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'consumed')
      .gte('consumed_at', startTimestamp)
      .lte('consumed_at', endTimestamp),
  ])

  if (revenuesResult.error) {
    throw new Error(`Erro ao buscar receitas: ${revenuesResult.error.message}`)
  }
  if (expensesResult.error) {
    throw new Error(`Erro ao buscar despesas: ${expensesResult.error.message}`)
  }
  if (appointmentsResult.error) {
    throw new Error(
      `Erro ao buscar atendimentos: ${appointmentsResult.error.message}`,
    )
  }
  if (productSalesResult.error) {
    throw new Error(
      `Erro ao buscar quantidade de produtos: ${productSalesResult.error.message}`,
    )
  }
  if (subscriptionsResult.error) {
    throw new Error(
      `Erro ao buscar assinantes: ${subscriptionsResult.error.message}`,
    )
  }
  if (allocationsResult.error) {
    throw new Error(
      `Erro ao buscar consumo de assinaturas: ${allocationsResult.error.message}`,
    )
  }

  const revenues = revenuesResult.data ?? []
  const expenses = expensesResult.data ?? []
  const appointments = appointmentsResult.data ?? []
  const productSales = productSalesResult.data ?? []
  const activeSubscriptions = subscriptionsResult.data ?? []
  const consumedAllocations = allocationsResult.data ?? []

  const totalRevenues = revenues.reduce(
    (sum, revenue) => sum + Number(revenue.amount),
    0,
  )
  const subscriptionRevenue = revenues
    .filter((revenue) => revenue.source === 'subscription_cycle')
    .reduce((sum, revenue) => sum + Number(revenue.amount), 0)
  const provisionedCommissions = appointments.reduce(
    (sum, appointment) => sum + Number(appointment.commission_amount ?? 0),
    0,
  )
  const manualExpensesSum = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  )
  const totalExpenses = manualExpensesSum + provisionedCommissions
  const netProfit = totalRevenues - totalExpenses
  const completedAppointmentsCount = appointments.length
  const operationalAttendanceValue = appointments.reduce(
    (sum, appointment) => sum + Number(appointment.total_price),
    0,
  )
  const averageTicket =
    completedAppointmentsCount > 0
      ? operationalAttendanceValue / completedAppointmentsCount
      : 0
  const productsSoldQuantity = productSales.reduce(
    (sum, sale) => sum + Number(sale.quantity),
    0,
  )

  const activeSubscribers = activeSubscriptions.length
  const renewalsDue = activeSubscriptions.filter(
    (subscription) =>
      subscription.next_billing_date >= startDateStr &&
      subscription.next_billing_date <= endDateStr,
  ).length
  const coveredAppointmentIds = new Set(
    consumedAllocations.map((allocation) => allocation.appointment_id),
  )
  const coveredAppointmentsCount = coveredAppointmentIds.size
  const coveredAttendanceValue = consumedAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.covered_amount),
    0,
  )
  const averageConsumptionPerSubscriber =
    activeSubscribers > 0 ? consumedAllocations.length / activeSubscribers : 0
  const averageRevenuePerSubscriber =
    activeSubscribers > 0 ? subscriptionRevenue / activeSubscribers : 0

  const revCatMap: Record<string, number> = {
    service: 0,
    product: 0,
    monthly_plan: 0,
    manual_adjustment: 0,
  }
  revenues.forEach((revenue) => {
    revCatMap[revenue.category] =
      (revCatMap[revenue.category] ?? 0) + Number(revenue.amount)
  })
  const revenuesByCategory = Object.entries(revCatMap).map(
    ([category, value]) => ({ category, value }),
  )

  const expCatMap: Record<string, number> = {
    rent: 0,
    energy: 0,
    water: 0,
    internet: 0,
    products: 0,
    commission: provisionedCommissions,
    maintenance: 0,
    marketing: 0,
    other: 0,
  }
  expenses.forEach((expense) => {
    expCatMap[expense.category] =
      (expCatMap[expense.category] ?? 0) + Number(expense.amount)
  })
  const expensesByCategory = Object.entries(expCatMap).map(
    ([category, value]) => ({ category, value }),
  )

  return {
    totalRevenues,
    totalExpenses,
    netProfit,
    averageTicket,
    completedAppointmentsCount,
    productsSoldQuantity,
    provisionedCommissions,
    subscriptionRevenue,
    activeSubscribers,
    renewalsDue,
    coveredAppointmentsCount,
    coveredAttendanceValue,
    averageConsumptionPerSubscriber,
    averageRevenuePerSubscriber,
    revenuesByCategory,
    expensesByCategory,
    recentRevenues: revenues,
    recentExpenses: expenses,
  }
}
export async function createExpenseAction(formData: {
  category: string
  description: string
  amount: number
  date: string
  is_recurring: boolean
}) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase.from('expenses').insert({
    barbershop_id: barbershopId,
    category: formData.category,
    description: formData.description || null,
    amount: formData.amount,
    date: formData.date,
    is_recurring: formData.is_recurring,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}

export async function deleteExpenseAction(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}

export async function createManualRevenueAction(formData: {
  category: string
  description: string
  amount: number
  date: string
  payment_method: string
}) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase.from('revenues').insert({
    barbershop_id: barbershopId,
    category: formData.category,
    description: formData.description || null,
    amount: formData.amount,
    date: formData.date,
    payment_method: formData.payment_method,
    source: 'manual',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}

export async function deleteManualRevenueAction(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { data, error } = await supabase
    .from('revenues')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)
    .eq('source', 'manual')
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Somente receitas manuais podem ser removidas.')

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}
