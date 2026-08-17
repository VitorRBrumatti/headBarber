import { describe, expect, it } from 'vitest'

import {
  createInitialImageUploadState,
  reduceImageUploadState,
} from '@/components/ui/image-upload-state'

describe('image upload state', () => {
  it('starts an upload with a local preview', () => {
    const initial = createInitialImageUploadState(null)

    expect(
      reduceImageUploadState(initial, {
        type: 'upload-started',
        previewUrl: 'blob:test',
      }),
    ).toEqual({
      status: 'uploading',
      currentUrl: null,
      previewUrl: 'blob:test',
      error: '',
    })
  })

  it('replaces the persisted URL after a successful upload', () => {
    const uploading = reduceImageUploadState(
      createInitialImageUploadState('https://example.test/old.jpg'),
      { type: 'upload-started', previewUrl: 'blob:test' },
    )

    expect(
      reduceImageUploadState(uploading, {
        type: 'upload-succeeded',
        url: 'https://i.ibb.co/a.webp',
      }),
    ).toEqual({
      status: 'idle',
      currentUrl: 'https://i.ibb.co/a.webp',
      previewUrl: null,
      error: '',
    })
  })

  it('preserves the existing URL if an upload fails', () => {
    const existingUrl = 'https://example.test/old.jpg'
    const uploading = reduceImageUploadState(
      createInitialImageUploadState(existingUrl),
      { type: 'upload-started', previewUrl: 'blob:test' },
    )

    expect(
      reduceImageUploadState(uploading, {
        type: 'upload-failed',
        error: 'Falhou',
      }),
    ).toEqual({
      status: 'idle',
      currentUrl: existingUrl,
      previewUrl: null,
      error: 'Falhou',
    })
  })

  it('removes and resets the current URL', () => {
    const existingUrl = 'https://example.test/old.jpg'
    const initial = createInitialImageUploadState(existingUrl)

    expect(reduceImageUploadState(initial, { type: 'removed' }).currentUrl).toBeNull()
    expect(
      reduceImageUploadState(initial, { type: 'reset', url: null }),
    ).toEqual(createInitialImageUploadState(null))
  })
})
