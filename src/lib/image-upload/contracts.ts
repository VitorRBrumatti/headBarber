export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_REQUEST_BYTES = MAX_IMAGE_BYTES + 256 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AcceptedImageMime = (typeof ACCEPTED_IMAGE_TYPES)[number]

export type ImageUploadCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'INVALID_SIGNATURE'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MISCONFIGURED'

export type ImageValidationResult =
  | { ok: true; mime: AcceptedImageMime }
  | { ok: false; code: ImageUploadCode; message: string }

export interface UploadedImage {
  url: string
}
