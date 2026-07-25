# Barber-Specific Add-Ons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make add-on availability, price, and extra duration configurable per barber and authoritative throughout administration, slot calculation, booking confirmation, and history.

**Architecture:** Keep `add_ons` as the tenant-scoped catalog and introduce `barber_add_ons` as the authoritative per-barber relationship, mirroring `barber_services`. Server Actions validate request shape and tenant membership, while transactional Postgres functions re-read relationship versions, calculate authoritative totals/durations, and write immutable appointment snapshots.

**Tech Stack:** Next.js 16.2.6 App Router and Server Functions, React 19.2.4, TypeScript 5, Supabase/Postgres with RLS and pgTAP, Vitest 4.1.8, Playwright 1.60.0.

## Global Constraints

- The same add-on accepts different price, duration, and availability per barber.
- Existing add-ons are linked to all existing barbers in the same barbershop, preserving current global price and duration.
- New barbers do not receive add-ons automatically.
- Creating an add-on requires at least one available barber; editing may leave zero available barbers.
- Add-on duration is an integer from 0 through 720 minutes; price is numeric and at least zero.
- Public clients send relationship IDs and versions, never authoritative price or duration.
- Changing barber clears service, add-ons, date, time, slots, and dependent errors.
- Changing selected add-ons clears date, time, and slots.
- Slot duration and `appointments.end_at` equal service duration plus selected add-on durations.
- Historical appointments keep their existing `end_at`; legacy add-on duration snapshots are zero.
- `appointment_add_ons.price` and `appointment_add_ons.duration_minutes` are immutable booking snapshots.
- Every exposed table has explicit grants and RLS; UPDATE policies have SELECT, `USING`, and `WITH CHECK`.
- Every `SECURITY DEFINER` function uses `search_path = ''`, schema-qualified relations, explicit tenant/auth checks, and explicit execute grants.
- Use the installed Next.js guides at `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`; every Server Function performs its own authorization.
- Use Supabase CLI 2.107.0 commands discovered through `--help`; create every migration with `npx supabase migration new <name>`.
- Do not contract legacy columns or RPC signatures in this delivery; contraction requires a later verified migration.

## File Structure

### New files

- `src/app/dashboard/adicionais/add-on-types.ts` — catalog, barber, saved assignment, and editable assignment types.
- `src/app/dashboard/adicionais/add-on-validation.ts` — pure parsing and validation of the admin form payload.
- `src/components/dashboard/add-on-assignments-editor.tsx` — focused per-barber availability, price, and duration editor.
- `tests/unit/add-on-assignments.test.ts` — pure validation and formatting behavior.
- `tests/unit/add-on-admin-contract.test.ts` — page/action/form integration contract.
- `tests/unit/booking-add-ons.test.ts` — public mapping, selection reset, and total-duration behavior.
- `supabase/tests/database/barber_add_ons_expand_test.sql` — relationship, backfill, grants, RLS, and admin RPC tests.
- `supabase/tests/database/barber_add_on_booking_test.sql` — slots, confirmation, snapshots, versioning, tenant, and concurrency tests.
- `tests/e2e/barber-add-on-booking.spec.ts` — administrator-to-customer flow with two barbers.
- CLI-generated `supabase/migrations/*_barber_add_ons_expand.sql` — schema expansion and admin persistence.
- CLI-generated `supabase/migrations/*_barber_add_on_booking_expand.sql` — public slots and booking RPC expansion.

### Modified files

- `src/app/dashboard/adicionais/page.tsx` — load add-ons with relationships and the barbers in the tenant.
- `src/app/dashboard/adicionais/actions.ts` — validate and save through the transactional RPC.
- `src/app/dashboard/adicionais/adicionais-client.tsx` — consume catalog types and render ranges/counts.
- `src/components/dashboard/add-on-form.tsx` — edit global catalog fields plus per-barber assignments.
- `src/app/booking/[slug]/booking-types.ts` — public add-on relationship and versioned selection types.
- `src/app/booking/[slug]/booking-action-mappers.ts` — map relationship rows and authoritative receipt data.
- `src/app/booking/[slug]/booking-selection.ts` — clear barber-dependent and duration-dependent choices.
- `src/app/booking/[slug]/booking-utils.ts` — calculate price and total duration from relationship values.
- `src/app/booking/[slug]/actions.ts` — load per-barber add-ons and pass versioned selections to RPCs.
- `src/app/booking/[slug]/booking-client.tsx` — load/filter add-ons, clear stale choices, and request slots with them.
- `src/app/dashboard/agenda/agenda-types.ts` — add add-on duration snapshot.
- `src/app/dashboard/agenda/appointment-mappers.ts` — map the duration snapshot.
- `src/app/dashboard/agenda/actions.ts` — select the duration snapshot.
- `src/app/dashboard/reservas/page.tsx` — select the duration snapshot.
- `src/app/dashboard/reservas/reservas-client.tsx` — expose snapshot duration in reservation details.
- `tests/unit/booking-actions-contract.test.ts` — enforce new action/RPC payload contracts.
- `tests/unit/booking-selection.test.ts` — enforce reset behavior.
- `tests/unit/booking-utils.test.ts` — enforce totals and duration.
- `tests/unit/booking-reservations-dashboard.test.ts` — enforce historical snapshot reads.
- `tests/unit/migrations.test.ts` — enforce migration security and compatibility markers.
- `supabase/tests/database/data_api_grants_test.sql` — verify precise Data API privileges.
- `supabase/tests/database/barber_service_booking_test.sql` — update existing booking fixtures for relationship-backed add-ons.
- `tests/e2e/barber-service-fixture.ts` — seed per-barber add-on relationships.
- `docs/runbooks/barber-service-rollout.md` — add rollout checks for relationship/snapshot nulls and legacy traffic.

---

### Task 1: Expand the database for per-barber add-ons

**Files:**
- Create: `supabase/tests/database/barber_add_ons_expand_test.sql`
- Create via CLI: the path printed by `npx supabase migration new barber_add_ons_expand`
- Modify: `supabase/tests/database/data_api_grants_test.sql`
- Modify: `tests/unit/migrations.test.ts`

**Interfaces:**
- Produces table: `public.barber_add_ons(id, barbershop_id, barber_id, add_on_id, price, duration_minutes, is_available, configuration_version, created_at, updated_at)`.
- Produces function: `public.save_add_on_with_barbers(p_add_on_id uuid, p_name text, p_is_active boolean, p_assignments jsonb) returns uuid`.
- Produces snapshots: `public.appointment_add_ons.barber_add_on_id uuid` and `duration_minutes integer`.
- Preserves: `public.add_ons.price`, `public.add_ons.duration_minutes`, existing booking RPC signatures, and every historical `appointments.end_at`.

- [ ] **Step 1: Write the failing database and migration contract tests**

Create pgTAP assertions that prove the missing schema and security behavior:

```sql
begin;
select plan(14);

select has_table('public', 'barber_add_ons');
select col_is_pk('public', 'barber_add_ons', 'id');
select col_has_check('public', 'barber_add_ons', 'price');
select col_has_check('public', 'barber_add_ons', 'duration_minutes');
select has_column('public', 'appointment_add_ons', 'barber_add_on_id');
select has_column('public', 'appointment_add_ons', 'duration_minutes');
select is((select duration_minutes from public.appointment_add_ons order by id limit 1), 0, 'legacy duration stays zero');
select is((select count(*) from public.barber_add_ons bao join public.add_ons ao on ao.id = bao.add_on_id where bao.barbershop_id <> ao.barbershop_id), 0::bigint, 'backfill never crosses tenants');
select ok((select relrowsecurity from pg_class where oid = 'public.barber_add_ons'::regclass), 'RLS enabled');
select has_table_privilege('anon', 'public.barber_add_ons', 'SELECT');
select hasnt_table_privilege('anon', 'public.barber_add_ons', 'INSERT');
select has_table_privilege('authenticated', 'public.barber_add_ons', 'UPDATE');
select function_returns('public', 'save_add_on_with_barbers', array['uuid','text','boolean','jsonb'], 'uuid');
select throws_ok(
  $$select public.save_add_on_with_barbers(null, 'Extra', true, '[]')$$,
  'P0001',
  'ADD_ON_REQUIRES_AVAILABLE_BARBER'
);

select * from finish();
rollback;
```

Add Vitest source assertions for `enable row level security`, explicit `grant select ... to anon`, authenticated ownership predicates, `using` plus `with check`, `security definer set search_path = ''`, and revoked default function execution.

- [ ] **Step 2: Run the tests and verify the expected RED state**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase test db --local supabase/tests/database/barber_add_ons_expand_test.sql
npm.cmd test -- tests/unit/migrations.test.ts
```

Expected: pgTAP fails because `barber_add_ons` and snapshot columns do not exist; Vitest fails because no expansion migration contains the required controls.

- [ ] **Step 3: Generate the migration through the CLI**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase migration new barber_add_ons_expand
```

Edit only the exact path printed by the CLI. Define composite tenant-safe foreign keys, uniqueness, checks (`price >= 0`, `duration_minutes between 0 and 720`, `configuration_version >= 1`), indexes, RLS, explicit grants, and an `updated_at`/version trigger that increments only when price, duration, or availability changes.

- [ ] **Step 4: Implement safe backfills and transactional admin persistence**

In the generated migration:

```sql
insert into public.barber_add_ons (
  barbershop_id, barber_id, add_on_id, price, duration_minutes, is_available
)
select ao.barbershop_id, b.id, ao.id, ao.price, ao.duration_minutes, true
from public.add_ons ao
join public.barbers b on b.barbershop_id = ao.barbershop_id
on conflict (barber_id, add_on_id) do nothing;

alter table public.appointment_add_ons
  add column barber_add_on_id uuid,
  add column duration_minutes integer;

update public.appointment_add_ons
set duration_minutes = 0
where duration_minutes is null;
```

Before linking historical rows, raise an explicit diagnostic if an appointment/add-on/barber combination has no same-tenant relationship. Implement `save_add_on_with_barbers` so it derives the tenant from `(select barbershop_id from public.profiles where id = auth.uid())`, rejects duplicate/external barber IDs, requires one available assignment only on create, upserts all assignments, and synchronizes legacy global price/duration from the first available assignment ordered by `barber_id`.

- [ ] **Step 5: Reset the local database and verify GREEN**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase db reset --local
npx.cmd supabase test db --local supabase/tests/database/barber_add_ons_expand_test.sql supabase/tests/database/data_api_grants_test.sql
npm.cmd test -- tests/unit/migrations.test.ts
```

Expected: reset succeeds, all pgTAP assertions pass, and migration contracts pass.

- [ ] **Step 6: Run database advisors and commit**

Discover and run the installed command:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase db advisors --help
npx.cmd supabase db advisors --local
git add supabase/migrations supabase/tests/database/barber_add_ons_expand_test.sql supabase/tests/database/data_api_grants_test.sql tests/unit/migrations.test.ts
git commit -m "feat: add barber-specific add-on relationships"
```

Expected: no security or performance advisor findings introduced by the migration.

---

### Task 2: Add pure admin types, parsing, and range formatting

**Files:**
- Create: `src/app/dashboard/adicionais/add-on-types.ts`
- Create: `src/app/dashboard/adicionais/add-on-validation.ts`
- Create: `tests/unit/add-on-assignments.test.ts`

**Interfaces:**
- Produces `AddOnAssignmentDraft`, `AddOnCatalogAssignment`, `AddOnCatalogItem`, and `AddOnBarber`.
- Produces `parseAddOnFormData(formData, allowedBarberIds, mode)`.
- Produces `formatAddOnPriceRange(assignments)` and `formatAddOnDurationRange(assignments)`.

- [ ] **Step 1: Write failing parser tests**

Cover a valid two-barber payload, duplicate IDs, external IDs, negative/blank price, fractional/over-720 duration, create with none available, and edit with none available:

```ts
it('accepts distinct per-barber values', () => {
  const formData = form({
    name: 'Sobrancelha',
    is_active: 'true',
    assignments: JSON.stringify([
      { barberId: 'a', price: 10, durationMinutes: 5, isAvailable: true },
      { barberId: 'b', price: 15, durationMinutes: 10, isAvailable: true },
    ]),
  })

  expect(parseAddOnFormData(formData, new Set(['a', 'b']), 'create')).toEqual({
    success: true,
    data: {
      name: 'Sobrancelha',
      isActive: true,
      assignments: [
        { barberId: 'a', price: 10, durationMinutes: 5, isAvailable: true },
        { barberId: 'b', price: 15, durationMinutes: 10, isAvailable: true },
      ],
    },
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/add-on-assignments.test.ts
```

Expected: FAIL because the modules and exports do not exist.

- [ ] **Step 3: Implement the minimal pure modules**

Use a discriminated result:

```ts
type ParseResult =
  | { success: true; data: ParsedAddOn }
  | { success: false; errors: Record<string, string> }
```

Validate every assignment regardless of availability so stale hidden values cannot reach SQL. Format only available assignments; return `Sem profissionais` when none are available, `R$ 10,00` for one value, and `R$ 10,00 – R$ 15,00` for a range. Use `0 min` for zero duration.

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npm.cmd test -- tests/unit/add-on-assignments.test.ts
git add src/app/dashboard/adicionais/add-on-types.ts src/app/dashboard/adicionais/add-on-validation.ts tests/unit/add-on-assignments.test.ts
git commit -m "feat: validate barber add-on assignments"
```

Expected: all parser and formatter cases pass.

---

### Task 3: Migrate the add-on administration UI and Server Functions

**Files:**
- Create: `src/components/dashboard/add-on-assignments-editor.tsx`
- Create: `tests/unit/add-on-admin-contract.test.ts`
- Modify: `src/app/dashboard/adicionais/page.tsx`
- Modify: `src/app/dashboard/adicionais/actions.ts`
- Modify: `src/app/dashboard/adicionais/adicionais-client.tsx`
- Modify: `src/components/dashboard/add-on-form.tsx`

**Interfaces:**
- Consumes `parseAddOnFormData`, catalog types, and `save_add_on_with_barbers`.
- Produces `AddOnAssignmentsEditor({ assignments, onChange })`.
- `createAddOn(formData)` and `updateAddOn(id, formData)` return the saved add-on UUID.

- [ ] **Step 1: Write failing source and component contract tests**

Assert that the page queries:

```ts
expect(page).toContain(
  'barber_add_ons(id, barber_id, price, duration_minutes, is_available, configuration_version)',
)
expect(page).toContain(".from('barbers')")
```

Assert that actions load allowed tenant barber IDs, call `parseAddOnFormData`, invoke `save_add_on_with_barbers`, and revalidate both `/dashboard/adicionais` and `/dashboard`. Assert the form serializes `assignments` and renders `AddOnAssignmentsEditor`.

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/add-on-admin-contract.test.ts
```

Expected: FAIL because the page still selects global rows and actions insert/update `add_ons` directly.

- [ ] **Step 3: Implement tenant-scoped loading and mapping**

Use `getBarbershopId()` in the page and load add-ons plus barbers in parallel. Map numeric database fields with `Number(...)`, preserve inactive barbers in the editor, and pass `AddOnCatalogItem[]` plus `AddOnBarber[]` to the client.

- [ ] **Step 4: Implement authorized transactional actions**

Use this flow in a private `saveAddOn` helper:

```ts
const { supabase, barbershopId } = await getBarbershopId()
const { data: barbers, error: barbersError } = await supabase
  .from('barbers')
  .select('id')
  .eq('barbershop_id', barbershopId)

const parsed = parseAddOnFormData(
  formData,
  new Set((barbers ?? []).map((barber) => barber.id)),
  mode,
)
if (!parsed.success) throw new Error(Object.values(parsed.errors)[0])

const { data, error } = await supabase.rpc('save_add_on_with_barbers', {
  p_add_on_id: addOnId,
  p_name: parsed.data.name,
  p_is_active: parsed.data.isActive,
  p_assignments: parsed.data.assignments,
})
```

Keep toggle/delete tenant filters and revalidation. Do not trust IDs or values merely because the form rendered them.

- [ ] **Step 5: Implement the assignment editor and card summaries**

Mirror the service editor’s visual language, but allow duration zero:

```tsx
<Input
  type="number"
  min="0"
  max="720"
  step="1"
  value={assignment.durationMinutes}
  onChange={(event) =>
    update(assignment.barberId, {
      durationMinutes: event.target.value === '' ? '' : Number(event.target.value),
    })
  }
/>
```

Cards show global active status, available barber count, price range, and duration range. The form initializes one draft per current barber and preserves saved assignments for inactive barbers.

- [ ] **Step 6: Run focused tests, lint, and commit**

Run:

```powershell
npm.cmd test -- tests/unit/add-on-assignments.test.ts tests/unit/add-on-admin-contract.test.ts
npm.cmd run lint -- src/app/dashboard/adicionais src/components/dashboard/add-on-form.tsx src/components/dashboard/add-on-assignments-editor.tsx
git add src/app/dashboard/adicionais src/components/dashboard/add-on-form.tsx src/components/dashboard/add-on-assignments-editor.tsx tests/unit/add-on-admin-contract.test.ts
git commit -m "feat: manage add-ons per barber"
```

Expected: tests and targeted lint pass without warnings.

---

### Task 4: Load and manage the selected barber’s public add-ons

**Files:**
- Create: `tests/unit/booking-add-ons.test.ts`
- Modify: `src/app/booking/[slug]/booking-types.ts`
- Modify: `src/app/booking/[slug]/booking-action-mappers.ts`
- Modify: `src/app/booking/[slug]/booking-selection.ts`
- Modify: `src/app/booking/[slug]/booking-utils.ts`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `tests/unit/booking-actions-contract.test.ts`
- Modify: `tests/unit/booking-selection.test.ts`
- Modify: `tests/unit/booking-utils.test.ts`

**Interfaces:**
- Produces `BarberAddOnOption { id, barberId, addOnId, name, price, durationMinutes, configurationVersion }`.
- Produces `SelectedBookingAddOn { barberAddOnId, configurationVersion }`.
- Produces `mapBarberAddOnRows(rows): BarberAddOnOption[]`.
- Produces `getBarberAddOnsAction(barbershopId, barberId)`.
- Extends `getBookingTotals` to return `attendanceDurationMinutes`.

- [ ] **Step 1: Write failing public mapping and reset tests**

Add assertions for numeric mapping and dependency clearing:

```ts
expect(
  selectBarber(
    { ...state, addOnIds: ['addon-a'], date: '2026-07-25', time: '10:00', slots: ['10:00'] },
    'barber-b',
  ),
).toMatchObject({ addOnIds: [], date: '', time: '', slots: [] })

expect(
  selectAddOns(state, ['relationship-b']),
).toMatchObject({ addOnIds: ['relationship-b'], date: '', time: '', slots: [] })
```

Test `getBookingTotals(40, [{ price: 10, durationMinutes: 5 }], products, selection, 30)` returns attendance price `50` and duration `35`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/booking-add-ons.test.ts tests/unit/booking-selection.test.ts tests/unit/booking-utils.test.ts tests/unit/booking-actions-contract.test.ts
```

Expected: FAIL because add-ons are still global and changing them does not invalidate slots.

- [ ] **Step 3: Add public relationship types and mappers**

Map joined rows:

```ts
type BarberAddOnRow = {
  id: string
  barber_id: string
  add_on_id: string
  price: number | string
  duration_minutes: number
  configuration_version: number | string
  add_ons: { name: string } | { name: string }[]
}
```

Normalize the Supabase relation shape and return only serializable primitives.

- [ ] **Step 4: Replace global loading with a barber-scoped action**

Remove add-ons from `getBookingPageData`. Query:

```ts
supabase
  .from('barber_add_ons')
  .select('id, barber_id, add_on_id, price, duration_minutes, configuration_version, add_ons!inner(name)')
  .eq('barbershop_id', barbershopId)
  .eq('barber_id', barberId)
  .eq('is_available', true)
  .eq('add_ons.is_active', true)
```

Return stable success/error objects and explicitly filter by tenant and barber even though RLS applies.

- [ ] **Step 5: Update client state and stale-response protection**

Load services and add-ons for the selected barber in the same transition or coordinated request generation. Clear add-ons and schedule immediately on barber change. On add-on toggle, clear date/time/slots. Preserve products. Render empty/loading/error states and use relationship price/duration in cards and totals.

- [ ] **Step 6: Run tests, lint, and commit**

Run:

```powershell
npm.cmd test -- tests/unit/booking-add-ons.test.ts tests/unit/booking-selection.test.ts tests/unit/booking-utils.test.ts tests/unit/booking-actions-contract.test.ts
npm.cmd run lint -- "src/app/booking/[slug]"
git add "src/app/booking/[slug]" tests/unit/booking-add-ons.test.ts tests/unit/booking-selection.test.ts tests/unit/booking-utils.test.ts tests/unit/booking-actions-contract.test.ts
git commit -m "feat: load public add-ons per barber"
```

Expected: public catalog, reset, mapping, totals, and contract tests pass.

---

### Task 5: Make slot availability include add-on duration

**Files:**
- Create: `supabase/tests/database/barber_add_on_booking_test.sql`
- Create via CLI: the path printed by `npx supabase migration new barber_add_on_booking_expand`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `tests/unit/booking-actions-contract.test.ts`

**Interfaces:**
- Produces RPC: `public.get_public_available_slots_for_service_and_add_ons(p_barbershop_id uuid, p_barber_service_id uuid, p_add_ons jsonb, p_date date) returns table(available_time time)`.
- Consumes selections shaped as `[{"barberAddOnId":"uuid","configurationVersion":1}]`.
- Preserves the existing `get_public_available_slots_for_service` wrapper for legacy clients.

- [ ] **Step 1: Write failing pgTAP duration and validation tests**

Seed one 30-minute service, a 15-minute add-on for the same barber, a lunch boundary, a second-tenant relationship, and a changed version. Assert:

```sql
select results_eq(
  $$select available_time from public.get_public_available_slots_for_service_and_add_ons(
    :'shop_a', :'barber_service_a',
    jsonb_build_array(jsonb_build_object('barberAddOnId', :'barber_add_on_a', 'configurationVersion', 1)),
    date '2030-07-22'
  ) where available_time = time '11:30'$$,
  $$select null::time where false$$,
  '45-minute attendance cannot cross lunch'
);
```

Also assert `INVALID_ADD_ON` for duplicates/cross-tenant/cross-barber IDs and `CONFIG_CHANGED` for stale versions.

- [ ] **Step 2: Run the database test and verify RED**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase test db --local supabase/tests/database/barber_add_on_booking_test.sql
```

Expected: FAIL because the new slots RPC does not exist.

- [ ] **Step 3: Generate and implement the booking expansion migration**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase migration new barber_add_on_booking_expand
```

In the printed migration path, create a private validator that locks/reads the service and selected add-on relationships, rejects duplicates and mismatched barber/tenant, compares versions, and returns the summed duration. Reuse the existing interval rules with:

```sql
v_total_duration := v_barber_service.duration_minutes + v_add_on_duration;
v_candidate_end := v_candidate_start + make_interval(mins => v_total_duration);
```

Expose only the wrapper needed by `anon` and `authenticated`; revoke `PUBLIC` execute.

- [ ] **Step 4: Update the Server Function contract**

Change `getPublicSlotsAction` to accept `SelectedBookingAddOn[]` and invoke:

```ts
supabase.rpc('get_public_available_slots_for_service_and_add_ons', {
  p_barbershop_id: barbershopId,
  p_barber_service_id: barberServiceId,
  p_add_ons: selectedAddOns,
  p_date: dateStr,
})
```

Map `CONFIG_CHANGED` and `INVALID_ADD_ON` to a response that returns the client to step 3 and reloads add-ons.

- [ ] **Step 5: Verify database and action GREEN, then commit**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase db reset --local
npx.cmd supabase test db --local supabase/tests/database/barber_add_on_booking_test.sql
npm.cmd test -- tests/unit/booking-actions-contract.test.ts tests/unit/booking-add-ons.test.ts
git add supabase/migrations supabase/tests/database/barber_add_on_booking_test.sql "src/app/booking/[slug]/actions.ts" tests/unit/booking-actions-contract.test.ts
git commit -m "feat: include add-ons in slot duration"
```

Expected: boundary, tenant, duplicate, and stale-version tests pass.

---

### Task 6: Confirm bookings with authoritative add-on relationships and snapshots

**Files:**
- Modify: CLI-generated `supabase/migrations/*_barber_add_on_booking_expand.sql`
- Modify: `supabase/tests/database/barber_add_on_booking_test.sql`
- Modify: `supabase/tests/database/barber_service_booking_test.sql`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `src/app/booking/[slug]/booking-action-mappers.ts`
- Modify: `src/app/booking/[slug]/booking-types.ts`
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `tests/unit/booking-actions-contract.test.ts`

**Interfaces:**
- Produces RPC: `public.create_public_appointment_with_barber_service_add_ons_and_products(..., p_add_ons jsonb, p_products jsonb) returns jsonb`.
- Returns receipt fields already used plus `addOnDurationMinutes` and an authoritative `endAt`.
- Preserves the current booking RPC as a compatibility wrapper.

- [ ] **Step 1: Extend database tests to RED for confirmation behavior**

Assert a booking with a 30-minute service and 15-minute add-on:

```sql
select is(
  (select value->>'endAt' from created_receipt),
  '2030-07-22T09:45:00+00:00',
  'receipt end includes add-on duration'
);
select results_eq(
  $$select price, duration_minutes, barber_add_on_id
    from public.appointment_add_ons
    where appointment_id = :'created_appointment'$$,
  $$values (10.00::numeric, 15, :'barber_add_on_a'::uuid)$$,
  'relationship and snapshots are authoritative'
);
```

Add rejection tests for duplicate, cross-barber, cross-tenant, inactive, and stale selections. Verify each rejection leaves appointment, add-on snapshot, and product stock counts unchanged.

- [ ] **Step 2: Run database and contract tests and verify RED**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase test db --local supabase/tests/database/barber_add_on_booking_test.sql supabase/tests/database/barber_service_booking_test.sql
npm.cmd test -- tests/unit/booking-actions-contract.test.ts
```

Expected: FAIL because confirmation still accepts global add-on IDs and only uses service duration.

- [ ] **Step 3: Implement the authoritative booking RPC**

In the booking expansion migration, re-read and lock the service/add-on relationships inside one transaction. Calculate:

```sql
v_end_at := p_start_at + make_interval(
  mins => v_service.duration_minutes + v_add_on_duration
);
v_attendance_total := v_service.price + v_add_on_total;
```

Call the shared interval validator with `v_end_at`, insert `appointments`, insert `appointment_add_ons(barber_add_on_id, price, duration_minutes)`, reserve products, and return the receipt. Never use client prices/durations.

- [ ] **Step 4: Update the app payload and recovery flow**

Change `CreatePublicBookingInput` from `addOnIds?: string[]` to:

```ts
addOns?: SelectedBookingAddOn[]
```

Send `p_add_ons: input.addOns ?? []`. On `CONFIG_CHANGED` or `INVALID_ADD_ON`, clear schedule, reload the current barber’s add-ons, and return to step 3. Parse and display authoritative `addOnDurationMinutes`/`endAt`; do not derive success values from client state.

- [ ] **Step 5: Run the focused suite, reset database, and commit**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase db reset --local
npx.cmd supabase test db --local supabase/tests/database/barber_add_on_booking_test.sql supabase/tests/database/barber_service_booking_test.sql
npm.cmd test -- tests/unit/booking-actions-contract.test.ts tests/unit/booking-add-ons.test.ts tests/unit/booking-ui.test.ts
git add supabase/migrations supabase/tests/database/barber_add_on_booking_test.sql supabase/tests/database/barber_service_booking_test.sql "src/app/booking/[slug]" tests/unit/booking-actions-contract.test.ts
git commit -m "feat: book authoritative barber add-ons"
```

Expected: totals, duration, snapshots, stock atomicity, and recovery contracts pass.

---

### Task 7: Surface add-on duration snapshots in Agenda and Reservas

**Files:**
- Modify: `src/app/dashboard/agenda/agenda-types.ts`
- Modify: `src/app/dashboard/agenda/appointment-mappers.ts`
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `src/app/dashboard/reservas/page.tsx`
- Modify: `src/app/dashboard/reservas/reservas-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Extends historical add-on item to `{ name: string; price: number; durationMinutes: number }`.
- All historical screens read snapshots from `appointment_add_ons`, never current `barber_add_ons`.

- [ ] **Step 1: Write the failing historical snapshot test**

Assert queries include `price, duration_minutes, add_ons(name)` and mappers use `duration_minutes`. Assert details render `+ 15 min` only when duration is greater than zero and continue showing the snapshot price.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/booking-reservations-dashboard.test.ts
```

Expected: FAIL because add-on duration is neither queried nor mapped.

- [ ] **Step 3: Implement snapshot mapping and display**

Map with:

```ts
{
  name: relationName(row.add_ons),
  price: Number(row.price),
  durationMinutes: Number(row.duration_minutes),
}
```

Display the duration beside each add-on without looking up current catalog/relationship values. Legacy rows display no extra-duration label because their snapshot is zero.

- [ ] **Step 4: Run tests, lint, and commit**

Run:

```powershell
npm.cmd test -- tests/unit/booking-reservations-dashboard.test.ts
npm.cmd run lint -- src/app/dashboard/agenda src/app/dashboard/reservas
git add src/app/dashboard/agenda src/app/dashboard/reservas tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: show add-on duration snapshots"
```

Expected: Agenda and Reservas preserve historical price/duration behavior.

---

### Task 8: Add end-to-end coverage, rollout checks, and final verification

**Files:**
- Create: `tests/e2e/barber-add-on-booking.spec.ts`
- Modify: `tests/e2e/barber-service-fixture.ts`
- Modify: `docs/runbooks/barber-service-rollout.md`
- Modify: `tests/unit/barber-service-rollout-contract.test.ts`

**Interfaces:**
- Produces a reusable E2E fixture with two barbers sharing one add-on at different price/duration.
- Produces rollout queries for null relationship/snapshot detection and legacy RPC observation.

- [ ] **Step 1: Write the failing E2E and rollout contract tests**

The E2E must:

```ts
test('uses the selected barber add-on price and duration', async ({ page }) => {
  await chooseBarber(page, 'Ana')
  await chooseService(page, 'Corte')
  await expect(page.getByText('Sobrancelha')).toContainText('R$ 10,00')
  await page.getByText('Sobrancelha').click()
  await expect(page.getByText('45 min')).toBeVisible()
  await completeBooking(page)
  await expect(page.getByText('R$ 50,00')).toBeVisible()
})
```

Add a second path for another barber at a different price/duration, a barber-change reset, and a stale configuration recovery. The rollout contract must require queries for `where barber_add_on_id is null`, `where duration_minutes is null`, and legacy RPC telemetry.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
npm.cmd test -- tests/unit/barber-service-rollout-contract.test.ts
npm.cmd run test:e2e -- tests/e2e/barber-add-on-booking.spec.ts
```

Expected: rollout contract fails for missing checks; E2E fails because fixture and flow do not yet expose relationship-backed add-ons.

- [ ] **Step 3: Implement the fixture, E2E cases, and rollout runbook**

Seed `barber_add_ons` with deterministic IDs and versions. Document expand → application → observation → later contraction, including zero-null queries, grant/RLS checks, advisor output, legacy traffic, and rollback that preserves expanded schema/snapshots.

- [ ] **Step 4: Run the complete database and application test suites**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase db reset --local
npx.cmd supabase test db --local supabase/tests/database
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/barber-add-on-booking.spec.ts tests/e2e/barber-service-booking.spec.ts tests/e2e/barber-service-concurrency.spec.ts
```

Expected: all commands exit zero with no warnings introduced by this feature.

- [ ] **Step 5: Run final migration/security checks**

Run:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx.cmd supabase migration list --local
npx.cmd supabase db advisors --local
git status --short
```

Expected: both new migrations appear locally in order, advisors report no introduced issues, and only intended files are modified.

- [ ] **Step 6: Commit the verification slice**

Run:

```powershell
git add tests/e2e/barber-add-on-booking.spec.ts tests/e2e/barber-service-fixture.ts docs/runbooks/barber-service-rollout.md tests/unit/barber-service-rollout-contract.test.ts
git commit -m "test: verify barber add-ons end to end"
```

Expected: final commit succeeds and the repository remains clean.
