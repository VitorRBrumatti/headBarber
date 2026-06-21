'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // UI States
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('A nova senha deve conter pelo menos 8 caracteres.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError(`Erro ao atualizar senha: ${updateError.message}`)
      setLoading(false)
      return
    }

    setMessage('Senha redefinida com sucesso! Você será redirecionado para o dashboard em instantes.')
    setLoading(false)

    // Redireciona após 2.5 segundos
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2500)
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
              <CardTitle className="text-xl font-semibold tracking-tight text-[#1D1C19]">Nova Senha</CardTitle>
              <CardDescription className="text-[#77736A] text-sm leading-normal">
                Defina uma nova senha de acesso segura para a sua conta.
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

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="reset-new-password" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">Nova Senha</label>
                  <div className="relative">
                    <Input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] placeholder:text-[#AAA49A] h-11 pl-10 pr-10 rounded-lg focus-visible:ring-2 focus-visible:ring-[#A87935]/20 focus-visible:ring-offset-0 focus-visible:border-[#A87935] hover:border-[#A87935]/50 transition-all duration-150"
                    />
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#AAA49A]" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-[#AAA49A] hover:text-[#1D1C19] cursor-pointer"
                      aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label htmlFor="reset-confirm-password" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Input
                      id="reset-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] placeholder:text-[#AAA49A] h-11 pl-10 pr-10 rounded-lg focus-visible:ring-2 focus-visible:ring-[#A87935]/20 focus-visible:ring-offset-0 focus-visible:border-[#A87935] hover:border-[#A87935]/50 transition-all duration-150"
                    />
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#AAA49A]" />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#1D1C19] hover:bg-[#35332E] active:bg-[#1D1C19] text-[#FEFCF8] font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 hover:-translate-y-[1px] active:translate-y-0" 
                  disabled={loading}
                >
                  {loading ? 'Redefinindo senha...' : 'Confirmar Nova Senha'}
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
