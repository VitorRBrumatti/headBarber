import { describe, expect, it } from 'vitest'
import { getGoogleMapsUrl, parseBookingProfile } from '@/lib/booking-profile'

describe('public booking profile', () => {
  it('normalizes the address and preserves approved uploaded images', () => {
    const form = new FormData()
    form.set('address', '  Av. Brasil, 1024\n Centro, Maringá - PR  ')
    form.set('avatar_url', 'https://i.ibb.co/example/logo.png')
    form.set('image_url', 'https://i.ibb.co/example/banner.webp')
    expect(parseBookingProfile(form)).toEqual({
      booking_address: 'Av. Brasil, 1024 Centro, Maringá - PR',
      booking_avatar_url: 'https://i.ibb.co/example/logo.png',
      booking_banner_url: 'https://i.ibb.co/example/banner.webp',
    })
  })

  it('allows clearing optional public fields', () => {
    expect(parseBookingProfile(new FormData())).toEqual({
      booking_address: null,
      booking_avatar_url: null,
      booking_banner_url: null,
    })
    expect(getGoogleMapsUrl(null)).toBeNull()
  })

  it.each([
    'javascript:alert(1)',
    'http://i.ibb.co/a.png',
    'https://i.ibb.co.evil.test/a.png',
  ])('rejects unapproved image URLs: %s', (url) => {
    const form = new FormData()
    form.set('avatar_url', url)
    expect(() => parseBookingProfile(form)).toThrow('imagem')
  })

  it('rejects oversized addresses and file values', () => {
    const form = new FormData()
    form.set('address', 'x'.repeat(301))
    expect(() => parseBookingProfile(form)).toThrow('300')
    form.set('address', new File(['x'], 'file.txt'))
    expect(() => parseBookingProfile(form)).toThrow()
  })

  it('encodes the full address into a Google Maps search without interpreting it as a URL', () => {
    const url = new URL(getGoogleMapsUrl('Rua A & B, 10, São Paulo')!)
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/search/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('query')).toBe('Rua A & B, 10, São Paulo')
  })
})
