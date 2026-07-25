import { describe, expect, it } from 'vitest'
import { mapAddOnCatalogRows } from '@/app/dashboard/adicionais/add-on-mappers'

describe('add-on administration mapping', () => {
  it('maps numeric relationship fields without using global price or duration', () => {
    expect(
      mapAddOnCatalogRows([
        {
          id: 'addon-a',
          name: 'Sobrancelha',
          is_active: true,
          barber_add_ons: [
            {
              id: 'assignment-a',
              barber_id: 'barber-a',
              price: '10.50',
              duration_minutes: 5,
              is_available: true,
              configuration_version: '3',
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: 'addon-a',
        name: 'Sobrancelha',
        isActive: true,
        assignments: [
          {
            id: 'assignment-a',
            barberId: 'barber-a',
            price: 10.5,
            durationMinutes: 5,
            isAvailable: true,
            configurationVersion: 3,
          },
        ],
      },
    ])
  })
})
