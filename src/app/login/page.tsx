'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // UI States
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Parallax refs
  const brandingRef = useRef<HTMLElement>(null)

  const router = useRouter()
  const supabase = createClient()

  // Capture URL errors
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

  // Parallax effect on branding panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!brandingRef.current) return
      const shapes = brandingRef.current.querySelectorAll<HTMLElement>('.auth-parallax-shape')
      const x = (e.clientX / window.innerWidth) - 0.5
      const y = (e.clientY / window.innerHeight) - 0.5

      shapes.forEach((shape, i) => {
        const speed = (i + 1) * 15
        shape.style.transform = `translate(${x * speed}px, ${y * speed}px)`
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const switchMode = useCallback((newMode: AuthMode) => {
    if (newMode === mode) return
    setError('')
    setMessage('')
    setMode(newMode)
  }, [mode])

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

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    if (!agreedToTerms) {
      setError('Você precisa aceitar os Termos de Uso e Políticas de Privacidade.')
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

    // Clear fields
    setName('')
    setPassword('')
    setConfirmPassword('')
    setAgreedToTerms(false)
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    if (!email) {
      setError('Informe seu e-mail para receber o link de acesso.')
      setLoading(false)
      return
    }

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
    <main className="min-h-screen flex flex-col md:flex-row relative font-inter select-none overflow-x-hidden">

      {/* ─── BRANDING PANEL (Left) ─── */}
      <section
        ref={brandingRef}
        className={`
          auth-sliding-panel w-full md:w-1/2 bg-[#1A1A1D] min-h-[40vh] md:min-h-screen
          relative overflow-hidden flex items-center justify-center p-8 md:p-16 z-20
          ${mode === 'register' ? 'md:translate-x-full' : 'md:translate-x-0'}
        `}
      >
        {/* Background decorations */}
        <div className="auth-parallax-shape absolute top-1/4 -left-20 w-64 h-64 bg-[#C79A4A] opacity-5 blur-[120px] rounded-full" />
        <div className="auth-parallax-shape absolute bottom-1/4 -right-20 w-80 h-80 bg-[#C79A4A] opacity-5 blur-[150px] rounded-full" />
        <div className="auth-parallax-shape auth-abstract-line top-[20%] rotate-12 -left-1/4" />
        <div className="auth-parallax-shape auth-abstract-line bottom-[30%] -rotate-6 -right-1/4" />

        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <Link href="/" className="inline-block mb-12 hover:opacity-90 transition-opacity">
            <img
              alt="HeadBarber Logo"
              className="h-14 md:h-20 w-auto"
              src="/brand/logo-white.png"
            />
          </Link>

          <h1 className="font-montserrat text-[28px] md:text-[32px] font-bold text-white mb-6 leading-tight tracking-[-0.02em]">
            Controle sua barbearia com{' '}
            <span className="text-[#C79A4A]">precisão.</span>
          </h1>

          <p className="text-[16px] leading-relaxed text-[#858387] mb-10 opacity-80">
            A plataforma definitiva para gestores que buscam excelência, agilidade e
            um ambiente de luxo para seus clientes.
          </p>

          <ul className="space-y-6">
            <li className="auth-feature-item flex items-start gap-4">
              <svg className="w-6 h-6 text-[#C79A4A] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <div>
                <strong className="text-white block font-montserrat text-[16px] font-semibold">Métricas Avançadas</strong>
                <p className="text-[12px] text-[#858387] font-semibold tracking-wider uppercase mt-0.5">Acompanhe faturamento e performance em tempo real.</p>
              </div>
            </li>
            <li className="auth-feature-item flex items-start gap-4">
              <svg className="w-6 h-6 text-[#C79A4A] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <div>
                <strong className="text-white block font-montserrat text-[16px] font-semibold">Agendamento Inteligente</strong>
                <p className="text-[12px] text-[#858387] font-semibold tracking-wider uppercase mt-0.5">Reduza faltas com notificações automáticas e fluxos otimizados.</p>
              </div>
            </li>
            <li className="auth-feature-item flex items-start gap-4">
              <svg className="w-6 h-6 text-[#C79A4A] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <div>
                <strong className="text-white block font-montserrat text-[16px] font-semibold">Fidelização Premium</strong>
                <p className="text-[12px] text-[#858387] font-semibold tracking-wider uppercase mt-0.5">Programas de recompensas integrados para clientes VIP.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* ─── FORM PANEL (Right) ─── */}
      <section
        className={`
          auth-sliding-panel w-full md:w-1/2 bg-[#f8f9ff] flex items-center justify-center
          p-6 md:p-12 z-10
          ${mode === 'register' ? 'md:-translate-x-full' : 'md:translate-x-0'}
        `}
      >
        <div className="w-full max-w-md">

          {/* ─── Toggle Switch ─── */}
          <div className="bg-[#f1f3fa] p-1 rounded-full flex mb-12 shadow-inner border border-[#c8c5cb]/30">
            <button
              id="btn-toggle-login"
              onClick={() => switchMode('login')}
              className={`
                flex-1 py-3 px-6 rounded-full text-[12px] font-semibold uppercase tracking-[0.05em]
                transition-all duration-300 cursor-pointer
                ${mode === 'login'
                  ? 'bg-white text-[#1A1A1D] shadow-sm'
                  : 'text-[#47464b] hover:text-[#1A1A1D]'
                }
              `}
            >
              Entrar
            </button>
            <button
              id="btn-toggle-register"
              onClick={() => switchMode('register')}
              className={`
                flex-1 py-3 px-6 rounded-full text-[12px] font-semibold uppercase tracking-[0.05em]
                transition-all duration-300 cursor-pointer
                ${mode === 'register'
                  ? 'bg-white text-[#1A1A1D] shadow-sm'
                  : 'text-[#47464b] hover:text-[#1A1A1D]'
                }
              `}
            >
              Criar conta
            </button>
          </div>

          {/* ─── Card Container ─── */}
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-[0_12px_40px_rgba(26,26,29,0.04)] border border-[#c8c5cb]/20 relative overflow-hidden">

            {/* Error / Success notifications */}
            {error && (
              <div className="mb-6 text-[#ba1a1a] text-[13px] font-medium bg-[#ffdad6] border border-[#ba1a1a]/20 p-3 rounded-lg text-left flex items-start gap-2 auth-form-enter">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 text-[#237A4B] text-[13px] font-medium bg-[#E7F5EC] border border-[#237A4B]/20 p-3 rounded-lg text-left flex items-start gap-2 auth-form-enter">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{message}</span>
              </div>
            )}

            {/* ─── LOGIN FORM ─── */}
            <div
              className={`transition-all duration-500 ease-in-out ${mode === 'login'
                  ? 'opacity-100 translate-y-0 relative z-10'
                  : 'opacity-0 translate-y-4 absolute inset-0 p-8 md:p-10 pointer-events-none z-0'
                }`}
            >
              <div className="mb-8">
                <h2 className="font-montserrat text-[24px] font-semibold text-[#1A1A1D] mb-2 leading-[1.3]">
                  Acesse sua conta
                </h2>
                <p className="text-[14px] text-[#47464b] leading-normal">
                  Entre para gerenciar sua barbearia.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1">
                  <label htmlFor="login-email" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                      focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="login-password" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                      Senha
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-[#C79A4A] hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                      focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C79A4A] text-[#1A1A1D] font-bold py-4 rounded-[4px] shadow-lg
                    hover:shadow-[#C79A4A]/20 transform hover:-translate-y-0.5 transition-all
                    active:scale-[0.98] uppercase tracking-widest text-[13px] cursor-pointer
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#c8c5cb]/30" />
                  <span className="flex-shrink mx-4 text-[12px] text-[#47464b] uppercase tracking-widest font-semibold">
                    ou entre com
                  </span>
                  <div className="flex-grow border-t border-[#c8c5cb]/30" />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-[#c8c5cb]/50
                    text-[#1A1A1D] font-semibold py-3.5 rounded-[4px] hover:bg-[#f1f3fa] transition-all
                    active:scale-[0.98] text-[13px] cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Entrar com Google
                </button>

                {/* Magic Link */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="w-full text-[12px] text-[#47464b] hover:text-[#C79A4A] transition-colors
                    font-semibold flex items-center justify-center gap-2 cursor-pointer py-2"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Receber link de acesso por e-mail
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-[#c8c5cb]/30 text-center">
                <p className="text-[12px] text-[#47464b] font-semibold">
                  Não possui uma conta?{' '}
                  <button
                    onClick={() => switchMode('register')}
                    className="text-[#C79A4A] font-bold hover:underline ml-1 cursor-pointer"
                  >
                    Comece agora
                  </button>
                </p>
              </div>
            </div>

            {/* ─── REGISTER FORM ─── */}
            <div
              className={`transition-all duration-500 ease-in-out ${mode === 'register'
                  ? 'opacity-100 translate-y-0 relative z-10'
                  : 'opacity-0 -translate-y-4 absolute inset-0 p-8 md:p-10 pointer-events-none z-0'
                }`}
            >
              <div className="mb-6">
                {/* Steps */}
                <div className="flex items-center gap-6 mb-8 pb-4 border-b border-[#c8c5cb]/20">
                  <div className="auth-step-active pb-2 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#C79A4A] text-white flex items-center justify-center text-[10px]">1</span>
                    Conta
                  </div>
                  <div className="text-[#47464b] pb-2 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 opacity-50">
                    <span className="w-5 h-5 rounded-full bg-[#e0e2e9] flex items-center justify-center text-[10px]">2</span>
                    Plano
                  </div>
                  <div className="text-[#47464b] pb-2 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 opacity-50">
                    <span className="w-5 h-5 rounded-full bg-[#e0e2e9] flex items-center justify-center text-[10px]">3</span>
                    Barbearia
                  </div>
                </div>

                <h2 className="font-montserrat text-[24px] font-semibold text-[#1A1A1D] mb-2 leading-[1.3]">
                  Crie sua conta
                </h2>
                <p className="text-[14px] text-[#47464b] leading-normal">
                  Depois do cadastro, você será direcionado para o plano Premium.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="reg-name" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                    Nome Completo
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Como deseja ser chamado?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                      focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-email" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                    E-mail Profissional
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                      focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="reg-password" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                      Senha
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                        focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg-confirm" className="text-[12px] font-semibold text-[#47464b] uppercase tracking-wider cursor-pointer">
                      Confirmar
                    </label>
                    <input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-[4px] bg-[#f8f9ff] border border-[#c8c5cb] text-[#181c21] placeholder:text-[#77767b] text-[14px]
                        focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A] transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-3 py-2">
                  <input
                    className="mt-1 rounded text-[#C79A4A] focus:ring-[#C79A4A] border-[#c8c5cb] cursor-pointer accent-[#C79A4A]"
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <label className="text-[12px] text-[#47464b] leading-relaxed cursor-pointer font-semibold" htmlFor="terms">
                    Concordo com os{' '}
                    <a className="text-[#C79A4A] font-bold hover:underline" href="#">Termos de Uso</a>
                    {' '}e{' '}
                    <a className="text-[#C79A4A] font-bold hover:underline" href="#">Políticas de Privacidade</a>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C79A4A] text-[#1A1A1D] font-bold py-4 rounded-[4px] shadow-lg
                    hover:shadow-[#C79A4A]/20 transform hover:-translate-y-0.5 transition-all
                    active:scale-[0.98] uppercase tracking-widest text-[13px] cursor-pointer
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </button>

                {/* Divider */}
                <div className="mt-6 space-y-4">
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-[#c8c5cb]/30" />
                    <span className="flex-shrink mx-4 text-[12px] text-[#47464b] uppercase tracking-widest font-semibold">
                      ou cadastre-se com
                    </span>
                    <div className="flex-grow border-t border-[#c8c5cb]/30" />
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-[#c8c5cb]/50
                      text-[#1A1A1D] font-semibold py-3.5 rounded-[4px] hover:bg-[#f1f3fa] transition-all
                      active:scale-[0.98] text-[13px] cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Cadastrar com Google
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-[#c8c5cb]/30 text-center">
                <p className="text-[12px] text-[#47464b] font-semibold">
                  Já tem uma conta?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-[#C79A4A] font-bold hover:underline ml-1 cursor-pointer"
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-8 opacity-60">
            <a className="text-[12px] font-semibold hover:text-[#C79A4A] transition-colors text-[#47464b]" href="#">Suporte</a>
            <a className="text-[12px] font-semibold hover:text-[#C79A4A] transition-colors text-[#47464b]" href="#">Ajuda</a>
            <Link className="text-[12px] font-semibold hover:text-[#C79A4A] transition-colors text-[#47464b]" href="/">HeadBarber Web</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
