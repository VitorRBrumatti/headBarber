import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { AdicionaisClient } from './adicionais-client'

export default async function AdicionaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user!.id)
    .single()

  const { data: addOns } = await supabase
    .from('add_ons')
    .select('*')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adicionais"
        description="Gerencie os serviços extras que podem ser adicionados durante o agendamento."
      />
      <AdicionaisClient addOns={addOns ?? []} />
    </div>
  )
}