-- Data API object privileges and RLS policies are separate authorization
-- layers. Expose only the operations the application already performs; the
-- existing RLS policies continue to decide which rows each role can access.
grant select on table public.barbershops to anon;

grant select, insert, update on table public.barbershops to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;
