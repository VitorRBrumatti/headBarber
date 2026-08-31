import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('demo provisioning entry point', () => {
  it('loads its dependencies in native Node ESM without running the provisioner', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/provision-demo.mjs'), 'utf8')
    // Execute only imports: do not load credentials or contact the database.
    const imports = source.match(/^import .+$/gm) ?? []
    expect(imports.length).toBeGreaterThan(0)
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', imports.join('\n')], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })).not.toThrow()
  })
})
