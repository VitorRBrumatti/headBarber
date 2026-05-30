import { getBarbershopSettings } from './actions'
import { ConfiguracoesClient } from './configuracoes-client'
import { createClient } from '@/utils/supabase/server'

export default async function ConfiguracoesPage() {
  const settings = await getBarbershopSettings()

  // Fetch active barbers for exceptional calendar blocking dropdown
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let barbers: { id: string; name: string }[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profile?.barbershop_id) {
      const { data: activeBarbers } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', profile.barbershop_id)
        .eq('is_active', true)
        .order('name')
      
      barbers = activeBarbers || []
    }
  }

  return (
    <div className="space-y-6">
      <ConfiguracoesClient initialSettings={settings} barbers={barbers} />
    </div>
  )
}