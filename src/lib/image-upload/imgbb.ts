import type { UploadedImage } from './contracts'

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const DEFAULT_TIMEOUT_MS = 15_000

export class ImgBbUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImgBbUploadError'
  }
}

interface UploadToImgBbInput {
  file: File
  apiKey: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

function safeUploadError() {
  return new ImgBbUploadError(
    'Não foi possível enviar a imagem. Tente novamente.',
  )
}

function parsePublicUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const result = payload as Record<string, unknown>
  if (result.success !== true || !result.data || typeof result.data !== 'object') {
    return null
  }

  const rawUrl = (result.data as Record<string, unknown>).url
  if (typeof rawUrl !== 'string') return null

  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'i.ibb.co') return null
    return url.toString()
  } catch {
    return null
  }
}

export async function uploadToImgBb({
  file,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UploadToImgBbInput): Promise<UploadedImage> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const body = new FormData()
  body.append('key', apiKey)
  body.append('image', file, file.name)

  try {
    const response = await fetchImpl(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body,
      signal: controller.signal,
    })

    if (!response.ok) throw safeUploadError()

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw safeUploadError()
    }

    const url = parsePublicUrl(payload)
    if (!url) throw safeUploadError()

    return { url }
  } catch (error) {
    if (error instanceof ImgBbUploadError) throw error
    throw safeUploadError()
  } finally {
    clearTimeout(timeout)
  }
}
