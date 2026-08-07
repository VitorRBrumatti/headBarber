export type ImageUploadState =
  | {
      status: 'idle'
      currentUrl: string | null
      previewUrl: null
      error: string
    }
  | {
      status: 'uploading'
      currentUrl: string | null
      previewUrl: string
      error: ''
    }

export type ImageUploadEvent =
  | { type: 'upload-started'; previewUrl: string }
  | { type: 'upload-succeeded'; url: string }
  | { type: 'upload-failed'; error: string }
  | { type: 'removed' }
  | { type: 'reset'; url: string | null }

export function createInitialImageUploadState(
  currentUrl: string | null,
): ImageUploadState {
  return {
    status: 'idle',
    currentUrl,
    previewUrl: null,
    error: '',
  }
}

export function reduceImageUploadState(
  state: ImageUploadState,
  event: ImageUploadEvent,
): ImageUploadState {
  switch (event.type) {
    case 'upload-started':
      return {
        status: 'uploading',
        currentUrl: state.currentUrl,
        previewUrl: event.previewUrl,
        error: '',
      }
    case 'upload-succeeded':
      return createInitialImageUploadState(event.url)
    case 'upload-failed':
      return {
        status: 'idle',
        currentUrl: state.currentUrl,
        previewUrl: null,
        error: event.error,
      }
    case 'removed':
      return createInitialImageUploadState(null)
    case 'reset':
      return createInitialImageUploadState(event.url)
  }
}
