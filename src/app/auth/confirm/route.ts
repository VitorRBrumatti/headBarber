import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // Redireciona para onde o usuário pretendia ir (ou para o dashboard por padrão)
      return NextResponse.redirect(new URL(`/${next.slice(1)}`, request.url))
    }
  }

  // Redireciona para a página de login com erro
  return NextResponse.redirect(new URL('/login?error=InvalidToken', request.url))
}
