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

  let barbershopName = 'Barbearia X'
  const { data: profile } = await supabase
    .from('profiles')
    .select('demo_mode, barbershops(name)')
    .eq('id', user.id)
    .single()

  const isDemo = profile?.demo_mode === true
  if (!isDemo && !hasProductAccess(subscription?.status)) redirect('/plans')

  const relatedBarbershop = profile?.barbershops as unknown as { name?: string } | null
  if (relatedBarbershop?.name) {
    barbershopName = relatedBarbershop.name
  }

  return (
    <DashboardShell
      userEmail={user.email || 'Usuário'}
      barbershopName={barbershopName}
      isDemo={isDemo}
    >
      {children}
    </DashboardShell>
  )
}
