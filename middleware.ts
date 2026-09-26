import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes under /admin that do NOT require a session (the login page itself).
const PUBLIC_ADMIN_PATHS = ['/admin/login']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Re-validates the JWT against Supabase Auth rather than trusting the
  // cookie blindly — required for middleware per Supabase's SSR guidance.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAdminRoute  = pathname.startsWith('/admin')
  const isPublicAdmin = PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))

  // Not logged in and hitting a protected admin route → send to login.
  if (isAdminRoute && !isPublicAdmin && !user) {
    const redirectUrl = new URL('/admin/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Already logged in and hitting the login page → send to dashboard.
  if (isPublicAdmin && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
