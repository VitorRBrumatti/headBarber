import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('exposes the checked state with native switch semantics', () => {
    const markup = renderToStaticMarkup(
      <Switch
        aria-label="Catálogo ativo"
        checked
        onCheckedChange={() => undefined}
      />,
    )

    expect(markup).toContain('role="switch"')
    expect(markup).toContain('aria-label="Catálogo ativo"')
    expect(markup).toContain('aria-checked="true"')
    expect(markup).toContain('checked=""')
  })

  it('keeps the disabled state on the native control', () => {
    const markup = renderToStaticMarkup(
      <Switch
        aria-label="Benefício disponível"
        checked={false}
        disabled
        onCheckedChange={() => undefined}
      />,
    )

    expect(markup).toContain('aria-checked="false"')
    expect(markup).toContain('disabled=""')
    expect(markup).not.toContain('checked=""')
  })
})
