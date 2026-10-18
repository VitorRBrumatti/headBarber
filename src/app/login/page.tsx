'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, UsersRound, Crown, Mail, LockKeyhole, UserRound, Link2 } from 'lucide-react'
import styles from './auth.module.css'

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

  const formRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

  // Capture URL errors
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam === 'OAuthFailed') {
        setError('Falha na autenticação com o Google. Tente novamente.')
      } else if (errorParam === 'InvalidToken') {
        setError('O link de acesso expirou ou já foi utilizado. Solicite um novo link.')
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(formRef.current, {
        x: mode === 'register' ? -24 : 24, opacity: 0.3,
        rotationY: mode === 'register' ? -4 : 4,
      }, {
        x: 0, opacity: 1, rotationY: 0, duration: 0.65,
        ease: 'power3.out', clearProps: 'transform,opacity',
      })
    })
    return () => media.revert()
  }, [mode])

  const switchMode = useCallback((newMode: AuthMode) => {
    if (newMode === mode) return
    setError('')
    setMessage('')
    setMode(newMode)
    document.getElementById(`btn-toggle-${newMode}`)?.focus({ preventScroll: true })
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
    <main className={`${styles.page} ${mode === 'register' ? styles.register : ''}`}>
      <section className={styles.brand} aria-label="HeadBarber">
        <Image src="/brand/barbershop-auth.webp" alt="" fill sizes="(max-width: 760px) 100vw, 180vh" priority className={styles.photo} />
        <div className={styles.brandContent}>
          <Link href="/" className={styles.logo} aria-label="HeadBarber, voltar ao site">
            <Image src="/brand/headbarber_logo_duas_cores_com_texto_transparente.png" alt="HeadBarber" width={220} height={180} priority />
          </Link>
          <p className={styles.eyebrow}>Gestão inteligente para barbearias</p>
          <h2>{mode === 'login' ? <>Mais tempo<br />para o que<br /><span>realmente importa.</span></> : <>Sua barbearia<br />pronta para crescer<br /><span>com controle.</span></>}</h2>
          <p className={styles.description}>O HeadBarber ajuda você a organizar sua barbearia, atender mais clientes e crescer com controle e profissionalismo.</p>
          <ul className={styles.benefits}>
            {([
              [CalendarDays, 'Agendamentos inteligentes', 'Sua agenda organizada, do link ao atendimento.'],
              [ChartNoAxesColumnIncreasing, 'Relatórios e métricas', 'Acompanhe seu faturamento e sua operação.'],
              [UsersRound, 'Gestão de clientes', 'Histórico e preferências sempre à mão.'],
              [Crown, 'Uma experiência premium', 'Mais organização para o seu negócio.'],
            ] as const).map(([Icon, title, description]) => (
              <li key={title}><Icon aria-hidden="true" /><div><strong>{title}</strong><p>{description}</p></div></li>
            ))}
          </ul>
        </div>
      </section>
      <section className={styles.formPanel} aria-label="Acesso à conta">
        <div className={styles.formInner}>
          <div className={styles.toggle} role="group" aria-label="Entrar ou criar conta">
            <button id="btn-toggle-login" type="button" aria-pressed={mode === 'login'} onClick={() => switchMode('login')}>Entrar</button>
            <button id="btn-toggle-register" type="button" aria-pressed={mode === 'register'} onClick={() => switchMode('register')}>Criar conta</button>
          </div>
          <div className={styles.card}>
            {error && <div role="alert" className={styles.error}>{error}</div>}
            {message && <div role="status" className={styles.success}>{message}</div>}
            <div ref={formRef}>
              {mode === 'login' ? <>
                <p className={styles.welcome}>Bem-vindo de volta</p>
                <h1>Acesse sua conta</h1>
                <p className={styles.intro}>Entre para gerenciar sua barbearia, agendamentos, clientes e muito mais.</p>
                <form onSubmit={handleLogin} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="login-email">E-mail</label>
                    <div className={styles.input}><Mail aria-hidden="true" /><input id="login-email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  </div>
                  <div className={styles.field}>
                    <div className={styles.passwordLabel}><label htmlFor="login-password">Senha</label><Link href="/forgot-password">Esqueci minha senha</Link></div>
                    <div className={styles.input}><LockKeyhole aria-hidden="true" /><input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  </div>
                  <button type="submit" disabled={loading} className={styles.primary}>{loading ? 'Entrando...' : 'Entrar'}<ArrowRight aria-hidden="true" /></button>
                  <div className={styles.divider}>Ou entre com</div>
                  <button type="button" onClick={handleGoogleLogin} disabled={loading} className={styles.social}><GoogleMark />Entrar com Google</button>
                  <button type="button" onClick={handleMagicLink} disabled={loading} className={styles.magic}><Link2 aria-hidden="true" />Receber link de acesso por e-mail</button>
                </form>
                <p className={styles.bottom}>Não possui uma conta?<button type="button" className={styles.textButton} onClick={() => switchMode('register')}>Criar conta</button></p>
              </> : <>
                <ol className={styles.steps} aria-label="Etapas do cadastro"><li aria-current="step"><span>1</span>Conta</li><li><span>2</span>Plano</li><li><span>3</span>Barbearia</li></ol>
                <h1>Crie sua conta</h1>
                <p className={styles.intro}>Depois do cadastro, confirme seu e-mail para continuar a configuração da sua barbearia.</p>
                <form onSubmit={handleRegister} className={styles.form}>
                  <div className={styles.field}><label htmlFor="reg-name">Nome completo</label><div className={styles.input}><UserRound aria-hidden="true" /><input id="reg-name" type="text" autoComplete="name" placeholder="Como deseja ser chamado?" value={name} onChange={e => setName(e.target.value)} required /></div></div>
                  <div className={styles.field}><label htmlFor="reg-email">E-mail profissional</label><div className={styles.input}><Mail aria-hidden="true" /><input id="reg-email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div></div>
                  <div className={styles.passwords}>
                    <div className={styles.field}><label htmlFor="reg-password">Senha</label><div className={styles.input}><LockKeyhole aria-hidden="true" /><input id="reg-password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div></div>
                    <div className={styles.field}><label htmlFor="reg-confirm">Confirmar senha</label><div className={styles.input}><LockKeyhole aria-hidden="true" /><input id="reg-confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div></div>
                  </div>
                  <div className={styles.terms}><input id="terms" type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} /><label htmlFor="terms">Concordo com os <a href="#">Termos de Uso</a> e <a href="#">Políticas de Privacidade</a>.</label></div>
                  <button type="submit" disabled={loading} className={styles.primary}>{loading ? 'Cadastrando...' : 'Criar conta'}<ArrowRight aria-hidden="true" /></button>
                  <div className={styles.divider}>Ou cadastre-se com</div>
                  <button type="button" onClick={handleGoogleLogin} disabled={loading} className={styles.social}><GoogleMark />Cadastrar com Google</button>
                </form>
                <p className={styles.bottom}>Já possui uma conta?<button type="button" className={styles.textButton} onClick={() => switchMode('login')}>Entrar agora</button></p>
              </>}
            </div>
          </div>
          <footer className={styles.footer}><Link href="/demo">Explorar demo</Link><Link href="/">HeadBarber Web</Link></footer>
        </div>
      </section>
    </main>
  )
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
}
