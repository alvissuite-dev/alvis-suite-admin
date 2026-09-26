-- ============================================================
-- ALVIS SUITE — MIGRATION 03: Join bookings with profiles for phone
-- Run this in Supabase SQL Editor after migration_02_mobile_model.sql
-- This updates the bookings_detail view to join with profiles table
-- to retrieve the user's registered phone number from sign-up
-- ============================================================

-- ── UPDATE bookings_detail VIEW TO JOIN WITH PROFILES ───────────
-- This recreates the view to include phone number from user profiles
-- The view now prioritizes profile phone over booking guest_phone
-- Uses COALESCE to safely handle null values and preserve b.* structure
drop view if exists bookings_detail;
create or replace view bookings_detail as
  select
    b.*,
    -- Use profile phone if available, otherwise use booking guest_phone
    -- COALESCE safely handles null values from both sources
    coalesce(p.phone, b.guest_phone) as guest_phone,
    a.name       as apartment_name,
    a.location   as apartment_location,
    a.price_per_night,
    a.city, a.country, a.neighborhood
  from bookings b
  left join profiles p on p.id = b.user_id
  join apartments a on a.id = b.apartment_id
  order by b.created_at desc;

-- ── UPDATE EXISTING BOOKINGS WITH PROFILE PHONE NUMBERS ───────────
-- For existing bookings that have a user_id but missing guest_phone,
-- update them with the phone number from the user's profile
update bookings
set guest_phone = (
  select phone from profiles 
  where profiles.id = bookings.user_id 
  and profiles.phone is not null 
  and profiles.phone != ''
)
where user_id is not null 
and (guest_phone is null or guest_phone = '')
and exists (
  select 1 from profiles 
  where profiles.id = bookings.user_id 
  and profiles.phone is not null 
  and profiles.phone != ''
);