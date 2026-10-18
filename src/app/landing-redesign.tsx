"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Menu,
  Package,
  Repeat2,
  Scissors,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import LandingPricing from "./landing-pricing";
import s from "./landing.module.css";

const capabilities = [
  [CalendarDays, "Agendamento online", "por link"],
  [UsersRound, "Gestão de clientes", "e histórico"],
  [Repeat2, "Assinaturas de clientes", "e recorrência"],
  [Wallet, "Financeiro", "e comissões"],
] as const;
const features = [
  [
    "Agenda organizada",
    "Visualize os agendamentos da sua equipe em um só lugar, evite conflitos e mantenha sua barbearia sempre no ritmo certo.",
    "agenda",
  ],
  [
    "Assinaturas e recorrência",
    "Crie planos, gerencie seus assinantes e acompanhe os benefícios e a recorrência de cada cliente.",
    "overview",
  ],
  [
    "Financeiro sob controle",
    "Acompanhe entradas, saídas, comissões e tenha uma visão clara da saúde financeira do seu negócio.",
    "finance",
  ],
];
const customization = [
  [Scissors, "Serviços personalizados", "Defina preços, duração e adicionais."],
  [
    UsersRound,
    "Gestão da equipe",
    "Cada barbeiro com sua própria agenda e comissão.",
  ],
  [Package, "Produtos e vendas", "Controle seu estoque e registre vendas."],
  [
    CreditCard,
    "Histórico de clientes",
    "Acompanhe o histórico e as preferências de cada cliente.",
  ],
] as const;
function Brand() {
  return (
    <Link href="/" className={s.brand} aria-label="HeadBarber, início">
      <Image
        src="/brand/headbarber_simbolo_duas_cores_transparente.png"
        alt=""
        width={40}
        height={40}
      />
      <span>HeadBarber</span>
    </Link>
  );
}
function Action({
  children = "Começar agora",
  href = "/login",
  secondary = false,
}: {
  children?: React.ReactNode;
  href?: string;
  secondary?: boolean;
}) {
  return (
    <Link className={`${s.action} ${secondary ? s.secondary : ""}`} href={href}>
      {children}
      <ArrowRight aria-hidden="true" size={16} />
    </Link>
  );
}
export default function LandingRedesign() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const root = landingRef.current;
      if (!root) return;
      const compact = window.matchMedia("(max-width: 640px)").matches;
      const select = gsap.utils.selector(root);
      const distance = compact ? 18 : 38;

      gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } })
        .from(select(`.${s.heroCopy} > *`), {
          y: distance, opacity: 0, stagger: 0.09, clearProps: "transform,opacity",
        })
        .from(select(`.${s.heroScreen}`), {
          y: distance, opacity: 0, rotation: compact ? 0 : 1.5,
          clearProps: "transform,opacity",
        }, 0.2);

      for (const selector of [
        `.${s.featureGrid}`, `.${s.phones}`, `.${s.customizeGrid}`, `.${s.pricingInner}`,
      ]) {
        const group = select(selector)[0] as HTMLElement | undefined;
        if (!group) continue;
        gsap.from(group.children, {
          y: distance, opacity: 0, duration: 0.8, stagger: compact ? 0.07 : 0.14,
          ease: "power3.out", clearProps: "transform,opacity",
          scrollTrigger: { trigger: group, start: "top 88%", once: true },
        });
      }
      for (const selector of [`.${s.partnerCopy}`, `.${s.operationInner} > div`, `.${s.bookingCopy}`, `.${s.finalCta} h2`]) {
        const target = select(selector);
        gsap.from(target, {
          y: distance * 0.65, opacity: 0, duration: 0.8, ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: target[0], start: "top 90%", once: true },
        });
      }
    }, landingRef);
    return () => media.revert();
  }, []);

  return (
    <div className={s.landing} ref={landingRef}>
      <a href="#conteudo" className={s.skip}>
        Pular para o conteúdo
      </a>
      <header className={s.header}>
        <nav className={s.nav} aria-label="Navegação principal">
          <Brand />
          <div className={s.desktopNav}>
            <a href="#recursos">Recursos</a>
            <a href="#precos">Preços</a>
            <Link href="/demo">Demonstração</Link>
          </div>
          <div className={s.desktopNav}>
            <Link href="/login">Entrar</Link>
            <Action />
          </div>
          <button
            className={s.menuButton}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </nav>
        {mobileOpen && (
          <nav
            id="landing-mobile-nav"
            className={s.mobileNav}
            aria-label="Navegação mobile"
          >
            <a href="#recursos" onClick={() => setMobileOpen(false)}>
              Recursos
            </a>
            <a href="#precos" onClick={() => setMobileOpen(false)}>
              Preços
            </a>
            <Link href="/demo">Demonstração</Link>
            <Link href="/login">Entrar / Começar agora</Link>
          </nav>
        )}
      </header>
      <main id="conteudo">
        <section className={s.heroWorld} aria-labelledby="hero-title">
          <Image
            src="/brand/barbershop-hero.png"
            alt=""
            fill
            preload
            sizes="100vw"
            className={s.heroPhoto}
          />
          <div className={s.hero}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Sistema de gestão para barbearias</p>
              <h1 id="hero-title">
                Menos tempo
                <br />
                na gestão.
                <br />
                <span>
                  Mais tempo
                  <br />
                  na cadeira.
                </span>
              </h1>
              <p className={s.heroDescription}>
                Agenda, clientes, assinaturas e financeiro.
                <br />
                Tudo no mesmo lugar.
              </p>
              <div className={s.actions}>
                <Action />
                <Action href="/demo" secondary>
                  Explorar demo
                </Action>
              </div>
              <ul className={s.capabilities}>
                {capabilities.map(([Icon, title, subtitle]) => (
                  <li key={title}>
                    <Icon aria-hidden="true" />
                    <span>
                      {title}
                      <br />
                      {subtitle}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.heroScreen}>
              <Image
                src="/brand/product/agenda.webp"
                alt="Agenda real do HeadBarber na demonstração"
                width={1440}
                height={960}
                preload
                sizes="(max-width:1000px) 94vw,65vw"
              />
              <span className={s.captureLabel}>
                HeadBarber · Agenda real do produto
              </span>
            </div>
          </div>
        </section>
        <section className={s.partner} aria-label="Parceiro oficial">
          <Image
            src="/brand/partners/hoffmanns-facade-ai.webp"
            alt="Fachada ilustrativa da Hoffmann’s Barber, gerada por IA"
            fill
            sizes="(max-width: 640px) 100vw, 55vw"
            className={s.partnerFacade}
          />
          <div className={s.partnerInner}>
            <div className={s.partnerBrand}>
              <p className={s.partnerEyebrow}>Parceiro oficial</p>
              <div className={s.partnerWordmark} aria-label="Hoffmann’s Barber">
                <span>Hoffmann’s</span>
                <span className={s.partnerBarber}>Barber</span>
              </div>
            </div>
            <div className={s.partnerCopy}>
              <h2 id="partner-title">
                A tradição encontra<br />
                <span>a tecnologia.</span>
              </h2>
              <p>
                A Hoffmann’s Barber confia no HeadBarber para uma gestão mais
                eficiente e uma experiência ainda melhor para seus clientes.
              </p>
            </div>
          </div>
        </section>
        <section className={s.operation}>
          <div className={s.operationInner}>
            <div>
              <p className={s.eyebrow}>Gestão sem complicação</p>
              <h2>
                Toda a operação,
                <br />
                sem ruído.
              </h2>
              <p>
                Do agendamento ao financeiro, o HeadBarber organiza o que
                importa para você focar no que faz de melhor: entregar uma
                experiência incrível para cada cliente.
              </p>
            </div>
            <Image
              src="/brand/product/agenda.webp"
              alt="Visão real da agenda HeadBarber"
              width={1440}
              height={960}
              sizes="(max-width:768px) 90vw,50vw"
            />
          </div>
        </section>
        <section id="recursos" className={s.features}>
          <div className={s.container}>
            <p className={s.eyebrow}>Principais recursos</p>
            <h2>
              Tudo que sua barbearia precisa
              <br className={s.desktopBreak} /> em um só lugar.
            </h2>
            <div className={s.featureGrid}>
              {features.map(([title, description, image], index) => (
                <article key={title}>
                  <span className={s.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className={s.featureCapture}>
                    <Image
                      src={`/brand/product/${image}.webp`}
                      alt={image === "overview" ? "Visão geral real do HeadBarber" : `Tela real do HeadBarber: ${title}`}
                      width={1440}
                      height={960}
                      sizes="(max-width:640px) 90vw,32vw"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="como-funciona" className={s.booking}>
          <div className={s.bookingInner}>
            <div className={s.bookingCopy}>
              <p className={s.eyebrow}>Agendamento online</p>
              <h2>Do link ao horário marcado.</h2>
              <p>
                Seu cliente agenda em poucos cliques,
                <br />
                sem complicação.
              </p>
              <Action href="/demo">Ver como funciona</Action>
            </div>
            <div className={s.phones}>
              {[
                "Escolha o barbeiro",
                "Selecione o serviço",
                "Escolha o horário",
              ].map((title, index) => (
                <div key={title}>
                  <span className={s.number}>0{index + 1}</span>
                  <h3>{title}</h3>
                  <div className={s.phone}>
                    <Image
                      src={`/brand/product/booking-${index + 1}.webp`}
                      alt={`Tela real do agendamento: ${title}`}
                      width={390}
                      height={844}
                      sizes="210px"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className={s.customize}>
          <div className={s.customizeInner}>
            <div>
              <p className={s.eyebrow}>Personalize do seu jeito</p>
              <h2>
                O controle fica
                <br />
                com você.
              </h2>
              <p>
                Configure serviços, equipe, produtos e muito mais. O HeadBarber
                se adapta à realidade da sua barbearia.
              </p>
              <Action />
            </div>
            <div className={s.customizeGrid}>
              {customization.map(([Icon, title, description]) => (
                <article key={title}>
                  <Icon aria-hidden="true" size={32} strokeWidth={1.5} />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <LandingPricing />
        <section className={s.finalCta}>
          <div className={s.container}>
            <p className={s.eyebrow}>Sua barbearia em outro nível</p>
            <h2>
              Sua barbearia merece
              <br />
              uma operação à altura.
            </h2>
            <p>
              Organize, cresça e foque no que realmente importa:
              <br />
              seus clientes.
            </p>
            <Action />
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <Brand />
          <p>Sistema de gestão para barbearias.</p>
          <nav aria-label="Navegação do rodapé">
            <a href="#recursos">Produto</a>
            <a href="#precos">Preços</a>
            <Link href="/demo">Demonstração</Link>
          </nav>
          <Link href="/login" className={s.action}>
            Entrar
          </Link>
        </div>
        <div className={s.footerBottom}>
          <span>
            © {new Date().getFullYear()} HeadBarber. Todos os direitos
            reservados.
          </span>
          <span>Feito para barbearias que vão mais longe.</span>
        </div>
      </footer>
    </div>
  );
}
