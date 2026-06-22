import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { hasProductAccess } from '@/lib/plans'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!hasProductAccess(subscription?.status)) redirect('/plans')

  let barbershopName = 'Barbearia X'
  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershops(name)')
    .eq('id', user.id)
    .single()

  const relatedBarbershop = profile?.barbershops as unknown as { name?: string } | null
  if (relatedBarbershop?.name) {
    barbershopName = relatedBarbershop.name
  }

  return (
    <DashboardShell
      userEmail={user.email || 'Usuário'}
      barbershopName={barbershopName}
    >
      {children}
    </DashboardShell>
  )
}
