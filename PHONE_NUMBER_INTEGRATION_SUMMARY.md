# Phone Number Integration Summary

## Overview
Updated the backend query for the bookings view to join with user profiles/auth table and retrieve the user's registered phone number during sign-up, ensuring it displays correctly in the bookings table for all existing and new bookings.

## Changes Made

### 1. Database Migration (`supabase/migration_03_profile_phone_join.sql`)
- **Updated `bookings_detail` view** to LEFT JOIN with the `profiles` table
- **Added phone number logic**: `coalesce(p.phone, b.guest_phone) as guest_phone`
  - Prioritizes profile phone number over booking guest_phone
  - Falls back to booking guest_phone if profile phone is not available
- **Backfilled existing bookings**: Updated existing bookings that have a user_id but missing guest_phone with phone numbers from user profiles

### 2. Booking Service Updates (`src/services/bookings.ts`)
- **Added import**: `import { getUser } from '@/services/auth'`
- **Enhanced `createBooking` function**:
  - Now attempts to get the authenticated user when creating a booking
  - If user is authenticated, tries to retrieve their profile phone number
  - Uses profile phone as fallback if no phone provided in booking form
  - Sets `user_id` on booking when user is authenticated
  - Gracefully handles cases where user cannot be authenticated (guest bookings)

### 3. TypeScript Type Updates (`src/types/index.ts`)
- **Added `user_id` field** to `Booking` interface
- **Added migration_02 fields**: `arrival_time`, `arrival_note`, `addons`, `promo_code`
- **Added joined fields**: `city`, `country`, `neighborhood` from apartments table

## How It Works

### For New Bookings:
1. When a user creates a booking, the system checks if they're authenticated
2. If authenticated, it retrieves their user profile phone number
3. The booking is created with:
   - `user_id` set to the authenticated user's ID
   - `guest_phone` set to either the form-provided phone or the profile phone (fallback)
4. The `bookings_detail` view will always show the profile phone if available

### For Existing Bookings:
1. The migration script updates existing bookings that have a `user_id` but missing `guest_phone`
2. These bookings are backfilled with phone numbers from their user profiles
3. The `bookings_detail` view now prioritizes profile phone over booking phone

### Display in Admin Panel:
- The bookings table already displays phone numbers (updated in previous task)
- Phone numbers now come from the enhanced `bookings_detail` view
- Admins can see phone numbers for both authenticated users and guest bookings

## Deployment Instructions

### 1. Run Database Migration
Execute the SQL migration in Supabase SQL Editor:
```sql
-- Run the contents of supabase/migration_03_profile_phone_join.sql
```

### 2. Deploy Code Changes
The TypeScript changes are already in place:
- `src/services/bookings.ts` - Enhanced booking creation
- `src/types/index.ts` - Updated type definitions

### 3. Test the Changes
1. **Test authenticated user booking**:
   - Sign in as a user with a profile phone number
   - Create a booking without providing a phone in the form
   - Verify the booking shows the profile phone number

2. **Test guest booking**:
   - Create a booking without signing in
   - Provide a phone number in the form
   - Verify the booking shows the provided phone number

3. **Test existing bookings**:
   - Check that existing bookings from authenticated users now show their profile phone numbers
   - Verify that bookings without user association still show their original phone numbers

## Benefits

1. **Consistent Phone Numbers**: Phone numbers from user profiles are now consistently used across all bookings
2. **Better User Experience**: Users don't need to re-enter their phone number for each booking
3. **Data Quality**: Ensures phone numbers are always available for authenticated users
4. **Backward Compatible**: Guest bookings without user accounts continue to work as before
5. **Admin Visibility**: Admins can always see guest contact information before approval

## Notes

- The system gracefully handles cases where user authentication fails (guest bookings)
- Profile phone numbers take priority over form-provided phone numbers
- Existing bookings are automatically updated with profile phone numbers where available
- The changes are backward compatible with existing guest bookings