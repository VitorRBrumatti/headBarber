# Barber service booking rollout

Deploy releases in order: A, then B, then C, then D. Do not advance a release
until its gate is satisfied.

## Release A

Deploy the database changes that add appointment snapshots and compatibility
paths. Release A is application-rollback-safe: the previous application may be
redeployed without a database rollback.

## Release B

Deploy the application that writes and reads the barber service snapshots.
Release B may roll back while legacy functions remain. Begin Release B only
after the local reset and legacy pgTAP compatibility cases are green.

## Release C

Before removing the compatibility paths, the null-snapshot check and the
legacy-call check must both remain at zero for 14 consecutive days. Release C
requires zero null snapshots and zero legacy calls for 14 consecutive days; it
also ends old-application rollback support.

## Release D

After the Release C gate completes, remove the legacy booking RPC signatures
and their telemetry only in a separately reviewed release. Do not roll back to
an old application after Release C.

## Telemetry gates

Run both queries as the database owner in the Supabase SQL Editor (or an
equivalent owner-only operational session). The application, `anon`, and
`authenticated` roles must not receive access to `private.legacy_booking_rpc_calls`.

```sql
select count(*) as null_snapshots
from public.appointments
where barber_service_id is null
   or service_price is null
   or service_duration_minutes is null;
```

```sql
select function_name, count(*) as calls, max(called_at) as last_call
from private.legacy_booking_rpc_calls
where called_at >= now() - interval '14 days'
group by function_name;
```

## Rollback rules

- Release A: application rollback is safe.
- Release B: application rollback is allowed only while the legacy functions remain deployed.
- Release C: do not roll back to the old application; support ended after its 14 consecutive day gate.
- Release D: restore a compatible release only through a reviewed forward recovery; do not reintroduce removed legacy APIs ad hoc.
