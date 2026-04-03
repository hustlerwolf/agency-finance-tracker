import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessPath, getFirstAllowedRoute } from '@/lib/modules'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // refreshing the auth token
  await supabase.auth.getUser()

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    // Redirect to appropriate landing page based on role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, allowed_modules')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.role === 'admin' || !profile) {
      url.pathname = '/dashboard'
    } else {
      url.pathname = getFirstAllowedRoute(profile.allowed_modules ?? [])
    }
    return NextResponse.redirect(url)
  }

  // ── Module access check ──
  if (user && !isLoginPage) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, allowed_modules')
      .eq('id', user.id)
      .single()

    // If query fails (RLS issue, no profile), allow access to avoid locking users out
    if (!error && profile) {
      const role = profile.role
      const allowedModules: string[] = profile.allowed_modules ?? []

      if (!canAccessPath(request.nextUrl.pathname, role, allowedModules)) {
        const url = request.nextUrl.clone()
        url.pathname = role === 'admin' ? '/dashboard' : getFirstAllowedRoute(allowedModules)
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}