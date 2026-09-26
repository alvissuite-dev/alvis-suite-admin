-- ============================================================
-- ALVIS SUITE — MIGRATION 02: extend schema for the mobile app
-- Run this in Supabase SQL Editor AFTER schema.sql has already
-- been run once. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── EXTEND APARTMENTS ────────────────────────────────────────
-- Adds the richer property metadata the mobile app's `Property`
-- type expects (city/country/neighborhood breakdown, type, rating,
-- featured flag, cancellation policy, house rules, etc.)
alter table apartments
  add column if not exists city                text,
  add column if not exists country              text,
  add column if not exists neighborhood         text,
  add column if not exists floor                int,
  add column if not exists property_type        text
    check (property_type in ('studio','1br','2br','3br','penthouse','villa')),
  add column if not exists rating               numeric(2,1) default 0,
  add column if not exists review_count         int default 0,
  add column if not exists is_featured          boolean default false,
  add column if not exists cancellation_policy  text
    check (cancellation_policy in ('flexible','moderate','strict')) default 'moderate',
  add column if not exists min_stay             int default 1,
  add column if not exists checkin_time         text default '15:00',
  add column if not exists checkout_time        text default '11:00',
  add column if not exists house_rules          text[] default '{}',
  add column if not exists local_asset_key      text; -- matches a folder key in the
                                                        -- mobile app's PROPERTY_IMAGE_MAP
                                                        -- for existing bundled-photo listings.
                                                        -- New properties added via the admin
                                                        -- leave this null and use `images` URLs.

-- ── EXTEND BOOKINGS ───────────────────────────────────────────
-- Adds arrival/addon/promo fields the mobile booking flow collects,
-- and widens status to cover the full guest lifecycle.
alter table bookings
  add column if not exists arrival_time  text,
  add column if not exists arrival_note  text,
  add column if not exists addons        text[] default '{}',
  add column if not exists promo_code    text,
  add column if not exists user_id       uuid references auth.users(id) on delete set null;

create index if not exists bookings_user_id_idx on bookings(user_id);

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending','confirmed','active','completed','cancelled'));

-- ── PROFILES ──────────────────────────────────────────────────
-- One row per guest (auth.users), holding the extra profile fields
-- the mobile app's `User` type needs beyond what Supabase Auth stores.
create table if not exists profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  email               text,
  phone               text,
  nationality         text,
  is_email_verified   boolean default false,
  is_phone_verified   boolean default false,
  created_at          timestamptz default now()
);

alter table profiles enable row level security;

create policy "users_read_own_profile"
  on profiles for select using (auth.uid() = id);

create policy "users_update_own_profile"
  on profiles for update using (auth.uid() = id);

create policy "admin_read_all_profiles"
  on profiles for select using (auth.role() = 'authenticated');

-- Auto-create a profile row whenever a new auth user signs up
-- (guest registration flow calls supabase.auth.signUp, this fills
-- in the profile automatically from the signUp metadata).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── OFFERS ────────────────────────────────────────────────────
create table if not exists offers (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text,
  discount_type   text not null check (discount_type in ('percent','fixed')),
  discount_value  numeric(10,2) not null,
  code            text unique,
  valid_until     date,
  min_booking     numeric(10,2) default 0,
  is_featured     boolean default false,
  created_at      timestamptz default now()
);

alter table offers enable row level security;

create policy "public_read_offers"
  on offers for select using (true);

create policy "admin_all_offers"
  on offers for all using (auth.role() = 'authenticated');

-- ── REVIEWS ───────────────────────────────────────────────────
create table if not exists reviews (
  id            uuid primary key default uuid_generate_v4(),
  apartment_id  uuid not null references apartments(id) on delete cascade,
  guest_name    text not null,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now()
);

alter table reviews enable row level security;

create policy "public_read_reviews"
  on reviews for select using (true);

create policy "authenticated_insert_reviews"
  on reviews for insert with check (auth.role() = 'authenticated');

create policy "admin_all_reviews"
  on reviews for all using (auth.role() = 'authenticated');

-- ── FIX: DISTINGUISH ADMIN FROM GUEST IN RLS ──────────────────
-- schema.sql's original "admin_all_*" policies check
-- auth.role() = 'authenticated', which is true for ANY logged-in
-- user — admin or guest. That was fine when only the admin ever
-- signed in, but now that mobile guests get real accounts via
-- Supabase Auth too, those policies would let any guest read/write
-- every apartment, booking, and blocked date. Locking that down:

alter table profiles add column if not exists is_admin boolean default false;

-- Mark your existing admin user as admin. If your admin's email is
-- different from this default, update the email below before running.
update profiles set is_admin = true
where email = 'admin@alvissuite.com';

create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- Replace the over-broad admin policies from schema.sql
drop policy if exists "admin_all_apartments" on apartments;
create policy "admin_all_apartments"
  on apartments for all using (public.is_admin());

drop policy if exists "admin_all_blocked_dates" on blocked_dates;
create policy "admin_all_blocked_dates"
  on blocked_dates for all using (public.is_admin());

drop policy if exists "admin_all_bookings" on bookings;
create policy "admin_all_bookings"
  on bookings for all using (public.is_admin());

-- Guests can read their own bookings (by user_id) and the public
-- insert policy from schema.sql already allows creating one
-- (guest checkout with or without an account).
create policy "guests_read_own_bookings"
  on bookings for select using (auth.uid() = user_id);

create policy "guests_insert_own_bookings"
  on bookings for insert with check (auth.uid() = user_id or user_id is null);

-- Update the profiles admin-read policy from earlier in this file
-- to use the same real admin check instead of "any authenticated user".
drop policy if exists "admin_read_all_profiles" on profiles;
create policy "admin_read_all_profiles"
  on profiles for select using (public.is_admin());

-- Same fix for offers/reviews admin policies defined above.
drop policy if exists "admin_all_offers" on offers;
create policy "admin_all_offers"
  on offers for all using (public.is_admin());

drop policy if exists "admin_all_reviews" on reviews;
create policy "admin_all_reviews"
  on reviews for all using (public.is_admin());

drop policy if exists "authenticated_insert_reviews" on reviews;
create policy "authenticated_insert_reviews"
  on reviews for insert with check (auth.uid() is not null);

-- ── REFRESH bookings_detail VIEW ──────────────────────────────
-- Recreated to include the new mobile-facing columns.
drop view if exists bookings_detail;
create or replace view bookings_detail as
  select
    b.*,
    a.name       as apartment_name,
    a.location   as apartment_location,
    a.price_per_night,
    a.city, a.country, a.neighborhood
  from bookings b
  join apartments a on a.id = b.apartment_id
  order by b.created_at desc;

-- ── REPLACE SEED DATA WITH THE REAL ALVIS SUITE PROPERTIES ────
-- The original schema.sql seeded 4 placeholder Dubai/Karachi rows
-- for early UI development. Deleting them here and replacing with
-- the 8 real Lahore/Islamabad properties from the mobile app's
-- mockData.ts — these are the actual listings, matched to their
-- bundled photo folders via `local_asset_key`.
--
-- NOTE: this deletes any bookings/blocked_dates tied to the old
-- placeholder apartments too (cascades). If you've already taken
-- real bookings against the placeholder data, back it up first.
delete from apartments
  where slug in ('obsidian-studio','marina-noir-1br','penthouse-gulberg','clifton-sea-suite');

insert into apartments
  (name, slug, description, location, price_per_night, bedrooms, bathrooms, max_guests,
   amenities, images, is_active, city, country, neighborhood, floor, property_type,
   rating, review_count, is_featured, cancellation_policy, min_stay,
   checkin_time, checkout_time, house_rules, local_asset_key)
values
(
  'Goldcrest Mall - Luxury 3-Bed Suite', 'goldcrest-1111-3bed',
  'A spacious three-bedroom suite at Goldcrest Mall with premium finishes throughout. Ideal for families or groups, featuring a full kitchen, generous living space, and Alvis Suite signature comfort in the heart of Lahore.',
  'Goldcrest Mall, Lahore, Pakistan', 55000.00, 3, 3, 6,
  array['WiFi','Kitchen','Parking','AC','Generator','Security','Gym'], '{}', true,
  'Lahore','Pakistan','Goldcrest Mall', 11, '3br', 4.9, 34, true, 'moderate', 2,
  '15:00','11:00',
  array['No smoking indoors','No loud music after 10pm','Max 6 guests','No parties'],
  '1111 3 Bed'
),
(
  'Goldcrest Mall - Classic One-Bed Suite', 'goldcrest-1125-1br',
  'A refined one-bedroom suite at Goldcrest Mall offering timeless elegance and everyday comfort. Thoughtfully furnished with a separate bedroom, modern kitchen, and a calm atmosphere for business or leisure stays.',
  'Goldcrest Mall, Lahore, Pakistan', 24000.00, 1, 1, 3,
  array['WiFi','Kitchen','Parking','AC','Generator','Security'], '{}', true,
  'Lahore','Pakistan','Goldcrest Mall', 11, '1br', 4.8, 47, false, 'flexible', 1,
  '15:00','11:00',
  array['No smoking','No pets','Quiet hours 11pm–7am'],
  '1125'
),
(
  'Goldcrest Mall - Deluxe One-Bed Suite', 'goldcrest-618-1br',
  'An elevated one-bedroom experience at Goldcrest Mall with deluxe furnishings and enhanced amenities. Perfect for guests who want extra space and polish without compromising on location or convenience.',
  'Goldcrest Mall, Lahore, Pakistan', 28000.00, 1, 1, 3,
  array['WiFi','Kitchen','Parking','AC','Generator','Security','Gym'], '{}', true,
  'Lahore','Pakistan','Goldcrest Mall', 6, '1br', 4.8, 39, true, 'flexible', 1,
  '15:00','11:00',
  array['No smoking','No pets','Quiet hours 11pm–7am'],
  '618'
),
(
  'Goldcrest Mall - Executive Penthouse Suite', 'goldcrest-1321-penthouse',
  'A commanding executive penthouse at Goldcrest Mall with sweeping views and expansive living areas. Designed for discerning guests who expect the finest finishes, privacy, and a truly elevated Lahore stay.',
  'Goldcrest Mall, Lahore, Pakistan', 52000.00, 2, 2, 5,
  array['WiFi','Kitchen','Parking','AC','Generator','Security','Rooftop','Gym'], '{}', true,
  'Lahore','Pakistan','Goldcrest Mall', 13, 'penthouse', 4.9, 29, true, 'moderate', 2,
  '15:00','11:00',
  array['No smoking indoors','No loud music after 10pm','Max 5 guests','No parties'],
  '1321'
),
(
  'Goldcrest Mall - Vintage Penthouse Suite', 'goldcrest-1302-penthouse',
  'A character-rich vintage penthouse at Goldcrest Mall blending classic charm with modern luxury. Spacious interiors, curated décor, and panoramic Lahore views make this a standout choice for extended stays.',
  'Goldcrest Mall, Lahore, Pakistan', 45000.00, 2, 2, 4,
  array['WiFi','Kitchen','Parking','AC','Generator','Security','Rooftop'], '{}', true,
  'Lahore','Pakistan','Goldcrest Mall', 13, 'penthouse', 4.9, 38, true, 'moderate', 2,
  '15:00','11:00',
  array['No smoking indoors','No loud music after 10pm','Max 4 guests','No parties'],
  '1302 Penthouse'
),
(
  'Penta Square - Executive Studio Suite', 'penta-309-studio',
  'A polished executive studio at Penta Square with smart layout and premium touches throughout. Open-plan living, quality bedding, and a fully equipped kitchenette — ideal for solo travellers or couples in Lahore.',
  'Penta Square, Lahore, Pakistan', 18000.00, 0, 1, 2,
  array['WiFi','Kitchen','Parking','AC','Generator','Security'], '{}', true,
  'Lahore','Pakistan','Penta Square', 3, 'studio', 4.8, 52, true, 'flexible', 1,
  '15:00','11:00',
  array['No smoking','No pets','Quiet hours 11pm–7am'],
  '309 Studio'
),
(
  'Penta Square - Classic Studio Suite', 'penta-305-studio',
  'A bright classic studio at Penta Square offering Alvis Suite comfort at an accessible price. Clean design, reliable amenities, and a peaceful atmosphere — perfect for business trips or weekend getaways.',
  'Penta Square, Lahore, Pakistan', 16000.00, 0, 1, 2,
  array['WiFi','Kitchen','Parking','AC','Generator','Security'], '{}', true,
  'Lahore','Pakistan','Penta Square', 3, 'studio', 4.7, 41, false, 'flexible', 1,
  '15:00','11:00',
  array['No smoking','No pets','Quiet hours 11pm–7am'],
  '305 Studio'
),
(
  'Skypark One - Premium Two-Bed Suite', 'skypark-417-2br',
  'A premium two-bedroom suite at Skypark One in One Capital Park, Islamabad. Contemporary design, floor-to-ceiling views, and full Alvis Suite amenities — ideal for families, business travellers, or extended stays in the capital.',
  'Skypark One, One Capital Park, Islamabad, Pakistan', 32000.00, 2, 2, 4,
  array['WiFi','Kitchen','Parking','AC','Generator','Security','Gym'], '{}', true,
  'Islamabad','Pakistan','Skypark One, One Capital Park', 4, '2br', 4.9, 22, true, 'moderate', 1,
  '15:00','11:00',
  array['No smoking indoors','No loud music after 10pm','Max 4 guests','No parties'],
  '417'
);

-- ── SEED OFFERS ───────────────────────────────────────────────
insert into offers (title, description, discount_type, discount_value, code, valid_until, min_booking, is_featured) values
('20% off all Lahore suites', 'Book by December 15th for stays in December and January', 'percent', 20, 'LAHORE20', '2025-12-15', 50000, true),
('Early bird — 15% off', 'Book 30+ days in advance and save automatically', 'percent', 15, null, '2026-03-31', 0, false),
('Extended stay discount', '7+ nights in any Alvis Suite property in Lahore', 'percent', 10, 'STAY7', '2026-01-31', 100000, false);

-- ── SEED REVIEWS ──────────────────────────────────────────────
insert into reviews (apartment_id, guest_name, rating, comment, created_at)
select id, 'Ahmed K.', 5, 'The Vintage Penthouse at Goldcrest Mall exceeded every expectation. Spotless, beautifully furnished, and the Lahore skyline view is breathtaking.', '2025-11-01'
from apartments where slug = 'goldcrest-1302-penthouse'
union all
select id, 'Fatima R.', 5, 'Executive Studio at Penta Square was perfect for our weekend in Lahore. Clean, quiet, and check-in was completely seamless.', '2025-10-01'
from apartments where slug = 'penta-309-studio'
union all
select id, 'Omar S.', 5, 'The Luxury 3-Bed Suite at Goldcrest Mall comfortably fit our family of five. Spacious, well-equipped, and impeccably maintained.', '2025-10-01'
from apartments where slug = 'goldcrest-1111-3bed'
union all
select id, 'Sana M.', 4, 'Deluxe One-Bed at Goldcrest Mall had everything we needed. Great location inside the mall complex and very responsive host team.', '2025-09-01'
from apartments where slug = 'goldcrest-618-1br'
union all
select id, 'Hassan T.', 5, 'Skypark One in Islamabad is exceptional. Spacious two-bed layout, immaculate interiors, and a prime One Capital Park location.', '2025-11-01'
from apartments where slug = 'skypark-417-2br';
