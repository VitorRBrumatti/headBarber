import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bookingDirectory = join(process.cwd(), 'src', 'app', 'booking', '[slug]')

function bookingSource(filename: string) {
  return readFileSync(join(bookingDirectory, filename), 'utf8')
}

describe('public booking media and responsive progress', () => {
  it('uses a bounded compact mobile summary and seven-column desktop track', () => {
    const progress = bookingSource('booking-progress.tsx')

    expect(progress).toContain('Etapa {currentStep} de {steps.length}')
    expect(progress).toContain('sm:hidden')
    expect(progress).toContain('sm:grid')
    expect(progress).toContain('grid-cols-7')
    expect(progress).toContain('absolute left-1/2')
    expect(progress).not.toContain('last:flex-none')
    expect(progress).not.toContain('w-screen')
  })

  it('contains the fixed progress track and leaves breathing room below it', () => {
    const client = bookingSource('booking-client.tsx')

    expect(client).toContain('mx-auto w-full max-w-3xl px-4 sm:px-6')
    expect(client).toContain('pb-40 pt-40')
    expect(client).toContain('sm:pt-48')
    expect(client).not.toContain('w-screen')
  })

  it('renders barber and product images through the resilient fallback', () => {
    const client = bookingSource('booking-client.tsx')
    const products = bookingSource('booking-product-step.tsx')
    const fallback = readFileSync(
      join(process.cwd(), 'src', 'components', 'ui', 'image-with-fallback.tsx'),
      'utf8',
    )

    expect(client).toContain('<ImageWithFallback')
    expect(products).toContain('<ImageWithFallback')
    expect(fallback).toContain('onError=')
    expect(fallback).toContain('failedSrc === src')
  })
})
