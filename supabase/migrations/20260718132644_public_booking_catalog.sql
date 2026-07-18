-- Public booking visitors need the active catalog before they can schedule.
-- RLS keeps inactive records private while authenticated tenant policies remain unchanged.

drop policy if exists "Services: public can view active" on public.services;
create policy "Services: public can view active"
on public.services for select to anon
using (is_active = true);

drop policy if exists "Barbers: public can view active" on public.barbers;
create policy "Barbers: public can view active"
on public.barbers for select to anon
using (is_active = true);

-- Explicit grants are required by new Supabase projects that opt out of automatic Data API exposure.
grant select on public.services to anon;
grant select on public.barbers to anon;
