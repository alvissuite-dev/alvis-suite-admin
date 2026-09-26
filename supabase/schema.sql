-- ============================================================
-- ALVIS SUITE — SUPABASE SCHEMA
-- Run this entire block in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ── APARTMENTS ───────────────────────────────────────────────
create table apartments (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,
  description     text,
  location        text not null,
  price_per_night numeric(10,2) not null,
  bedrooms        int  not null default 1,
  bathrooms       int  not null default 1,
  max_guests      int  not null default 2,
  amenities       text[] default '{}',
  images          text[] default '{}',
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ── BLOCKED DATES ────────────────────────────────────────────
create table blocked_dates (
  id            uuid primary key default uuid_generate_v4(),
  apartment_id  uuid not null references apartments(id) on delete cascade,
  blocked_date  date not null,
  reason        text,
  unique(apartment_id, blocked_date)
);

-- ── BOOKINGS ─────────────────────────────────────────────────
create table bookings (
  id               uuid primary key default uuid_generate_v4(),
  apartment_id     uuid not null references apartments(id) on delete restrict,
  guest_name       text not null,
  guest_email      text not null,
  guest_phone      text,
  check_in         date not null,
  check_out        date not null,
  num_guests       int  not null default 1,
  num_nights       int  generated always as (check_out - check_in) stored,
  total_price      numeric(10,2) not null,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','cancelled')),
  special_requests text,
  created_at       timestamptz default now(),
  constraint no_overlap exclude using gist (
    apartment_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status != 'cancelled')
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table apartments   enable row level security;
alter table blocked_dates enable row level security;
alter table bookings     enable row level security;

-- Public read active apartments
create policy "public_read_apartments"
  on apartments for select using (is_active = true);

-- Public read blocked dates
create policy "public_read_blocked_dates"
  on blocked_dates for select using (true);

-- Public can create bookings
create policy "public_insert_bookings"
  on bookings for insert with check (true);

-- Admin full access (authenticated user)
create policy "admin_all_apartments"
  on apartments for all using (auth.role() = 'authenticated');

create policy "admin_all_blocked_dates"
  on blocked_dates for all using (auth.role() = 'authenticated');

create policy "admin_all_bookings"
  on bookings for all using (auth.role() = 'authenticated');

-- ── USEFUL VIEW ───────────────────────────────────────────────
create or replace view bookings_detail as
  select
    b.*,
    a.name     as apartment_name,
    a.location as apartment_location,
    a.price_per_night
  from bookings b
  join apartments a on a.id = b.apartment_id
  order by b.created_at desc;

-- ── SEED DATA ─────────────────────────────────────────────────
insert into apartments (name, slug, description, location, price_per_night, bedrooms, bathrooms, max_guests, amenities, images) values
(
  'The Obsidian Studio', 'obsidian-studio',
  'A sleek minimalist studio wrapped in dark marble and walnut. Floor-to-ceiling windows reveal the city skyline.',
  'Downtown Dubai, UAE', 320.00, 0, 1, 2,
  array['High-speed WiFi','Smart TV','Espresso machine','Gym access','Concierge','City view','Keyless entry'],
  array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80']
),
(
  'Marina Noir 1BR', 'marina-noir-1br',
  'One-bedroom sanctuary perched above Dubai Marina with panoramic water views from the private balcony.',
  'Dubai Marina, UAE', 580.00, 1, 1, 3,
  array['High-speed WiFi','Smart TV','Full kitchen','Private balcony','Marina view','Pool access','Gym','Parking'],
  array['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80']
),
(
  'The Penthouse — Gulberg', 'penthouse-gulberg',
  'Three bedrooms, a private rooftop terrace, and interiors that blend heritage craftsmanship with contemporary luxury.',
  'Gulberg III, Lahore, PK', 28000.00, 3, 3, 6,
  array['High-speed WiFi','Smart TVs','Full kitchen','Private rooftop','Generator backup','Dedicated staff','Secure parking'],
  array['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80','https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80']
),
(
  'Clifton Sea Suite 2BR', 'clifton-sea-suite',
  'Wake to the Arabian Sea. Two bedrooms, full kitchen, walking distance to Clifton promenade.',
  'Clifton, Karachi, PK', 18000.00, 2, 2, 4,
  array['High-speed WiFi','Smart TV','Full kitchen','Sea view','Generator backup','Air conditioning','Secure parking'],
  array['https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&q=80','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80']
);
