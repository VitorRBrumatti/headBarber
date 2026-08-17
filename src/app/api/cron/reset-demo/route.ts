import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('demo_mode', true)
    .not('barbershop_id', 'is', null)

  if (profilesError) {
    console.error('Demo reset lookup failed:', profilesError.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const barbershopIds = [...new Set((profiles ?? []).map((profile) => profile.barbershop_id))]
  for (const barbershopId of barbershopIds) {
    const { error } = await supabase.rpc('reset_demo_activity', {
      p_barbershop_id: barbershopId,
    })
    if (error) {
      console.error(`Demo reset failed for ${barbershopId}:`, error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, reset: barbershopIds.length })
}
