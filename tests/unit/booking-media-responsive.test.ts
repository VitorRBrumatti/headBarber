import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bookingDirectory = join(process.cwd(), 'src', 'app', 'booking', '[slug]')

function bookingSource(filename: string) {
  return readFileSync(join(bookingDirectory, filename), 'utf8')
}

describe('public booking media and responsive progress', () => {
  it('uses one bounded linear progress track on every viewport', () => {
    const progress = bookingSource('booking-progress.tsx')

    expect(progress).toContain('role="progressbar"')
    expect(progress).toContain('aria-valuemax={steps.length}')
    expect(progress).toContain('style={{ width: `${progress}%` }}')
    expect(progress).toContain('steps[currentStep - 1]?.name')
    expect(progress).not.toContain('grid-cols-7')
    expect(progress).not.toContain('w-screen')
  })

  it('contains the sticky progress track and leaves breathing room below it', () => {
    const client = bookingSource('booking-client.tsx')

    expect(client).toContain('mx-auto w-full max-w-3xl px-4 sm:px-6')
    expect(client).toContain('sticky top-16')
    expect(client).toContain('pb-36 pt-10')
    expect(client).toContain('sm:pt-14')
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
