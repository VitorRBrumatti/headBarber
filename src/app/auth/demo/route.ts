import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { getConfiguredDemo } from '@/lib/demo-server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return new NextResponse('Origem inválida', { status: 403 })
  }

  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url), 303)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  try {
    // Never replace an existing customer's session with the shared demo.
    const existing = await createClient()
    const { data: { user }, error: sessionError } = await existing.auth.getUser()
    if (user) return redirect('/dashboard')
    if (sessionError && sessionError.name !== 'AuthSessionMissingError') {
      return redirect('/demo?error=unavailable')
    }

    const email = process.env.DEMO_ACCOUNT_EMAIL
    const password = process.env.DEMO_ACCOUNT_PASSWORD
    if (!email || !password) return redirect('/demo?error=unavailable')
    const demo = await getConfiguredDemo()

    // Hold cookies until the authenticated identity has been checked.
    const stagedCookies: { name: string; value: string; options: CookieOptions }[] = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: (values) => { stagedCookies.push(...values) } } },
    )
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session || data.user?.id !== demo.user_id) {
      if (data.session) await supabase.auth.signOut({ scope: 'local' })
      return redirect('/demo?error=unavailable')
    }
    const response = redirect('/dashboard')
    for (const { name, value, options } of stagedCookies) {
      response.cookies.set(name, value, options)
    }
    return response
  } catch {
    console.error('Demo entry blocked: unavailable or inconsistent demo configuration')
    return redirect('/demo?error=unavailable')
  }
}
