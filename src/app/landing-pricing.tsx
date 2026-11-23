"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { formatPlanAmount, PLAN_DETAILS } from "@/lib/plans";
import { trackPricingViewed, trackTrialClick } from "@/lib/analytics";
import s from "./landing.module.css";

const included = [
  "Agendamento online pelo link na bio",
  "Barbeiros ilimitados, sem taxa por cadeira",
  "Clube de assinaturas e controle de recorrência",
  "Fechamento de caixa e comissão automática",
  "Produtos, estoque e histórico de clientes",
];

export default function LandingPricing({
  whatsappUrl,
}: {
  whatsappUrl: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let tracked = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (tracked) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          tracked = true;
          trackPricingViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="precos"
      className={s.pricing}
      aria-labelledby="pricing-title"
    >
      <div className={s.pricingShell}>
        <div className={s.pricingHeader}>
          <p className={s.eyebrow}>Preços transparentes</p>
          <h2 id="pricing-title">
            Um plano completo. Sem pegadinha e sem cobrar por barbeiro.
          </h2>
          <p className={s.pricingLead}>
            Comece com 14 dias grátis para testar na rotina da barbearia. Depois,
            escolha pagar por mês ou garantir desconto no plano anual.
          </p>
        </div>

        <div className={s.pricingCards}>
          {(["monthly", "annual"] as const).map((interval) => {
            const plan = PLAN_DETAILS[interval];
            const isAnnual = interval === "annual";
            return (
              <article
                className={`${s.plan} ${isAnnual ? s.annualPlan : ""}`}
                key={interval}
              >
                <div className={s.planTop}>
                  <h3>{isAnnual ? "Plano Anual" : "Plano Mensal"}</h3>
                  {isAnnual && <span className={s.saving}>ECONOMIZE 16%</span>}
                </div>

                <p className={s.price}>
                  <strong>{formatPlanAmount(plan.amount)}</strong>
                  <span> {plan.suffix}</span>
                </p>

                <p className={s.planSummary}>
                  {isAnnual
                    ? `Todos os recursos liberados, barbeiros ilimitados — equivale a ${formatPlanAmount(plan.amount / 12)}/mês.`
                    : "Todos os recursos liberados, barbeiros ilimitados, sem fidelidade."}
                </p>

                <ul>
                  {included.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`${s.action} ${!isAnnual ? s.secondary : ""}`}
                  onClick={() => trackTrialClick("pricing")}
                >
                  Testar 14 dias grátis
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>

                <p className={s.planNote}>
                  {isAnnual
                    ? "Cobrança anual única. Cancele a renovação quando quiser."
                    : "Cobrado mensalmente. Cancele quando quiser, sem multa."}
                </p>
              </article>
            );
          })}
        </div>

        <div className={s.riskFree}>
          <div className={s.riskFreeIcon} aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div className={s.riskFreeText}>
            <strong>Sem tempo pra configurar?</strong> A gente cadastra seus
            barbeiros, cortes e horários pra você de graça no primeiro dia.
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={s.riskFreeLink}
          >
            Falar no WhatsApp
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
