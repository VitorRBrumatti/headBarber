export function getClientSubscriptionLabel(activePlanName: string | null): {
  label: string
  isSubscriber: boolean
} {
  if (activePlanName) {
    return { label: activePlanName, isSubscriber: true }
  }

  return { label: 'Regular', isSubscriber: false }
}
