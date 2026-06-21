'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(`Erro ao enviar solicitação: ${resetError.message}`)
      setLoading(false)
      return
    }

    setMessage('Enviamos as instruções para redefinição no seu e-mail. Verifique sua caixa de entrada!')
    setLoading(false)
    setEmail('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1] p-4 font-sans select-none antialiased">
      <div className="w-full max-w-[440px] space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
        
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
          
          <Card className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="text-left space-y-1.5 p-6 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight text-[#1D1C19]">Recuperar Senha</CardTitle>
              <CardDescription className="text-[#77736A] text-sm leading-normal">
                Informe o seu e-mail de cadastro. Enviaremos um link seguro para você redefinir sua senha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              
              {/* Notificações de Erro e Sucesso */}
              {error && (
                <div className="text-[#B42318] text-xs font-medium bg-[#FEECE9] border border-red-200 p-3 rounded-lg text-left flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="text-[#237A4B] text-xs font-medium bg-[#E7F5EC] border border-green-200 p-3 rounded-lg text-left flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="reset-email" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">E-mail de cadastro</label>
                  <div className="relative">
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] placeholder:text-[#AAA49A] h-11 pl-10 pr-4 rounded-lg focus-visible:ring-2 focus-visible:ring-[#A87935]/20 focus-visible:ring-offset-0 focus-visible:border-[#A87935] hover:border-[#A87935]/50 transition-all duration-150"
                    />
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#AAA49A]" />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#1D1C19] hover:bg-[#35332E] active:bg-[#1D1C19] text-[#FEFCF8] font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 hover:-translate-y-[1px] active:translate-y-0" 
                  disabled={loading}
                >
                  {loading ? 'Enviando instruções...' : 'Recuperar Senha'}
                </Button>
              </form>

              <div className="pt-2 text-center">
                <Link 
                  href="/login" 
                  className="text-xs text-[#77736A] hover:text-[#1D1C19] font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o Login</span>
                </Link>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
