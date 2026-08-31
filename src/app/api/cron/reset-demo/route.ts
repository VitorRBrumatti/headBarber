import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getConfiguredDemo } from '@/lib/demo-server'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const demo = await getConfiguredDemo(supabase)
    const { error } = await supabase.rpc('reset_demo_activity', {
      p_barbershop_id: demo.barbershop_id,
    })
    if (error) throw error
    return NextResponse.json({ ok: true, reset: 1 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    console.error('Demo reset blocked: unavailable or inconsistent demo configuration')
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
