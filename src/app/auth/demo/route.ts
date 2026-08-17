import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')

  if (origin && new URL(origin).origin !== requestUrl.origin) {
    return new NextResponse('Origem inválida', { status: 403 })
  }

  const email = process.env.DEMO_ACCOUNT_EMAIL
  const password = process.env.DEMO_ACCOUNT_PASSWORD

  if (!email || !password) {
    return NextResponse.redirect(new URL('/demo?error=unavailable', request.url), 303)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('Demo sign-in failed:', error.message)
    return NextResponse.redirect(new URL('/demo?error=unavailable', request.url), 303)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url), 303)
}
