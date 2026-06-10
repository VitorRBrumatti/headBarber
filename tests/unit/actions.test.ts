import { describe, it, expect, vi } from 'vitest'
import { getFinancialOverview } from '@/app/dashboard/financeiro/actions'

// Mock datasets
const mockRevenues = [
  { id: '1', category: 'service', amount: 100.0, date: '2026-06-01', payment_method: 'pix' },
  { id: '2', category: 'service', amount: 50.0, date: '2026-06-02', payment_method: 'money' },
  { id: '3', category: 'product', amount: 30.0, date: '2026-06-03', payment_method: 'credit_card' },
]

const mockExpenses = [
  { id: '1', category: 'rent', amount: 40.0, date: '2026-06-01', is_recurring: true },
  { id: '2', category: 'other', amount: 20.0, date: '2026-06-02', is_recurring: false },
]

const mockAppointments = [
  { total_price: 100.0, barbers: { commission_percentage: 30.0 } },
  { total_price: 50.0, barbers: { commission_percentage: 20.0 } },
]

const mockProductSales = [
  { quantity: 2 },
  { quantity: 1 },
]

// Mock getBarbershopId module
vi.mock('@/utils/get-barbershop', () => {
  return {
    getBarbershopId: vi.fn().mockImplementation(async () => {
      const selectMock = (table: string) => {
        let data: any[] = []
        if (table === 'revenues') data = mockRevenues
        else if (table === 'expenses') data = mockExpenses
        else if (table === 'appointments') data = mockAppointments
        else if (table === 'product_sales') data = mockProductSales

        const queryObj = {
          eq: () => queryObj,
          gte: () => queryObj,
          lte: () => queryObj,
          order: () => queryObj,
          then: (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled),
        }
        
        return {
          select: () => queryObj,
        }
      }

      return {
        supabase: {
          from: vi.fn().mockImplementation((table) => selectMock(table)),
        },
        barbershopId: 'test-barbershop-id',
      }
    }),
  }
})

describe('getFinancialOverview', () => {
  it('should correctly calculate financial metrics and group by category', async () => {
    const overview = await getFinancialOverview('2026-06-01', '2026-06-30')

    // 1. Total Revenues: 100 + 50 + 30 = 180
    expect(overview.totalRevenues).toBe(180)

    // 2. Provisioned Commissions:
    // Barber 1: 30% of 100 = 30
    // Barber 2: 20% of 50 = 10
    // Total Commissions = 40
    expect(overview.provisionedCommissions).toBe(40)

    // 3. Total Expenses: Manual (40 + 20) + Commission (40) = 100
    expect(overview.totalExpenses).toBe(100)

    // 4. Net Profit: 180 - 100 = 80
    expect(overview.netProfit).toBe(80)

    // 5. Products sold quantity: 2 + 1 = 3
    expect(overview.productsSoldQuantity).toBe(3)

    // 6. Ticket average for completed appointments:
    // Service revenues: 100 + 50 = 150
    // Count: 2
    // Average: 75
    expect(overview.averageTicket).toBe(75)

    // 7. Categories breakdown
    const serviceCat = overview.revenuesByCategory.find((c) => c.category === 'service')
    expect(serviceCat?.value).toBe(150)

    const commissionCat = overview.expensesByCategory.find((c) => c.category === 'commission')
    expect(commissionCat?.value).toBe(40)
  })
})
