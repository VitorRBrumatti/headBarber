"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState, type ReactElement } from "react"

/* ── Smooth scroll helper ───────────────────────────────────── */
function smoothScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const navHeight = 64 // h-16
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8
  window.scrollTo({ top, behavior: "smooth" })
}

/* ── Scroll-reveal hook ─────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale"
    )
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ── SVG Icons ──────────────────────────────────────────────── */
type IconName =
  | "menu" | "arrow_forward" | "chat" | "link" | "calendar_view_day"
  | "account_balance_wallet" | "inventory_2" | "history"
  | "check_circle" | "check" | "group" | "add_circle"
  | "payments" | "public" | "video_library" | "calendar_check"

const ICONS: Record<IconName, ReactElement> = {
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  arrow_forward: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  calendar_view_day: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="4" width="18" height="5" rx="1" /><rect x="3" y="11" width="18" height="5" rx="1" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  account_balance_wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><circle cx="17" cy="13" r="1" fill="currentColor" /><path d="M20 7V5a2 2 0 0 0-2-2H4" /></svg>,
  inventory_2: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 8H3l1 13h16l1-13z" /><path d="M1 8h22M10 12h4" /><path d="M9 4l1-1h4l1 1v4H9V4z" /></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>,
  check_circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>,
  group: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>,
  add_circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>,
  payments: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  public: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  video_library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M10 9l5 3-5 3V9z" /></svg>,
  calendar_check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg>,
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <span className={`inline-flex ${className}`} aria-hidden>{ICONS[name]}</span>
}

/* ── Feature data ───────────────────────────────────────────── */
const FEATURES = [
  { icon: "chat" as IconName, title: "Notificações WhatsApp", desc: "Lembretes automáticos e confirmações diretamente no celular do seu cliente." },
  { icon: "link" as IconName, title: "Link Exclusivo", desc: "Página de agendamento online personalizada com a marca da sua barbearia." },
  { icon: "calendar_view_day" as IconName, title: "Agendas por Profissional", desc: "Controle individual de horários, folgas e bloqueios para cada barbeiro." },
  { icon: "account_balance_wallet" as IconName, title: "Controle Financeiro", desc: "Gestão de receitas, despesas, lucro líquido e cálculo de comissões automático." },
  { icon: "inventory_2" as IconName, title: "Produtos e Vendas", desc: "Registro de estoque e ponto de venda integrado para aumentar seu faturamento." },
  { icon: "history" as IconName, title: "Histórico Completo", desc: "Acompanhe a jornada de cada cliente com histórico de agendamentos e preferências." },
]

const CHECKLIST_LEFT = ["Gestão de serviços, preços e duração personalizada.", "Agendamentos manuais via painel administrativo.", "Add-ons (serviços extras) nos agendamentos."]
const CHECKLIST_RIGHT = ["Horários, almoço, folgas e bloqueios pontuais.", "Suporte especializado e interface intuitiva."]

/* stagger delay class map */
const DELAYS = ["", "delay-75", "delay-150", "delay-225", "delay-300", "delay-375"] as const

/* ── Page ───────────────────────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const glowRef = useRef<HTMLDivElement>(null)

  useScrollReveal()

  // Cursor spotlight — updates DOM directly (no re-render on every mousemove)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!glowRef.current) return
      glowRef.current.style.background =
        `radial-gradient(480px circle at ${e.clientX}px ${e.clientY}px,` +
        ` rgba(199,154,74,0.13), transparent 65%)`
    }
    const onLeave = () => {
      if (glowRef.current) glowRef.current.style.background = "none"
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    document.documentElement.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      document.documentElement.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#181c21] overflow-x-hidden">

      {/* ── Cursor spotlight glow ─── */}
      <div
        ref={glowRef}
        className="fixed inset-0 pointer-events-none z-[49] transition-none"
        style={{ mixBlendMode: "screen" }}
        aria-hidden
      />

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-16 px-6 flex justify-between items-center transition-all duration-300 ${scrolled ? "bg-[#1A1A1D] shadow-lg" : "bg-[#1A1A1D]/95 backdrop-blur-md shadow-sm"
        }`}>
        <Link href="/" className="flex items-center">
          <Image src="/brand/logo-white.png" alt="HeadBarber" width={140} height={36} className="h-8 w-auto object-contain" priority />
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          {[{ label: "Recursos", target: "features" }, { label: "Preços", target: "pricing" }].map((item) => (
            <button
              key={item.target}
              onClick={() => smoothScrollTo(item.target)}
              className="text-[#848481] hover:text-[#C79A4A] transition-colors text-xs font-semibold uppercase tracking-widest"
            >
              {item.label}
            </button>
          ))}
          <Link href="/login" className="bg-[#C79A4A] text-[#1A1A1D] px-6 py-2 rounded text-xs font-semibold uppercase tracking-widest transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(199,154,74,0.35)]">
            Começar agora
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <Icon name="menu" className="w-6 h-6" />
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#1A1A1D] pt-20 px-6 flex flex-col gap-6">
          {[{ label: "Recursos", target: "features" }, { label: "Preços", target: "pricing" }].map((item) => (
            <button
              key={item.target}
              onClick={() => { smoothScrollTo(item.target); setMobileOpen(false) }}
              className="text-[#848481] hover:text-[#C79A4A] text-lg font-semibold uppercase tracking-widest text-left"
            >
              {item.label}
            </button>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)} className="bg-[#C79A4A] text-[#1A1A1D] px-6 py-3 rounded text-sm font-semibold uppercase tracking-widest text-center">
            Começar agora
          </Link>
        </div>
      )}

      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <header className="relative pt-32 pb-20 overflow-hidden bg-[#1A1A1D] min-h-screen flex items-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#C79A4A]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-white/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
          </div>

          <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="reveal inline-block border border-[#C79A4A]/30 px-4 py-1 rounded-full bg-[#C79A4A]/5">
                <span className="text-[#C79A4A] text-xs font-semibold uppercase tracking-[0.2em]">Exclusividade &amp; Precisão</span>
              </div>

              <h1 className="reveal delay-75 font-montserrat font-bold text-white text-[clamp(2rem,5vw,3.75rem)] leading-[1.15] tracking-tight max-w-xl">
                O Sistema Operacional da{" "}
                <span className="text-[#C79A4A]">Barbearia Moderna</span>
              </h1>

              <p className="reveal delay-150 text-[#848481] text-base leading-relaxed max-w-lg">
                Eleve o padrão do seu negócio com a plataforma de gestão que combina sofisticação estética com eficiência operacional inabalável.
              </p>

              <div className="reveal delay-225 flex flex-wrap gap-4 pt-4">
                <Link href="/login" className="inline-flex items-center gap-2 bg-[#C79A4A] text-[#1A1A1D] px-8 py-4 rounded text-xs font-semibold uppercase tracking-widest transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(199,154,74,0.35)]">
                  Começar Agora
                  <Icon name="arrow_forward" className="w-4 h-4" />
                </Link>
              </div>

              {/* Social proof */}
              <div className="reveal delay-300 flex items-center gap-6 pt-8 border-t border-white/10">
                <div className="flex -space-x-3">
                  {["JR", "MC", "TS"].map((initials, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1A1A1D] bg-gradient-to-br from-[#C79A4A]/40 to-[#111113] flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                  ))}
                </div>
                <p className="text-[#848481] text-sm">
                  <span className="text-white font-bold">+500 barbearias</span> já transformadas.
                </p>
              </div>
            </div>

            {/* Right – mockup */}
            <div className="reveal-right relative group">
              <div className="absolute -inset-4 bg-[#C79A4A]/10 blur-xl group-hover:bg-[#C79A4A]/20 transition-all rounded-3xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-square lg:aspect-video bg-[#111113]">
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0f] border-b border-white/10">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    <div className="flex-1 mx-4 h-5 bg-white/5 rounded text-center text-[10px] text-white/20 leading-5">headbarber.app/dashboard</div>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <div className="w-14 bg-[#0d0d0f] border-r border-white/5 flex flex-col items-center py-4 gap-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg ${i === 0 ? "bg-[#C79A4A]/30" : "bg-white/5"}`} />
                      ))}
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[{ val: "R$ 12.840", label: "Faturamento" }, { val: "48 hoje", label: "Atendimentos" }, { val: "94%", label: "Satisfação" }].map(({ val, label }) => (
                          <div key={label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <p className="text-[#C79A4A] text-xs font-semibold">{val}</p>
                            <p className="text-white/30 text-[10px] mt-1">{label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {[{ time: "09:00", name: "Carlos M.", svc: "Degradê" }, { time: "10:30", name: "Rafael S.", svc: "Barba" }, { time: "11:15", name: "Bruno T.", svc: "Corte" }].map((apt) => (
                          <div key={apt.time} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 border-l-2 border-[#C79A4A]">
                            <span className="text-[#C79A4A] text-xs font-mono">{apt.time}</span>
                            <span className="text-white text-xs font-medium flex-1">{apt.name}</span>
                            <span className="text-white/40 text-[10px]">{apt.svc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating stat card – with float animation */}
              <div className="float-anim absolute -bottom-6 -left-6 bg-white p-5 rounded-xl shadow-xl border border-[#c8c5cb] hidden md:flex items-center gap-4">
                <div className="w-12 h-12 bg-[#C79A4A]/10 rounded-full flex items-center justify-center text-[#C79A4A]">
                  <Icon name="calendar_check" className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-montserrat font-semibold text-xl text-[#1A1A1D]">+24%</p>
                  <p className="text-[#77767b] text-xs font-semibold uppercase tracking-wide">Aumento em agendamentos</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="py-24 bg-[#f8f9ff]" id="features">
          <div className="container mx-auto px-6">
            {/* Heading */}
            <div className="reveal text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-montserrat font-semibold text-2xl text-[#1A1A1D] mb-4">A plataforma completa para seu negócio</h2>
              <p className="text-[#47464b] text-base leading-relaxed">Ferramentas essenciais desenhadas para a eficiência do barbeiro moderno.</p>
            </div>

            {/* 6-card grid – staggered reveal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.title}
                  className={`reveal ${DELAYS[i]} bg-white p-8 rounded-2xl border border-[#c8c5cb] hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
                >
                  <Icon name={feat.icon} className="w-10 h-10 text-[#C79A4A] mb-4" />
                  <h4 className="font-montserrat font-semibold text-xl text-[#1A1A1D] mb-2">{feat.title}</h4>
                  <p className="text-[#47464b] text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>

            {/* Checklist panel */}
            <div className="reveal mt-16 grid md:grid-cols-2 gap-8 bg-[#f1f3fa] p-10 rounded-2xl">
              <div>
                <h3 className="font-montserrat font-semibold text-xl text-[#1A1A1D] mb-6">Tudo o que você precisa:</h3>
                <ul className="space-y-4">
                  {CHECKLIST_LEFT.map((item, i) => (
                    <li key={item} className={`reveal-left ${DELAYS[i]} flex items-start gap-3 text-sm text-[#181c21]`}>
                      <Icon name="check_circle" className="w-5 h-5 text-[#C79A4A] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-montserrat font-semibold text-xl text-[#1A1A1D] mb-6">Configuração Total:</h3>
                <ul className="space-y-4">
                  {CHECKLIST_RIGHT.map((item, i) => (
                    <li key={item} className={`reveal-right ${DELAYS[i]} flex items-start gap-3 text-sm text-[#181c21]`}>
                      <Icon name="check_circle" className="w-5 h-5 text-[#C79A4A] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────── */}
        <section className="py-24 bg-white" id="pricing">
          <div className="container mx-auto px-6">
            <div className="reveal text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-montserrat font-semibold text-2xl text-[#1A1A1D] mb-4">Investimento simples e transparente</h2>
              <p className="text-[#47464b] text-base leading-relaxed">Um único plano com acesso a todas as funcionalidades premium.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">

              {/* Monthly – reveal from left */}
              <div className="reveal-left bg-white p-10 rounded-2xl border border-[#c8c5cb] shadow-sm flex flex-col justify-between hover:border-[#C79A4A]/30 hover:-translate-y-1 transition-all duration-300">
                <div>
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#47464b] mb-1">Recorrência Mensal</p>
                    <h3 className="font-montserrat font-semibold text-2xl text-[#1A1A1D]">Plano Profissional</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-xl font-semibold text-[#1A1A1D]">R$</span>
                    <span className="font-montserrat font-bold text-5xl text-[#1A1A1D]">24,90</span>
                    <span className="text-[#47464b]">/mês</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    {[
                      { icon: "check" as IconName, text: "Todas as funcionalidades inclusas" },
                      { icon: "group" as IconName, text: "Até 2 barbeiros inclusos" },
                      { icon: "add_circle" as IconName, text: "Barbeiro extra: + R$ 5,00/mês" },
                    ].map(({ icon, text }) => (
                      <li key={text} className="flex items-center gap-3 text-sm text-[#181c21]">
                        <Icon name={icon} className="w-5 h-5 text-[#C79A4A] shrink-0" />{text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Annual – reveal from right + glow + shimmer */}
              <div className="reveal-right reveal-scale md:scale-105 relative">
                {/*
                  Animated conic border wrapper
                  Trick: absolute gradient ring behind the card
                */}
                <div
                  className="absolute -inset-[2px] rounded-2xl z-0 annual-glow"
                  style={{
                    background: "linear-gradient(90deg, #C79A4A, #f0d080, #C79A4A, #a07030, #C79A4A)",
                    backgroundSize: "300% 100%",
                    animation: "borderRotate 3s linear infinite, goldGlow 3s ease-in-out infinite",
                  }}
                />

                <div className="relative z-10 bg-[#1A1A1D] p-10 rounded-2xl flex flex-col justify-between overflow-hidden">
                  {/* Shimmer sweep overlay */}
                  <div
                    className="shimmer-sweep pointer-events-none absolute inset-0 z-20"
                    style={{
                      background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
                      width: "60%",
                    }}
                  />

                  {/* Ribbon badge */}
                  <div className="absolute top-0 right-0 bg-[#C79A4A] text-[#1A1A1D] px-10 py-1.5 text-[10px] font-bold uppercase tracking-widest -rotate-45 translate-x-12 translate-y-6 z-30">
                    Melhor Valor
                  </div>

                  <div className="relative z-10">
                    <div className="mb-6">
                      <p className="badge-pulse text-xs font-semibold uppercase tracking-widest text-[#C79A4A] mb-1">Recorrência Anual</p>
                      <h3 className="font-montserrat font-semibold text-2xl text-white">Plano Profissional</h3>
                    </div>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xl font-semibold text-white">R$</span>
                      <span className="font-montserrat font-bold text-5xl text-white">249,99</span>
                      <span className="text-[#848481]">/ano</span>
                    </div>

                    {/* Economy badge */}
                    <div className="inline-flex items-center gap-1.5 bg-[#C79A4A]/15 text-[#C79A4A] border border-[#C79A4A]/30 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest mb-8">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C79A4A] animate-pulse" />
                      Economia de ~16% — 2 meses grátis
                    </div>

                    <ul className="space-y-4 mb-10">
                      {[
                        { icon: "check" as IconName, text: "Todas as funcionalidades inclusas" },
                        { icon: "group" as IconName, text: "Até 2 barbeiros inclusos" },
                        { icon: "payments" as IconName, text: "Pagamento único anual" },
                      ].map(({ icon, text }) => (
                        <li key={text} className="flex items-center gap-3 text-sm text-white">
                          <Icon name={icon} className="w-5 h-5 text-[#C79A4A] shrink-0" />{text}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/login"
                    className="relative z-10 block w-full py-4 bg-[#C79A4A] text-[#1A1A1D] rounded text-xs font-semibold uppercase tracking-widest text-center transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(199,154,74,0.6)]"
                  >
                    Assinar Agora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section
          className="py-24 relative bg-[#1A1A1D] overflow-hidden"
          style={{ clipPath: "polygon(0 0, 100% 5%, 100% 100%, 0 95%)" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C79A4A]/10 blur-[100px] rounded-full" />
          </div>
          <div className="container mx-auto px-6 text-center relative z-10 py-8">
            <h2 className="reveal font-montserrat font-bold text-3xl md:text-4xl text-white mb-6">
              Pronto para elevar o nível da sua barbearia?
            </h2>
            <p className="reveal delay-75 text-[#848481] text-base leading-relaxed mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de empresários que transformaram a gestão em um diferencial competitivo.
            </p>
            <div className="reveal delay-150">
              <Link
                href="/login"
                className="inline-block bg-[#C79A4A] text-[#1A1A1D] px-12 py-5 rounded text-sm font-semibold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(199,154,74,0.5)] transition-all active:scale-95"
              >
                Começar Agora
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-[#1A1A1D] pt-20 pb-10 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-6">
                <Image src="/brand/logo-white.png" alt="HeadBarber" width={140} height={36} className="h-8 w-auto object-contain" />
              </Link>
              <p className="text-[#848481] text-sm leading-relaxed">A ferramenta definitiva para barbearias que buscam luxo, organização e escalabilidade.</p>
            </div>

            <div>
              <h5 className="text-white text-xs font-semibold uppercase tracking-widest mb-6">Plataforma</h5>
              <ul className="space-y-4">
                {["Funcionalidades", "Segurança", "Preços"].map((link) => (
                  <li key={link}><a href="#" className="text-[#848481] text-sm hover:text-[#C79A4A] transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-white text-xs font-semibold uppercase tracking-widest mb-6">Suporte</h5>
              <ul className="space-y-4">
                {["Central de Ajuda", "Contato", "Status do Sistema"].map((link) => (
                  <li key={link}><a href="#" className="text-[#848481] text-sm hover:text-[#C79A4A] transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-white text-xs font-semibold uppercase tracking-widest mb-6">Social</h5>
              <div className="flex gap-4">
                {[{ icon: "public" as IconName, label: "Site" }, { icon: "video_library" as IconName, label: "Vídeos" }].map(({ icon, label }) => (
                  <a key={label} href="#" aria-label={label} className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-white hover:bg-[#C79A4A] hover:text-[#1A1A1D] transition-all">
                    <Icon name={icon} className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-[#848481] uppercase tracking-widest">
            <p>© 2024 HeadBarber SaaS. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
