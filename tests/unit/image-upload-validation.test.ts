import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES } from '@/lib/image-upload/contracts'
import { validateImageFile } from '@/lib/image-upload/file-validation'

function file(bytes: number[], name: string, type: string) {
  return new File([Uint8Array.from(bytes)], name, { type })
}

describe('image file validation', () => {
  it.each([
    [
      file([0xff, 0xd8, 0xff, 0xdb], 'foto.jpg', 'image/jpeg'),
      'image/jpeg',
    ],
    [
      file(
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        'foto.png',
        'image/png',
      ),
      'image/png',
    ],
    [
      file(
        [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
        'foto.webp',
        'image/webp',
      ),
      'image/webp',
    ],
  ] as const)('accepts a valid %s file signature', async (image, mime) => {
    await expect(validateImageFile(image)).resolves.toEqual({
      ok: true,
      mime,
    })
  })

  it('rejects an empty file', async () => {
    const image = new File([], 'vazia.png', { type: 'image/png' })

    await expect(validateImageFile(image)).resolves.toEqual({
      ok: false,
      code: 'EMPTY_FILE',
      message: 'Selecione uma imagem.',
    })
  })

  it('rejects a file above 5 MiB', async () => {
    const image = new File(
      [new Uint8Array(MAX_IMAGE_BYTES + 1)],
      'grande.jpg',
      { type: 'image/jpeg' },
    )

    await expect(validateImageFile(image)).resolves.toEqual({
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: 'A imagem deve ter no máximo 5 MB.',
    })
  })

  it.each([
    file([0x3c, 0x73, 0x76, 0x67], 'vetor.svg', 'image/svg+xml'),
    file([0x47, 0x49, 0x46, 0x38], 'animada.gif', 'image/gif'),
  ])('rejects unsupported browser-declared formats', async (image) => {
    await expect(validateImageFile(image)).resolves.toEqual({
      ok: false,
      code: 'INVALID_TYPE',
      message: 'Use uma imagem JPEG, PNG ou WebP.',
    })
  })

  it('rejects a MIME type that disagrees with the file bytes', async () => {
    const image = file(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      'disfarçada.jpg',
      'image/jpeg',
    )

    await expect(validateImageFile(image)).resolves.toEqual({
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: 'O conteúdo do arquivo não corresponde a uma imagem válida.',
    })
  })

  it('rejects arbitrary bytes even with an allowed MIME type', async () => {
    const image = file([1, 2, 3, 4, 5], 'falsa.webp', 'image/webp')

    await expect(validateImageFile(image)).resolves.toEqual({
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: 'O conteúdo do arquivo não corresponde a uma imagem válida.',
    })
  })
})
