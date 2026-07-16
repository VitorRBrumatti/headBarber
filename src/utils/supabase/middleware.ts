import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasProductAccess } from '@/lib/plans'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  const isOnboarding = path.startsWith('/onboarding')
  const isPlans = path.startsWith('/plans')
  const isLogin = path.startsWith('/login')

  if ((isDashboard || isOnboarding || isPlans) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (isDashboard || isOnboarding || isPlans || isLogin)) {
    const [{ data: subscription }, { data: profile }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const hasAccess = hasProductAccess(subscription?.status)

    if (!hasAccess && !isPlans) {
      const url = request.nextUrl.clone()
      url.pathname = '/plans'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (hasAccess && (isPlans || isLogin)) {
      const url = request.nextUrl.clone()
      url.pathname = profile?.barbershop_id ? '/dashboard' : '/onboarding'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (hasAccess && isDashboard && !profile?.barbershop_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    if (hasAccess && isOnboarding && profile?.barbershop_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
