"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Calculator,
  CalendarCheck2,
  ChevronDown,
  History,
  Menu,
  MessageSquareOff,
  Package,
  Repeat2,
  UsersRound,
  X,
} from "lucide-react";
import { trackTrialClick, trackWhatsAppClick } from "@/lib/analytics";
import LandingPricing from "./landing-pricing";
import s from "./landing.module.css";

export const WHATSAPP_URL =
  "https://wa.me/5544999954481?text=Oi%20Vitor,%20quero%20conhecer%20o%20HeadBarber%20pra%20minha%20barbearia";

const painPoints = [
  {
    icon: MessageSquareOff,
    title: 'Chega de "tem horário hoje?"',
    description:
      "Coloque o link na bio do Instagram e na mensagem automática do Whats. O cliente vê os horários livres e marca sozinho.",
  },
  {
    icon: CalendarCheck2,
    title: "Zero confusão na agenda",
    description:
      "Cada barbeiro vê seus próprios horários. Sem encaixe errado, sem cliente duplicado e sem esquecimento no sábado.",
  },
  {
    icon: Calculator,
    title: "Fechamento de caixa em 2 minutos",
    description:
      "Esqueça calculadora no fim do dia. O sistema calcula entradas, saídas e a comissão exata de cada barbeiro.",
  },
] as const;

const clientSteps = [
  {
    step: "Passo 1",
    title: "Abre o link da barbearia (no Insta ou WhatsApp)",
    image: "/brand/product/booking-1.webp",
    alt: "Tela real do agendamento online mostrando a abertura do link da barbearia",
  },
  {
    step: "Passo 2",
    title: "Escolhe o barbeiro e o serviço (com preço e duração na tela)",
    image: "/brand/product/booking-2.webp",
    alt: "Tela real do agendamento online com serviços, preço e duração",
  },
  {
    step: "Passo 3",
    title: "Escolhe o horário e confirma — pronto, já cai na sua agenda.",
    image: "/brand/product/booking-3.webp",
    alt: "Tela real do agendamento online para escolha de horário e confirmação",
  },
] as const;

const faqs = [
  {
    question: "Meu cliente precisa baixar algum aplicativo?",
    answer:
      "Não. Ele abre o link direto no navegador do celular, escolhe o horário e agenda em segundos.",
  },
  {
    question: "Funciona só pelo celular ou preciso de computador?",
    answer:
      "Funciona 100% pelo celular, tablet ou computador. Você gerencia a agenda e o caixa da palma da mão.",
  },
  {
    question: "Eu pago mais caro se tiver vários barbeiros?",
    answer:
      "Não. O valor é fixo para a barbearia, com barbeiros ilimitados.",
  },
  {
    question: "E se eu não souber configurar o sistema?",
    answer:
      "Você não fica sozinho. Chama a gente no WhatsApp que nós cadastramos sua equipe, serviços e preços junto com você.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim, sem multa e sem burocracia.",
  },
] as const;

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.33-1.66a11.85 11.85 0 0 0 5.73 1.46h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42ZM12.07 21.8h-.01a9.87 9.87 0 0 1-5.04-1.38l-.36-.21-3.76.99 1-3.66-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.46 4.44-9.9 9.91-9.9 2.64 0 5.13 1.03 7 2.9a9.84 9.84 0 0 1 2.9 7c0 5.46-4.44 9.9-9.89 9.9Zm5.43-7.42c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z"
      />
    </svg>
  );
}

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

export default function LandingRedesign() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const root = landingRef.current;
      if (!root) return;
      const compact = window.matchMedia("(max-width: 640px)").matches;
      const select = gsap.utils.selector(root);
      const distance = compact ? 14 : 26;

      gsap
        .timeline({ defaults: { ease: "power3.out", duration: 0.7 } })
        .from(select(`.${s.heroCopy} > *`), {
          y: distance,
          opacity: 0,
          stagger: 0.08,
          clearProps: "transform,opacity",
        })
        .from(
          select(`.${s.heroScreen}`),
          {
            y: distance,
            opacity: 0,
            clearProps: "transform,opacity",
          },
          0.18,
        );

      for (const selector of [
        `.${s.painList}`,
        `.${s.phones}`,
        `.${s.bentoGrid}`,
        `.${s.pricingCards}`,
        `.${s.faqList}`,
      ]) {
        const group = select(selector)[0] as HTMLElement | undefined;
        if (!group) continue;
        gsap.from(group.children, {
          y: distance,
          opacity: 0,
          duration: 0.65,
          stagger: compact ? 0.06 : 0.1,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: group, start: "top 90%", once: true },
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
          <div className={s.desktopLinks}>
            <a href="#recursos">Recursos</a>
            <a href="#precos">Preços</a>
            <a href="#duvidas">Dúvidas</a>
          </div>
          <div className={s.desktopActions}>
            <Link href="/login" className={`${s.action} ${s.secondary} ${s.navBtn}`}>
              Entrar
            </Link>
            <Link
              href="/login"
              className={`${s.action} ${s.navBtn}`}
              onClick={() => trackTrialClick("navbar")}
            >
              Testar grátis
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
          <button
            type="button"
            className={s.menuButton}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
            <a href="#duvidas" onClick={() => setMobileOpen(false)}>
              Dúvidas
            </a>
            <div className={s.mobileNavActions}>
              <Link
                href="/login"
                className={`${s.action} ${s.secondary}`}
                onClick={() => setMobileOpen(false)}
              >
                Entrar
              </Link>
              <Link
                href="/login"
                className={s.action}
                onClick={() => {
                  trackTrialClick("navbar");
                  setMobileOpen(false);
                }}
              >
                Testar grátis
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="conteudo">
        <section className={s.heroWorld} aria-labelledby="hero-title">
          <Image
            src="/brand/barbershop-hero.png"
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="58vw"
            className={s.heroPhoto}
          />
          <div className={s.hero}>
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>Agendamento e gestão para barbearias</p>
              <h1 id="hero-title">
                Pare de perder tempo no WhatsApp{" "}
                <span>e corte mais cabelo.</span>
              </h1>
              <p className={s.heroDescription}>
                Seu cliente agenda em 20 segundos pelo link na bio — sem baixar
                aplicativo e sem criar senha. Você controla agenda, comissões,
                assinaturas e caixa direto do celular.
              </p>
              <div className={s.actions}>
                <Link
                  href="/login"
                  className={s.action}
                  onClick={() => trackTrialClick("hero")}
                >
                  Testar 14 dias grátis
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${s.action} ${s.secondary}`}
                  onClick={() => trackWhatsAppClick("hero")}
                >
                  <WhatsAppIcon size={17} />
                  Falar no WhatsApp
                </a>
              </div>
              <p className={s.heroMicrocopy}>
                Sem cartão de crédito · A gente configura seus serviços pra você
              </p>
            </div>

            <div className={s.heroScreen}>
              <Image
                src="/brand/product/agenda.webp"
                alt="Tela real da agenda do HeadBarber com horários da equipe"
                width={1440}
                height={960}
                preload
                sizes="(max-width: 900px) 94vw, 56vw"
              />
              <span className={s.captureLabel}>
                HeadBarber · Agenda real do sistema
              </span>
            </div>
          </div>
        </section>

        <section className={s.painSection} aria-labelledby="pain-title">
          <div className={s.painInner}>
            <div className={s.painIntro}>
              <p className={s.eyebrow}>Rotina de barbearia</p>
              <h2 id="pain-title">
                Barbearia cheia não combina com caderninho e WhatsApp travado.
              </h2>
              <p className={s.painAside}>
                Enquanto você tá com a máquina na mão, o cliente quer só saber se
                tem vaga às 18h. Com o HeadBarber, ele resolve sozinho e você não
                perde corte nem mensagem.
              </p>
            </div>

            <div className={s.painList}>
              {painPoints.map(({ icon: Icon, title, description }) => (
                <article className={s.painCard} key={title}>
                  <div className={s.painIcon} aria-hidden="true">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className={s.booking}
          aria-labelledby="booking-title"
        >
          <div className={s.container}>
            <div className={s.bookingHeader}>
              <div>
                <p className={s.eyebrow}>Na prática pro seu cliente</p>
                <h2 id="booking-title">
                  Fácil pro seu cliente marcar. Impossível ele desistir no meio.
                </h2>
                <p className={s.bookingLead}>
                  Ninguém quer baixar mais um app só pra cortar o cabelo.
                </p>
              </div>
              <Link href="/demo" className={`${s.action} ${s.secondary}`}>
                Ver agendamento ao vivo
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>

            <div className={s.phones}>
              {clientSteps.map((item) => (
                <article className={s.stepCard} key={item.step}>
                  <div className={s.stepCopy}>
                    <span className={s.stepTag}>{item.step}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className={s.phone}>
                    <Image
                      src={item.image}
                      alt={item.alt}
                      width={390}
                      height={844}
                      sizes="(max-width: 640px) 240px, 30vw"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className={s.bento} aria-labelledby="bento-title">
          <div className={s.container}>
            <div className={s.bentoHeader}>
              <p className={s.eyebrow}>Recursos no dia a dia</p>
              <h2 id="bento-title">
                Tudo que uma barbearia de verdade usa no dia a dia.
              </h2>
            </div>

            <div className={s.bentoGrid}>
              <article className={`${s.bentoCard} ${s.bentoWide} ${s.bentoDark}`}>
                <div className={s.bentoText}>
                  <span className={s.bentoIcon} aria-hidden="true">
                    <Repeat2 size={20} strokeWidth={1.75} />
                  </span>
                  <h3>Clube de Assinaturas</h3>
                  <p>
                    Crie planos mensais de corte e barba e garanta faturamento
                    previsível antes mesmo do mês começar.
                  </p>
                </div>
                <div className={s.bentoScreen}>
                  <Image
                    src="/brand/product/overview.webp"
                    alt="Tela real do HeadBarber com painel de assinaturas e resumo do mês"
                    width={1440}
                    height={960}
                    sizes="(max-width: 900px) 92vw, 52vw"
                  />
                </div>
              </article>

              <article className={`${s.bentoCard} ${s.bentoTall}`}>
                <div className={s.bentoText}>
                  <span className={s.bentoIcon} aria-hidden="true">
                    <UsersRound size={20} strokeWidth={1.75} />
                  </span>
                  <h3>Comissão automática da equipe</h3>
                  <p>
                    Cadastre quantos barbeiros quiser, cada um com sua agenda,
                    serviços e porcentagem.
                  </p>
                </div>
                <div className={s.bentoScreen}>
                  <Image
                    src="/brand/product/finance.webp"
                    alt="Tela real do financeiro do HeadBarber com caixa e comissões"
                    width={1440}
                    height={960}
                    sizes="(max-width: 900px) 92vw, 38vw"
                  />
                </div>
              </article>

              <article className={`${s.bentoCard} ${s.bentoHalf}`}>
                <span className={s.bentoIcon} aria-hidden="true">
                  <Package size={20} strokeWidth={1.75} />
                </span>
                <h3>Produtos e estoque</h3>
                <p>
                  Registre pomada, óleo ou bebida junto com o corte e saiba o que
                  realmente dá lucro.
                </p>
              </article>

              <article className={`${s.bentoCard} ${s.bentoHalf}`}>
                <span className={s.bentoIcon} aria-hidden="true">
                  <History size={20} strokeWidth={1.75} />
                </span>
                <h3>Histórico de clientes</h3>
                <p>
                  Saiba quem cortou, quando foi a última vez e qual serviço
                  prefere.
                </p>
              </article>
            </div>
          </div>
        </section>

        <LandingPricing whatsappUrl={WHATSAPP_URL} />

        <section id="duvidas" className={s.faq} aria-labelledby="faq-title">
          <div className={s.faqInner}>
            <div className={s.faqIntro}>
              <p className={s.eyebrow}>Sem letra miúda</p>
              <h2 id="faq-title">Dúvidas frequentes</h2>
              <p className={s.faqLead}>
                Ficou com alguma pergunta sobre como funciona na sua barbearia?
                Chama direto no WhatsApp que a gente responde rápido.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={s.faqWhatsapp}
                onClick={() => trackWhatsAppClick("faq")}
              >
                <WhatsAppIcon size={17} />
                Perguntar no WhatsApp
              </a>
            </div>

            <div className={s.faqList}>
              {faqs.map((item, index) => {
                const isOpen = openFaq === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;

                return (
                  <div
                    className={`${s.faqItem} ${isOpen ? s.faqItemOpen : ""}`}
                    key={item.question}
                  >
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        className={s.faqTrigger}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          size={19}
                          aria-hidden="true"
                          className={s.faqChevron}
                        />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className={s.faqAnswer}
                    >
                      <p>{item.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={s.finalCta} aria-labelledby="final-cta-title">
          <div className={s.finalCtaInner}>
            <h2 id="final-cta-title">
              Teste na sua barbearia por 14 dias sem compromisso.
            </h2>
            <div className={s.finalCtaActions}>
              <Link
                href="/login"
                className={s.action}
                onClick={() => trackTrialClick("footer")}
              >
                Começar teste grátis
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.action} ${s.secondary}`}
                onClick={() => trackWhatsAppClick("footer")}
              >
                <WhatsAppIcon size={17} />
                Tirar dúvida no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerTop}>
          <Brand />
          <p>Agendamento e gestão para barbearias.</p>
          <nav aria-label="Navegação do rodapé">
            <a href="#recursos">Recursos</a>
            <a href="#precos">Preços</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <Link href="/login" className={`${s.action} ${s.secondary} ${s.navBtn}`}>
            Entrar
          </Link>
        </div>
        <div className={s.footerBottom}>
          <span>
            © {new Date().getFullYear()} HeadBarber. Todos os direitos
            reservados.
          </span>
          <div className={s.footerLegal}>
            <Link href="/demo">Demonstração</Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("footer")}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={s.whatsappFloat}
        aria-label="Falar com o HeadBarber no WhatsApp"
        onClick={() => trackWhatsAppClick("floating")}
      >
        <WhatsAppIcon size={22} />
        <span className={s.whatsappFloatLabel}>WhatsApp</span>
      </a>
    </div>
  );
}
