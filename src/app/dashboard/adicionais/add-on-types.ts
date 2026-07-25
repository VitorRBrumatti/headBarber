export interface AddOnAssignmentInput {
  barberId: string
  price: number
  durationMinutes: number
  isAvailable: boolean
}

export interface AddOnAssignmentDraft {
  barberId: string
  barberName: string
  price: number | string
  durationMinutes: number | string
  isAvailable: boolean
}

export interface AddOnCatalogAssignment extends AddOnAssignmentInput {
  id: string
  configurationVersion: number
}

export interface AddOnCatalogItem {
  id: string
  name: string
  isActive: boolean
  assignments: AddOnCatalogAssignment[]
}

export interface AddOnBarber {
  id: string
  name: string
  isActive: boolean
}

export interface ParsedAddOnForm {
  name: string
  isActive: boolean
  assignments: AddOnAssignmentInput[]
}
