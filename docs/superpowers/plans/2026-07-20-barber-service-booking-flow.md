# Barber-Service Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the barber-service relationship the single source of truth for public and manual bookings, including per-barber price, duration, availability, historical snapshots, and barber-first selection.

**Architecture:** Add a tenant-safe `barber_services` join table and snapshot columns on `appointments`, then introduce service-aware slot and booking RPCs that validate and price each appointment inside Postgres. Public and admin flows query relationship records after a barber is selected; service management persists catalog data and assignments transactionally.

**Tech Stack:** Next.js 16.2 App Router and Server Actions, React 19, TypeScript 5, Supabase/Postgres with RLS and PL/pgSQL RPCs, Vitest 4, Playwright 1.60.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before changing any Next.js API, convention, or file structure.
- Before Supabase implementation, scan `https://supabase.com/changelog.md`, use current official documentation, and discover CLI commands with `npx supabase --help` and subcommand `--help`.
- Create every migration with `npx supabase migration new <name>`; use the exact path printed by the CLI and never invent a migration timestamp.
- Enable RLS on every new table in `public`; public reads expose only available relationships whose barber and service are active.
- Price and duration sent by a browser are never authoritative; database functions load both from `barber_services`.
- New services require explicit barber assignments; new barbers receive no automatic service assignments.
- Keep add-on and product behavior unchanged, including products paid on pickup.
- Follow red-green-refactor for every behavior change and commit after each independently testable task.
- Do not add a validation or form dependency; use focused TypeScript validation helpers and database constraints.

---

## File and Interface Map

### New files

- `tests/unit/barber-services-migration.test.ts` — schema, backfill, RLS, snapshot, and grant contract.
- `tests/unit/barber-service-booking-functions.test.ts` — service-aware slot, booking, admin-save, and privilege contract.
- `src/app/booking/[slug]/booking-selection.ts` — pure dependent-selection reset helper.
- `tests/unit/booking-selection.test.ts` — reset semantics when a barber changes.
- `src/app/dashboard/servicos/service-types.ts` — admin service and assignment DTOs shared by page, form, and actions.
- `src/app/dashboard/servicos/service-validation.ts` — pure parser/validator for service assignments.
- `src/components/dashboard/service-assignments-editor.tsx` — per-barber availability, price, and duration editor.
- `tests/unit/service-assignments.test.ts` — parser, validation, and range formatting tests.
- `tests/unit/service-admin-contract.test.ts` — authenticated query/action/UI source contract.
- `tests/e2e/barber-service-booking.spec.ts` — two-barber price/filter/reset journey.
- Two migration files whose timestamped paths are created by the Supabase CLI: suffixes `_barber_services.sql` and `_barber_service_booking_functions.sql`.

### Modified files

- `src/app/booking/[slug]/booking-types.ts` — public relationship DTO and structured booking error/result types.
- `src/app/booking/[slug]/actions.ts` — barber-scoped catalog query, service-aware slots, relationship-based booking.
- `src/app/booking/[slug]/page.tsx` — stop loading global services.
- `src/app/booking/[slug]/booking-client.tsx` — barber-first wizard, reload/reset behavior, stale-request protection.
- `src/app/booking/[slug]/booking-summary-bar.tsx` — separate service price from add-ons and products.
- `src/app/booking/[slug]/booking-success.tsx` — show service price and duration explicitly.
- `src/app/dashboard/servicos/page.tsx` — load catalog, barbers, and assignments.
- `src/app/dashboard/servicos/actions.ts` — authenticated transactional save payload.
- `src/app/dashboard/servicos/services-client.tsx` — assignment-aware cards and form props.
- `src/components/dashboard/service-form.tsx` — catalog fields plus assignment editor.
- `src/app/dashboard/agenda/page.tsx` — stop loading global service prices.
- `src/app/dashboard/agenda/actions.ts` — admin relationship catalog, service-aware slots/creation, historical detail fields.
- `src/app/dashboard/agenda/agenda-client.tsx` — barber-first manual booking and snapshot display.
- `src/app/dashboard/reservas/page.tsx` — fetch snapshots and add-on snapshots.
- `src/app/dashboard/reservas/reservas-client.tsx` — display barber, service price, duration, add-ons, and totals.
- `tests/unit/booking-wizard-contract.test.ts` — new step order and removal of `any`.
- `tests/unit/booking-actions-contract.test.ts` — relationship query and RPC payload.
- `tests/unit/booking-ui.test.ts` — explicit price/duration summary contract.
- `tests/unit/booking-reservations-dashboard.test.ts` — snapshot detail contract.
- `tests/e2e/fluxo-principal.spec.ts` — keep existing journey compatible with the new service form.

### Stable interfaces produced by this plan

```ts
export interface BarberServiceOption {
  id: string
  barberId: string
  serviceId: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  configurationUpdatedAt: string
}

export interface ServiceAssignmentInput {
  barberId: string
  price: number
  durationMinutes: number
  isAvailable: boolean
}

export interface ManagedService {
  id: string
  name: string
  description: string | null
  isActive: boolean
  assignments: ServiceAssignmentInput[]
}

export async function getBarberServicesAction(
  barbershopId: string,
  barberId: string,
): Promise<BarberServiceOption[]>

export async function getPublicSlotsAction(
  barbershopId: string,
  barberServiceId: string,
  dateStr: string,
): Promise<string[]>
```

---

### Task 1: Add the relationship schema, historical snapshots, backfill, RLS, and grants

**Files:**
- Create through CLI: the exact file printed by `npx supabase migration new barber_services`, ending in `_barber_services.sql`
- Create: `tests/unit/barber-services-migration.test.ts`

**Interfaces:**
- Produces table `public.barber_services` with columns `id`, `barbershop_id`, `barber_id`, `service_id`, `price`, `duration_minutes`, `is_available`, `created_at`, and `updated_at`.
- Produces non-null `appointments.barber_service_id`, `appointments.service_price`, and `appointments.service_duration_minutes` after backfill.
- Preserves existing `services.price` and `services.duration_minutes` temporarily for deployment compatibility, but no later application task may read them.

- [ ] **Step 1: Discover the installed Supabase CLI and create the migration through the CLI**

Run:

```powershell
npx supabase --help
npx supabase migration --help
npx supabase migration new --help
npx supabase migration new barber_services
```

Expected: the last command prints the exact new path ending in `_barber_services.sql`. Use that printed path for every SQL edit in this task.

- [ ] **Step 2: Write the failing migration contract test**

Create `tests/unit/barber-services-migration.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationName = readdirSync(resolve(process.cwd(), 'supabase/migrations'))
  .find((name) => name.endsWith('_barber_services.sql'))

const sql = migrationName
  ? readFileSync(resolve(process.cwd(), 'supabase/migrations', migrationName), 'utf8').toLowerCase()
  : ''

describe('barber service relationship migration', () => {
  it('creates tenant-safe relationship data with price, duration and availability', () => {
    expect(migrationName).toBeDefined()
    expect(sql).toContain('create table public.barber_services')
    expect(sql).toContain('unique (barber_id, service_id)')
    expect(sql).toContain('check (price >= 0)')
    expect(sql).toContain('check (duration_minutes > 0)')
    expect(sql).toContain('alter table public.barber_services enable row level security')
  })

  it('backfills only same-shop pairs and preserves appointment snapshots', () => {
    expect(sql).toContain('insert into public.barber_services')
    expect(sql).toContain('barber.barbershop_id = service.barbershop_id')
    expect(sql).toContain('add column barber_service_id')
    expect(sql).toContain('add column service_price')
    expect(sql).toContain('add column service_duration_minutes')
    expect(sql).toContain('appointment_add_ons')
    expect(sql).toContain("extract(epoch from (appointment.end_at - appointment.start_at)) / 60")
  })

  it('exposes only bookable rows to anon and tenant rows to authenticated users', () => {
    expect(sql).toContain('on public.barber_services for select to anon')
    expect(sql).toContain('barber_services.is_available')
    expect(sql).toContain('barber.is_active')
    expect(sql).toContain('service.is_active')
    expect(sql).toContain('to authenticated')
    expect(sql).toContain('(select auth.uid())')
    expect(sql).toContain('grant select on public.barber_services to anon')
  })
})
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- tests/unit/barber-services-migration.test.ts`

Expected: FAIL because the generated migration does not yet contain the table, backfill, snapshots, and policies.

- [ ] **Step 4: Implement the schema and backfill in the CLI-created migration**

The migration must implement this exact data contract:

```sql
alter table public.barbers
  add constraint barbers_id_barbershop_id_key unique (id, barbershop_id);
alter table public.services
  add constraint services_id_barbershop_id_key unique (id, barbershop_id);

create table public.barber_services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (barber_id, service_id),
  foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete cascade
);

create index barber_services_barbershop_id_idx on public.barber_services(barbershop_id);
create index barber_services_barber_available_idx
  on public.barber_services(barber_id, is_available);
create index barber_services_service_id_idx on public.barber_services(service_id);

create trigger update_barber_services_updated_at
before update on public.barber_services
for each row execute function public.update_updated_at_column();

insert into public.barber_services (
  barbershop_id, barber_id, service_id, price, duration_minutes, is_available
)
select
  barber.barbershop_id,
  barber.id,
  service.id,
  service.price,
  service.duration_minutes,
  true
from public.barbers as barber
join public.services as service
  on barber.barbershop_id = service.barbershop_id
on conflict (barber_id, service_id) do nothing;

alter table public.appointments add column barber_service_id uuid;
alter table public.appointments add column service_price numeric(10,2);
alter table public.appointments add column service_duration_minutes integer;

update public.appointments as appointment
set barber_service_id = relationship.id,
    service_price = greatest(
      appointment.total_price - coalesce((
        select sum(snapshot.price)
        from public.appointment_add_ons as snapshot
        where snapshot.appointment_id = appointment.id
      ), 0),
      0
    ),
    service_duration_minutes = round(
      extract(epoch from (appointment.end_at - appointment.start_at)) / 60
    )::integer
from public.barber_services as relationship
where relationship.barber_id = appointment.barber_id
  and relationship.service_id = appointment.service_id
  and relationship.barbershop_id = appointment.barbershop_id;

alter table public.appointments
  alter column barber_service_id set not null,
  alter column service_price set not null,
  alter column service_duration_minutes set not null,
  add constraint appointments_service_price_check check (service_price >= 0),
  add constraint appointments_service_duration_check check (service_duration_minutes > 0),
  add constraint appointments_barber_service_id_fkey
    foreign key (barber_service_id) references public.barber_services(id) on delete restrict;
```

Add RLS policies with explicit `TO` roles. The anonymous policy requires `barber_services.is_available`, an active same-shop barber, and an active same-shop service. Authenticated SELECT/INSERT/UPDATE/DELETE policies require `barber_services.barbershop_id` to equal the caller profile's `barbershop_id`; UPDATE includes both `USING` and `WITH CHECK`. Grant `SELECT` to `anon` and `SELECT, INSERT, UPDATE, DELETE` to `authenticated`.

- [ ] **Step 5: Run migration tests and the existing migration suite**

Run:

```powershell
npm test -- tests/unit/barber-services-migration.test.ts tests/unit/migrations.test.ts tests/unit/public-booking-catalog-migration.test.ts
```

Expected: PASS with 0 failed tests.

- [ ] **Step 6: Commit the schema foundation**

```powershell
git add supabase/migrations tests/unit/barber-services-migration.test.ts
git commit -m "feat: add barber service relationship schema"
```

---

### Task 2: Add service-aware slot, booking, product, and admin-save database functions

**Files:**
- Create through CLI: the exact file printed by `npx supabase migration new barber_service_booking_functions`, ending in `_barber_service_booking_functions.sql`
- Create: `tests/unit/barber-service-booking-functions.test.ts`

**Interfaces:**
- Produces `public.get_public_available_slots_for_service(p_barbershop_id uuid, p_barber_service_id uuid, p_date date)` returning `available_time time`.
- Produces `public.create_public_appointment_with_barber_service_and_products(p_barbershop_id uuid, p_client_name text, p_client_phone text, p_client_email text, p_barber_service_id uuid, p_configuration_updated_at timestamptz, p_start_at timestamptz, p_notes text, p_add_on_ids uuid[], p_products jsonb)` returning an appointment UUID.
- Produces `public.save_service_with_barbers(p_service_id uuid, p_name text, p_description text, p_is_active boolean, p_assignments jsonb)` returning a service UUID.
- Emits stable PostgreSQL messages `INVALID_BARBER_SERVICE`, `CONFIG_CHANGED`, `SLOT_UNAVAILABLE`, `INVALID_ASSIGNMENTS`, and existing `INSUFFICIENT_STOCK`.

- [ ] **Step 1: Create the functions migration through the CLI**

Run:

```powershell
npx supabase migration new --help
npx supabase migration new barber_service_booking_functions
```

Expected: a path ending in `_barber_service_booking_functions.sql`.

- [ ] **Step 2: Write the failing function contract test**

Create `tests/unit/barber-service-booking-functions.test.ts` and read the migration by suffix. Assert all of the following exact fragments:

```ts
expect(sql).toContain('get_public_available_slots_for_service')
expect(sql).toContain('p_barber_service_id uuid')
expect(sql).toContain('relationship.duration_minutes')
expect(sql).toContain('slot_start < appointment.end_at')
expect(sql).toContain('slot_end > appointment.start_at')
expect(sql).toContain('create_public_appointment_with_barber_service_and_products')
expect(sql).toContain('p_configuration_updated_at timestamptz')
expect(sql).toContain("message = 'config_changed'")
expect(sql).toContain('appointment.service_price')
expect(sql).toContain('appointment.service_duration_minutes')
expect(sql).toContain('save_service_with_barbers')
expect(sql).toContain("jsonb_to_recordset(p_assignments)")
expect(sql).toContain('security invoker')
expect(sql).toContain('set search_path = \'\'')
expect(sql).toContain('revoke execute on function')
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- tests/unit/barber-service-booking-functions.test.ts`

Expected: FAIL because the function migration is empty.

- [ ] **Step 4: Implement service-aware availability**

Implement `get_public_available_slots_for_service` with `SECURITY DEFINER SET search_path = ''`. It must:

1. Load and validate one available relationship joined to active same-shop barber and service.
2. Read the relationship barber and duration.
3. Generate candidate starts using `barbershop_settings.slot_interval_minutes`.
4. Set `slot_end = slot_start + make_interval(mins => duration_minutes)`.
5. Require the entire interval inside work hours.
6. Reject any overlap with lunch using `slot_start < lunch_end AND slot_end > lunch_start`.
7. Reject overlap with active appointments and `barber_blocked_times` using half-open interval checks.
8. Return ordered start times only.

The public wrapper qualifies every relation with `public.` and grants execution only to `anon, authenticated` after revoking `PUBLIC`.

- [ ] **Step 5: Implement the relationship-based booking transaction**

Implement a private core function and the public product wrapper. The core transaction must use this input contract:

```sql
p_barbershop_id uuid,
p_client_name text,
p_client_phone text,
p_client_email text,
p_barber_service_id uuid,
p_configuration_updated_at timestamptz,
p_start_at timestamptz,
p_notes text,
p_add_on_ids uuid[]
```

Within the transaction:

- take `pg_advisory_xact_lock(hashtext(relationship.barber_id::text))`;
- select the relationship `FOR UPDATE`, joined to active barber and service;
- raise `INVALID_BARBER_SERVICE` if not found;
- compare `relationship.updated_at` with `p_configuration_updated_at` and raise `CONFIG_CHANGED` on mismatch;
- compute `end_at` with `relationship.duration_minutes`;
- repeat work-hours, lunch, block, and appointment overlap validation for the full interval;
- validate add-ons belong to the same barbershop and are active;
- insert/update the normalized client as the existing function does;
- insert `appointments` with relationship barber/service IDs, `barber_service_id`, `service_price`, `service_duration_minutes`, `end_at`, and total of relationship price plus add-ons;
- insert add-on price snapshots.

The product wrapper keeps the current row locking, duplicate/quantity validation, stock snapshot, stock decrement, and release trigger behavior, but calls the new relationship core. Keep `INSUFFICIENT_STOCK` details compatible with the existing TypeScript mapper.

- [ ] **Step 6: Implement transactional admin service saving**

Implement `save_service_with_barbers` as `SECURITY INVOKER SET search_path = ''`, executable only by `authenticated`. It derives the barbershop from `public.profiles` using `(select auth.uid())`, validates a non-empty trimmed name and at least one available assignment, rejects duplicates and foreign barber IDs, inserts or updates `public.services`, upserts every submitted relationship, and sets omitted existing relationships to `is_available = false` rather than deleting them.

Assignments use this JSON shape:

```json
[
  {
    "barberId": "uuid",
    "price": 40,
    "durationMinutes": 30,
    "isAvailable": true
  }
]
```

Reject available assignments when price is null/negative or duration is null/non-positive. Revoke execution of the legacy public booking signatures from `PUBLIC`, `anon`, and `authenticated` once the new functions are granted.

- [ ] **Step 7: Run function and migration contract tests**

Run:

```powershell
npm test -- tests/unit/barber-service-booking-functions.test.ts tests/unit/barber-services-migration.test.ts tests/unit/booking-products-migration.test.ts
```

Expected: PASS with the product reservation contract unchanged.

- [ ] **Step 8: Reset and query the local database when available**

First discover exact flags:

```powershell
npx supabase db reset --help
npx supabase migration list --help
```

Then run the supported local reset and migration-list commands. Execute test SQL through the supported CLI command or Supabase MCP to verify: two prices for one service, full-duration slot exclusion, `CONFIG_CHANGED`, cross-tenant rejection, and snapshot insertion. Expected: each valid case returns the configured relationship values; each invalid case raises its stable error code.

- [ ] **Step 9: Commit database behavior**

```powershell
git add supabase/migrations tests/unit/barber-service-booking-functions.test.ts
git commit -m "feat: enforce barber service booking rules"
```

---

### Task 3: Add shared booking types, dependent reset behavior, and server contracts

**Files:**
- Modify: `src/app/booking/[slug]/booking-types.ts`
- Create: `src/app/booking/[slug]/booking-selection.ts`
- Create: `tests/unit/booking-selection.test.ts`
- Modify: `src/app/booking/[slug]/actions.ts`
- Modify: `tests/unit/booking-actions-contract.test.ts`

**Interfaces:**
- Produces `BarberServiceOption` exactly as defined in the File and Interface Map.
- Produces `resetForBarberChange(state, barberId)` that clears relationship, date, time, slots, and relationship errors while preserving add-ons/products.
- Produces `getBarberServicesAction`, the new `getPublicSlotsAction` signature, and `createPublicBooking` using `barberServiceId` plus `configurationUpdatedAt`.

- [ ] **Step 1: Write the failing reset test**

Create `tests/unit/booking-selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resetForBarberChange } from '@/app/booking/[slug]/booking-selection'

describe('barber-first booking selection', () => {
  it('clears service and schedule dependencies but preserves optional purchases', () => {
    expect(resetForBarberChange({
      barberId: 'old',
      barberServiceId: 'relationship',
      selectedDate: '2026-07-21',
      selectedTime: '10:00',
      slots: ['10:00'],
      error: 'old error',
      addOnIds: ['beard-oil'],
      productQuantities: { pomade: 1 },
    }, 'new')).toEqual({
      barberId: 'new',
      barberServiceId: '',
      selectedDate: '',
      selectedTime: '',
      slots: [],
      error: '',
      addOnIds: ['beard-oil'],
      productQuantities: { pomade: 1 },
    })
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/booking-selection.test.ts`

Expected: FAIL because `booking-selection.ts` does not exist.

- [ ] **Step 3: Implement the pure selection helper and booking DTOs**

Add `BarberServiceOption`, `CreatePublicBookingInput`, and structured result types to `booking-types.ts`. Implement `resetForBarberChange` as a pure immutable object transformation matching the test exactly.

- [ ] **Step 4: Run the selection test and verify GREEN**

Run: `npm test -- tests/unit/booking-selection.test.ts`

Expected: PASS.

- [ ] **Step 5: Update the booking action contract test before production actions**

Change `tests/unit/booking-actions-contract.test.ts` to assert:

```ts
expect(source).toContain(".from('barber_services')")
expect(source).toContain("services!inner")
expect(source).toContain(".eq('barber_id', barberId)")
expect(source).toContain(".eq('is_available', true)")
expect(source).toContain("'get_public_available_slots_for_service'")
expect(source).toContain('p_barber_service_id: input.barberServiceId')
expect(source).toContain('p_configuration_updated_at: input.configurationUpdatedAt')
expect(source).toContain("'create_public_appointment_with_barber_service_and_products'")
expect(source).toContain("code: 'CONFIG_CHANGED'")
expect(source).not.toContain("input.barberId === 'any'")
```

- [ ] **Step 6: Run the action contract and verify RED**

Run: `npm test -- tests/unit/booking-actions-contract.test.ts`

Expected: FAIL on the relationship query and new RPC names.

- [ ] **Step 7: Implement server actions**

In `getBookingPageData`, stop selecting global services. Add `getBarberServicesAction` using an explicit barbershop/barber/available filter and an inner service join filtered to `services.is_active = true`. Map database snake_case fields to `BarberServiceOption`.

Change slots to call `get_public_available_slots_for_service` with barbershop, relationship, and date. Remove all “any barber” union logic.

Change booking input to carry `barberServiceId` and `configurationUpdatedAt`; call `create_public_appointment_with_barber_service_and_products`. Map `CONFIG_CHANGED`, `INVALID_BARBER_SERVICE`, `SLOT_UNAVAILABLE`, and `INSUFFICIENT_STOCK` to structured client results. Notification lookups derive barber/service names from the inserted appointment or relationship, not browser IDs.

- [ ] **Step 8: Run focused tests and commit**

Run:

```powershell
npm test -- tests/unit/booking-selection.test.ts tests/unit/booking-actions-contract.test.ts tests/unit/booking-availability.test.ts tests/unit/booking-utils.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/app/booking tests/unit/booking-selection.test.ts tests/unit/booking-actions-contract.test.ts
git commit -m "feat: add barber scoped booking actions"
```

---

### Task 4: Rebuild the public wizard as barber-first with safe reload behavior

**Files:**
- Modify: `src/app/booking/[slug]/page.tsx`
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `src/app/booking/[slug]/booking-summary-bar.tsx`
- Modify: `src/app/booking/[slug]/booking-success.tsx`
- Modify: `tests/unit/booking-wizard-contract.test.ts`
- Modify: `tests/unit/booking-ui.test.ts`

**Interfaces:**
- Consumes `BarberServiceOption`, `getBarberServicesAction`, `getPublicSlotsAction`, `createPublicBooking`, and `resetForBarberChange` from Task 3.
- Produces a seven-step public flow: Profissional, Serviço, Adicionais, Produtos, Data e Hora, Dados, Confirmação.

- [ ] **Step 1: Update wizard/UI tests first**

Require this label order in `booking-wizard-contract.test.ts`:

```ts
const labels = [
  'Profissional',
  'Serviço',
  'Adicionais',
  'Produtos',
  'Data e Hora',
  'Dados',
  'Confirmação',
]
```

Also assert source contains `getBarberServicesAction`, `resetForBarberChange`, `servicesRequestRef`, `CONFIG_CHANGED`, `setCurrentStep(2)`, and does not contain `selectedBarber === 'any'` or `Qualquer profissional`.

Update `booking-ui.test.ts` to require explicit labels `Preço do serviço`, `Duração`, `Adicionais`, `Produtos`, and `Total do atendimento` across summary/success files.

- [ ] **Step 2: Run both tests and verify RED**

Run: `npm test -- tests/unit/booking-wizard-contract.test.ts tests/unit/booking-ui.test.ts`

Expected: FAIL on order, reload behavior, and explicit summary fields.

- [ ] **Step 3: Remove global services from the page contract**

Delete `services={data.services}` from `page.tsx` and the `services` prop from `BookingClientProps`. Keep barbers, add-ons, and products in initial server data.

- [ ] **Step 4: Implement barber selection and scoped loading**

In `booking-client.tsx`:

- replace `selectedService` with `selectedBarberServiceId`;
- add `availableServices`, `loadingServices`, and `servicesError` state;
- on barber selection, apply `resetForBarberChange`, increment `servicesRequestRef`, and call `getBarberServicesAction`;
- apply a response only when its request number and barber ID still match the current selection;
- show loading cards, retryable error state, and empty state with a “Escolher outro profissional” action;
- render relationship price and duration on service cards;
- require barber on step 1 and relationship on step 2.

- [ ] **Step 5: Make slots and confirmation relationship-based**

Fetch slots only when relationship and date are selected. Submit `barberServiceId` and `configurationUpdatedAt`. On `CONFIG_CHANGED`, clear relationship/date/time/slots, refetch services for the current barber, set step 2, and show “O preço ou a duração deste serviço mudou. Revise os dados antes de confirmar.”

On `INVALID_BARBER_SERVICE`, follow the same recovery path with an unavailable-service message. Keep stock conflict recovery at step 4.

- [ ] **Step 6: Render explicit selected values**

Pass service price and duration separately into `BookingSummaryBar` and `BookingSuccess`. Confirmation must show barber name, service name, duration, service price, add-ons, products, attendance subtotal, and total at the shop. Do not use current catalog data after success; the successful configuration version guarantees the selected values match the snapshots.

- [ ] **Step 7: Run public booking tests and commit**

Run:

```powershell
npm test -- tests/unit/booking-wizard-contract.test.ts tests/unit/booking-ui.test.ts tests/unit/booking-selection.test.ts tests/unit/booking-actions-contract.test.ts tests/unit/booking-utils.test.ts tests/unit/booking-availability.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/app/booking tests/unit/booking-wizard-contract.test.ts tests/unit/booking-ui.test.ts
git commit -m "feat: make public booking barber first"
```

---

### Task 5: Add transactional per-barber service management

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
- Produces `parseServiceFormData(formData, allowedBarberIds)` returning a discriminated success/error result with `ServiceAssignmentInput[]`.
- Produces `saveService(serviceId: string | null, formData: FormData)` calling `save_service_with_barbers`.
- Produces cards with professional count and price/duration ranges.

- [ ] **Step 1: Write failing parser and range tests**

Create `tests/unit/service-assignments.test.ts` covering:

```ts
it('requires one available assignment for a new service')
it('rejects duplicate or foreign barber ids')
it('accepts zero price and positive duration')
it('rejects negative price and non-positive duration')
it('formats one price or a min-max price range')
it('formats one duration or a min-max duration range')
```

Use real `FormData` with an `assignments` JSON field and explicit expected Portuguese error messages.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm test -- tests/unit/service-assignments.test.ts`

Expected: FAIL because types and validation helpers do not exist.

- [ ] **Step 3: Implement focused admin types and validation**

Define `ServiceAssignmentInput`, `ManagedService`, and `BarberOption` in `service-types.ts`. Implement parsing that trims name/description, parses the JSON array, checks allowed/unique barber IDs, requires at least one `isAvailable`, accepts numeric price `>= 0`, and requires integer duration `> 0`. Export pure `formatPriceRange` and `formatDurationRange` helpers used by cards.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run: `npm test -- tests/unit/service-assignments.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the admin source contract test**

Create `tests/unit/service-admin-contract.test.ts` asserting:

```ts
expect(pageSource).toContain('barber_services')
expect(pageSource).toContain('barbers')
expect(actionSource).toContain("'save_service_with_barbers'")
expect(actionSource).toContain('parseServiceFormData')
expect(formSource).toContain('ServiceAssignmentsEditor')
expect(editorSource).toContain('Preço (R$)')
expect(editorSource).toContain('Duração')
expect(editorSource).toContain('Disponível')
expect(clientSource).toContain('profissionais')
```

- [ ] **Step 6: Run the source contract and verify RED**

Run: `npm test -- tests/unit/service-admin-contract.test.ts`

Expected: FAIL on relationship loading, RPC save, and editor rendering.

- [ ] **Step 7: Load catalog and assignments on the server page**

Fetch all barbers in the authenticated barbershop and services with nested `barber_services(id, barber_id, price, duration_minutes, is_available)`. Map them to `ManagedService[]` and `BarberOption[]`; pass both to `ServicesClient`.

- [ ] **Step 8: Replace create/update actions with one validated transactional save**

`saveService` obtains `{ supabase, barbershopId }`, loads allowed barber IDs for that tenant, calls `parseServiceFormData`, then invokes `save_service_with_barbers` with the validated name, description, global status, and assignment JSON. It revalidates `/dashboard/servicos`, `/dashboard/agenda`, `/dashboard`, and the public booking path as supported by the current route data.

Keep global toggle and delete actions tenant-filtered. Delete errors continue recommending deactivation when history exists.

- [ ] **Step 9: Build the assignment editor and cards**

`ServiceAssignmentsEditor` renders one accessible fieldset per barber with an availability checkbox, price number input (`min=0`, `step=0.01`), and duration select. Disabled relationships retain values but submit `isAvailable: false`. `ServiceForm` serializes editor state into the `assignments` FormData field and calls `saveService`.

Cards use available assignments only and show “N profissionais”, price range, and duration range. A service with zero available assignments displays “Sem profissionais” and never invents a global price.

- [ ] **Step 10: Run service administration tests and commit**

Run:

```powershell
npm test -- tests/unit/service-assignments.test.ts tests/unit/service-admin-contract.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/app/dashboard/servicos src/components/dashboard/service-form.tsx src/components/dashboard/service-assignments-editor.tsx tests/unit/service-assignments.test.ts tests/unit/service-admin-contract.test.ts
git commit -m "feat: manage services per barber"
```

---

### Task 6: Make manual agenda creation and administrative details use relationship snapshots

**Files:**
- Modify: `src/app/dashboard/agenda/page.tsx`
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `src/app/dashboard/reservas/page.tsx`
- Modify: `src/app/dashboard/reservas/reservas-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Produces `getAdminBarberServices(barberId)` and `getAdminAvailableSlots(barberServiceId, dateStr)` under the authenticated tenant.
- Changes `CreateAdminBookingInput` to `barberServiceId`, `configurationUpdatedAt`, client fields, start time, and notes.
- Appointment detail DTOs include `service_price`, `service_duration_minutes`, and `appointment_add_ons(price, add_ons(name))`.

- [ ] **Step 1: Expand the dashboard contract test first**

Require source to contain:

```ts
expect(agendaActions).toContain('getAdminBarberServices')
expect(agendaActions).toContain('getAdminAvailableSlots')
expect(agendaActions).toContain('p_barber_service_id')
expect(agendaPage).not.toContain(".select('id, name, price')")
expect(agendaClient).toContain('service_duration_minutes')
expect(agendaClient).toContain('service_price')
expect(reservasPage).toContain('appointment_add_ons')
expect(reservasClient).toContain('Preço do serviço')
expect(reservasClient).toContain('Duração')
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`

Expected: FAIL on global price queries and missing snapshots.

- [ ] **Step 3: Implement authenticated relationship/slot actions**

`getAdminBarberServices` derives `barbershopId` with `getBarbershopId`, filters `barber_services` by that tenant and barber, and maps the same `BarberServiceOption` fields. `getAdminAvailableSlots` verifies the relationship belongs to the tenant and calls `get_public_available_slots_for_service`.

`createAdminAppointment` accepts relationship/version, calls `create_public_appointment_with_barber_service_and_products` with an empty product array, and maps stable configuration/slot errors. Notification data comes from the created appointment relationship.

- [ ] **Step 4: Rebuild the manual form in dependency order**

Remove the global `services` prop from `AgendaPage` and `AgendaClient`. In the creation sheet:

1. select barber;
2. load that barber's services;
3. select a relationship showing price and duration;
4. load full-duration-safe slots for the current agenda date;
5. submit relationship ID and configuration version.

Changing barber clears service and time. Changing service clears time. Loading, empty, and error states prevent submission.

- [ ] **Step 5: Query and render historical snapshots**

Add `service_price`, `service_duration_minutes`, `barbers(name)`, and `appointment_add_ons(price, add_ons(name))` to Agenda and Reservas appointment queries. Detail drawers display service price separately from add-ons, duration from the snapshot, barber and service names, product subtotal, attendance total, and combined pay-at-shop total where applicable. Remove hard-coded “30 minutos”.

- [ ] **Step 6: Run dashboard tests and commit**

Run:

```powershell
npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/actions.test.ts tests/unit/booking-actions-contract.test.ts
```

Expected: PASS.

Commit:

```powershell
git add src/app/dashboard/agenda src/app/dashboard/reservas tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: use service snapshots in booking admin"
```

---

### Task 7: Add the two-barber end-to-end journey and complete regression verification

**Files:**
- Create: `tests/e2e/barber-service-booking.spec.ts`
- Modify: `tests/e2e/fluxo-principal.spec.ts`
- Modify only if verification exposes a regression: files already listed in Tasks 1–6.

**Interfaces:**
- Consumes accessible labels from `ServiceAssignmentsEditor` and public booking cards.
- Proves two barbers can expose the same service with different prices and that changing barber clears the selected relationship.

- [ ] **Step 1: Write the failing Playwright journey**

The test must:

1. authenticate using the existing resilient login/onboarding pattern;
2. create two uniquely named barbers;
3. create one uniquely named service;
4. explicitly enable both barbers with prices `40` and `50`, and durations `30` and `45`;
5. obtain the current barbershop booking link from the dashboard;
6. select barber A and assert only linked services plus `R$ 40,00` and `30 min`;
7. select the service, go back, choose barber B, and assert the previous service is no longer selected;
8. assert the reloaded service shows `R$ 50,00` and `45 min`;
9. advance to confirmation and assert barber, service, price, and duration are all present.

Use roles and labels; add a stable `data-testid` only when an accessible selector cannot identify the relationship row.

- [ ] **Step 2: Run the focused E2E test and verify RED**

Run: `npx playwright test tests/e2e/barber-service-booking.spec.ts`

Expected before the completed implementation: FAIL on missing assignment controls or barber-first behavior.

- [ ] **Step 3: Update the existing principal flow for explicit service assignment**

If `fluxo-principal.spec.ts` creates a service, choose at least one barber and provide relationship price/duration before submitting. Preserve all existing product and finance assertions.

- [ ] **Step 4: Run the complete unit suite**

Run: `npm test`

Expected: all Vitest files pass with 0 failures.

- [ ] **Step 5: Run lint and fix only in-scope issues**

Run: `npm run lint`

Expected: exit code 0, with no errors or warnings introduced by this feature.

- [ ] **Step 6: Run the production build**

Run: `npm run build`

Expected: Next.js 16.2.6 production build exits 0 with all routes compiled.

- [ ] **Step 7: Run focused and complete E2E suites**

Run:

```powershell
npx playwright test tests/e2e/barber-service-booking.spec.ts
npm run test:e2e
```

Expected: the new journey passes; existing principal and alternative journeys remain green.

- [ ] **Step 8: Run Supabase verification and advisors**

Discover available commands first:

```powershell
npx supabase db --help
npx supabase migration list --help
```

Use supported local reset/query/advisor commands, or Supabase MCP equivalents, to verify migrations apply from zero, both new migrations are listed, RLS/grants match the contract, valid booking SQL stores relationship snapshots, and invalid cross-tenant/configuration cases fail. Fix every advisor finding caused by these migrations.

- [ ] **Step 9: Review the implementation against every acceptance criterion**

Check the design spec line by line: barber-first public flow, filtered services, per-barber values, reset on barber change, duration-aware slots, database authority, historical snapshots, admin configuration, backfill, summaries, and regression coverage. Record any unmet criterion as a failing test before changing production code.

- [ ] **Step 10: Commit E2E and verification adjustments**

```powershell
git add tests/e2e src tests/unit supabase/migrations
git commit -m "test: cover barber specific booking flow"
```

---

## Final Verification Commands

Run fresh, in this order, immediately before reporting completion:

```powershell
npm test
npm run lint
npm run build
npx playwright test tests/e2e/barber-service-booking.spec.ts
npm run test:e2e
git status --short
```

Expected: all commands exit 0; `git status --short` is empty after the final commit. If local Supabase or browser dependencies are unavailable, report the exact failing command and environment blocker without claiming those checks passed.
