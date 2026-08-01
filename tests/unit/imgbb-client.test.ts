import { describe, expect, it, vi } from 'vitest'
import { ImgBbUploadError, uploadToImgBb } from '@/lib/image-upload/imgbb'

const image = new File([Uint8Array.from([0xff, 0xd8, 0xff])], 'foto.jpg', {
  type: 'image/jpeg',
})

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('ImgBB upload client', () => {
  it('posts multipart data and returns only the validated public URL', async () => {
    let requestedUrl = ''
    let requestedInit: RequestInit | undefined
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      requestedUrl = String(input)
      requestedInit = init

      return response({
        data: {
          url: 'https://i.ibb.co/example/foto.jpg',
          delete_url: 'https://ibb.co/delete/private-token',
        },
        success: true,
        status: 200,
      })
    })

    const result = await uploadToImgBb({
      file: image,
      apiKey: 'server-secret',
      fetchImpl,
    })

    expect(result).toEqual({ url: 'https://i.ibb.co/example/foto.jpg' })
    expect(requestedUrl).toBe('https://api.imgbb.com/1/upload')
    expect(requestedInit?.method).toBe('POST')
    expect(requestedInit?.body).toBeInstanceOf(FormData)

    const body = requestedInit?.body as FormData
    expect(body.get('key')).toBe('server-secret')
    const uploadedFile = body.get('image') as File
    expect(uploadedFile).toMatchObject({
      name: 'foto.jpg',
      type: 'image/jpeg',
      size: 3,
    })
    expect(new Uint8Array(await uploadedFile.arrayBuffer())).toEqual(
      Uint8Array.from([0xff, 0xd8, 0xff]),
    )
  })

  it.each([
    ['non-2xx status', response({ error: 'raw-provider-error' }, 500)],
    [
      'unsuccessful payload',
      response({ success: false, status: 400, data: null }),
    ],
    [
      'non-HTTPS URL',
      response({ success: true, data: { url: 'http://i.ibb.co/a.jpg' } }),
    ],
    [
      'unexpected host',
      response({ success: true, data: { url: 'https://evil.test/a.jpg' } }),
    ],
    [
      'lookalike host',
      response({ success: true, data: { url: 'https://i.ibb.co.evil.test/a.jpg' } }),
    ],
  ])('rejects a %s without leaking provider details', async (_, result) => {
    const operation = uploadToImgBb({
      file: image,
      apiKey: 'server-secret',
      fetchImpl: async () => result,
    })

    await expect(operation).rejects.toEqual(
      new ImgBbUploadError(
        'Não foi possível enviar a imagem. Tente novamente.',
      ),
    )
    await expect(operation).rejects.not.toThrow(/server-secret|raw-provider-error/)
  })

  it('rejects malformed JSON with a stable safe error', async () => {
    const operation = uploadToImgBb({
      file: image,
      apiKey: 'server-secret',
      fetchImpl: async () => new Response('{invalid-json', { status: 200 }),
    })

    await expect(operation).rejects.toBeInstanceOf(ImgBbUploadError)
    await expect(operation).rejects.toThrow(
      'Não foi possível enviar a imagem. Tente novamente.',
    )
  })

  it('aborts a provider request after the configured timeout', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )

    const operation = uploadToImgBb({
      file: image,
      apiKey: 'server-secret',
      fetchImpl,
      timeoutMs: 5,
    })

    await expect(operation).rejects.toBeInstanceOf(ImgBbUploadError)
    await expect(operation).rejects.toThrow(
      'Não foi possível enviar a imagem. Tente novamente.',
    )
  })
})
