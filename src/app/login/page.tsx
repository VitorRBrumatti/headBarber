'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redireciona de volta para a rota base que o middleware interceptará
        emailRedirectTo: `${location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Verifique seu email para o link de acesso!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="bg-primary p-2 rounded-lg">
              <Scissors className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">HeadBarber</span>
          </Link>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Acessar Sistema</CardTitle>
              <CardDescription className="text-center">
                Digite seu email. Nós enviaremos um link mágico para você entrar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                {message && <p className="text-sm text-green-500 text-center font-medium">{message}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Link Mágico'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
