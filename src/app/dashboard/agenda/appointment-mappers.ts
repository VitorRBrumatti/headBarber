import type {
  AppointmentDetails,
  AppointmentProductSnapshot,
} from './agenda-types'
import type { AppointmentStatus } from './agenda-rules'

interface AppointmentRow {
  id: string
  barber_id: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  service_price: number | string | null
  service_duration_minutes: number | null
  total_price: number | string
  subscription_covered_total: number | string
  amount_due: number | string
  subscription_coverage_status: AppointmentDetails['subscriptionCoverageStatus']
  notes: string | null
  clients:
    | { name: string; phone: string; email: string | null }
    | { name: string; phone: string; email: string | null }[]
    | null
  services: { name: string } | { name: string }[] | null
  barbers: { name: string } | { name: string }[] | null
  appointment_add_ons:
    | {
        price: number | string
        duration_minutes: number
        add_ons: { name: string } | { name: string }[] | null
      }[]
    | null
  appointment_subscription_allocations:
    | {
        status: string
        subscription_cycle_entitlements:
          | {
              item_name_snapshot: string
              subscription_cycles:
                | { plan_name_snapshot: string }
                | { plan_name_snapshot: string }[]
                | null
            }
          | {
              item_name_snapshot: string
              subscription_cycles:
                | { plan_name_snapshot: string }
                | { plan_name_snapshot: string }[]
                | null
            }[]
          | null
      }[]
    | null
  appointment_products:
    | {
        quantity: number
        unit_price: number | string
        status: string
        products:
          | { name: string; image_url: string | null }
          | { name: string; image_url: string | null }[]
          | null
      }[]
    | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function mapAppointmentRows(rows: AppointmentRow[] | null) {
  return (rows ?? []).map((row): AppointmentDetails => {
    const client = one(row.clients)
    const service = one(row.services)
    const barber = one(row.barbers)
    const allocations = (row.appointment_subscription_allocations ?? []).map(
      (allocation) => ({
        status: allocation.status,
        entitlement: one(allocation.subscription_cycle_entitlements),
      }),
    )
    const subscriptionPlanName =
      allocations
        .map(
          ({ entitlement }) =>
            one(entitlement?.subscription_cycles ?? null)?.plan_name_snapshot,
        )
        .find(Boolean) ?? null
    const addOns = (row.appointment_add_ons ?? []).map((item) => ({
      name: one(item.add_ons)?.name ?? 'Adicional',
      price: Number(item.price),
      durationMinutes: Number(item.duration_minutes),
    }))

    return {
      id: row.id,
      barberId: row.barber_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      servicePrice: Number(row.service_price ?? 0),
      serviceDurationMinutes: Number(row.service_duration_minutes ?? 0),
      totalDurationMinutes:
        Number(row.service_duration_minutes ?? 0) +
        addOns.reduce((total, item) => total + item.durationMinutes, 0),
      attendanceTotal: Number(row.total_price),
      subscriptionCoveredTotal: Number(row.subscription_covered_total ?? 0),
      amountDue: Number(row.amount_due ?? row.total_price),
      subscriptionCoverageStatus: row.subscription_coverage_status ?? 'none',
      subscriptionPlanName,
      waitingSubscriptionItems: allocations
        .filter((allocation) => allocation.status === 'waiting')
        .map(
          (allocation) =>
            allocation.entitlement?.item_name_snapshot ?? 'Benefício',
        ),
      notes: row.notes,
      client: client ?? { name: 'Cliente', phone: '', email: null },
      serviceName: service?.name ?? 'Serviço',
      barberName: barber?.name ?? 'Profissional',
      addOns,
      products: (row.appointment_products ?? []).map(
        (item): AppointmentProductSnapshot => ({
          name: one(item.products)?.name ?? 'Produto',
          imageUrl: one(item.products)?.image_url ?? null,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          status: item.status,
        }),
      ),
    }
  })
}
