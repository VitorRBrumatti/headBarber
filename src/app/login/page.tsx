'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type AuthMode = 'login' | 'register' | 'magic-link'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  // UI States
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  // Capturar erros da URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam === 'OAuthFailed') {
        setError('Falha na autenticação com o Google. Tente novamente.')
      } else if (errorParam === 'InvalidToken') {
        setError('O link de acesso expirou ou já foi utilizado. Solicite um novo link.')
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos. Tente novamente.' 
        : `Erro ao entrar: ${signInError.message}`
      )
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (signUpError) {
      setError(`Erro ao criar conta: ${signUpError.message}`)
      setLoading(false)
      return
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError('Este e-mail já está cadastrado. Tente fazer login.')
      setLoading(false)
      return
    }

    setMessage('Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail.')
    setLoading(false)
    
    // Limpar campos
    setName('')
    setPassword('')
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (otpError) {
      setError(`Erro ao enviar link mágico: ${otpError.message}`)
      setLoading(false)
      return
    }

    setMessage('Um link de acesso foi enviado para o seu e-mail. Verifique sua caixa de entrada!')
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (googleError) {
      setError(`Erro ao conectar com o Google: ${googleError.message}`)
      setLoading(false)
    }
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

          {/* Abas / Switcher (apenas se não estiver no modo magic-link) */}
          {mode !== 'magic-link' && (
            <div className="flex bg-[#EEEAE3] p-1 rounded-xl w-full mb-6 border border-[#DEDAD2]/50 shadow-inner">
              <button
                onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${mode === 'login'
                  ? 'bg-[#FEFCF8] text-[#1D1C19] shadow-sm font-semibold'
                  : 'text-[#77736A] hover:text-[#1D1C19]'
                  }`}
              >
                Entrar
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${mode === 'register'
                  ? 'bg-[#FEFCF8] text-[#1D1C19] shadow-sm font-semibold'
                  : 'text-[#77736A] hover:text-[#1D1C19]'
                  }`}
              >
                Criar Conta
              </button>
            </div>
          )}
          
          <Card className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="text-left space-y-1.5 p-6 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight text-[#1D1C19]">
                {mode === 'login' && 'Bem-vindo de volta'}
                {mode === 'register' && 'Cadastre sua Barbearia'}
                {mode === 'magic-link' && 'Entrar sem senha'}
              </CardTitle>
              <CardDescription className="text-[#77736A] text-sm leading-normal">
                {mode === 'login' && 'Acesse seu painel administrativo para gerenciar sua agenda.'}
                {mode === 'register' && 'Crie sua conta para começar a gerenciar sua barbearia hoje mesmo.'}
                {mode === 'magic-link' && 'Informe seu e-mail para receber um link de acesso direto.'}
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

              {/* MODO LOGIN */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="login-email" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">E-mail</label>
                    <div className="relative">
                      <Input
                        id="login-email"
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

                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-password" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">Senha</label>
                      <Link 
                        href="/forgot-password" 
                        className="text-xs text-[#A87935] hover:underline font-semibold"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
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

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-[#1D1C19] hover:bg-[#35332E] active:bg-[#1D1C19] text-[#FEFCF8] font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 hover:-translate-y-[1px] active:translate-y-0" 
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar na Conta'}
                  </Button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-[#DEDAD2]"></div>
                    <span className="flex-shrink mx-4 text-[#77736A] text-[10px] font-semibold uppercase tracking-wider">ou</span>
                    <div className="flex-grow border-t border-[#DEDAD2]"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setMode('magic-link'); setError(''); setMessage(''); }}
                    className="w-full h-11 border border-[#DEDAD2] hover:bg-[#EEEAE3]/30 hover:border-[#A87935]/50 text-[#1D1C19] font-medium rounded-lg transition-all duration-150 text-sm flex items-center justify-center gap-2 cursor-pointer bg-transparent"
                  >
                    Acessar via link mágico (sem senha)
                  </button>
                </form>
              )}

              {/* MODO CADASTRO */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="reg-name" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">Nome Completo</label>
                    <div className="relative">
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-[#FEFCF8] border-[#DEDAD2] text-[#1D1C19] placeholder:text-[#AAA49A] h-11 pl-10 pr-4 rounded-lg focus-visible:ring-2 focus-visible:ring-[#A87935]/20 focus-visible:ring-offset-0 focus-visible:border-[#A87935] hover:border-[#A87935]/50 transition-all duration-150"
                      />
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#AAA49A]" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="reg-email" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">E-mail</label>
                    <div className="relative">
                      <Input
                        id="reg-email"
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

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="reg-password" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">Senha</label>
                    <div className="relative">
                      <Input
                        id="reg-password"
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

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-[#1D1C19] hover:bg-[#35332E] active:bg-[#1D1C19] text-[#FEFCF8] font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 hover:-translate-y-[1px] active:translate-y-0" 
                    disabled={loading}
                  >
                    {loading ? 'Cadastrando...' : 'Criar minha Conta'}
                  </Button>
                </form>
              )}

              {/* MODO MAGIC LINK */}
              {mode === 'magic-link' && (
                <form onSubmit={handleMagicLink} className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="magic-email" className="text-xs font-semibold tracking-wider text-[#77736A] uppercase cursor-pointer">E-mail</label>
                    <div className="relative">
                      <Input
                        id="magic-email"
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
                    {loading ? 'Enviando link...' : 'Enviar Link de Acesso'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                    className="w-full h-11 border border-[#DEDAD2] hover:bg-[#EEEAE3]/30 hover:border-[#A87935]/50 text-[#1D1C19] font-medium rounded-lg transition-all duration-150 text-sm flex items-center justify-center gap-2 cursor-pointer bg-transparent"
                  >
                    Voltar para o login com senha
                  </button>
                </form>
              )}

              {/* Botão Google OAuth */}
              {mode !== 'magic-link' && (
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-[#DEDAD2]"></div>
                    <span className="flex-shrink mx-4 text-[#77736A] text-[10px] font-semibold uppercase tracking-wider">ou continue com</span>
                    <div className="flex-grow border-t border-[#DEDAD2]"></div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full h-11 border-[#DEDAD2] hover:bg-[#EEEAE3]/30 hover:border-[#A87935]/50 text-[#1D1C19] font-semibold rounded-lg transition-all duration-150 text-sm flex items-center justify-center gap-2.5 cursor-pointer bg-transparent shadow-sm hover:-translate-y-[1px] active:translate-y-0"
                    disabled={loading}
                  >
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Entrar com o Google</span>
                  </Button>
                </>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
