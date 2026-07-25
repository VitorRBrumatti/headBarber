export interface BarberAddOnOption {
  id: string
  barberId: string
  addOnId: string
  name: string
  price: number
  durationMinutes: number
  configurationVersion: number
}

export interface SelectedBookingAddOn {
  barberAddOnId: string
  configurationVersion: number
}

interface BarberAddOnRow {
  id: unknown
  barber_id: unknown
  add_on_id: unknown
  price: unknown
  duration_minutes: unknown
  configuration_version: unknown
  add_ons: { name?: unknown } | { name?: unknown }[] | null
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid barber add-on field: ${field}`)
  }
  return value
}

export function mapBarberAddOnRows(
  rows: BarberAddOnRow[] | null,
): BarberAddOnOption[] {
  return (rows ?? []).map((row) => {
    const addOn = Array.isArray(row.add_ons) ? row.add_ons[0] : row.add_ons
    if (!addOn) throw new Error('Invalid barber add-on relation')
    return {
      id: requiredString(row.id, 'id'),
      barberId: requiredString(row.barber_id, 'barber_id'),
      addOnId: requiredString(row.add_on_id, 'add_on_id'),
      name: requiredString(addOn.name, 'add_ons.name'),
      price: Number(row.price),
      durationMinutes: Number(row.duration_minutes),
      configurationVersion: Number(row.configuration_version),
    }
  })
}

export function toggleAddOnSelection(
  state: {
    selectedIds: string[]
    date: string
    time: string
    slots: string[]
  },
  relationshipId: string,
) {
  return {
    selectedIds: state.selectedIds.includes(relationshipId)
      ? state.selectedIds.filter((id) => id !== relationshipId)
      : [...state.selectedIds, relationshipId],
    date: '',
    time: '',
    slots: [],
  }
}

export function selectedAddOnPayload(
  selectedIds: string[],
  options: BarberAddOnOption[],
): SelectedBookingAddOn[] {
  const selected = new Set(selectedIds)
  return options
    .filter((option) => selected.has(option.id))
    .map((option) => ({
      barberAddOnId: option.id,
      configurationVersion: option.configurationVersion,
    }))
}
