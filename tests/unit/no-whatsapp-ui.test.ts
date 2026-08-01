import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Home from '@/app/page'
import LoginPage from '@/app/login/page'
import { ConfiguracoesClient } from '@/app/dashboard/configuracoes/configuracoes-client'
import { ClientForm } from '@/components/dashboard/client-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: {} }),
}))

vi.mock('@/app/dashboard/configuracoes/actions', () => ({
  updateBarbershopSettingsAction: vi.fn(),
  createBarberBlock: vi.fn(),
  getBarberBlocks: vi.fn(),
  deleteBarberBlock: vi.fn(),
}))

vi.mock('@/app/dashboard/clientes/actions', () => ({
  createClient: vi.fn(),
  updateClient: vi.fn(),
}))

function renderSurfaces(): Array<[string, string]> {
  const surfaces: Array<[string, ReactElement]> = [
    ['landing', createElement(Home)],
    ['login', createElement(LoginPage)],
    ['client form', createElement(ClientForm, { onSuccess: vi.fn() })],
    [
      'settings',
      createElement(ConfiguracoesClient, {
        initialSettings: { whatsapp_reminder_hours: 2 },
        barbers: [],
      }),
    ],
  ]

  return surfaces.map(([name, component]) => [
    name,
    renderToStaticMarkup(component),
  ])
}

describe('customer-facing messaging surfaces', () => {
  it('does not advertise WhatsApp messages or automatic notifications', () => {
    const surfaces = renderSurfaces()

    for (const [name, markup] of surfaces) {
      expect(markup, name).not.toMatch(/whatsapp/i)
      expect(markup, name).not.toContain('notificações automáticas')
    }
  })

  it('shows client subscriptions in place of the WhatsApp landing benefit', () => {
    const landingMarkup = renderSurfaces().find(([name]) => name === 'landing')?.[1]

    expect(landingMarkup).toContain('Assinaturas de clientes')
  })
})