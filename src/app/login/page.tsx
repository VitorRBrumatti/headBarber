'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, Sparkles, AlertTriangle, Info, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfigGuide, setShowConfigGuide] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowConfigGuide(false)

    const supabase = createClient()
    const defaultPassword = 'testing_password_123'

    // 1. Tenta fazer login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: defaultPassword,
    })

    if (signInError) {
      // 2. Tenta fazer o sign up (cadastro) automático
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: defaultPassword,
      })

      if (signUpError) {
        if (signUpError.message.includes('confirmation email') || signUpError.message.includes('email_provider_disabled')) {
          setError('Erro de confirmação de e-mail ativo no Supabase.')
          setShowConfigGuide(true)
        } else {
          setError(`Erro ao criar conta de teste: ${signUpError.message}`)
        }
        setLoading(false)
        return
      }

      // 3. Tenta conectar novamente após o cadastro automático
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password: defaultPassword,
      })

      if (retryError) {
        setError(`Erro ao conectar: ${retryError.message}`)
        setLoading(false)
        return
      }
    }

    // Sucesso! Redireciona
    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="bg-amber-500 p-2.5 rounded-xl">
              <Scissors className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">HeadBarber</span>
          </Link>
          <Card className="w-full bg-zinc-900 border-zinc-800 text-white shadow-2xl">
            <CardHeader className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-2xl font-bold text-white">Acessar Sistema</CardTitle>
              </div>
              <CardDescription className="text-zinc-400 text-xs">
                [MODO TESTE ATIVO] Digite qualquer e-mail para entrar ou cadastrar instantaneamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs uppercase font-mono tracking-widest text-zinc-500">Seu E-mail *</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border-zinc-850 text-white placeholder:text-zinc-500 py-6 focus:border-amber-500"
                  />
                </div>
                
                {error && (
                  <div className="text-red-500 text-xs font-semibold bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-left flex items-start gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/10" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Conectando...</span>
                    </div>
                  ) : (
                    'Entrar Instantaneamente'
                  )}
                </Button>
              </form>

              {/* Guia de Configuração Amigável se der erro de e-mail */}
              {showConfigGuide && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left space-y-2.5 transition-all">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                    <HelpCircle className="w-4 h-4" />
                    <span>COMO ATIVAR O LOGIN DE TESTE (10 segundos):</span>
                  </div>
                  
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    O Supabase está exigindo a confirmação de e-mail real para cadastros. Para desligar isso no seu ambiente de testes:
                  </p>
                  
                  <ol className="text-[10px] text-zinc-300 space-y-1.5 font-sans list-decimal list-inside">
                    <li>Abra o painel do seu <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-500 underline font-bold">Supabase Dashboard</a>.</li>
                    <li>Vá no menu **Authentication** (lado esquerdo) &gt; **Providers** &gt; **Email**.</li>
                    <li>Desative a opção **"Confirm email"** (Confirmar e-mail).</li>
                    <li>Clique em **Save** (Salvar) no rodapé do bloco.</li>
                  </ol>
                  
                  <div className="text-[9px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-850 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Alternativa: Crie o usuário manualmente em <i>Authentication &gt; Users &gt; Add User (com Auto-confirm)</i> e use o e-mail cadastrado aqui.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
