import Link from "next/link"
import { Check, ArrowUpRight } from "lucide-react"
import { formatPlanAmount, PLAN_DETAILS } from "@/lib/plans"

const included = [
  "Agenda, clientes e financeiro no mesmo lugar",
  "Assinaturas de clientes e agendamento online",
  "Cadastre quantos barbeiros quiser",
]

export default function LandingPricing() {
  const monthly = PLAN_DETAILS.monthly
  const annual = PLAN_DETAILS.annual
  const annualPerMonth = formatPlanAmount(annual.amount / 12)

  return <section id="precos" className="relative scroll-mt-20 overflow-hidden bg-[#232220] py-16 text-white sm:py-24">
    <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[650px] rounded-full bg-[#B78635]/[.09] blur-[100px]" />
    <div className="relative mx-auto max-w-[1160px] px-5 sm:px-8">
      <div className="max-w-[690px]">
        <p className="text-xs font-bold uppercase tracking-[.17em] text-[#D6A85B]">Planos HeadBarber</p>
        <h2 className="mt-3 text-balance [font-family:var(--font-montserrat),Arial,sans-serif] text-[clamp(2.2rem,4vw,3.7rem)] font-semibold leading-[1.12] tracking-[-.05em]">Tudo para a barbearia funcionar melhor.</h2>
        <p className="mt-5 max-w-[590px] text-base leading-relaxed text-[#D5D1C9]">O mesmo plano completo, com duas formas de pagar. Escolha a que combina com seu momento.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 md:items-stretch">
        <article className="flex flex-col rounded-xl border border-white/20 bg-white/[.055] p-6 backdrop-blur-md sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#D6A85B]">Pagamento mensal</p><h3 className="mt-3 [font-family:var(--font-montserrat),Arial,sans-serif] text-2xl font-semibold tracking-[-.035em]">Mensal</h3></div><span className="text-xs text-[#D5D1C9]">Flexível</span></div>
          <p className="mt-3 text-sm leading-relaxed text-[#D5D1C9]">Para começar sem compromisso anual.</p>
          <p className="mt-9 flex items-baseline gap-2"><strong className="[font-family:var(--font-montserrat),Arial,sans-serif] text-[clamp(2.8rem,5vw,3.8rem)] font-semibold leading-none tracking-[-.06em]">{formatPlanAmount(monthly.amount)}</strong><span className="text-sm text-[#D5D1C9]">/ mês</span></p>
          <p className="mt-3 text-sm text-[#D5D1C9]">Cobrado mensalmente.</p>
          <div className="mt-auto pt-9"><Link href="/login" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D6A85B] px-5 text-sm font-semibold text-[#E7BD77] transition-colors hover:bg-[#D6A85B] hover:text-[#211B12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Começar no mensal <ArrowUpRight className="size-4" /></Link></div>
        </article>

        <article className="relative flex flex-col overflow-hidden rounded-xl border border-[#C79A4A]/75 bg-[linear-gradient(145deg,rgba(103,77,40,.52),rgba(50,43,33,.78)_54%,rgba(37,35,32,.95))] p-6 shadow-[0_18px_45px_rgba(0,0,0,.16)] backdrop-blur-md sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#E2BA70]/[.12] blur-3xl" />
          <div className="relative flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#E2BA70]">Pagamento anual</p><h3 className="mt-3 [font-family:var(--font-montserrat),Arial,sans-serif] text-2xl font-semibold tracking-[-.035em]">Anual</h3></div><span className="rounded-full bg-[#E2BA70] px-3 py-1 text-[11px] font-bold text-[#2A2116]">Economize 16%</span></div>
          <p className="relative mt-3 text-sm leading-relaxed text-[#E8DFD2]">Para quem já sabe que a agenda não para.</p>
          <p className="relative mt-9 flex items-baseline gap-2"><strong className="[font-family:var(--font-montserrat),Arial,sans-serif] text-[clamp(2.8rem,5vw,3.8rem)] font-semibold leading-none tracking-[-.06em]">{formatPlanAmount(annual.amount)}</strong><span className="text-sm text-[#E8DFD2]">/ ano</span></p>
          <p className="relative mt-3 text-sm text-[#E8DFD2]">Equivale a <strong className="text-white">{annualPerMonth}/mês</strong>. Cobrança única anual.</p>
          <div className="relative mt-auto pt-9"><Link href="/login" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#D6A85B] px-5 text-sm font-semibold text-[#211B12] transition-colors hover:bg-[#E2BA70] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Começar no anual <ArrowUpRight className="size-4" /></Link></div>
        </article>
      </div>

      <div className="mt-8 border-t border-white/20 pt-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#D6A85B]">Incluso nos dois planos</p><ul className="mt-5 grid gap-4 text-sm text-[#E6E1D9] md:grid-cols-3">{included.map(item => <li key={item} className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-[#D6A85B]" /><span>{item}</span></li>)}</ul><p className="mt-6 text-xs text-[#C9C3B9]">Você escolhe o plano após criar sua conta.</p></div>
    </div>
  </section>
}
