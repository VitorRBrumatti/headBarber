'use client'

import {
  useEffect,
  useReducer,
  useRef,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react'

import { validateImageFile } from '@/lib/image-upload/file-validation'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  createInitialImageUploadState,
  reduceImageUploadState,
} from './image-upload-state'

interface ImageUploadProps {
  name: 'avatar_url' | 'image_url'
  label: string
  initialUrl: string | null
  shape?: 'circle' | 'square'
  onUploadingChange?: (uploading: boolean) => void
}

interface UploadResponse {
  url?: unknown
  error?: unknown
}

const fallbackError = 'Não foi possível enviar a imagem. Tente novamente.'

async function responsePayload(response: Response): Promise<UploadResponse> {
  try {
    const payload: unknown = await response.json()
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as UploadResponse)
      : {}
  } catch {
    return {}
  }
}

export function ImageUpload({
  name,
  label,
  initialUrl,
  shape = 'square',
  onUploadingChange,
}: ImageUploadProps) {
  const [state, dispatch] = useReducer(
    reduceImageUploadState,
    initialUrl,
    createInitialImageUploadState,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const isUploading = state.status === 'uploading'
  const displayedUrl = state.previewUrl ?? state.currentUrl

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  async function uploadFile(file: File) {
    if (isUploading) return

    const validation = await validateImageFile(file)
    if (!validation.ok) {
      dispatch({ type: 'upload-failed', error: validation.message })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    objectUrlRef.current = previewUrl
    dispatch({ type: 'upload-started', previewUrl })
    onUploadingChange?.(true)

    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body,
      })
      const payload = await responsePayload(response)

      if (!response.ok || typeof payload.url !== 'string') {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : fallbackError,
        )
      }

      dispatch({ type: 'upload-succeeded', url: payload.url })
    } catch (error) {
      dispatch({
        type: 'upload-failed',
        error: error instanceof Error ? error.message : fallbackError,
      })
    } finally {
      URL.revokeObjectURL(previewUrl)
      objectUrlRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
      onUploadingChange?.(false)
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void uploadFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input type="hidden" name={name} value={state.currentUrl ?? ''} />

      <div
        className="flex flex-col gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 sm:flex-row sm:items-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            'relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-white text-zinc-400',
            shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          )}
        >
          {displayedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayedUrl}
              alt={`Prévia: ${label}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-8 w-8" aria-hidden="true" />
          )}

          {isUploading ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/60 text-white"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
              <span className="sr-only">Enviando imagem...</span>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-800">
              JPEG, PNG ou WebP
            </p>
            <p className="text-xs text-zinc-500">
              Até 5 MB. Você também pode arrastar a imagem para cá.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {state.currentUrl ? 'Trocar imagem' : 'Escolher imagem'}
            </Button>

            {state.currentUrl ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isUploading}
                onClick={() => dispatch({ type: 'removed' })}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Remover imagem
              </Button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={handleChange}
            aria-label={label}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}
