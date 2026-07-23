import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const runbookPath = resolve(process.cwd(), 'docs/runbooks/barber-service-rollout.md')
const runbook = existsSync(runbookPath) ? readFileSync(runbookPath, 'utf8') : ''

describe('barber service rollout runbook contract', () => {
  it('exists and defines releases A through D', () => {
    expect(existsSync(runbookPath)).toBe(true)

    for (const release of ['A', 'B', 'C', 'D']) {
      expect(runbook).toMatch(new RegExp(`^## Release ${release}\\b`, 'm'))
    }
  })

  it('requires owner-only telemetry checks for fourteen consecutive days', () => {
    expect(runbook).toContain('14 consecutive days')
    expect(runbook).toMatch(/database owner/i)
    expect(runbook).toMatch(/Supabase SQL Editor/i)
    expect(runbook).toMatch(
      /application,\s+`anon`,\s+and\s+`authenticated` roles must not receive access/i,
    )
  })

  it('includes the null-snapshot and legacy-call telemetry queries', () => {
    expect(runbook).toContain('select count(*) as null_snapshots')
    expect(runbook).toContain('from public.appointments')
    expect(runbook).toContain('where barber_service_id is null')
    expect(runbook).toContain('or service_price is null')
    expect(runbook).toContain('or service_duration_minutes is null')

    expect(runbook).toContain('select function_name, count(*) as calls, max(called_at) as last_call')
    expect(runbook).toContain('from private.legacy_booking_rpc_calls')
    expect(runbook).toContain("where called_at >= now() - interval '14 days'")
    expect(runbook).toContain('group by function_name')
  })

  it('defines the rollback boundaries for releases A, B, and C', () => {
    expect(runbook).toMatch(/Release A[\s\S]*application-rollback-safe/i)
    expect(runbook).toMatch(/Release B[\s\S]*roll back[\s\S]*legacy functions remain/i)
    expect(runbook).toMatch(/Release C[\s\S]*zero null snapshots[\s\S]*zero legacy calls[\s\S]*14 consecutive days/i)
    expect(runbook).toMatch(/Release C[\s\S]*ends old-application rollback support/i)
  })
})
