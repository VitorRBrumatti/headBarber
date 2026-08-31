'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, AlertTriangle, KeyRound, Mail, MailCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import styles from './recovery.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  const handleResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(resetError.status === 429
          ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.'
          : 'Não foi possível enviar o link. Confira seu e-mail e tente novamente.')
        return
      }
      setSentEmail(email.trim())
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <aside className={styles.brand} aria-label="HeadBarber">
        <div className={styles.brandContent}>
          <Link href="/" className={styles.logo} aria-label="HeadBarber — página inicial">
            <Image src="/brand/headbarber_logo_duas_cores_com_texto_transparente.png" alt="HeadBarber"
              width={384} height={256} sizes="(max-width: 767px) 144px, 216px" className={styles.logoImage} preload />
          </Link>
          <div className={styles.brandCopy}>
            <h2>Sua barbearia espera.<br /><span>Vamos recuperar seu acesso.</span></h2>
            <p>Redefina sua senha e volte a cuidar da sua agenda, da sua equipe e dos seus clientes.</p>
          </div>
          <p className={styles.brandNote}>A mesma gestão. Um novo acesso.</p>
        </div>
      </aside>
      <section className={styles.formPanel} aria-labelledby="recovery-title">
        <div className={styles.formContent}>
          <Link href="/login" className={styles.backLink}><ArrowLeft size={18} aria-hidden="true" /> Voltar para o login</Link>
          <div className={styles.card}>
            <div className={styles.icon} aria-hidden="true">
              {sentEmail ? <MailCheck size={26} strokeWidth={1.6} /> : <KeyRound size={26} strokeWidth={1.6} />}
            </div>
            <div role="status" aria-live="polite" aria-atomic="true">
              <h1 id="recovery-title">{sentEmail ? 'Confira seu e-mail' : 'Esqueceu sua senha?'}</h1>
              {sentEmail ? (
                <p className={styles.description}>Se houver uma conta vinculada a <strong className={styles.email}>{sentEmail}</strong>, você receberá um link para criar uma nova senha.</p>
              ) : (
                <p id="recovery-description" className={styles.description}>Acontece. Informe seu e-mail de cadastro e enviaremos um link para redefinir sua senha.</p>
              )}
            </div>
            {sentEmail ? (
              <div className={styles.success}>
                <p>Não encontrou? Confira também a pasta de spam ou lixo eletrônico. O e-mail pode levar alguns minutos para chegar.</p>
                <Link href="/login" className={styles.primary}>Voltar para o login <ArrowRight size={18} aria-hidden="true" /></Link>
                <button type="button" className={styles.secondary} onClick={() => {
                  setSentEmail('')
                  setError('')
                  requestAnimationFrame(() => emailRef.current?.focus())
                }}>Corrigir e-mail ou tentar novamente</button>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className={styles.form} aria-busy={loading}>
                <div className={styles.field}>
                  <label htmlFor="reset-email">E-mail de cadastro</label>
                  <div className={styles.inputWrap}>
                    <Mail size={18} aria-hidden="true" />
                    <input ref={emailRef} id="reset-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                      placeholder="seu@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} required disabled={loading}
                      aria-describedby={error ? 'recovery-description recovery-error' : 'recovery-description'} />
                  </div>
                </div>
                {error && <p id="recovery-error" role="alert" className={styles.error}><AlertTriangle size={18} aria-hidden="true" />{error}</p>}
                <button type="submit" className={styles.primary} disabled={loading} aria-live="polite">
                  <span>{loading ? 'Enviando link...' : 'Enviar link de recuperação'}</span>
                  {!loading && <ArrowRight size={18} aria-hidden="true" />}
                </button>
                <p className={styles.hint}>Você vai criar uma nova senha pelo link recebido.</p>
              </form>
            )}
          </div>
          <p className={styles.footer}>HeadBarber · Gestão para sua barbearia</p>
        </div>
      </section>
    </main>
  )
}
