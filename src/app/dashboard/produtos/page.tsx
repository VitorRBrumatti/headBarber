import { createClient } from '@/utils/supabase/server'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user!.id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('barbershop_id', profile!.barbershop_id)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <ProdutosClient products={products ?? []} clients={clients ?? []} />
    </div>
  )
}