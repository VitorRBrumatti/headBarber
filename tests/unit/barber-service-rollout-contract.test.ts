import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const runbookPath = resolve(process.cwd(), 'docs/runbooks/barber-service-rollout.md')
const runbook = existsSync(runbookPath) ? readFileSync(runbookPath, 'utf8') : ''

function releaseSection(release: string) {
  const heading = `## Release ${release}`
  const start = runbook.indexOf(heading)
  const nextHeading = runbook.indexOf('\n## ', start + heading.length)

  return start === -1 ? '' : runbook.slice(start, nextHeading === -1 ? undefined : nextHeading)
}

describe('barber service rollout runbook contract', () => {
  it('exists and defines releases A through D', () => {
    expect(existsSync(runbookPath)).toBe(true)

    for (const release of ['A', 'B', 'C', 'D']) {
      expect(runbook).toMatch(new RegExp(`^## Release ${release}\\b`, 'm'))
    }
  })

  it('blocks Release A until the local reset and pgTAP compatibility gate pass', () => {
    const releaseA = releaseSection('A')

    expect(releaseA).toMatch(/before deploy/i)
    expect(releaseA).toMatch(/fresh local database reset/i)
    expect(releaseA).toMatch(/legacy pgTAP[\s\S]*green/i)
    expect(releaseA).toMatch(/do not deploy Release A until this gate passes/i)
  })

  it('requires legacy signatures to preserve snapshots and relationship pricing', () => {
    const releaseA = releaseSection('A')

    expect(releaseA).toMatch(/legacy signatures?[\s\S]*create snapshots/i)
    expect(releaseA).toMatch(/relationship pricing/i)
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
    expect(runbook).toContain('from public.appointment_add_ons')
    expect(runbook).toContain('where barber_add_on_id is null')
    expect(runbook).toContain('or duration_minutes is null')
    expect(runbook).toMatch(/barber_add_ons[\s\S]*RLS[\s\S]*grants/i)
    expect(runbook).toContain(
      'select function_name, count(*) as calls, max(called_at) as last_call',
    )
    expect(runbook).toContain('from private.legacy_booking_rpc_calls')
    expect(runbook).toContain("where called_at >= now() - interval '14 days'")
    expect(runbook).toContain('group by function_name')
  })

  it('defines rollback boundaries inside releases A, B, and C', () => {
    expect(releaseSection('A')).toMatch(/application-rollback-safe/i)
    expect(releaseSection('B')).toMatch(/roll back[\s\S]*legacy functions remain/i)
    expect(releaseSection('C')).toMatch(
      /zero null snapshots[\s\S]*zero legacy calls[\s\S]*14 consecutive days/i,
    )
    expect(releaseSection('C')).toMatch(/ends old-application rollback support/i)
  })
})
