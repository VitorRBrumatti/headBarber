import { createClient } from '@/utils/supabase/server'
import { ServicesClient } from './services-client'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user!.id)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <ServicesClient services={services ?? []} />
    </div>
  )
}