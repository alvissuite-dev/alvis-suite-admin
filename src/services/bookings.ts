import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { getUser } from '@/services/auth'
import type { Booking, BookingFormData, BookingStatus, DashboardStats } from '@/types'

/**
 * All functions accept an optional `client` so they work from either
 * a Server Component / Route Handler (pass the server client) or a
 * Client Component (omit it — the browser client is used by default).
 */

// Reads from the `bookings_detail` view so we get apartment_name /
// apartment_location / price_per_night joined in for free.
export async function getBookings(
  client?: SupabaseClient,
  opts: { status?: BookingStatus } = {}
): Promise<Booking[]> {
  const supabase = client ?? createBrowserClient()

  let query = supabase
    .from('bookings_detail')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('getBookings error:', error.message)
    throw new Error(`Failed to load bookings: ${error.message}`)
  }

  return data ?? []
}

export async function getBookingById(
  id: string,
  client?: SupabaseClient
): Promise<Booking | null> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('bookings_detail')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getBookingById error:', error.message)
    throw new Error(`Failed to load booking: ${error.message}`)
  }

  return data
}

export async function getBookingsForApartment(
  apartmentId: string,
  client?: SupabaseClient
): Promise<Booking[]> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('apartment_id', apartmentId)
    .neq('status', 'cancelled')
    .order('check_in', { ascending: true })

  if (error) {
    console.error('getBookingsForApartment error:', error.message)
    throw new Error(`Failed to load apartment bookings: ${error.message}`)
  }

  return data ?? []
}

/**
 * Creates a booking. Relies on the database's `no_overlap` exclusion
 * constraint as the source of truth for double-booking prevention —
 * if the date range collides with an existing non-cancelled booking,
 * Postgres rejects the insert and we surface a friendly error.
 */
export async function createBooking(
  input: BookingFormData & { total_price: number; loyalty_points_used?: number },
  client?: SupabaseClient
): Promise<Booking> {
  const supabase = client ?? createBrowserClient()

  // Try to get the authenticated user and their profile phone number
  let userPhone = input.guest_phone || null
  let userId = null

  try {
    const user = await getUser(supabase)
    if (user) {
      userId = user.id
      // If no phone provided in form, try to get it from user profile
      if (!userPhone) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileData?.phone) {
          userPhone = profileData.phone
        }
      }
    }
  } catch (err) {
    // If we can't get the user, proceed without user_id and profile phone
    console.log('Could not get authenticated user for booking, proceeding as guest')
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      apartment_id:        input.apartment_id,
      guest_name:          input.guest_name,
      guest_email:         input.guest_email,
      guest_phone:         userPhone,
      user_id:             userId,
      check_in:            input.check_in,
      check_out:           input.check_out,
      num_guests:          input.num_guests,
      total_price:         input.total_price,
      special_requests:    input.special_requests || null,
      loyalty_points_used: input.loyalty_points_used || 0, // <--- Add this line
      status:              'pending',
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('createBooking error:', error.message)
    if (error.code === '23P01') {
      throw new Error('Those dates were just booked by someone else. Please pick different dates.')
    }
    throw new Error(`Failed to create booking: ${error.message}`)
  }

  return data
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  client?: SupabaseClient
): Promise<Booking> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle()
    console.log('UPDATE BOOKING STATUS:', { data, error, id, status })
  if (error) {
    console.error('updateBookingStatus error:', error.message)
    throw new Error(`Failed to update booking status: ${error.message}`)
  }

  return data
}

export async function deleteBooking(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createBrowserClient()

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteBooking error:', error.message)
    throw new Error(`Failed to delete booking: ${error.message}`)
  }
}

/**
 * Computes dashboard stats client-side from the bookings_detail view.
 * Fine at this scale; move to a Postgres RPC/view later if the
 * bookings table grows large.
 */
export async function getDashboardStats(
  client?: SupabaseClient
): Promise<DashboardStats> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('bookings_detail')
    .select('status, total_price, check_in, check_out')

  if (error) {
    console.error('getDashboardStats error:', error.message)
    throw new Error(`Failed to load dashboard stats: ${error.message}`)
  }

  const rows = data ?? []
  const today = new Date().toISOString().slice(0, 10)

  const stats: DashboardStats = {
    total_bookings:     rows.length,
    pending_bookings:   rows.filter(r => r.status === 'pending').length,
    confirmed_bookings: rows.filter(r => r.status === 'confirmed').length,
    total_revenue:      rows
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + Number(r.total_price), 0),
    checkins_today:  rows.filter(r => r.status !== 'cancelled' && r.check_in === today).length,
    checkouts_today: rows.filter(r => r.status !== 'cancelled' && r.check_out === today).length,
  }

  return stats
}
