import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { formatPlanAmount, PLAN_DETAILS } from "@/lib/plans";
import s from "./landing.module.css";
const included = [
  "Agendamento online",
  "Gestão de clientes",
  "Assinaturas e recorrência",
  "Financeiro e comissões",
  "Produtos e vendas",
  "Cadastre quantos barbeiros quiser",
];
export default function LandingPricing() {
  return (
    <section id="precos" className={s.pricing}>
      <div className={s.pricingInner}>
        <div className={s.pricingIntro}>
          <p className={s.eyebrow}>Planos</p>
          <h2>
            Planos simples
            <br />e transparentes.
          </h2>
          <p>
            Recursos essenciais para sua barbearia,
            <br />
            sem complicação.
          </p>
        </div>
        {(["monthly", "annual"] as const).map((interval) => {
          const plan = PLAN_DETAILS[interval];
          return (
            <article className={`${s.plan} ${interval === "annual" ? s.annualPlan : ""}`} key={interval}>
              {interval === "annual" && (
                <span className={s.saving}>ECONOMIZE 16%</span>
              )}
              <h3>
                Profissional {interval === "monthly" ? "Mensal" : "Anual"}
              </h3>
              <p className={s.price}>
                <strong>{formatPlanAmount(plan.amount)}</strong>
                <span> {plan.suffix}</span>
              </p>
              <ul>
                {included.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className={s.action}>
                Começar agora <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className={s.planNote}>
                {interval === "annual"
                  ? `Equivale a ${formatPlanAmount(plan.amount / 12)}/mês. Cobrança anual.`
                  : "Cobrado mensalmente."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
