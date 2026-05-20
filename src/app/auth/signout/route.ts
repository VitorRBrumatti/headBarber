import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verifica se há sessão ativa antes de fazer o sign out
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
  }

  // Redireciona para a home
  return NextResponse.redirect(new URL('/', request.url))
}
