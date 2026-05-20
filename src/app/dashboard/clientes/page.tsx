import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user!.id)
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerencie a carteira de clientes cadastrados na sua barbearia."
      />
      <ClientesClient clients={clients ?? []} />
    </div>
  )
}