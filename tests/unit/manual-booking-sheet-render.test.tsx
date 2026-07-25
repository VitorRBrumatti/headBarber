import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ManualBookingSheet } from '@/app/dashboard/agenda/manual-booking-sheet'

const markup = renderToStaticMarkup(
  <ManualBookingSheet
    barbers={[
      {
        id: 'barber-1',
        name: 'Ricardo',
        bio: null,
        avatarUrl: null,
      },
    ]}
    currentDate="2030-07-22"
    initialSelection={{ barberId: 'barber-1', time: '10:30' }}
    onClose={() => undefined}
    onCreated={() => undefined}
    open
  />,
)

describe('manual booking sheet rendering', () => {
  it('renders the complete barber-first manual form', () => {
    expect(markup).toContain('Nova reserva manual')
    expect(markup).toContain('Nome do cliente')
    expect(markup).toContain('Telefone')
    expect(markup).toContain('Profissional')
    expect(markup).toContain('Serviço')
    expect(markup).toContain('Horário')
  })

  it('keeps the clicked barber and time visible and editable', () => {
    expect(markup).toContain('Ricardo')
    expect(markup).toContain('10:30')
    expect(markup).toContain('<select')
  })
})
