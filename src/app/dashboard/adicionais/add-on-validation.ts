import type {
  AddOnAssignmentInput,
  ParsedAddOnForm,
} from './add-on-types'

type AddOnFormMode = 'create' | 'edit'
type AddOnFormErrors = Record<string, string>

type AddOnFormResult =
  | { success: true; data: ParsedAddOnForm }
  | { success: false; errors: AddOnFormErrors }

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on'
}

function parseFiniteNumber(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

export function parseAddOnFormData(
  formData: FormData,
  allowedBarberIds: ReadonlySet<string>,
  mode: AddOnFormMode,
): AddOnFormResult {
  const errors: AddOnFormErrors = {}
  const name = String(formData.get('name') ?? '').trim()
  const isActive = parseBoolean(formData.get('is_active'))

  if (!name) errors.name = 'Informe o nome do adicional.'

  let rawAssignments: unknown
  try {
    rawAssignments = JSON.parse(String(formData.get('assignments') ?? '[]'))
  } catch {
    errors.assignments = 'A configuração dos profissionais é inválida.'
  }

  if (!Array.isArray(rawAssignments)) {
    errors.assignments = 'A configuração dos profissionais é inválida.'
    rawAssignments = []
  }

  const assignments: AddOnAssignmentInput[] = []
  const seenBarberIds = new Set<string>()

  for (const raw of rawAssignments as unknown[]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.assignments = 'A configuração dos profissionais é inválida.'
      continue
    }

    const item = raw as Record<string, unknown>
    const barberId = typeof item.barberId === 'string' ? item.barberId : ''
    if (!barberId || !allowedBarberIds.has(barberId)) {
      errors.assignments =
        'Um dos profissionais selecionados não pertence a esta barbearia.'
      continue
    }
    if (seenBarberIds.has(barberId)) {
      errors.assignments = 'Existem profissionais duplicados na configuração.'
      continue
    }
    seenBarberIds.add(barberId)

    const price = parseFiniteNumber(item.price)
    const durationMinutes = parseFiniteNumber(item.durationMinutes)
    const isAvailable = parseBoolean(item.isAvailable)

    if (price === null || price < 0) {
      errors[`assignments.${barberId}.price`] =
        'Informe um preço válido, maior ou igual a zero.'
    }
    if (
      durationMinutes === null ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 0 ||
      durationMinutes > 720
    ) {
      errors[`assignments.${barberId}.durationMinutes`] =
        'A duração deve ser um número inteiro entre 0 e 720 minutos.'
    }

    if (price !== null && durationMinutes !== null) {
      assignments.push({
        barberId,
        price,
        durationMinutes,
        isAvailable,
      })
    }
  }

  if (
    mode === 'create' &&
    !assignments.some((assignment) => assignment.isAvailable)
  ) {
    errors.assignments =
      'Selecione ao menos um profissional disponível para criar o adicional.'
  }

  if (Object.keys(errors).length > 0) return { success: false, errors }
  return { success: true, data: { name, isActive, assignments } }
}

function availableAssignments(assignments: AddOnAssignmentInput[]) {
  return assignments.filter((assignment) => assignment.isAvailable)
}

export function formatAddOnPriceRange(assignments: AddOnAssignmentInput[]) {
  const available = availableAssignments(assignments)
  if (available.length === 0) return 'Sem profissionais'

  const prices = available.map((assignment) => assignment.price)
  const minimum = Math.min(...prices)
  const maximum = Math.max(...prices)
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  return minimum === maximum
    ? formatter.format(minimum)
    : `${formatter.format(minimum)} – ${formatter.format(maximum)}`
}

export function formatAddOnDurationRange(
  assignments: AddOnAssignmentInput[],
) {
  const available = availableAssignments(assignments)
  if (available.length === 0) return 'Sem profissionais'

  const durations = available.map(
    (assignment) => assignment.durationMinutes,
  )
  const minimum = Math.min(...durations)
  const maximum = Math.max(...durations)
  return minimum === maximum ? `${minimum} min` : `${minimum}–${maximum} min`
}
