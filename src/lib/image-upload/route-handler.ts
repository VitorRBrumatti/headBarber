import {
  MAX_IMAGE_REQUEST_BYTES,
  type ImageUploadCode,
  type UploadedImage,
} from './contracts'
import { validateImageFile } from './file-validation'

interface UploadContext<TSupabase> {
  supabase: TSupabase
  barbershopId: string
}

interface QuotaResult {
  allowed: boolean
  retryAfterSeconds: number
}

export interface ImageUploadRouteDependencies<TSupabase> {
  getContext: () => Promise<UploadContext<TSupabase>>
  isConfigured: () => boolean
  consumeQuota: (
    supabase: TSupabase,
    barbershopId: string,
  ) => Promise<QuotaResult>
  upload: (file: File) => Promise<UploadedImage>
}

interface ErrorPayload {
  error: string
  code: ImageUploadCode
  retryAfterSeconds?: number
}

function json(payload: ErrorPayload | UploadedImage, status: number, headers?: HeadersInit) {
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function errorResponse(
  status: number,
  code: ImageUploadCode,
  error: string,
  retryAfterSeconds?: number,
) {
  return json(
    {
      error,
      code,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
    status,
    retryAfterSeconds === undefined
      ? undefined
      : { 'Retry-After': String(retryAfterSeconds) },
  )
}

export async function handleImageUpload<TSupabase>(
  request: Request,
  deps: ImageUploadRouteDependencies<TSupabase>,
): Promise<Response> {
  const requestOrigin = new URL(request.url).origin
  if (request.headers.get('origin') !== requestOrigin) {
    return errorResponse(403, 'FORBIDDEN', 'Origem da requisição não permitida.')
  }

  let context: UploadContext<TSupabase>
  try {
    context = await deps.getContext()
  } catch {
    return errorResponse(401, 'UNAUTHENTICATED', 'Faça login para enviar imagens.')
  }

  if (!deps.isConfigured()) {
    return errorResponse(
      503,
      'MISCONFIGURED',
      'O envio de imagens não está disponível no momento.',
    )
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_REQUEST_BYTES) {
    return errorResponse(413, 'FILE_TOO_LARGE', 'A imagem deve ter no máximo 5 MB.')
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse(400, 'EMPTY_FILE', 'Selecione uma imagem.')
  }

  const imageValues = formData.getAll('image')
  if (imageValues.length !== 1 || !(imageValues[0] instanceof File)) {
    return errorResponse(400, 'EMPTY_FILE', 'Selecione uma imagem.')
  }

  const file = imageValues[0]
  const validation = await validateImageFile(file)
  if (!validation.ok) {
    return errorResponse(
      validation.code === 'FILE_TOO_LARGE' ? 413 : 400,
      validation.code,
      validation.message,
    )
  }

  let quota: QuotaResult
  try {
    quota = await deps.consumeQuota(context.supabase, context.barbershopId)
  } catch {
    return errorResponse(
      503,
      'PROVIDER_UNAVAILABLE',
      'Não foi possível validar o limite de uploads. Tente novamente.',
    )
  }

  if (!quota.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(quota.retryAfterSeconds))
    return errorResponse(
      429,
      'RATE_LIMITED',
      'Muitos envios de imagem. Aguarde e tente novamente.',
      retryAfterSeconds,
    )
  }

  try {
    const uploaded = await deps.upload(file)
    return json({ url: uploaded.url }, 200)
  } catch (uploadError) {
    if (uploadError instanceof Error && uploadError.message === 'MISCONFIGURED') {
      return errorResponse(
        503,
        'MISCONFIGURED',
        'O envio de imagens não está disponível no momento.',
      )
    }

    return errorResponse(
      502,
      'PROVIDER_UNAVAILABLE',
      'Não foi possível enviar a imagem. Tente novamente.',
    )
  }
}
