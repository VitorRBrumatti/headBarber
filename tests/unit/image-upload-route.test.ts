import { describe, expect, it, vi } from 'vitest'

import { ImgBbUploadError } from '@/lib/image-upload/imgbb'
import { handleImageUpload } from '@/lib/image-upload/route-handler'

const endpoint = 'https://headbarber.test/api/images/upload'

function jpegFile() {
  return new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xdb])], 'photo.jpg', {
    type: 'image/jpeg',
  })
}

function uploadRequest(file: File = jpegFile(), headers?: HeadersInit) {
  const body = new FormData()
  body.append('image', file)
  return new Request(endpoint, {
    method: 'POST',
    headers: { origin: 'https://headbarber.test', ...headers },
    body,
  })
}

function dependencies() {
  return {
    getContext: vi.fn(async () => ({
      supabase: { kind: 'fake-supabase' },
      barbershopId: 'shop-a',
    })),
    isConfigured: vi.fn(() => true),
    consumeQuota: vi.fn(async () => ({
      allowed: true,
      retryAfterSeconds: 0,
    })),
    upload: vi.fn(async () => ({
      url: 'https://i.ibb.co/a/photo.webp',
    })),
  }
}

describe('handleImageUpload', () => {
  it('returns only the public image URL on success', async () => {
    const deps = dependencies()
    const response = await handleImageUpload(uploadRequest(), deps)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      url: 'https://i.ibb.co/a/photo.webp',
    })
    expect(deps.consumeQuota).toHaveBeenCalledWith(
      { kind: 'fake-supabase' },
      'shop-a',
    )
    expect(deps.upload).toHaveBeenCalledOnce()
  })

  it.each([
    ['missing', undefined],
    ['mismatched', 'https://evil.test'],
  ])('rejects a %s Origin before authentication', async (_case, origin) => {
    const deps = dependencies()
    const body = new FormData()
    body.append('image', jpegFile())
    const headers = new Headers()
    if (origin) headers.set('origin', origin)
    const request = new Request(endpoint, { method: 'POST', headers, body })

    const response = await handleImageUpload(request, deps)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' })
    expect(deps.getContext).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated context without exposing configuration', async () => {
    const deps = dependencies()
    deps.getContext.mockRejectedValue(new Error('not authenticated'))
    deps.isConfigured.mockReturnValue(false)

    const response = await handleImageUpload(uploadRequest(), deps)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.isConfigured).not.toHaveBeenCalled()
  })

  it('rejects a missing server configuration for an authenticated user', async () => {
    const deps = dependencies()
    deps.isConfigured.mockReturnValue(false)

    const response = await handleImageUpload(uploadRequest(), deps)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'MISCONFIGURED',
    })
    expect(deps.consumeQuota).not.toHaveBeenCalled()
  })

  it('rejects requests that declare a body above the upload envelope', async () => {
    const deps = dependencies()
    const response = await handleImageUpload(
      uploadRequest(jpegFile(), { 'content-length': String(6 * 1024 * 1024) }),
      deps,
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      code: 'FILE_TOO_LARGE',
    })
    expect(deps.consumeQuota).not.toHaveBeenCalled()
  })

  it('requires exactly one file in the image field', async () => {
    const deps = dependencies()
    const empty = new FormData()
    const missing = new Request(endpoint, {
      method: 'POST',
      headers: { origin: 'https://headbarber.test' },
      body: empty,
    })

    const response = await handleImageUpload(missing, deps)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'EMPTY_FILE' })
    expect(deps.consumeQuota).not.toHaveBeenCalled()

    const duplicateBody = new FormData()
    duplicateBody.append('image', jpegFile())
    duplicateBody.append('image', jpegFile())
    const duplicate = new Request(endpoint, {
      method: 'POST',
      headers: { origin: 'https://headbarber.test' },
      body: duplicateBody,
    })

    expect((await handleImageUpload(duplicate, deps)).status).toBe(400)
    expect(deps.consumeQuota).not.toHaveBeenCalled()
  })

  it('validates the image before consuming quota', async () => {
    const deps = dependencies()
    const invalid = new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' })

    const response = await handleImageUpload(uploadRequest(invalid), deps)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_SIGNATURE',
    })
    expect(deps.consumeQuota).not.toHaveBeenCalled()
    expect(deps.upload).not.toHaveBeenCalled()
  })

  it('returns a retry window when quota is exhausted', async () => {
    const deps = dependencies()
    deps.consumeQuota.mockResolvedValue({ allowed: false, retryAfterSeconds: 37 })

    const response = await handleImageUpload(uploadRequest(), deps)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('37')
    await expect(response.json()).resolves.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: 37,
    })
    expect(deps.upload).not.toHaveBeenCalled()
  })

  it('maps provider failures to a safe response', async () => {
    const deps = dependencies()
    deps.upload.mockRejectedValue(new ImgBbUploadError('safe internal message'))

    const response = await handleImageUpload(uploadRequest(), deps)

    expect(response.status).toBe(502)
    const payload = await response.json()
    expect(payload).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' })
    expect(JSON.stringify(payload)).not.toContain('safe internal message')
  })
})
