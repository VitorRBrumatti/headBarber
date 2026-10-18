export interface BookingProfile {
  booking_avatar_url: string | null
  booking_banner_url: string | null
  booking_address: string | null
}

export function parseBookingProfile(form: FormData): BookingProfile {
  const text = (name: string, limit: number) => {
    const value = form.get(name)
    if (value === null) return null
    if (typeof value !== 'string')
      throw new Error('Campo inválido no perfil público.')
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (normalized.length > limit)
      throw new Error(`O campo deve ter no máximo ${limit} caracteres.`)
    return normalized || null
  }
  const image = (name: string) => {
    const value = text(name, 2048)
    if (!value) return null
    try {
      const url = new URL(value)
      if (
        url.protocol === 'https:' &&
        url.hostname === 'i.ibb.co' &&
        !url.username &&
        !url.password
      )
        return url.href
    } catch {
      /* A imagem deve vir do uploader do produto. */
    }
    throw new Error('Envie uma imagem pelo botão de upload.')
  }
  return {
    booking_address: text('address', 300),
    booking_avatar_url: image('avatar_url'),
    booking_banner_url: image('image_url'),
  }
}

export function getGoogleMapsUrl(address?: string | null) {
  return address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
    : null
}
