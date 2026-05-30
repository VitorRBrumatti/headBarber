'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="bg-amber-500 p-2.5 rounded-xl">
            <Scissors className="w-6 h-6 text-black" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">HeadBarber</span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">Bem-vindo!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Vamos configurar sua barbearia
          </h1>
          <p className="text-zinc-400 mb-8">
            Esta é a última etapa. Dê um nome para sua barbearia e você estará pronto para começar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Nome da barbearia
              </label>
              <Input
                type="text"
                placeholder="Ex: Barbearia do João"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full h-12 text-base bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {loading ? 'Configurando...' : 'Entrar no Dashboard →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
