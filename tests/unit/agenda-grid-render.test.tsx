import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgendaGrid } from '@/app/dashboard/agenda/agenda-grid'

const markup = renderToStaticMarkup(
  <AgendaGrid
    appointments={[
      {
        id: 'appointment-1',
        barberId: 'barber-1',
        startAt: '2030-07-22T09:00:00.000Z',
        endAt: '2030-07-22T10:00:00.000Z',
        status: 'confirmed',
        servicePrice: 85,
        serviceDurationMinutes: 60,
        attendanceTotal: 85,
        notes: null,
        client: {
          name: 'João Silva',
          phone: '51999999999',
          email: null,
        },
        serviceName: 'Corte & Barba',
        barberName: 'Ricardo',
        addOns: [],
        products: [],
      },
    ]}
    barbers={[
      {
        id: 'barber-1',
        name: 'Ricardo',
        bio: null,
        avatarUrl: null,
      },
      {
        id: 'barber-2',
        name: 'Marcos',
        bio: null,
        avatarUrl: null,
      },
    ]}
    blocks={[
      {
        id: 'block-1',
        barberId: 'barber-2',
        startAt: '2030-07-22T09:00:00.000Z',
        endAt: '2030-07-22T10:00:00.000Z',
        reason: null,
      },
    ]}
    currentDate="2030-07-22"
    onSelectAppointment={() => undefined}
    onSelectSlot={() => undefined}
    settings={{
      slotIntervalMinutes: 30,
      defaultStartTime: '09:00:00',
      defaultEndTime: '11:00:00',
    }}
    workHours={[
      {
        barberId: 'barber-1',
        startTime: '09:00:00',
        endTime: '11:00:00',
        lunchStartTime: '10:00:00',
        lunchEndTime: '10:30:00',
      },
      {
        barberId: 'barber-2',
        startTime: '09:00:00',
        endTime: '11:00:00',
        lunchStartTime: '12:00:00',
        lunchEndTime: '13:00:00',
      },
    ]}
  />,
)

describe('daily agenda grid rendering', () => {
  it('renders appointment details and an accessible action', () => {
    expect(markup).toContain('João Silva')
    expect(markup).toContain('Corte &amp; Barba')
    expect(markup).toContain('Confirmada')
    expect(markup).toContain(
      'aria-label="Ver reserva de João Silva às 09:00"',
    )
  })

  it('renders free slots as contextual booking actions', () => {
    expect(markup).toContain('aria-label="Agendar com Ricardo às 10:30"')
  })

  it('renders lunch as unavailable instead of a booking action', () => {
    expect(markup).toContain('Almoço')
    expect(markup).not.toContain('aria-label="Agendar com Ricardo às 10:00"')
  })

  it('shows one visible label for consecutive blocked intervals', () => {
    expect(markup.match(/Bloqueado/g)).toHaveLength(1)
  })
})
