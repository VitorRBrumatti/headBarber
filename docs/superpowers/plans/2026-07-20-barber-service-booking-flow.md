# Barber-Service Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `barber_services` authoritative for availability, price, and duration without breaking old browser sessions during deployment, while preserving authoritative appointment history.

**Architecture:** Ship independent expand, application-migration, contract, and cleanup releases. Expand adds nullable snapshots, composite integrity, compatibility-aware legacy RPCs, new receipt-returning RPCs, telemetry, and pgTAP; the application release switches every UI and Server Action; contract and cleanup are hard-gated by production evidence.

**Tech Stack:** Next.js 16.2.6 App Router and Server Actions, React 19.2.4, TypeScript 5, Supabase CLI/Postgres, RLS, PL/pgSQL, pgTAP, Vitest 4.1.8, Playwright 1.60.

## Global Constraints

- Read the relevant file in `node_modules/next/dist/docs/` before changing any Next.js API, convention, or file structure.
- Scan the current Supabase changelog and official database, RLS, function, and testing docs before database work.
- Discover CLI commands with `npx supabase --help` and subcommand `--help`; create migrations only with `npx supabase migration new <name>`.
- Keep internal `SECURITY DEFINER` functions in non-exposed `private` with `search_path = ''`; revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Enable RLS on `public.barber_services`; use explicit roles, tenant predicates, `USING` plus `WITH CHECK`, and indexed policy/filter columns.
- Browser-supplied prices, durations, names, and totals are never authoritative.
- Enforce `duration_minutes between 5 and 720` in TypeScript, functions, and constraints.
- Creating a service requires one available barber; editing an existing service may leave zero available barbers.
- Preserve current UTC wire/storage semantics and the `America/Sao_Paulo` past-slot filter.
- Do not revoke compatibility functions or remove compatibility columns in Expand or Migrate Application.
- Database completion requires local `db reset`, real pgTAP behavior tests, concurrency verification, and database lint/advisors. Text-search tests are supplemental.
- Follow red-green-refactor and commit after each independently verified task.

---

## Release Boundaries and Hard Gates

| Release | Contents | Compatibility |
| --- | --- | --- |
| A — Expand | Relation, nullable snapshots, safe backfill, new and compatible legacy RPCs, telemetry, pgTAP | Existing deployment and old browser tabs |
| B — Migrate Application | Public/admin flows, authoritative receipt, historical details, E2E | Both RPC generations |
| C — Contract | `NOT NULL` and legacy RPC retirement | Only after 14 consecutive days with zero legacy calls and zero null snapshots |
| D — Cleanup | Drop global service price/duration | Only after another stable release cycle and zero consumers |

Release C and D must not be created or deployed with A/B. Stop at each hard gate and request explicit operator authorization with evidence.

## Stable Interfaces

```ts
export interface BarberServiceOption {
  id: string
  barberId: string
  serviceId: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  configurationVersion: number
}

export interface CreatedBookingReceipt {
  appointmentId: string
  barberId: string
  barberName: string
  serviceId: string
  serviceName: string
  servicePrice: string
  serviceDurationMinutes: number
  addOnTotal: string
  productSubtotal: string
  attendanceTotal: string
  totalAtShop: string
  startAt: string
  endAt: string
}

export interface ServiceAssignmentInput {
  barberId: string
  price: number
  durationMinutes: number
  isAvailable: boolean
}
```

New Release A functions:

```sql
public.get_public_available_slots_for_service(
  p_barbershop_id uuid, p_barber_service_id uuid, p_date date
) returns table (available_time time)

public.create_public_appointment_with_barber_service_and_products(
  p_barbershop_id uuid, p_client_name text, p_client_phone text,
  p_client_email text, p_barber_service_id uuid,
  p_configuration_version bigint, p_start_at timestamptz,
  p_notes text, p_add_on_ids uuid[], p_products jsonb default '[]'::jsonb
) returns jsonb

public.save_service_with_barbers(
  p_service_id uuid, p_name text, p_description text,
  p_is_active boolean, p_assignments jsonb
) returns uuid
```

---

# Release A — Expand

### Task 1: Audit appointment writers and add an expandable schema

**Files:**
- Create via CLI: migration ending `_barber_services_expand.sql`
- Create via CLI: `supabase/tests/database/barber_services_expand.test.sql`
- Create: `tests/unit/appointment-writers-audit.test.ts`

**Interfaces:**
- Produces `barber_services` with composite identity and `configuration_version`.
- Adds nullable appointment relation/price/duration snapshots and a composite FK.
- Produces private legacy-RPC telemetry.

- [ ] **Step 1: Discover CLI and create migration/test files**

```powershell
npx supabase --version
npx supabase --help
npx supabase migration new --help
npx supabase test new --help
npx supabase migration new barber_services_expand
npx supabase test new database/barber_services_expand.test
```

Expected: CLI prints the exact timestamped migration and pgTAP paths.

- [ ] **Step 2: Write the failing writer inventory test**

Create `tests/unit/appointment-writers-audit.test.ts` that runs:

```ts
const matches = execFileSync('rg', [
  '-n',
  "from\\('appointments'\\)|insert into public\\.appointments|update public\\.appointments",
  'src',
  'supabase/migrations',
], { encoding: 'utf8' })
```

Assert the current application has no direct appointment insert, only the reviewed RPC creation paths and `.update({ status })`; assert Agenda has no direct `start_at`, `barber_id`, or `service_id` update.

- [ ] **Step 3: Run writer inventory**

Run: `npm test -- tests/unit/appointment-writers-audit.test.ts`

Expected: PASS only for the verified baseline. Any additional writer must be added to this plan before continuing.

- [ ] **Step 4: Write pgTAP schema tests before SQL**

Test table/columns/checks/indexes, RLS/grants, nullable snapshot columns, composite FK, and private telemetry. Key assertions:

```sql
select has_table('public', 'barber_services');
select has_column('public', 'barber_services', 'configuration_version');
select has_check('public', 'barber_services', 'barber_services_duration_minutes_check');
select has_index('public', 'barber_services', 'barber_services_barber_available_idx');
select col_is_null('public', 'appointments', 'barber_service_id');
select col_is_null('public', 'appointments', 'service_price');
select col_is_null('public', 'appointments', 'service_duration_minutes');
select has_fk('public', 'appointments', 'appointments_barber_service_identity_fkey');
select has_table('private', 'legacy_booking_rpc_calls');
```

- [ ] **Step 5: Verify pgTAP RED**

```powershell
npx supabase start
npx supabase db reset --local
npx supabase test db supabase/tests/database/barber_services_expand.test.sql --local
```

Expected: FAIL because the expand schema is absent.

- [ ] **Step 6: Implement expand-only schema/backfill**

The CLI-created migration must:

1. Create `private` if missing.
2. Add unique `(id, barbershop_id)` constraints to barbers/services.
3. Create `barber_services` with price `>= 0`, duration `5..720`, availability, `configuration_version bigint default 1`, unique `(barber_id, service_id)`, unique `(id, barbershop_id, barber_id, service_id)`, and composite same-tenant FKs.
4. Index `(barber_id, is_available)`, `service_id`, `barbershop_id`, and FK columns.
5. Backfill same-shop barber/service pairs from legacy values; abort on out-of-range duration.
6. Add nullable `appointments.barber_service_id`, `service_price`, and `service_duration_minutes`.
7. Before backfill, raise explicit exceptions for: missing relation, reconstructed negative price, `end_at <= start_at`, or duration outside 5..720.
8. Backfill without `greatest`; price is `total_price - sum(appointment_add_ons.price)`, duration is `end_at - start_at`.
9. Add composite FK:

```sql
foreign key (barber_service_id, barbershop_id, barber_id, service_id)
references public.barber_services (id, barbershop_id, barber_id, service_id)
on delete restrict
```

10. Create `private.legacy_booking_rpc_calls(function_name text, called_at timestamptz)` and revoke all public-role access.
11. Enable RLS and minimum grants. Do not add `NOT NULL`, revoke old RPCs, or drop old columns.

- [ ] **Step 7: Verify GREEN and commit**

```powershell
npx supabase db reset --local
npx supabase test db supabase/tests/database/barber_services_expand.test.sql --local
npm test -- tests/unit/appointment-writers-audit.test.ts tests/unit/migrations.test.ts
git add supabase/migrations supabase/tests/database tests/unit/appointment-writers-audit.test.ts
git commit -m "feat: expand schema for barber service pricing"
```
---

### Task 2: Add compatible legacy RPCs, authoritative new RPCs, and real database tests

**Files:**
- Create via CLI: migration ending `_barber_service_rpc_expand.sql`
- Create via CLI: `supabase/tests/database/barber_service_booking.test.sql`
- Modify: `supabase/tests/database/barber_services_expand.test.sql`

**Interfaces:**
- Keeps old signatures callable, now validating relationships and filling snapshots.
- New booking wrapper returns `CreatedBookingReceipt` JSON.
- Admin save changes `configuration_version` only when relationship configuration changes.

- [ ] **Step 1: Create migration and pgTAP file**

```powershell
npx supabase migration new barber_service_rpc_expand
npx supabase test new database/barber_service_booking.test
```

- [ ] **Step 2: Write real behavior pgTAP tests RED**

Inside one rollback transaction, create two tenants, authenticated owners/profiles, two barbers with the same service at prices 40/50 and durations 30/45, work hours, lunch, block, settings, add-ons, and products. Execute functions—not SQL text searches—to test:

1. distinct prices/durations for the same catalog service;
2. anon reads only active/available rows;
3. authenticated tenant A cannot write tenant B;
4. cross-tenant relationship booking raises `INVALID_BARBER_SERVICE`;
5. 45-minute service fits only full-duration intervals on a 15-minute start grid;
6. lunch overlap rejection;
7. exceptional-block rejection;
8. appointment overlap rejection;
9. `CONFIG_CHANGED` on stale version;
10. correct service/add-on/product snapshots;
11. authoritative receipt decimal totals and times;
12. create-service with zero available assignments is rejected;
13. edit-service with zero is accepted;
14. identical save preserves version;
15. changed price increments version;
16. legacy RPC still executes and fills snapshots;
17. private core is not executable by anon/authenticated;
18. timezone boundary fixtures produce expected UTC times.

Example executed assertions:

```sql
select results_eq(
  $$select price from public.barber_services where barber_id = '10000000-0000-0000-0000-000000000001'$$,
  $$values (40.00::numeric)$$,
  'barber A has its own price'
);
select throws_ok(
  $$select public.create_public_appointment_with_barber_service_and_products(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client', '11999999999', null,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1,
    '2026-07-21 14:00:00+00', null, null, '[]'::jsonb
  )$$,
  'P0001', 'INVALID_BARBER_SERVICE', 'cross-tenant relationship is rejected'
);
```

- [ ] **Step 3: Run pgTAP RED**

```powershell
npx supabase db reset --local
npx supabase test db supabase/tests/database/barber_service_booking.test.sql --local
```

Expected: FAIL because functions/compatibility behavior are missing.

- [ ] **Step 4: Implement one private interval guard and trigger**

Create `private.assert_bookable_appointment_interval` with `SECURITY DEFINER SET search_path = ''`. For blocking statuses it takes `pg_advisory_xact_lock(hashtext(barber_id::text))`, validates composite relationship identity, work hours, lunch, exceptional blocks, and half-open overlap excluding the current appointment ID.

Attach a trigger to appointment INSERT and updates of identity, interval, or status. After the compatibility migration is installed, reject every new INSERT whose relationship, service price, or service duration snapshot is null, even though columns remain nullable for rollout. Validate any transition from non-blocking to blocking. Reject direct post-creation changes of barber/service/relationship/start/end with `APPOINTMENT_RESCHEDULE_REQUIRES_RPC`; no speculative rescheduling feature is added.

- [ ] **Step 5: Adapt old creation RPC signatures without revocation**

Keep exact legacy signatures. Log each call to the private telemetry table. Resolve `(barbershop_id, barber_id, service_id)` to an active/available relationship, use its duration/price, fill snapshots, and reuse the guard. Preserve old timezone/payload semantics. The old slot RPC cannot know service duration; final creation remains authoritative and can reject a displayed legacy slot.

After replacing legacy functions, rerun preflight and catch-up backfill for rows created between migrations. Keep columns nullable.

- [ ] **Step 6: Implement new service-aware slots conservatively**

Copy the existing timestamp construction and UTC behavior from `get_public_available_slots`. Change only relationship validation, barber source, duration source, and full-interval checks. Preserve slot interval configuration. Test `23:45`, `00:00`, and `America/Sao_Paulo` current-minute filtering at the TypeScript boundary.

- [ ] **Step 7: Implement private core and authoritative public receipt wrapper**

The private core locks the relationship and barber, compares `configuration_version`, validates add-ons/products, writes appointment and snapshots, and returns created identity. The public product wrapper returns all `CreatedBookingReceipt` fields from authoritative locked/inserted data. Return money as decimal strings. Do not trust request totals.

- [ ] **Step 8: Implement transactional service save with exact zero rule**

`save_service_with_barbers` is `SECURITY INVOKER SET search_path = ''`, granted only to authenticated users. For `p_service_id is null`, require one available assignment; for an existing service, allow zero. Validate tenant, duplicate IDs, price, and 5..720 duration.

Use `ON CONFLICT DO UPDATE ... WHERE` with `IS DISTINCT FROM`; increment `configuration_version` only for changed price/duration/availability. Synchronize legacy service price/duration from the first available assignment ordered by `barber_id`; if edit leaves zero available, retain the previous compatibility values.

- [ ] **Step 9: Revoke internal execution explicitly**

```sql
revoke execute on function private.create_appointment_from_barber_service(
  uuid, text, text, text, uuid, bigint, timestamptz, text, uuid[]
) from public, anon, authenticated;
revoke execute on function private.assert_bookable_appointment_interval(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, uuid
) from public, anon, authenticated;
```

Revoke `PUBLIC` from every new public wrapper before granting only intended roles. Do not revoke legacy wrappers.

- [ ] **Step 10: Verify database GREEN and commit**

```powershell
npx supabase db reset --local
npx supabase test db --local
npx supabase db lint --help
npx supabase db lint --local
npx supabase migration list --local
git add supabase/migrations supabase/tests/database
git commit -m "feat: add compatible barber service booking RPCs"
```

Expected: reset, all pgTAP, lint, and migration list exit 0.

---

### Task 3: Add rollout gates and prove old-application compatibility

**Files:**
- Create: `docs/runbooks/barber-service-rollout.md`
- Create: `tests/unit/barber-service-rollout-contract.test.ts`

**Interfaces:**
- Defines rollback boundaries, telemetry queries, release order, and hard gates.

- [ ] **Step 1: Write runbook contract RED**

Require headings for Releases A/B/C/D, “14 consecutive days”, null-snapshot query, legacy-telemetry query, and rollback rules.

- [ ] **Step 2: Write exact runbook gates**

Run both queries as the database owner in the Supabase SQL Editor (or an equivalent owner-only operational session). The application, `anon`, and `authenticated` roles must not receive access to `private.legacy_booking_rpc_calls`.

`sql
select count(*) as null_snapshots
from public.appointments
where barber_service_id is null
   or service_price is null
   or service_duration_minutes is null;

select function_name, count(*) as calls, max(called_at) as last_call
from private.legacy_booking_rpc_calls
where called_at >= now() - interval '14 days'
group by function_name;
```

Release A is application-rollback-safe. Release B may roll back while legacy functions remain. Release C requires zero null snapshots and zero legacy calls for 14 consecutive days; it also ends old-application rollback support.

- [ ] **Step 3: Prove old API compatibility locally**

After a fresh reset, run the legacy pgTAP cases and verify old signatures create snapshots and use relationship pricing.

- [ ] **Step 4: Verify and commit runbook**

```powershell
npm test -- tests/unit/barber-service-rollout-contract.test.ts
npx supabase test db --local
git add docs/runbooks/barber-service-rollout.md tests/unit/barber-service-rollout-contract.test.ts
git commit -m "docs: add safe barber service rollout gates"
```

Release A may now deploy independently. Release B starts only after local reset/pgTAP are green.
---

# Release B — Migrate Application

### Task 4: Add authoritative booking types, reset behavior, and Server Actions

**Files:**
- Modify: `src/app/booking/[slug]/booking-types.ts`
- Create: `src/app/booking/[slug]/booking-selection.ts`
- Create: `tests/unit/booking-selection.test.ts`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `src/app/booking/[slug]/page.tsx`
- Modify: `tests/unit/booking-actions-contract.test.ts`
- Modify: `tests/unit/booking-availability.test.ts`

**Interfaces:**
- Produces stable `BarberServiceOption` and `CreatedBookingReceipt`.
- Produces `getBarberServicesAction(barbershopId, barberId)` and service-aware slots.
- `createPublicBooking` returns `{ success: true, receipt }` or a structured error.

- [ ] **Step 1: Write reset behavior tests RED**

Changing barber clears relationship/date/time/slots/errors while preserving add-ons/products. Changing service clears date/time/slots while preserving barber/add-ons/products.

- [ ] **Step 2: Implement DTOs and immutable helpers GREEN**

Use `configurationVersion`, never `updated_at`. Keep receipt money as strings until formatting.

- [ ] **Step 3: Replace text-only action tests with behavior plus wiring**

Keep source assertions only for RPC/query wiring. Add mocked behavior tests for nested relationship mapping, receipt parsing, and `CONFIG_CHANGED`, `INVALID_BARBER_SERVICE`, `SLOT_UNAVAILABLE`, `INSUFFICIENT_STOCK` mapping.

- [ ] **Step 4: Implement relationship actions and receipt mapping**

Stop loading global services. Query relationships with explicit barbershop/barber/availability filters and active inner service join. Call new slot/booking RPCs. Use receipt data for notification and return it unchanged to the client.

- [ ] **Step 5: Add timezone regression behavior tests**

Cover current minute, `23:45`, midnight, past date, and next date in `America/Sao_Paulo`. Keep existing UTC request payload construction.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- tests/unit/booking-selection.test.ts tests/unit/booking-actions-contract.test.ts tests/unit/booking-availability.test.ts tests/unit/booking-utils.test.ts
git add src/app/booking tests/unit
git commit -m "feat: add authoritative barber service booking actions"
```

---

### Task 5: Make the public wizard barber-first and success receipt-only

**Files:**
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `src/app/booking/[slug]/booking-summary-bar.tsx`
- Modify: `src/app/booking/[slug]/booking-success.tsx`
- Modify: `tests/unit/booking-wizard-contract.test.ts`
- Modify: `tests/unit/booking-ui.test.ts`

**Interfaces:**
- Steps: Profissional, Serviço, Adicionais, Produtos, Data e Hora, Dados, Confirmação.
- Success consumes only `CreatedBookingReceipt` for all displayed created-booking facts.

- [ ] **Step 1: Write wizard and receipt-rendering tests RED**

Require barber-first order, no “any”, scoped loading/empty/retry states, stale-request protection, dependency reset, and `BookingSuccess receipt={receipt}`. Assert success has no selected date/time, client subtotal, or product-state props.

- [ ] **Step 2: Implement scoped async loading**

Use a monotonic request ref plus current barber comparison before applying responses. Clear dependent state immediately on barber change, then reload.

- [ ] **Step 3: Implement service-aware slots and recovery**

On stale configuration or invalid relationship, return to Serviço, reload, clear date/time, and require reconfirmation. Preserve stock-conflict recovery at Produtos.

- [ ] **Step 4: Render authoritative success**

Pre-confirmation summary may show current selections. After creation, render barber/service names, service price/duration, add-on/product totals, attendance total, total at shop, and timestamps only from the receipt.

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- tests/unit/booking-wizard-contract.test.ts tests/unit/booking-ui.test.ts tests/unit/booking-selection.test.ts tests/unit/booking-actions-contract.test.ts tests/unit/booking-availability.test.ts tests/unit/booking-utils.test.ts
git add src/app/booking tests/unit
git commit -m "feat: make booking barber first with authoritative receipt"
```

---

### Task 6: Implement exact per-barber service administration rules

**Files:**
- Create: `src/app/dashboard/servicos/service-types.ts`
- Create: `src/app/dashboard/servicos/service-validation.ts`
- Create: `src/components/dashboard/service-assignments-editor.tsx`
- Create: `tests/unit/service-assignments.test.ts`
- Create: `tests/unit/service-admin-contract.test.ts`
- Modify: `src/app/dashboard/servicos/page.tsx`
- Modify: `src/app/dashboard/servicos/actions.ts`
- Modify: `src/app/dashboard/servicos/services-client.tsx`
- Modify: `src/components/dashboard/service-form.tsx`

**Interfaces:**
- `parseServiceFormData(formData, allowedBarberIds, mode)` with mode `'create' | 'edit'`.
- Create requires one available relationship; edit permits zero.
- SQL and TypeScript enforce price `>= 0`, duration 5..720, and unique same-tenant IDs.

- [ ] **Step 1: Write validation tests RED**

Test: create-zero rejected; edit-zero accepted; duplicate/foreign IDs rejected; zero price accepted; negative/empty price rejected; durations 5/720 accepted; 4/721 rejected; price/duration ranges formatted correctly.

- [ ] **Step 2: Implement validation/types GREEN**

Return field-specific Portuguese errors. Do not coerce empty price to zero. Keep unavailable assignment values for reactivation.

- [ ] **Step 3: Write UI/action wiring tests RED**

Verify nested relationship loading, transactional RPC use, editor labels, and “Sem profissionais” card. Treat these as supplemental to Release A pgTAP.

- [ ] **Step 4: Implement page, action, editor, and cards**

Load all same-shop barbers and relationships. Submit assignment JSON once to `save_service_with_barbers`. The database performs distinct-only updates, version increments, and compatibility-column sync.

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- tests/unit/service-assignments.test.ts tests/unit/service-admin-contract.test.ts
git add src/app/dashboard/servicos src/components/dashboard/service-form.tsx src/components/dashboard/service-assignments-editor.tsx tests/unit
git commit -m "feat: manage prices and durations per barber"
```

---

### Task 7: Migrate manual agenda creation, status safety, and historical details

**Files:**
- Modify: `src/app/dashboard/agenda/page.tsx`
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `src/app/dashboard/reservas/page.tsx`
- Modify: `src/app/dashboard/reservas/reservas-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`
- Modify: `tests/unit/appointment-writers-audit.test.ts`

**Interfaces:**
- Produces authenticated barber-service and slot actions.
- Manual creation submits relation/version and receives a receipt.
- Status action permits only reviewed transitions; database trigger guards any transition that starts blocking time.

- [ ] **Step 1: Write dashboard/writer tests RED**

Require no global service-price query, barber-first manual form, service-aware slots, snapshot fields/add-ons, no hard-coded 30 minutes, and explicit transition rules. Re-run repository writer inventory.

- [ ] **Step 2: Implement authenticated relationship actions**

Derive tenant via `getBarbershopId`, filter explicitly, call new functions, return receipt/error codes.

- [ ] **Step 3: Rebuild manual form**

Order Barber → Service → Available time. Barber change clears service/time; service change clears time. Show relationship price/duration and loading/empty/error states.

- [ ] **Step 4: Harden status transitions**

```ts
const ALLOWED_STATUS_TRANSITIONS = {
  confirmed: ['completed', 'cancelled', 'no_show'],
  pending: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
} as const
```

Allow `pending -> confirmed` only with a behavioral database test proving the Release A trigger takes the advisory lock and invokes the interval guard before the status update completes. Reject all other unlisted transitions. Current UI does not reactivate cancelled/no-show appointments.

- [ ] **Step 5: Render historical snapshots**

Query service price/duration, add-on snapshots/names, product snapshots, and current barber/service names. Display service, add-ons, attendance total, product subtotal, and total at shop separately. Names intentionally reflect current cadastro in this delivery.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- tests/unit/appointment-writers-audit.test.ts tests/unit/booking-reservations-dashboard.test.ts tests/unit/booking-actions-contract.test.ts tests/unit/actions.test.ts
git add src/app/dashboard/agenda src/app/dashboard/reservas tests/unit
git commit -m "feat: migrate booking administration to barber services"
```
---

### Task 8: Prove complete journey, concurrency, history, and Release B readiness

**Files:**
- Create: `tests/e2e/barber-service-booking.spec.ts`
- Create: `tests/e2e/barber-service-concurrency.spec.ts`
- Modify: `tests/e2e/fluxo-principal.spec.ts`

**Interfaces:**
- Proves actual creation with per-barber configuration and immutable snapshots.
- Proves simultaneous confirmations cannot both reserve the same interval.

- [ ] **Step 1: Write full-history E2E RED**

Authenticate, create two unique barbers, create one service assigned at R$40/30 min and R$50/45 min, open the public link, verify filtering/reset, choose a real slot, submit and confirm. Validate all receipt values. Open Agenda/Reservas and validate saved barber/service/price/duration. Change current relationship price, reopen the old appointment, and assert the original snapshot remains.

- [ ] **Step 2: Write real concurrency E2E RED**

Use two isolated browser contexts and different phones. Drive both to the same barber/service/start and release confirmation clicks with `Promise.all`. Assert exactly one success receipt, exactly one occupied/`SLOT_UNAVAILABLE` result, and only one admin appointment.

- [ ] **Step 3: Run focused E2E**

```powershell
npx playwright test tests/e2e/barber-service-booking.spec.ts
npx playwright test tests/e2e/barber-service-concurrency.spec.ts
```

- [ ] **Step 4: Run mandatory local database verification**

```powershell
npx supabase start
npx supabase db reset --local
npx supabase test db --local
npx supabase db lint --local
npx supabase migration list --local
```

No database completion claim is allowed if local Supabase is unavailable.

- [ ] **Step 5: Run full application verification**

```powershell
npm test
npm run lint
npm run build
npm run test:e2e
```

- [ ] **Step 6: Re-audit all appointment writers**

```powershell
rg -n "from\('appointments'\)|insert into public\.appointments|update public\.appointments" src supabase tests
npm test -- tests/unit/appointment-writers-audit.test.ts
```

Any new interval writer blocks completion until it uses the interval guard and has behavioral tests.

- [ ] **Step 7: Commit Release B verification**

```powershell
git add tests/e2e tests/unit src supabase/tests
git commit -m "test: verify barber service booking end to end"
```

---

### Task 9: Begin the Release B observation window

**Files:**
- Modify: `docs/runbooks/barber-service-rollout.md`

- [ ] **Step 1: Record deployed UTC timestamp and full Git SHA**

Use ISO-8601 UTC and immutable SHA.

- [ ] **Step 2: Run production read-only gates daily for 14 consecutive days**

Run the exact owner-only SQL Editor queries from Task 3 and record null snapshot count and legacy calls. A nonzero result restarts the clock after remediation. Never grant application roles access to private telemetry to automate this check.

- [ ] **Step 3: Stop and request explicit Release C authorization**

Do not create the contract migration until evidence shows zero nulls and zero calls for the full window.

---

# Release C — Contract (Separate Authorized Execution)

### Task 10: Enforce snapshots and retire legacy RPCs

**Hard gate:** Execute only after Task 9 evidence and explicit operator authorization.

**Files:**
- Create via CLI after authorization: migration ending `_barber_service_contract.sql`
- Create via CLI after authorization: `supabase/tests/database/barber_service_contract.test.sql`

- [ ] **Step 1: Re-run production preconditions**

Abort on any null snapshot or legacy call in the prior 14 days.

- [ ] **Step 2: Write pgTAP RED**

Assert snapshot columns are non-null, new functions keep intended privileges, old signatures are not executable by anon/authenticated, and internal functions remain private.

- [ ] **Step 3: Create contract migration through CLI**

Apply `NOT NULL`, revoke/drop legacy signatures, and retain legacy service columns for rollback during one more release cycle.

- [ ] **Step 4: Verify GREEN and commit separately**

```powershell
npx supabase db reset --local
npx supabase test db --local
npx supabase db lint --local
git add supabase/migrations supabase/tests/database docs/runbooks/barber-service-rollout.md
git commit -m "chore: contract barber service booking schema"
```

---

# Release D — Cleanup (Future Separate Authorized Execution)

After one additional stable production release cycle, verify `rg` finds no reader of `services.price`/`services.duration_minutes`, production logs show no legacy use, and old application rollback is retired. Then create a CLI-generated cleanup migration that removes compatibility writes and drops both columns. Run full pgTAP, Vitest, lint, build, and E2E before committing `chore: remove legacy service pricing columns`.

---

## Completion Definition for Initial Implementation

The initial implementation is complete through Release B only when:

- Release A migrations reset cleanly and all pgTAP tests pass locally.
- Legacy RPCs remain compatible and populate snapshots.
- New public/admin flows exclusively use `barber_services`.
- Success uses the authoritative receipt.
- Composite integrity prevents mismatched appointment identity.
- Writer audit finds no unguarded interval mutation.
- Full E2E creates a reservation and proves historical price after current price change.
- Concurrency E2E proves only one reservation wins.
- Vitest, lint, build, pgTAP, database lint, focused E2E, and full E2E all exit 0.
- Runbook starts the 14-day window; Releases C/D remain unapplied.