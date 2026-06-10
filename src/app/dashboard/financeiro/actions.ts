'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export interface FinancialOverview {
  totalRevenues: number
  totalExpenses: number
  netProfit: number
  averageTicket: number
  completedAppointmentsCount: number
  productsSoldQuantity: number
  provisionedCommissions: number
  revenuesByCategory: { category: string; value: number }[]
  expensesByCategory: { category: string; value: number }[]
  recentRevenues: any[]
  recentExpenses: any[]
}

export async function getFinancialOverview(
  startDateStr: string,
  endDateStr: string
): Promise<FinancialOverview> {
  const { supabase, barbershopId } = await getBarbershopId()

  // 1. Fetch all revenues in range
  const { data: revenues, error: revError } = await supabase
    .from('revenues')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: false })

  if (revError) throw new Error(`Erro ao buscar receitas: ${revError.message}`)

  // 2. Fetch all manual/recorded expenses in range
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: false })

  if (expError) throw new Error(`Erro ao buscar despesas: ${expError.message}`)

  // 3. Calculate provisioned commissions from completed appointments
  // Query appointments where status = completed and start_at is in date range
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('total_price, barbers(commission_percentage)')
    .eq('status', 'completed')
    .eq('barbershop_id', barbershopId)
    .gte('start_at', `${startDateStr}T00:00:00`)
    .lte('start_at', `${endDateStr}T23:59:59`)

  if (apptError) throw new Error(`Erro ao buscar comissões: ${apptError.message}`)

  let provisionedCommissions = 0
  appointments?.forEach((appt: any) => {
    // barbers could be an object because of the relationship
    const commissionPercent = appt.barbers?.commission_percentage || 0
    provisionedCommissions += (appt.total_price * Number(commissionPercent)) / 100
  })

  // 4. Calculate total products sold quantity in range
  const { data: productSales, error: salesError } = await supabase
    .from('product_sales')
    .select('quantity')
    .eq('barbershop_id', barbershopId)
    .gte('created_at', `${startDateStr}T00:00:00`)
    .lte('created_at', `${endDateStr}T23:59:59`)

  if (salesError) throw new Error(`Erro ao buscar quantidade de produtos: ${salesError.message}`)

  const productsSoldQuantity = productSales?.reduce((acc, sale) => acc + sale.quantity, 0) || 0

  // 5. Compute sums
  const totalRevenues = revenues?.reduce((sum, rev) => sum + Number(rev.amount), 0) || 0
  const manualExpensesSum = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
  const totalExpenses = manualExpensesSum + provisionedCommissions
  const netProfit = totalRevenues - totalExpenses

  // Average Ticket for completed appointments (service category in revenues)
  const serviceRevenues = revenues?.filter((r) => r.category === 'service') || []
  const serviceRevenueSum = serviceRevenues.reduce((sum, r) => sum + Number(r.amount), 0)
  const completedAppointmentsCount = serviceRevenues.length
  const averageTicket = completedAppointmentsCount > 0 ? serviceRevenueSum / completedAppointmentsCount : 0

  // 6. Aggregate by category
  const revCatMap: Record<string, number> = {
    service: 0,
    product: 0,
    monthly_plan: 0,
    manual_adjustment: 0,
  }
  revenues?.forEach((r) => {
    if (revCatMap[r.category] !== undefined) {
      revCatMap[r.category] += Number(r.amount)
    }
  })
  const revenuesByCategory = Object.entries(revCatMap).map(([category, value]) => ({
    category,
    value,
  }))

  const expCatMap: Record<string, number> = {
    rent: 0,
    energy: 0,
    water: 0,
    internet: 0,
    products: 0,
    commission: provisionedCommissions, // Seed with the dynamic commission
    maintenance: 0,
    marketing: 0,
    other: 0,
  }
  expenses?.forEach((e) => {
    if (expCatMap[e.category] !== undefined) {
      expCatMap[e.category] += Number(e.amount)
    } else {
      expCatMap[e.category] = Number(e.amount)
    }
  })
  const expensesByCategory = Object.entries(expCatMap).map(([category, value]) => ({
    category,
    value,
  }))

  return {
    totalRevenues,
    totalExpenses,
    netProfit,
    averageTicket,
    completedAppointmentsCount,
    productsSoldQuantity,
    provisionedCommissions,
    revenuesByCategory,
    expensesByCategory,
    recentRevenues: revenues || [],
    recentExpenses: expenses || [],
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
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}

export async function deleteManualRevenueAction(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('revenues')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')
}
