import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type AcceptedImageMime,
  type ImageValidationResult,
} from './contracts'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte)
}

function detectImageMime(bytes: Uint8Array): AcceptedImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png'

  const isWebp =
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  return isWebp ? 'image/webp' : null
}

export async function validateImageFile(
  file: File,
): Promise<ImageValidationResult> {
  if (file.size === 0) {
    return {
      ok: false,
      code: 'EMPTY_FILE',
      message: 'Selecione uma imagem.',
    }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: 'A imagem deve ter no máximo 5 MB.',
    }
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageMime)) {
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: 'Use uma imagem JPEG, PNG ou WebP.',
    }
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const detectedMime = detectImageMime(header)

  if (!detectedMime || detectedMime !== file.type) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: 'O conteúdo do arquivo não corresponde a uma imagem válida.',
    }
  }

  return { ok: true, mime: detectedMime }
}
