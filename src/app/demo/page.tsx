import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Eye, LockKeyhole, ShieldCheck, Database, Zap, ArrowRight, Check, Sparkles } from 'lucide-react'
import styles from './demo.module.css'

const visibleAreas = [
  'Dashboard',
  'Agenda',
  'Clientes',
  'Financeiro',
  'Serviços',
  'Barbeiros',
]

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const bookingSlug = process.env.DEMO_BOOKING_SLUG || 'headbarber-demo'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" aria-label="Voltar para a página inicial" className={styles.brand}>
            <Image src="/brand/headbarber_simbolo_duas_cores_transparente.png" alt="" width={45} height={45} priority />HeadBarber
          </Link>
          <Link href="/" className={styles.back}>Voltar ao site<ArrowRight aria-hidden="true" /></Link>
        </header>
        <section className={styles.hero}>
          <Image src="/brand/barbershop-auth.webp" alt="" fill priority sizes="(max-width: 1400px) 100vw, 1400px" className={styles.heroPhoto} />
          <div className={styles.heroCopy}>
            <div className={styles.badge}><ShieldCheck aria-hidden="true" />Demonstração segura</div>
            <h1>Experimente a<br />HeadBarber<br /><span>antes de decidir.</span></h1>
            <p>Navegue por uma barbearia fictícia, veja a operação por dentro e crie um agendamento de teste. Os dados principais ficam protegidos.</p>
            <ul className={styles.assurances}>
              <li><Eye aria-hidden="true" /><span>Sem risco<br />para seus dados</span></li>
              <li><Database aria-hidden="true" /><span>Dados<br />simulados</span></li>
              <li><Zap aria-hidden="true" /><span>Explore<br />no seu ritmo</span></li>
            </ul>
          </div>
          <aside className={styles.protected}>
            <LockKeyhole aria-hidden="true" />
            <h2>Ambiente de demonstração protegido</h2>
            <p>A demo não permite excluir cadastros, alterar preços, configurações ou dados financeiros.</p>
          </aside>
        </section>
        {error ? <div role="alert" className={styles.notice}>A demonstração está indisponível agora. Tente novamente em instantes.</div> : null}
        <section className={styles.choices} aria-label="Escolha como explorar">
          <article className={styles.choice}>
            <div className={styles.choiceCopy}>
              <CalendarDays aria-hidden="true" className={styles.choiceIcon} />
              <h2>Testar como cliente</h2>
              <p>Conheça a experiência completa de agendamento na visão do seu cliente. Escolha um serviço, barbeiro, data e horário como em uma barbearia real.</p>
              <ul className={styles.chips}>{['Escolha barbeiro', 'Selecione serviço', 'Defina horário'].map(item => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
              <Link href={`/booking/${bookingSlug}`} className={styles.button}>Testar agendamento<ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className={styles.phone}><Image src="/brand/product/booking-1.webp" alt="Tela real de seleção do profissional no HeadBarber" width={390} height={844} sizes="(max-width: 480px) 65vw, 200px" /></div>
          </article>
          <article className={styles.choice}>
            <div className={styles.choiceCopy}>
              <Eye aria-hidden="true" className={styles.choiceIcon} />
              <h2>Conhecer o painel da barbearia</h2>
              <p>Entre direto, sem e-mail ou senha. Explore os dados e crie um agendamento sem risco de alterar a estrutura da demo.</p>
              <ul className={styles.chips} aria-label="Áreas disponíveis">{visibleAreas.map(area => <li key={area}><Check aria-hidden="true" />{area}</li>)}</ul>
              <form action="/auth/demo" method="post"><button type="submit" className={`${styles.button} ${styles.primary}`}>Abrir painel demo<ArrowRight aria-hidden="true" /></button></form>
            </div>
            <div className={styles.screen}><Image src="/brand/product/overview.webp" alt="Visão real do painel HeadBarber com dados de demonstração" width={1440} height={900} sizes="(max-width: 480px) 90vw, 360px" /></div>
          </article>
        </section>
        <footer className={styles.footer}>
          <div><ShieldCheck aria-hidden="true" /><div><strong>Acesso seguro</strong><p>Ambiente isolado com dados fictícios.</p></div></div>
          <div><Database aria-hidden="true" /><div><strong>Não requer cadastro</strong><p>Acesse e explore sem criar uma conta.</p></div></div>
          <div><Sparkles aria-hidden="true" /><div><strong>Explore no seu ritmo</strong><p>Conheça o produto antes de decidir.</p></div></div>
        </footer>
        <p className={styles.fineprint}>Os dados exibidos são fictícios e podem ser restaurados periodicamente.</p>
      </div>
    </main>
  )
}
