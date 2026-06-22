import { createClient } from '@/utils/supabase/server'
import { BarbeirosClient } from './barbeiros-client'

export default async function BarbeirosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user!.id)
    .single()

  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <BarbeirosClient barbers={barbers ?? []} />
    </div>
  )
}