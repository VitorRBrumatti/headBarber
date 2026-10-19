import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getBarbershopBookingProfile } from '@/app/dashboard/configuracoes/actions'
import { OnboardingProfile } from './profile-client'

export default async function OnboardingProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles')
    .select('barbershop_id, role, demo_mode').eq('id', user.id).single()
  if (!profile?.barbershop_id) redirect('/onboarding')
  if (profile.role !== 'owner' || profile.demo_mode) redirect('/dashboard')
  const bookingProfile = await getBarbershopBookingProfile()
  return <OnboardingProfile profile={bookingProfile} />
}
