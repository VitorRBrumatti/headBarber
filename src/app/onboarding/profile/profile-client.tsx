'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BookingProfile } from '@/lib/booking-profile'
import { BookingProfileForm } from '@/app/dashboard/configuracoes/booking-profile-form'

export function OnboardingProfile({ profile }: { profile: BookingProfile | null }) {
  const router = useRouter()
  return (
    <main className="min-h-dvh bg-[#f6f5f2] px-4 py-10 text-[#242321]">
      <div className="mx-auto max-w-[760px]">
        <Link href="/" className="mb-8 inline-block text-lg font-bold">Head<span className="text-[#906923]">Barber</span></Link>
        <h1 className="mb-3 font-montserrat text-2xl font-bold">Personalize seu agendamento</h1>
        <p className="mb-7 max-w-xl text-sm leading-6 text-[#625f59]">
          Sua barbearia já foi criada. Foto, banner e endereço são opcionais e podem ser alterados depois em Configurações → Perfil público.
        </p>
        <BookingProfileForm profile={profile} submitLabel="Concluir e entrar no painel" onSaved={() => { router.push('/dashboard'); router.refresh() }} />
        <Link href="/dashboard" className="mt-6 inline-block min-h-11 py-3 text-sm text-[#795a29] underline underline-offset-4">Configurar depois</Link>
      </div>
    </main>
  )
}
