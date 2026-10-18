-- Optional public presentation fields; existing tenant policies stay unchanged.
alter table public.barbershops
  add column if not exists booking_avatar_url text,
  add column if not exists booking_banner_url text,
  add column if not exists booking_address text;

alter table public.barbershops
  add constraint booking_address_length check (char_length(booking_address) <= 300),
  add constraint booking_avatar_url_length check (char_length(booking_avatar_url) <= 2048),
  add constraint booking_banner_url_length check (char_length(booking_banner_url) <= 2048);
