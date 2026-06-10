import { getFinancialOverview } from './actions'
import { FinanceiroClient } from './financeiro-client'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()

  // Default: current month
  const defaultStart = new Date(y, m, 1).toISOString().split('T')[0]
  const defaultEnd = new Date(y, m + 1, 0).toISOString().split('T')[0]

  const startDate = params.start || defaultStart
  const endDate = params.end || defaultEnd

  const overview = await getFinancialOverview(startDate, endDate)

  return (
    <div className="space-y-6">
      <FinanceiroClient
        overview={overview}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  )
}