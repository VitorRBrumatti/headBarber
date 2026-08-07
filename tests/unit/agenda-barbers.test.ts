import { describe, expect, it } from 'vitest'
import { selectAgendaBarbers } from '@/app/dashboard/agenda/agenda-barbers'

describe('agenda barber selection', () => {
  it('keeps inactive barbers only when they have appointments on the selected day', () => {
    expect(
      selectAgendaBarbers(
        [
          { id: 'active', name: 'Ana', bio: null, avatar_url: null, is_active: true },
          { id: 'booked', name: 'Bruno', bio: null, avatar_url: null, is_active: false },
          { id: 'idle', name: 'Caio', bio: null, avatar_url: null, is_active: false },
        ],
        [{ barberId: 'booked' }],
      ),
    ).toEqual([
      { id: 'active', name: 'Ana', bio: null, avatarUrl: null },
      { id: 'booked', name: 'Bruno', bio: null, avatarUrl: null },
    ])
  })
})
