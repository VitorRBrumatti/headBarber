export interface ServiceAssignmentInput {
  barberId: string
  price: number
  durationMinutes: number
  isAvailable: boolean
}

export interface ServiceAssignmentDraft {
  barberId: string
  barberName: string
  price: number | string
  durationMinutes: number | string
  isAvailable: boolean
}

export interface ServiceCatalogAssignment extends ServiceAssignmentInput {
  id: string
  configurationVersion: number
}

export interface ServiceCatalogItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  assignments: ServiceCatalogAssignment[]
}

export interface ServiceBarber {
  id: string
  name: string
  isActive: boolean
}

export interface ParsedServiceForm {
  name: string
  description: string | null
  isActive: boolean
  assignments: ServiceAssignmentInput[]
}
