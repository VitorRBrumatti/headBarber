# Client Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver customer subscription plans with paid-cycle snapshots, deterministic benefit allocation, automatic waiting-list promotion, idempotent settlement, and correct financial reporting.

**Architecture:** Expand the Supabase schema behind feature flags, keep legacy RPC signatures operational, and introduce one private booking core plus authenticated/anonymous wrappers. Database transactions own prices, quotas, status transitions, stock, and revenues; Next.js Server Actions authenticate every administrative mutation and only map authoritative RPC receipts.

**Tech Stack:** Next.js 16.2 App Router and Server Actions, React 19.2, TypeScript 5, Supabase/Postgres with pgTAP, Vitest 4, Playwright 1.60.

## Global Constraints

- Work only in `C:\Projects\headBarber\.worktrees\client-subscriptions` on `codex/client-subscriptions`; do not create another worktree.
- Generate every migration with `npx supabase migration new <name>`; never invent a timestamped filename.
- New public tables must enable RLS and receive explicit Data API grants.
- Administrative RPCs derive the tenant from `auth.uid()`; they do not trust a client-provided `barbershop_id`.
- Privileged helpers live in `private`, set `search_path = ''`, and revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Public `SECURITY DEFINER` wrappers revoke `PUBLIC` before granting only the required role.
- `total_price` remains the gross attendance value; `amount_due` is the collectible service/add-on value; products remain separate.
- A granted benefit is never automatically downgraded. Released quota promotes the earliest eligible waiting allocation.
- Future unpaid appointments begin at normal price and are reconciled when their cycle is paid.
- Pausing or cancelling a subscription never changes a paid cycle. Plan changes take effect at the next payment.
- No OTP, SMS, or WhatsApp verification is implemented; public matching continues by normalized phone.
- Every behavior change follows RED → GREEN → REFACTOR and ends in a small commit.
- Every activation feature flag defaults to `false`.
- Do not run `npm audit fix` or dependency upgrades as part of this feature.

## Stable Interface Contracts

Database RPCs introduced by this plan:

```sql
public.save_subscription_plan(
  p_plan_id uuid,
  p_name text,
  p_description text,
  p_monthly_price numeric,
  p_items jsonb
) returns uuid

public.create_client_subscription(
  p_client_id uuid,
  p_plan_id uuid,
  p_started_on date,
  p_notes text
) returns uuid

public.set_client_subscription_status(
  p_subscription_id uuid,
  p_status text
) returns jsonb

public.schedule_client_subscription_plan(
  p_subscription_id uuid,
  p_plan_id uuid
) returns jsonb

public.register_client_subscription_payment(
  p_subscription_id uuid,
  p_period_start date,
  p_payment_method text
) returns jsonb

public.preview_public_booking_with_entitlements(
  p_barbershop_id uuid,
  p_client_phone text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb

public.create_public_booking_with_entitlements(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb

public.create_admin_booking_with_entitlements(
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb

public.settle_appointment(
  p_appointment_id uuid,
  p_target_status text,
  p_payment_method text
) returns jsonb
```

Internal database interfaces:

```sql
private.recalculate_appointment_subscription_totals(p_appointment_id uuid) returns void
private.reconcile_subscription_cycle(p_cycle_id uuid) returns void
private.promote_waiting_subscription_allocation(p_cycle_entitlement_id uuid) returns uuid
private.create_appointment_with_entitlements(...) returns jsonb
```

Application result convention:

```ts
export type SubscriptionActionResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; error: string }
```

---

## Phase A — Foundation and administration

### Task 1: Add subscription schema, financial snapshots, and feature flags

**Files:**
- Create via CLI: `supabase/migrations/*_client_subscriptions_foundation.sql`
- Create: `supabase/tests/database/client_subscriptions_foundation.test.sql`
- Create: `tests/unit/client-subscriptions-foundation-migration.test.ts`

**Interfaces:**
- Consumes: existing `barbershops`, `clients`, `services`, `add_ons`, `appointments`, `appointment_products`, `revenues`, and `public.has_active_subscription()`.
- Produces: six subscription tables, appointment financial fields, revenue sources, product settlement links, product `sold` state, and three disabled flags.

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const file = readdirSync('supabase/migrations').find((name) =>
  name.endsWith('_client_subscriptions_foundation.sql'),
)
const sql = file ? readFileSync(`supabase/migrations/${file}`, 'utf8') : ''

describe('client subscriptions foundation migration', () => {
  it('creates the domain with tenant security and disabled flags', () => {
    expect(sql).toMatch(/create table public\.subscription_plans/i)
    expect(sql).toMatch(/create table public\.subscription_plan_items/i)
    expect(sql).toMatch(/create table public\.client_subscriptions/i)
    expect(sql).toMatch(/create table public\.subscription_cycles/i)
    expect(sql).toMatch(/create table public\.subscription_cycle_entitlements/i)
    expect(sql).toMatch(/create table public\.appointment_subscription_allocations/i)
    expect(sql.match(/enable row level security/gi)).toHaveLength(6)
    expect(sql).toMatch(/client_subscriptions_admin_enabled boolean not null default false/i)
    expect(sql).toMatch(/source text not null default 'manual'/i)
    expect(sql).toMatch(/status in \('reserved', 'sold', 'released'\)/i)
  })
})
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npm.cmd test -- tests/unit/client-subscriptions-foundation-migration.test.ts`
Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Generate the migration and add the minimum schema**

Run: `npx.cmd supabase migration new client_subscriptions_foundation`

The generated migration must define these checks and indexes exactly:

```sql
alter table public.barbershop_settings
  add column client_subscriptions_admin_enabled boolean not null default false,
  add column client_subscriptions_booking_enabled boolean not null default false,
  add column client_subscriptions_settlement_enabled boolean not null default false;

alter table public.appointments
  add column subscription_coverage_status text not null default 'none'
    check (subscription_coverage_status in ('none','awaiting_cycle','waiting','partial','covered')),
  add column subscription_covered_total numeric(10,2) not null default 0 check (subscription_covered_total >= 0),
  add column amount_due numeric(10,2),
  add column commissionable_total numeric(10,2),
  add column commission_percentage_snapshot numeric(5,2),
  add column commission_amount numeric(10,2);

update public.appointments
set amount_due = total_price,
    commissionable_total = total_price;

alter table public.revenues
  add column source text not null default 'manual'
    check (source in ('manual','appointment_service','appointment_product','subscription_cycle'));

create unique index revenues_automatic_origin_uq
  on public.revenues(barbershop_id, source, reference_id)
  where source <> 'manual' and reference_id is not null;

alter table public.product_sales
  add column appointment_id uuid references public.appointments(id) on delete restrict,
  add column appointment_product_id uuid references public.appointment_products(id) on delete restrict;

create unique index product_sales_appointment_product_uq
  on public.product_sales(appointment_product_id) where appointment_product_id is not null;
```

Create all six tables from the approved spec, use XOR checks for service/add-on items, add composite tenant FKs, and use this open-subscription index:

```sql
create unique index client_subscriptions_one_open_per_client_uq
  on public.client_subscriptions(barbershop_id, client_id)
  where status in ('active','paused');
```

Grant only `SELECT` on new tables to `authenticated`; mutations go through RPCs. Grant `ALL` to `service_role`, revoke all from `anon`, and add restrictive `subscription_required_for_authenticated_access` policies plus tenant-select policies.

- [ ] **Step 4: Write the pgTAP structural and RLS test**

```sql
begin;
select plan(18);
select has_table('public','subscription_plans');
select has_table('public','subscription_plan_items');
select has_table('public','client_subscriptions');
select has_table('public','subscription_cycles');
select has_table('public','subscription_cycle_entitlements');
select has_table('public','appointment_subscription_allocations');
select has_column('public','appointments','amount_due');
select has_column('public','appointments','subscription_covered_total');
select has_column('public','appointments','commissionable_total');
select has_column('public','revenues','source');
select col_default_is('public','barbershop_settings','client_subscriptions_admin_enabled','false');
select col_default_is('public','barbershop_settings','client_subscriptions_booking_enabled','false');
select col_default_is('public','barbershop_settings','client_subscriptions_settlement_enabled','false');
select has_index('public','client_subscriptions','client_subscriptions_one_open_per_client_uq');
select has_index('public','revenues','revenues_automatic_origin_uq');
select isnt_empty($$select 1 from pg_policies where tablename='subscription_plans'$$);
select isnt_empty($$select 1 from pg_policies where tablename='subscription_cycles'$$);
select isnt_empty($$select 1 from pg_policies where tablename='appointment_subscription_allocations'$$);
select * from finish();
rollback;
```

- [ ] **Step 5: Run GREEN checks**

Run: `npm.cmd test -- tests/unit/client-subscriptions-foundation-migration.test.ts`
Expected: PASS.

Discover the current CLI syntax before the database test: `npx.cmd supabase test db --help`
Run: `npx.cmd supabase test db supabase/tests/database/client_subscriptions_foundation.test.sql`
Expected: PASS with 18 assertions.

- [ ] **Step 6: Commit the foundation**

```powershell
git add supabase/migrations supabase/tests/database/client_subscriptions_foundation.test.sql tests/unit/client-subscriptions-foundation-migration.test.ts
git commit -m "feat: add client subscription foundation"
```

### Task 2: Add plan and subscriber administrative RPCs

**Files:**
- Create via CLI: `supabase/migrations/*_client_subscriptions_admin_rpcs.sql`
- Create: `supabase/tests/database/client_subscriptions_admin.test.sql`
- Create: `tests/unit/client-subscriptions-admin-migration.test.ts`

**Interfaces:**
- Consumes: Task 1 tables and `public.get_user_barbershop_id(auth.uid())`.
- Produces: `save_subscription_plan`, `create_client_subscription`, `set_client_subscription_status`, and `schedule_client_subscription_plan`.

- [ ] **Step 1: Write RED contract tests for authenticated tenant derivation**

```ts
expect(sql).toMatch(/create or replace function public\.save_subscription_plan/i)
expect(sql).toMatch(/v_tenant\s*:=\s*public\.get_user_barbershop_id\(auth\.uid\(\)\)/i)
expect(sql).toMatch(/create or replace function public\.create_client_subscription/i)
expect(sql).toMatch(/create or replace function public\.set_client_subscription_status/i)
expect(sql).toMatch(/create or replace function public\.schedule_client_subscription_plan/i)
expect(sql).toMatch(/revoke execute on function public\.save_subscription_plan[\s\S]+from public/i)
expect(sql).toMatch(/grant execute on function public\.save_subscription_plan[\s\S]+to authenticated/i)
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- tests/unit/client-subscriptions-admin-migration.test.ts`
Expected: FAIL because none of the RPCs exist.

- [ ] **Step 3: Generate and implement the administrative RPC migration**

Run: `npx.cmd supabase migration new client_subscriptions_admin_rpcs`

Use `SECURITY INVOKER SET search_path = ''`. Validate non-empty names, non-negative prices, unique benefit identities, positive-or-null limits, active tenant-owned client/plan references, legal status transitions, and terminal cancellation. `save_subscription_plan` locks the plan row and replaces current plan items in one transaction while incrementing `configuration_version`.

Return stable JSON from status and schedule operations:

```sql
return jsonb_build_object(
  'subscriptionId', v_subscription.id,
  'status', v_subscription.status,
  'planId', v_subscription.plan_id,
  'pendingPlanId', v_subscription.pending_plan_id
);
```

- [ ] **Step 4: Write pgTAP behavior tests**

Test these exact cases inside one rollback transaction:

```sql
select lives_ok($$select public.save_subscription_plan(null,'Premium',null,149.00,
  '[{"itemType":"service","serviceId":"00000000-0000-0000-0000-000000000111","monthlyLimit":null}]'::jsonb)$$,
  'creates a plan with an unlimited service');
select throws_ok($$select public.save_subscription_plan(null,'',null,149.00,'[]'::jsonb)$$,'P0001','INVALID_PLAN');
select throws_ok($$select public.create_client_subscription(v_foreign_client,v_plan,current_date,null)$$,'P0001','INVALID_CLIENT');
select throws_ok($$select public.create_client_subscription(v_client,v_archived_plan,current_date,null)$$,'P0001','INVALID_PLAN');
select throws_ok($$select public.set_client_subscription_status(v_cancelled,'active')$$,'P0001','INVALID_STATUS_TRANSITION');
```

Also assert that a paused subscription blocks a second open subscription and that scheduling a plan does not change `plan_id` immediately.

- [ ] **Step 5: Run GREEN checks**

Run the focused Vitest file and the pgTAP file.
Expected: all assertions pass.

- [ ] **Step 6: Commit admin domain operations**

```powershell
git add supabase/migrations supabase/tests/database/client_subscriptions_admin.test.sql tests/unit/client-subscriptions-admin-migration.test.ts
git commit -m "feat: add subscription administration rpcs"
```

### Task 3: Implement payment, snapshots, reconciliation, and promotion

**Files:**
- Create via CLI: `supabase/migrations/*_client_subscription_cycles.sql`
- Create: `supabase/tests/database/client_subscription_cycles.test.sql`
- Create: `tests/unit/client-subscription-cycles-migration.test.ts`

**Interfaces:**
- Consumes: Task 1 schema and Task 2 subscription state.
- Produces: payment RPC plus the three private allocation/recalculation helpers.

- [ ] **Step 1: Write RED contract tests**

```ts
expect(sql).toMatch(/private\.recalculate_appointment_subscription_totals/i)
expect(sql).toMatch(/private\.reconcile_subscription_cycle/i)
expect(sql).toMatch(/private\.promote_waiting_subscription_allocation/i)
expect(sql).toMatch(/public\.register_client_subscription_payment/i)
expect(sql).toMatch(/for update/i)
expect(sql).toMatch(/order by appointment\.start_at, appointment\.id/i)
expect(sql).toMatch(/on conflict[\s\S]+do nothing/i)
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- tests/unit/client-subscription-cycles-migration.test.ts`
Expected: FAIL because the cycle migration is absent.

- [ ] **Step 3: Generate and implement cycle functions**

Run: `npx.cmd supabase migration new client_subscription_cycles`

`register_client_subscription_payment` must:

```sql
select * into v_subscription
from public.client_subscriptions
where id = p_subscription_id and barbershop_id = v_tenant
for update;

insert into public.subscription_cycles (...)
values (...)
on conflict (client_subscription_id, period_start) do nothing
returning id into v_cycle_id;
```

If the insert returns no row, return the existing receipt without creating another revenue. When a pending plan exists, snapshot it, then atomically set `plan_id = pending_plan_id, pending_plan_id = null`. Insert revenue with `source='subscription_cycle'` and `reference_id=v_cycle_id`.

`reconcile_subscription_cycle` locks entitlements by `id`, scans eligible appointments by `start_at, id`, inserts `reserved` until each finite quota is full, inserts `waiting` afterward, and always calls `recalculate_appointment_subscription_totals`.

`promote_waiting_subscription_allocation` locks the entitlement, selects the first active waiting row with `FOR UPDATE SKIP LOCKED`, promotes it, and recalculates that appointment. Unlimited entitlements never need promotion.

- [ ] **Step 4: Write database behavior and concurrency tests**

Cover:

```sql
select is((select count(*) from public.subscription_cycles where client_subscription_id=v_subscription),1::bigint,'duplicate payment creates one cycle');
select is((select count(*) from public.revenues where source='subscription_cycle' and reference_id=v_cycle),1::bigint,'duplicate payment creates one revenue');
select is((select status from public.appointment_subscription_allocations where appointment_id=v_first),'reserved','earliest appointment receives quota');
select is((select status from public.appointment_subscription_allocations where appointment_id=v_third),'waiting','later appointment waits at normal price');
select is((select amount_due from public.appointments where id=v_third),50.00::numeric,'waiting appointment remains payable');
select is((select plan_id from public.client_subscriptions where id=v_subscription),v_new_plan,'pending plan activates at payment');
```

Use two database sessions in `tests/e2e/client-subscription-concurrency.spec.ts` to call payment and promotion simultaneously, then assert one cycle, one revenue, and no quota overflow.

- [ ] **Step 5: Run GREEN checks**

Run focused Vitest, pgTAP, and the concurrency Playwright spec.
Expected: all pass, including duplicate requests.

- [ ] **Step 6: Commit cycle accounting**

```powershell
git add supabase/migrations supabase/tests/database/client_subscription_cycles.test.sql tests/unit/client-subscription-cycles-migration.test.ts tests/e2e/client-subscription-concurrency.spec.ts
git commit -m "feat: add subscription cycle accounting"
```

### Task 4: Deliver the administrative subscriptions vertical

**Files:**
- Create: `src/app/dashboard/financeiro/assinaturas/types.ts`
- Create: `src/app/dashboard/financeiro/assinaturas/subscription-mappers.ts`
- Create: `src/app/dashboard/financeiro/assinaturas/actions.ts`
- Create: `src/app/dashboard/financeiro/assinaturas/page.tsx`
- Create: `src/app/dashboard/financeiro/assinaturas/subscriptions-client.tsx`
- Create: `tests/unit/client-subscriptions-actions.test.ts`
- Create: `tests/unit/client-subscriptions-ui.test.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

**Interfaces:**
- Consumes: Tasks 2–3 RPC receipts.
- Produces: `/dashboard/financeiro/assinaturas`, typed actions, plan CRUD, subscriber controls, and payment registration.

- [ ] **Step 1: Write RED mapper/action tests**

```ts
expect(mapSubscriptionRow(row)).toEqual({
  id: 'sub-1', clientName: 'Ana', planName: 'Premium', status: 'active',
  nextBillingDate: '2026-09-01', pendingPlanName: null,
})
await registerSubscriptionPaymentAction({
  subscriptionId: 'sub-1', periodStart: '2026-09-01', paymentMethod: 'pix',
})
expect(mockRpc).toHaveBeenCalledWith('register_client_subscription_payment', {
  p_subscription_id: 'sub-1', p_period_start: '2026-09-01', p_payment_method: 'pix',
})
```

- [ ] **Step 2: Verify RED**

Run both new unit files.
Expected: FAIL because route modules do not exist.

- [ ] **Step 3: Implement typed actions and mapping**

Define `SubscriptionActionResult<T>` exactly as the global contract. Every action calls `getBarbershopId()` first, invokes one RPC, maps known database codes (`INVALID_PLAN`, `INVALID_CLIENT`, `INVALID_STATUS_TRANSITION`, `PAYMENT_CONFLICT`), and calls:

```ts
revalidatePath('/dashboard/financeiro/assinaturas')
revalidatePath('/dashboard/financeiro')
revalidatePath('/dashboard/agenda')
```

- [ ] **Step 4: Implement the feature-flagged page and client UI**

The server page loads the three flags and all tenant-filtered subscription data. If `client_subscriptions_admin_enabled` is false, render a neutral “Assinaturas ainda não ativadas para esta barbearia” state without exposing mutation controls.

When enabled, render tabs `Visão geral`, `Planos`, `Assinantes`, and `Cobranças`. Forms use Server Actions, disable pending submissions, display mapped errors, archive instead of delete, and require explicit confirmation for pause/cancel/payment.

- [ ] **Step 5: Add navigation without colliding with SaaS billing**

Keep `/dashboard/planos-mensais` labeled `Assinatura HeadBarber`. Add `/dashboard/financeiro/assinaturas` labeled `Assinaturas de clientes` under the financial area.

- [ ] **Step 6: Run Phase A gate**

Run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd supabase test db
```

Expected: 0 test failures, 0 lint errors, production build exit 0, all pgTAP files pass. Confirm all three flags remain `false` by default.

- [ ] **Step 7: Commit the administrative vertical**

```powershell
git add src/app/dashboard/financeiro/assinaturas src/components/dashboard/sidebar.tsx tests/unit
git commit -m "feat: add client subscription administration"
```

## Phase B — Booking coverage

### Task 5: Add the unified subscription-aware booking core

**Files:**
- Create via CLI: `supabase/migrations/*_subscription_booking_core.sql`
- Create: `supabase/tests/database/subscription_booking_core.test.sql`
- Create: `tests/unit/subscription-booking-core-migration.test.ts`
- Modify: `tests/unit/appointment-writers-audit.test.ts`

**Interfaces:**
- Consumes: existing versioned barber service/add-on validation, product reservation, Task 3 allocation helpers.
- Produces: one private core, preview wrapper, public wrapper, and authenticated admin wrapper.

- [ ] **Step 1: Write RED inventory tests**

```ts
expect(sql).toMatch(/create or replace function private\.create_appointment_with_entitlements/i)
expect(sql).toMatch(/create or replace function public\.preview_public_booking_with_entitlements/i)
expect(sql).toMatch(/create or replace function public\.create_public_booking_with_entitlements/i)
expect(sql).toMatch(/create or replace function public\.create_admin_booking_with_entitlements/i)
expect(sql.match(/insert into public\.appointments/gi)).toHaveLength(1)
```

Update the appointment writer audit so the new core is the only new writer and all legacy writers remain present during expansion.

- [ ] **Step 2: Verify RED**

Run the two focused inventory tests.
Expected: FAIL because the unified core is absent.

- [ ] **Step 3: Generate and implement the core**

Run: `npx.cmd supabase migration new subscription_booking_core`

Move the authoritative validation sequence into `private.create_appointment_with_entitlements`: lock versioned service/add-ons/products in deterministic ID order; validate interval; resolve client by tenant and normalized phone; calculate gross snapshots; find the paid cycle covering `p_start_at`; create reserved/waiting allocations; reserve products; recalculate totals; return the receipt.

The receipt must extend the existing contract without removing fields:

```json
{
  "appointmentId": "uuid",
  "attendanceTotal": "50.00",
  "subscriptionCoveredTotal": "50.00",
  "amountDue": "0.00",
  "subscriptionCoverageStatus": "covered",
  "subscriptionPlanName": "Premium",
  "productSubtotal": "30.00",
  "totalAtShop": "30.00"
}
```

Preview executes the same calculations without writes. Public and admin wrappers call the same core; admin derives tenant from `auth.uid()`. Existing RPCs remain untouched for rollback.

- [ ] **Step 4: Write pgTAP coverage tests**

Assert full coverage, partial add-on coverage, exhausted quota waiting state, unlimited quota, unpaid future `awaiting_cycle`, product reservation, configuration-version errors, and no cross-tenant references. Assert preview and confirmation totals are equal for unchanged inputs.

- [ ] **Step 5: Run GREEN checks and commit**

Run focused Vitest and pgTAP tests, then:

```powershell
git add supabase/migrations supabase/tests/database/subscription_booking_core.test.sql tests/unit/subscription-booking-core-migration.test.ts tests/unit/appointment-writers-audit.test.ts
git commit -m "feat: add subscription aware booking core"
```

### Task 6: Integrate booking actions, receipts, and interfaces

**Files:**
- Modify: `src/app/booking/[slug]/booking-types.ts`
- Modify: `src/app/booking/[slug]/booking-action-mappers.ts`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `src/app/booking/[slug]/booking-success.tsx`
- Modify: `src/app/booking/[slug]/booking-summary-bar.tsx`
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/agenda-types.ts`
- Modify: `src/app/dashboard/agenda/appointment-mappers.ts`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Test: `tests/unit/booking-actions-contract.test.ts`
- Test: `tests/unit/booking-ui.test.ts`
- Test: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: Task 5 receipt and `client_subscriptions_booking_enabled`.
- Produces: flag-controlled RPC selection and visible subscription totals in public/admin booking.

- [ ] **Step 1: Extend receipt tests first**

```ts
expect(parseCreatedBookingReceipt(receipt)).toMatchObject({
  subscriptionCoveredTotal: '50.00',
  amountDue: '0.00',
  subscriptionCoverageStatus: 'covered',
  subscriptionPlanName: 'Premium',
})
```

Add UI assertions for the `Assinatura Premium` badge, “Coberto R$ 50,00”, “A pagar R$ 0,00”, and “Aguardando disponibilidade” state.

- [ ] **Step 2: Verify RED**

Run the three focused unit files.
Expected: FAIL on missing receipt fields and labels.

- [ ] **Step 3: Implement flag-controlled actions**

Load the barbershop setting on the server. When false, call the current RPC. When true, call `preview_public_booking_with_entitlements` for preview and the matching entitlement-aware wrapper for confirmation. Never trust preview totals during confirmation.

- [ ] **Step 4: Implement public and agenda presentation**

Show gross attendance, covered amount, due amount, products, and total at shop. In agenda details show plan, coverage state, waiting items, and financial snapshots. Preserve existing copy and receipt parsing for the legacy flag-off response by defaulting new fields to `0.00`, gross due, `none`, and `null`.

- [ ] **Step 5: Run Phase B gate and commit**

Run full Vitest, lint, build, all database tests, and existing booking Playwright specs with the flag both off and on.

```powershell
git add src/app/booking src/app/dashboard/agenda tests/unit tests/e2e
git commit -m "feat: show subscription coverage in bookings"
```

## Phase C — Transactional settlement

### Task 7: Add idempotent completion, cancellation, and no-show

**Files:**
- Create via CLI: `supabase/migrations/*_subscription_settlement.sql`
- Create: `supabase/tests/database/subscription_settlement.test.sql`
- Create: `tests/unit/subscription-settlement-migration.test.ts`

**Interfaces:**
- Consumes: Task 5 allocations, current stock reservations, revenues, and product sales.
- Produces: `public.settle_appointment` and disables legacy revenue sync only when settlement flag is active.

- [ ] **Step 1: Write RED settlement contracts**

```ts
expect(sql).toMatch(/create or replace function public\.settle_appointment/i)
expect(sql).toMatch(/new\.amount_due/i)
expect(sql).toMatch(/source[^\n]+appointment_service/i)
expect(sql).toMatch(/status = 'sold'/i)
expect(sql).toMatch(/private\.promote_waiting_subscription_allocation/i)
expect(sql).toMatch(/p_target_status in \('completed','cancelled','no_show'\)/i)
```

- [ ] **Step 2: Verify RED**

Run the focused migration test.
Expected: FAIL because settlement RPC is absent.

- [ ] **Step 3: Generate and implement settlement**

Run: `npx.cmd supabase migration new subscription_settlement`

Lock the appointment first. Derive tenant and reject foreign appointments. Return the existing receipt when the requested terminal state already matches. For completion, consume allocations, insert one service revenue for `amount_due > 0`, sell reserved products, create product sales/revenues, and snapshot payment method. For cancellation, release allocations/products and promote waiting rows. For no-show, consume allocations but release products.

Keep the legacy trigger function installed for rollback, but make it exit without writes when `client_subscriptions_settlement_enabled` is true. The feature flag must be read from the appointment tenant.

- [ ] **Step 4: Write database tests**

Assert:

```sql
select is((select count(*) from public.revenues where source='appointment_service' and reference_id=v_appointment),0::bigint,'covered service creates no service revenue');
select is((select count(*) from public.product_sales where appointment_id=v_appointment),1::bigint,'completion sells the reserved product');
select is((select count(*) from public.revenues where source='appointment_product'),1::bigint,'product creates one revenue');
select is((select status from public.appointment_subscription_allocations where appointment_id=v_appointment),'consumed','completion consumes benefit');
```

Also test repeated completion, cancellation promotion, no-show consumption, released stock, illegal transitions, and flag-off legacy behavior.

- [ ] **Step 5: Run GREEN checks and commit**

Run focused tests and database suite.

```powershell
git add supabase/migrations supabase/tests/database/subscription_settlement.test.sql tests/unit/subscription-settlement-migration.test.ts
git commit -m "feat: add transactional appointment settlement"
```

### Task 8: Replace direct status updates with a settlement modal

**Files:**
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/agenda-rules.ts`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Create: `src/app/dashboard/agenda/settlement-dialog.tsx`
- Modify: `tests/unit/appointment-writers-audit.test.ts`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`
- Create: `tests/unit/appointment-settlement-ui.test.tsx`

**Interfaces:**
- Consumes: Task 7 settlement receipt and settlement feature flag.
- Produces: authenticated settlement action and UI for payment/status confirmation.

- [ ] **Step 1: Write RED audit and UI tests**

```ts
expect(agendaActions).toContain(".rpc('settle_appointment'")
expect(agendaActions).not.toMatch(/from\('appointments'\)[\s\S]{0,160}\.update\(\{ status \}\)/)
expect(rendered).toContain('Finalizar atendimento')
expect(rendered).toContain('Valor coberto')
expect(rendered).toContain('Valor a receber')
expect(rendered).toContain('Forma de pagamento')
```

- [ ] **Step 2: Verify RED**

Run the three focused unit tests.
Expected: FAIL because direct status update and no modal remain.

- [ ] **Step 3: Implement settlement action and dialog**

`settleAppointmentAction` authenticates with `getBarbershopId`, invokes the RPC, maps `INVALID_STATUS_TRANSITION`, `APPOINTMENT_NOT_FOUND`, and `SETTLEMENT_CONFLICT`, then revalidates agenda, reservations, finance, dashboard, and subscriptions.

The dialog displays gross, covered, due, products, and payment method. Cancellation/no-show require confirmation but no payment method. Disable the submit button while pending and keep the dialog open on mapped failure.

- [ ] **Step 4: Run Phase C gate and commit**

Run full unit, database, lint, build, and E2E booking/agenda suites with settlement flag off and on.

```powershell
git add src/app/dashboard/agenda tests/unit tests/e2e
git commit -m "feat: settle appointments from agenda"
```

## Phase D — Financial reporting and rollout

### Task 9: Correct financial metrics and protect automatic revenues

**Files:**
- Modify: `src/app/dashboard/financeiro/actions.ts`
- Modify: `src/app/dashboard/financeiro/financeiro-client.tsx`
- Modify: `src/app/dashboard/financeiro/financial-entry-drawer.tsx`
- Modify: `tests/unit/actions.test.ts`
- Create: `tests/unit/subscription-financial-metrics.test.ts`

**Interfaces:**
- Consumes: appointment financial snapshots, revenue sources, subscription cycles, and allocations.
- Produces: accurate attendance counts, ticket, commissions, subscription KPIs, and protected deletion.

- [ ] **Step 1: Write RED financial tests**

Use a fully covered appointment with no `service` revenue and assert:

```ts
expect(overview.completedAppointmentsCount).toBe(1)
expect(overview.averageTicket).toBe(50)
expect(overview.subscriptionRevenue).toBe(149)
expect(overview.activeSubscribers).toBe(1)
expect(overview.coveredAttendanceValue).toBe(50)
expect(overview.provisionedCommissions).toBe(15)
```

Assert `deleteManualRevenueAction` rejects a row with `source='subscription_cycle'` and deletes only `source='manual'`.

- [ ] **Step 2: Verify RED**

Run financial tests.
Expected: FAIL because completed count still derives from service revenues and subscription KPIs do not exist.

- [ ] **Step 3: Implement metrics from their source tables**

Count completed appointments from `appointments`; compute operational average ticket from `total_price`; use `commission_amount`; aggregate actual revenue from `revenues`; count products from `product_sales`; count active subscribers and due renewals from subscriptions; aggregate consumed allocations and covered values separately.

Extend `FinancialOverview` with:

```ts
subscriptionRevenue: number
activeSubscribers: number
renewalsDue: number
coveredAppointmentsCount: number
coveredAttendanceValue: number
averageConsumptionPerSubscriber: number
averageRevenuePerSubscriber: number
```

- [ ] **Step 4: Update the UI and deletion guard**

Render subscription revenue and coverage as separate cards. Do not include covered value in total revenues. Filter the delete action by `.eq('source', 'manual')` and return an explicit error if zero rows are deleted.

- [ ] **Step 5: Run GREEN checks and commit**

```powershell
npm.cmd test -- tests/unit/actions.test.ts tests/unit/subscription-financial-metrics.test.ts
git add src/app/dashboard/financeiro tests/unit
git commit -m "fix: report subscription finances accurately"
```

### Task 10: Add end-to-end acceptance coverage and rollout runbook

**Files:**
- Create: `tests/e2e/client-subscriptions.spec.ts`
- Create: `docs/runbooks/client-subscriptions-rollout.md`
- Modify: `tests/unit/appointment-writers-audit.test.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: acceptance proof, activation order, monitoring queries, and rollback steps.

- [ ] **Step 1: Write the failing E2E acceptance flow**

The spec must perform, through public/admin interfaces:

```ts
test('subscription lifecycle avoids duplicate revenue and promotes released quota', async ({ page }) => {
  const plan = await createPlan(page, {
    name: 'Premium', price: 149, benefits: [{ item: 'Barba', limit: 2 }],
  })
  const subscriber = await enrollClient(page, { phone: '11999990001', plan })
  const [first, second, third] = await createFutureAppointments(page, {
    phone: '11999990001', service: 'Barba', daysAhead: [5, 12, 20],
  })
  await registerPayment(page, subscriber, { method: 'Pix' })
  await expectCoverage(page, [first, second], 'covered')
  await expectCoverage(page, [third], 'waiting')
  await cancelAppointment(page, second)
  await expectCoverage(page, [third], 'covered')
  await completeAppointmentWithProduct(page, first, {
    product: 'Pomada', method: 'Pix',
  })
  await expectAutomaticRevenueCounts({ subscriptionCycle: 1, product: 1, service: 0 })
})
```

Use deterministic fixture helpers and direct database assertions already established by existing booking E2E tests; do not rely only on visible text for financial uniqueness.

- [ ] **Step 2: Verify RED before enabling flags**

Run: `npm.cmd run test:e2e -- tests/e2e/client-subscriptions.spec.ts`
Expected: FAIL at the first missing/disabled feature step.

- [ ] **Step 3: Write the rollout runbook**

Document this exact activation order:

1. apply Phase A migrations with every flag false;
2. verify backfill null counts and RLS/advisors;
3. enable admin flag for one internal tenant;
4. enable booking flag after preview/confirmation parity monitoring;
5. enable settlement flag only after revenue-diff query returns zero;
6. observe duplicate origins, null snapshots, waiting promotions, and revenue divergence;
7. rollback by disabling the newest flag, never by deleting subscription history;
8. remove legacy contracts only in a later migration after the observation window.

Include monitoring queries for duplicate automatic revenues, over-allocated entitlements, stale waiting rows with free quota, and `amount_due` invariant violations.

- [ ] **Step 4: Run final verification**

Run fresh, complete commands:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd supabase test db
npm.cmd run test:e2e
git diff --check
git status --short
```

Expected: every command exits 0; no test failures, lint errors, build errors, whitespace errors, or uncommitted generated artifacts.

- [ ] **Step 5: Run Supabase security checks**

Discover current syntax first:

```powershell
npx.cmd supabase db lint --help
npx.cmd supabase db lint --local
```

If CLI version supports advisors, discover and run:

```powershell
npx.cmd supabase db advisors --help
npx.cmd supabase db advisors --local
```

Expected: no unresolved security or performance findings introduced by these migrations.

- [ ] **Step 6: Commit acceptance and rollout documentation**

```powershell
git add tests/e2e/client-subscriptions.spec.ts docs/runbooks/client-subscriptions-rollout.md tests/unit/appointment-writers-audit.test.ts
git commit -m "test: cover client subscription lifecycle"
```

## Completion checklist

- [ ] Every migration was generated by the Supabase CLI.
- [ ] Every public table has RLS, tenant policies, SaaS restrictive policy, and explicit grants.
- [ ] Every privileged function has safe schema placement, empty search path, tenant checks where applicable, and revoked default execution.
- [ ] Payment and settlement are idempotent under concurrent requests.
- [ ] Granted coverage is never downgraded automatically.
- [ ] Released finite quota promotes the earliest active waiting appointment.
- [ ] Flag-off behavior remains compatible throughout expansion.
- [ ] Covered services do not duplicate revenue; products and monthly payments do generate revenue.
- [ ] Commission and operational metrics use historical snapshots.
- [ ] Full unit, database, build, lint, E2E, and security gates pass with fresh evidence.
