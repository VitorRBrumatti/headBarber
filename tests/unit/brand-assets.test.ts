import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const brandDirectory = join(projectRoot, 'public', 'brand')
const appDirectory = join(projectRoot, 'src', 'app')

const newBrandAssets = [
  'headbarber_favicon_simbolo_transparente.png',
  'headbarber_logo_branca_com_texto_transparente.png',
  'headbarber_logo_dourada_com_texto_transparente.png',
  'headbarber_logo_duas_cores_com_texto_transparente.png',
  'headbarber_simbolo_duas_cores_transparente.png',
]

const retiredBrandAssets = [
  'app-icon.png',
  'logo-horizontal.png',
  'logo-symbol-black.png',
  'logo-symbol-gold.png',
  'logo-symbol-white.png',
  'logo-symbol.png',
  'logo-white.png',
  'social-icon.png',
  'logo-nome-branco.png',
  'logo-nome-dourado.png',
  'logo-nome-padrao.png',
  'logo-transparente.png',
]

const faviconSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512]

function collectFiles(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return collectFiles(path, extension)
    }

    return entry.name.endsWith(extension) ? [path] : []
  })
}

describe('HeadBarber brand assets', () => {
  it('ships only the new logo family and the new app icon', () => {
    for (const asset of newBrandAssets) {
      expect(existsSync(join(brandDirectory, asset)), `${asset} should exist`).toBe(true)
    }

    for (const asset of retiredBrandAssets) {
      expect(existsSync(join(brandDirectory, asset)), `${asset} should be retired`).toBe(false)
    }

    expect(existsSync(join(appDirectory, 'favicon.ico'))).toBe(true)
    expect(existsSync(join(appDirectory, 'icon.png'))).toBe(true)
    expect(existsSync(join(appDirectory, 'apple-icon.png'))).toBe(true)

    for (const size of faviconSizes) {
      expect(
        existsSync(join(brandDirectory, 'favicons', `favicon-${size}x${size}.png`)),
      ).toBe(true)
    }
  })

  it('uses the new logos across the app and Supabase email templates', () => {
    const appSource = collectFiles(join(projectRoot, 'src'), '.tsx')
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const emailTemplates = collectFiles(join(projectRoot, 'supabase', 'templates'), '.html')
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const source = `${appSource}\n${emailTemplates}`

    expect(source).toContain('/brand/headbarber_logo_branca_com_texto_transparente.png')
    expect(source).toContain('/brand/headbarber_logo_dourada_com_texto_transparente.png')
    expect(source).toContain('/brand/headbarber_logo_duas_cores_com_texto_transparente.png')
    expect(source).toContain('/brand/headbarber_simbolo_duas_cores_transparente.png')
    expect(emailTemplates).toContain(
      '{{ .SiteURL }}/brand/headbarber_simbolo_duas_cores_transparente.png',
    )

    for (const asset of retiredBrandAssets) {
      expect(source).not.toContain(`/brand/${asset}`)
    }
  })
})
