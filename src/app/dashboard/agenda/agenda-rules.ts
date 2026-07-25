export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export const ALLOWED_STATUS_TRANSITIONS = {
  confirmed: ['completed', 'cancelled', 'no_show'],
  pending: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
} as const satisfies Record<AppointmentStatus, readonly AppointmentStatus[]>

export function getAllowedAppointmentTransitions(
  status: AppointmentStatus,
): AppointmentStatus[] {
  return [...ALLOWED_STATUS_TRANSITIONS[status]]
}

export function canTransitionAppointmentStatus(
  current: AppointmentStatus,
  next: AppointmentStatus,
) {
  return getAllowedAppointmentTransitions(current).includes(next)
}
