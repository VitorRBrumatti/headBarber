import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260801190211_subscription_settlement.sql',
  ),
  'utf8',
)

describe('subscription settlement migration', () => {
  it('defines one authenticated terminal-state transaction', () => {
    expect(sql).toMatch(
      /create or replace function public\.settle_appointment/i,
    )
    expect(sql).toMatch(
      /p_target_status not in \('completed','cancelled','no_show'\)/i,
    )
    expect(sql).toMatch(/for update/i)
  })

  it('uses due amount, product sales, and allocation promotion', () => {
    expect(sql).toMatch(/new\.amount_due/i)
    expect(sql).toMatch(/source[^\n]+appointment_service/i)
    expect(sql).toMatch(/status = 'sold'/i)
    expect(sql).toMatch(/private\.promote_waiting_subscription_allocation/i)
  })

  it('keeps the legacy trigger installed but flag-controlled', () => {
    expect(sql).toMatch(
      /create or replace function public\.sync_appointment_to_revenue/i,
    )
    expect(sql).toMatch(/client_subscriptions_settlement_enabled/i)
  })
})
