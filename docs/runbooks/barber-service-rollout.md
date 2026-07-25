# Barber service rollout

This runbook keeps the database expansion, application migration, contract,
and cleanup as independent releases. Run operational queries as the database owner in the Supabase SQL Editor, or in an equivalent owner-only session.
The application, `anon`, and `authenticated` roles must not receive access to
`private.legacy_booking_rpc_calls`.

## Release A — Expand

Before deployment, complete a fresh local database reset and verify that all
legacy pgTAP cases are green. The compatibility proof must show that legacy signatures create snapshots using relationship pricing.

Release A is application-rollback-safe. It adds nullable snapshots, the
barber/service relationship, compatible legacy functions, and owner-only
telemetry. It does not remove legacy functions or compatibility columns.

## Release B — Migrate application

Deploy the public and administrative application flows that use
`barber_services`, service-aware availability, and the authoritative booking
receipt. Release B may roll back while legacy functions remain available.

Record the deployed UTC timestamp and immutable Git SHA. Beginning on the
deployment date, run both queries below once per UTC day:

```sql
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

Keep the raw daily results with the release record. Any null snapshot or legacy
call resets the observation clock after the cause is remediated.

## Release C — Contract

Release C requires zero null snapshots and zero legacy calls for 14 consecutive days. It needs explicit operator authorization supported by the daily evidence.
It adds the snapshot `NOT NULL` constraints and retires legacy RPC signatures.
Release C ends old-application rollback support.

Do not create or deploy the contract migration as part of Release A or B. If
the gate is not fully met, continue observing Release B.

## Release D — Cleanup

After another stable release cycle, confirm through code search, logs, and tests
that no consumer reads `services.price` or `services.duration_minutes`. Only
then create a separate cleanup migration to drop those global compatibility
columns.

Release D is not part of the Release B observation window and requires its own
operator decision and rollback plan.
