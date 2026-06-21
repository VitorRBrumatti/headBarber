'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, ArrowRight, Store, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sessão expirada. Faça login novamente.')
      setLoading(false)
      return
    }

    // 1. Criar a barbearia
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: shop, error: shopErr } = await supabase
      .from('barbershops')
      .insert({ name: name.trim(), slug: `${slug}-${Date.now()}` })
      .select()
      .single()

    if (shopErr) {
      setError('Erro ao criar barbearia: ' + shopErr.message)
      setLoading(false)
      return
    }

    // 2. Associar o usuário à barbearia
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ barbershop_id: shop.id, role: 'owner' })
      .eq('id', user.id)

    if (profileErr) {
      setError('Erro ao configurar perfil: ' + profileErr.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-[480px] space-y-6">
        
        {/* Logo superior */}
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2.5 mb-6 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-[#1D1C19] rounded-lg flex items-center justify-center shadow-sm">
              <img 
                src="/brand/logo-symbol.png" 
                alt="Logo HeadBarber" 
                className="w-5.5 h-5.5 object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1D1C19]">
              Head<span className="text-[#A87935]">Barber</span>
            </span>
          </Link>

          {/* Card */}
          <div className="bg-[#FEFCF8] border border-[#DEDAD2] rounded-xl p-8 shadow-sm w-full text-[#1D1C19]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#A87935]" />
              <span className="text-xs font-semibold text-[#A87935] uppercase tracking-wider">Bem-vindo!</span>
            </div>
            
            <h1 className="text-xl font-semibold tracking-tight text-[#1D1C19] mb-2">
              Vamos configurar sua barbearia
            </h1>
            <p className="text-[#77736A] text-sm leading-normal mb-6">
              Esta é a última etapa. Escolha um nome para sua barbearia para criar seu ambiente de agendamentos e acessar o painel administrativo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold tracking-wider text-[#77736A] uppercase">
                  Nome da barbearia
                </label>
                <div className="relative">
                  <Input
                    name="name"
                    type="text"
                    placeholder="Ex: Barbearia Imperial"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] placeholder:text-[#AAA49A] h-11 pl-10 pr-4 rounded-lg focus-visible:ring-2 focus-visible:ring-[#A87935] focus-visible:ring-offset-2 focus-visible:border-[#A87935] transition-all"
                  />
                  <Store className="absolute left-3.5 top-3.5 w-4 h-4 text-[#AAA49A]" />
                </div>
              </div>

              {error && (
                <div className="text-[#B42318] text-xs font-medium bg-[#FEECE9] border border-red-200 p-3 rounded-lg text-left flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full h-11 bg-[#1D1C19] hover:bg-[#35332E] text-[#FEFCF8] font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Configurando...' : (
                  <>
                    <span>Entrar no Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
