-- The public booking catalog needs the active add-on row to resolve the name
-- attached to an available barber relationship.
create policy "AddOns: public can view active"
on public.add_ons
for select
to anon
using (is_active);

grant select on table public.add_ons to anon;
