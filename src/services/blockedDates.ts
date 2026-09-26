import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { BlockedDate } from '@/types'

/**
 * All functions accept an optional `client` so they work from either
 * a Server Component / Route Handler (pass the server client) or a
 * Client Component (omit it — the browser client is used by default).
 */

export async function getBlockedDates(
  client?: SupabaseClient
): Promise<BlockedDate[]> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('blocked_date', { ascending: true })

  if (error) {
    console.error('getBlockedDates error:', error.message)
    throw new Error(`Failed to load blocked dates: ${error.message}`)
  }

  return data ?? []
}

export async function getBlockedDatesForApartment(
  apartmentId: string,
  client?: SupabaseClient
): Promise<BlockedDate[]> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .eq('apartment_id', apartmentId)
    .order('blocked_date', { ascending: true })

  if (error) {
    console.error('getBlockedDatesForApartment error:', error.message)
    throw new Error(`Failed to load blocked dates: ${error.message}`)
  }

  return data ?? []
}

export async function blockDate(
  apartmentId: string,
  date: string,
  reason: string | null,
  client?: SupabaseClient
): Promise<BlockedDate> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ apartment_id: apartmentId, blocked_date: date, reason })
    .select()
    .single()

  if (error) {
    console.error('blockDate error:', error.message)
    if (error.code === '23505') {
      throw new Error('That date is already blocked for this apartment.')
    }
    throw new Error(`Failed to block date: ${error.message}`)
  }

  return data
}

// Convenience helper for blocking a contiguous range (e.g. maintenance week)
// in one call — inserts one row per date.
export async function blockDateRange(
  apartmentId: string,
  startDate: string,
  endDate: string,
  reason: string | null,
  client?: SupabaseClient
): Promise<BlockedDate[]> {
  const supabase = client ?? createBrowserClient()

  const dates: string[] = []
  const cursor = new Date(startDate)
  const end = new Date(endDate)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  const { data, error } = await supabase
    .from('blocked_dates')
    .insert(dates.map(d => ({ apartment_id: apartmentId, blocked_date: d, reason })))
    .select()

  if (error) {
    console.error('blockDateRange error:', error.message)
    throw new Error(`Failed to block date range: ${error.message}`)
  }

  return data ?? []
}

export async function unblockDate(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createBrowserClient()

  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('unblockDate error:', error.message)
    throw new Error(`Failed to unblock date: ${error.message}`)
  }
}
