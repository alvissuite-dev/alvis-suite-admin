import type { SupabaseClient, Session, User } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

/**
 * All functions accept an optional `client` so they work from either
 * a Server Component / Route Handler (pass the server client) or a
 * Client Component (omit it — the browser client is used by default).
 */

export async function signIn(
  email: string,
  password: string,
  client?: SupabaseClient
): Promise<{ user: User; session: Session }> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('signIn error:', error.message)
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : error.message
    )
  }

  if (!data.session || !data.user) {
    throw new Error('Sign in succeeded but no session was returned.')
  }

  return { user: data.user, session: data.session }
}

export async function signOut(client?: SupabaseClient): Promise<void> {
  const supabase = client ?? createBrowserClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('signOut error:', error.message)
    throw new Error(`Failed to sign out: ${error.message}`)
  }
}

export async function getSession(
  client?: SupabaseClient
): Promise<Session | null> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('getSession error:', error.message)
    return null
  }

  return data.session
}

// Prefer this over getSession() when you need a verified user (e.g. in
// middleware or server components) — it re-validates the JWT against
// Supabase Auth rather than trusting the local cookie.
export async function getUser(
  client?: SupabaseClient
): Promise<User | null> {
  const supabase = client ?? createBrowserClient()

  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user
}

export async function isAuthenticated(client?: SupabaseClient): Promise<boolean> {
  const user = await getUser(client)
  return !!user
}
