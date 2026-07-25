import type { AddOnCatalogItem } from './add-on-types'

export interface AddOnAssignmentRow {
  id: string
  barber_id: string
  price: number | string
  duration_minutes: number
  is_available: boolean
  configuration_version: number | string
}

export interface AddOnRow {
  id: string
  name: string
  is_active: boolean
  barber_add_ons: AddOnAssignmentRow[] | null
}

export function mapAddOnCatalogRows(rows: AddOnRow[]): AddOnCatalogItem[] {
  return rows.map((addOn) => ({
    id: addOn.id,
    name: addOn.name,
    isActive: addOn.is_active,
    assignments: (addOn.barber_add_ons ?? []).map((assignment) => ({
      id: assignment.id,
      barberId: assignment.barber_id,
      price: Number(assignment.price),
      durationMinutes: assignment.duration_minutes,
      isAvailable: assignment.is_available,
      configurationVersion: Number(assignment.configuration_version),
    })),
  }))
}
