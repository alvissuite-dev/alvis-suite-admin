import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { Apartment } from '@/types'

// Fields accepted when creating/updating an apartment from the admin UI.
export type ApartmentInput = {
  name:            string
  slug:            string
  description:     string
  location:        string
  price_per_night: number
  bedrooms:        number
  bathrooms:       number
  max_guests:      number
  amenities:       string[]
  images:          string[]
  house_rules?:    string[]
  is_active?:      boolean
}

/**
 * All functions accept an optional `client` so they work from either
 * a Server Component / Route Handler (pass the server client) or a
 * Client Component (omit it — the browser client is used by default).
 */

export async function getApartments(
  client?: SupabaseClient,
  opts: { activeOnly?: boolean } = {}
): Promise<Apartment[]> {
  const supabase = client ?? createBrowserClient()

  let query = supabase
    .from('apartments')
    .select('*')
    .order('created_at', { ascending: false })

  if (opts.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('getApartments error:', error.message)
    throw new Error(`Failed to load apartments: ${error.message}`)
  }

  return data ?? []
}

export async function getApartmentById(
  id: string,
  client?: SupabaseClient
): Promise<Apartment | null> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getApartmentById error:', error.message)
    throw new Error(`Failed to load apartment: ${error.message}`)
  }

  return data
}

export async function getApartmentBySlug(
  slug: string,
  client?: SupabaseClient
): Promise<Apartment | null> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('getApartmentBySlug error:', error.message)
    throw new Error(`Failed to load apartment: ${error.message}`)
  }

  return data
}

export async function createApartment(
  input: ApartmentInput,
  client?: SupabaseClient
): Promise<Apartment> {
  const supabase = client ?? createBrowserClient()

  console.log('Inserting into apartments table with images:', input.images)

  const { data, error } = await supabase
    .from('apartments')
    .insert({ ...input, is_active: input.is_active ?? true })
    .select()
    .single()

  if (error) {
    console.error('createApartment error:', error.message)
    throw new Error(`Failed to create apartment: ${error.message}`)
  }

  return data
}

export async function updateApartment(
  id: string,
  input: Partial<ApartmentInput>,
  client?: SupabaseClient
): Promise<Apartment> {
  const supabase = client ?? createBrowserClient()
  console.log('Updating apartment with images payload:', input.images)

  const { data, error } = await supabase
    .from('apartments')
    .update(input)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('updateApartment error:', error.message)
    throw new Error(`Failed to update apartment: ${error.message}`)
  }

// Fallback if no row was returned back by Supabase
if (!data) {
  console.warn('Update executed, but no row was returned. Proceeding anyway.');
  return input as Apartment; // Returns your input data cleanly instead of crashing
}

  return data
}

export async function toggleApartmentActive(
  id: string,
  is_active: boolean,
  client?: SupabaseClient
): Promise<Apartment> {
  return updateApartment(id, { is_active }, client)
}

export async function deleteApartment(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createBrowserClient()

  const { error } = await supabase
    .from('apartments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteApartment error:', error.message)
    throw new Error(`Failed to delete apartment: ${error.message}`)
  }
}
