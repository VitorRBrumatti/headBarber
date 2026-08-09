import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdicionaisClient } from '@/app/dashboard/adicionais/adicionais-client'
import { ServicesClient } from '@/app/dashboard/servicos/services-client'
import { AddOnForm } from '@/components/dashboard/add-on-form'
import { ServiceForm } from '@/components/dashboard/service-form'

function switchCount(markup: string) {
  return markup.match(/role="switch"/g)?.length ?? 0
}

describe('catalog switches', () => {
  it('renders service and add-on catalog status as switches', () => {
    const servicesMarkup = renderToStaticMarkup(
      <ServicesClient
        barbers={[]}
        services={[
          {
            id: 'service-1',
            name: 'Corte',
            description: null,
            isActive: true,
            assignments: [],
          },
        ]}
      />,
    )
    const addOnsMarkup = renderToStaticMarkup(
      <AdicionaisClient
        barbers={[]}
        addOns={[
          {
            id: 'add-on-1',
            name: 'Sobrancelha',
            isActive: true,
            assignments: [],
          },
        ]}
      />,
    )

    expect(switchCount(servicesMarkup)).toBe(1)
    expect(servicesMarkup).toContain('Catálogo ativo')
    expect(switchCount(addOnsMarkup)).toBe(1)
    expect(addOnsMarkup).toContain('Catálogo ativo')
  })

  it('renders active and professional availability controls as switches', () => {
    const serviceFormMarkup = renderToStaticMarkup(
      <ServiceForm
        barbers={[{ id: 'barber-1', name: 'João', isActive: true }]}
        onSuccess={() => undefined}
      />,
    )
    const addOnFormMarkup = renderToStaticMarkup(
      <AddOnForm
        barbers={[{ id: 'barber-1', name: 'João', isActive: true }]}
        onSuccess={() => undefined}
      />,
    )

    expect(switchCount(serviceFormMarkup)).toBe(2)
    expect(serviceFormMarkup).toContain('Serviço ativo no catálogo')
    expect(serviceFormMarkup).toContain('Disponível para agendamento')
    expect(switchCount(addOnFormMarkup)).toBe(2)
    expect(addOnFormMarkup).toContain('Adicional ativo no catálogo')
    expect(addOnFormMarkup).toContain('Disponível para agendamento')
  })
})
