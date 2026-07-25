import { getBarbershopId } from '@/utils/get-barbershop'
import type {
  ServiceCatalogAssignment,
  ServiceCatalogItem,
  ServiceBarber,
} from './service-types'
import { ServicesClient } from './services-client'

interface BarberRow {
  id: string
  name: string
  is_active: boolean
}

interface AssignmentRow {
  id: string
  barber_id: string
  price: number | string
  duration_minutes: number
  is_available: boolean
  configuration_version: number
}

interface ServiceRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  barber_services: AssignmentRow[] | null
}

export default async function ServicosPage() {
  const { supabase, barbershopId } = await getBarbershopId()
  const [servicesResult, barbersResult] = await Promise.all([
    supabase
      .from('services')
      .select(
        'id, name, description, is_active, barber_services(id, barber_id, price, duration_minutes, is_available, configuration_version)',
      )
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
    supabase
      .from('barbers')
      .select('id, name, is_active')
      .eq('barbershop_id', barbershopId)
      .order('name'),
  ])

  if (servicesResult.error) throw new Error(servicesResult.error.message)
  if (barbersResult.error) throw new Error(barbersResult.error.message)

  const services: ServiceCatalogItem[] = (
    (servicesResult.data ?? []) as ServiceRow[]
  ).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    isActive: service.is_active,
    assignments: (service.barber_services ?? []).map(
      (assignment): ServiceCatalogAssignment => ({
        id: assignment.id,
        barberId: assignment.barber_id,
        price: Number(assignment.price),
        durationMinutes: assignment.duration_minutes,
        isAvailable: assignment.is_available,
        configurationVersion: assignment.configuration_version,
      }),
    ),
  }))

  const barbers: ServiceBarber[] = (
    (barbersResult.data ?? []) as BarberRow[]
  ).map((barber) => ({
    id: barber.id,
    name: barber.name,
    isActive: barber.is_active,
  }))

  return (
    <div className="space-y-6">
      <ServicesClient services={services} barbers={barbers} />
    </div>
  )
}