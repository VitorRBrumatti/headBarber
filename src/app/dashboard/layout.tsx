import { createClient } from "@/utils/supabase/server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Buscar o perfil do usuário para o nome da barbearia
  let barbershopName = "Barbearia X"
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershops(name)')
      .eq('id', user.id)
      .single()
      
    // @ts-ignore
    if (profile?.barbershops?.name) {
      // @ts-ignore
      barbershopName = profile.barbershops.name
    }
  }

  return (
    <DashboardShell
      userEmail={user?.email || 'Usuário'}
      barbershopName={barbershopName}
    >
      {children}
    </DashboardShell>
  )
}
