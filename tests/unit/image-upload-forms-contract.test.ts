import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('dashboard image upload integrations', () => {
  it('uses the reusable uploader only for barbers and products', () => {
    const barberForm = source('src/components/dashboard/barber-form.tsx')
    const productForm = source('src/components/dashboard/product-form.tsx')
    const serviceForm = source('src/components/dashboard/service-form.tsx')

    expect(barberForm).toContain('<ImageUpload')
    expect(barberForm).toContain('name="avatar_url"')
    expect(productForm).toContain('<ImageUpload')
    expect(productForm).toContain('name="image_url"')
    expect(barberForm).not.toContain('type="url"')
    expect(productForm).not.toContain('type="url"')
    expect(serviceForm).not.toContain('<ImageUpload')
    expect(serviceForm).not.toContain('image_url')
  })

  it('shows accessible upload progress and submits to the same-origin endpoint', () => {
    const imageUpload = source('src/components/ui/image-upload.tsx')

    expect(imageUpload).toContain('LoaderCircle')
    expect(imageUpload).toContain('animate-spin')
    expect(imageUpload).toContain('role="status"')
    expect(imageUpload).toContain('aria-live="polite"')
    expect(imageUpload).toContain("fetch('/api/images/upload'")
    expect(imageUpload).toContain('type="hidden"')
  })

  it('prevents either form from saving while its image is uploading', () => {
    const barberForm = source('src/components/dashboard/barber-form.tsx')
    const productForm = source('src/components/dashboard/product-form.tsx')

    expect(barberForm).toContain('disabled={isPending || isUploading}')
    expect(productForm).toContain('disabled={isPending || isUploading}')
  })
})
