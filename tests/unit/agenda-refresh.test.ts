import { describe, expect, it, vi } from 'vitest'
import { startAgendaAutoRefresh } from '@/app/dashboard/agenda/agenda-auto-refresh'

describe('agenda automatic refresh', () => {
  it('refreshes on focus, visibility and the scheduled interval while visible', () => {
    const windowTarget = new EventTarget()
    const documentTarget = new EventTarget()
    const refresh = vi.fn()
    let scheduled: (() => void) | undefined
    let visible = true
    const cancel = vi.fn()

    const stop = startAgendaAutoRefresh({
      refresh,
      windowTarget,
      documentTarget,
      isDocumentVisible: () => visible,
      schedule: (callback) => {
        scheduled = callback
        return 7
      },
      cancel,
    })

    windowTarget.dispatchEvent(new Event('focus'))
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    scheduled?.()
    expect(refresh).toHaveBeenCalledTimes(3)

    visible = false
    scheduled?.()
    expect(refresh).toHaveBeenCalledTimes(3)

    stop()
    expect(cancel).toHaveBeenCalledWith(7)
  })
})
