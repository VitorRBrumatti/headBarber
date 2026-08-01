import type {
  BarberServiceOption,
  BookingCoveragePreview,
  CreatedBookingReceipt,
  SubscriptionCoverageStatus,
  UnavailableProduct,
} from './booking-types'

interface BarberServiceRow {
  id: unknown
  barber_id: unknown
  service_id: unknown
  price: unknown
  duration_minutes: unknown
  configuration_version: unknown
  services:
    | { name?: unknown; description?: unknown }
    | { name?: unknown; description?: unknown }[]
    | null
}

type BookingRpcError = {
  message: string
  details?: string | null
}

const expectedErrorMessages = {
  CONFIG_CHANGED:
    'O preço ou a duração mudou. Revise o serviço e confirme novamente.',
  INVALID_BARBER_SERVICE:
    'Este serviço não está mais disponível para o profissional escolhido.',
  INVALID_ADD_ON: 'Um adicional selecionado mudou ou não está mais disponível.',
  SLOT_UNAVAILABLE:
    'Este horário acabou de ficar indisponível. Escolha outro horário.',
} as const

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid booking receipt field: ${field}`)
  }
  return value
}

const subscriptionCoverageStatuses = new Set<SubscriptionCoverageStatus>([
  'none',
  'awaiting_cycle',
  'waiting',
  'partial',
  'covered',
])

function optionalString(value: unknown, field: string) {
  if (value === null || value === undefined) return null
  return requiredString(value, field)
}

function coverageStatus(value: unknown): SubscriptionCoverageStatus {
  if (
    typeof value !== 'string' ||
    !subscriptionCoverageStatuses.has(value as SubscriptionCoverageStatus)
  ) {
    throw new Error('Invalid booking receipt field: subscriptionCoverageStatus')
  }
  return value as SubscriptionCoverageStatus
}

function requiredNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid booking receipt field: ${field}`)
  }
  return value
}

export function mapBarberServiceRows(
  rows: BarberServiceRow[] | null,
): BarberServiceOption[] {
  return (rows ?? []).map((row) => {
    const service = Array.isArray(row.services) ? row.services[0] : row.services

    if (!service) throw new Error('Invalid barber service relation')

    return {
      id: requiredString(row.id, 'id'),
      barberId: requiredString(row.barber_id, 'barber_id'),
      serviceId: requiredString(row.service_id, 'service_id'),
      name: requiredString(service.name, 'services.name'),
      description:
        service.description === null
          ? null
          : requiredString(service.description, 'services.description'),
      price: Number(row.price),
      durationMinutes: Number(row.duration_minutes),
      configurationVersion: Number(row.configuration_version),
    }
  })
}

export function parseCreatedBookingReceipt(
  value: unknown,
): CreatedBookingReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid booking receipt')
  }

  const receipt = value as Record<string, unknown>
  return {
    appointmentId: requiredString(receipt.appointmentId, 'appointmentId'),
    barberId: requiredString(receipt.barberId, 'barberId'),
    barberName: requiredString(receipt.barberName, 'barberName'),
    serviceId: requiredString(receipt.serviceId, 'serviceId'),
    serviceName: requiredString(receipt.serviceName, 'serviceName'),
    servicePrice: requiredString(receipt.servicePrice, 'servicePrice'),
    serviceDurationMinutes: requiredNumber(
      receipt.serviceDurationMinutes,
      'serviceDurationMinutes',
    ),
    addOnDurationMinutes: requiredNumber(
      receipt.addOnDurationMinutes,
      'addOnDurationMinutes',
    ),
    addOnTotal: requiredString(receipt.addOnTotal, 'addOnTotal'),
    productSubtotal: requiredString(receipt.productSubtotal, 'productSubtotal'),
    attendanceTotal: requiredString(receipt.attendanceTotal, 'attendanceTotal'),
    subscriptionCoveredTotal:
      receipt.subscriptionCoveredTotal === undefined
        ? '0.00'
        : requiredString(
            receipt.subscriptionCoveredTotal,
            'subscriptionCoveredTotal',
          ),
    amountDue:
      receipt.amountDue === undefined
        ? requiredString(receipt.attendanceTotal, 'attendanceTotal')
        : requiredString(receipt.amountDue, 'amountDue'),
    subscriptionCoverageStatus:
      receipt.subscriptionCoverageStatus === undefined
        ? 'none'
        : coverageStatus(receipt.subscriptionCoverageStatus),
    subscriptionPlanName: optionalString(
      receipt.subscriptionPlanName,
      'subscriptionPlanName',
    ),
    totalAtShop: requiredString(receipt.totalAtShop, 'totalAtShop'),
    startAt: requiredString(receipt.startAt, 'startAt'),
    endAt: requiredString(receipt.endAt, 'endAt'),
  }
}

export function parseBookingCoveragePreview(
  value: unknown,
): BookingCoveragePreview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid booking preview')
  }
  const preview = value as Record<string, unknown>
  return {
    attendanceTotal: requiredString(preview.attendanceTotal, 'attendanceTotal'),
    subscriptionCoveredTotal: requiredString(
      preview.subscriptionCoveredTotal,
      'subscriptionCoveredTotal',
    ),
    amountDue: requiredString(preview.amountDue, 'amountDue'),
    subscriptionCoverageStatus: coverageStatus(
      preview.subscriptionCoverageStatus,
    ),
    subscriptionPlanName: optionalString(
      preview.subscriptionPlanName,
      'subscriptionPlanName',
    ),
    productSubtotal: requiredString(preview.productSubtotal, 'productSubtotal'),
    totalAtShop: requiredString(preview.totalAtShop, 'totalAtShop'),
  }
}

export function mapBookingRpcError(error: BookingRpcError) {
  if (error.message.includes('INSUFFICIENT_STOCK')) {
    let unavailableProducts: UnavailableProduct[] = []
    try {
      const details = JSON.parse(error.details || '[]')
      if (Array.isArray(details)) {
        unavailableProducts = details.filter(
          (item): item is UnavailableProduct =>
            typeof item?.productId === 'string' &&
            typeof item?.availableQuantity === 'number',
        )
      }
    } catch {
      unavailableProducts = []
    }

    return {
      error:
        'Alguns produtos tiveram o estoque alterado. Ajuste as quantidades para continuar.',
      code: 'INSUFFICIENT_STOCK' as const,
      unavailableProducts,
    }
  }

  for (const [code, message] of Object.entries(expectedErrorMessages)) {
    if (error.message.includes(code)) {
      return {
        error: message,
        code: code as keyof typeof expectedErrorMessages,
      }
    }
  }

  return {
    error: 'Não foi possível concluir o agendamento. Tente novamente.',
    code: 'UNKNOWN' as const,
  }
}
