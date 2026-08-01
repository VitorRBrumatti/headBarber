const DEFAULT_REFRESH_INTERVAL_MS = 30_000

interface AgendaAutoRefreshOptions {
  refresh: () => void
  windowTarget: EventTarget
  documentTarget: EventTarget
  isDocumentVisible: () => boolean
  schedule?: (callback: () => void, intervalMs: number) => unknown
  cancel?: (handle: unknown) => void
  intervalMs?: number
}

export function startAgendaAutoRefresh({
  refresh,
  windowTarget,
  documentTarget,
  isDocumentVisible,
  schedule = (callback, intervalMs) =>
    globalThis.setInterval(callback, intervalMs),
  cancel = (handle) => globalThis.clearInterval(handle as number),
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
}: AgendaAutoRefreshOptions) {
  const refreshWhenVisible = () => {
    if (isDocumentVisible()) refresh()
  }

  windowTarget.addEventListener('focus', refreshWhenVisible)
  documentTarget.addEventListener('visibilitychange', refreshWhenVisible)
  const intervalHandle = schedule(refreshWhenVisible, intervalMs)

  return () => {
    windowTarget.removeEventListener('focus', refreshWhenVisible)
    documentTarget.removeEventListener('visibilitychange', refreshWhenVisible)
    cancel(intervalHandle)
  }
}
