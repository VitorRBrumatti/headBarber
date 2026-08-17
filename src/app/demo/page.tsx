import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Eye, LockKeyhole, Scissors } from 'lucide-react'

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
    <main className="min-h-screen bg-[#f8f9ff] px-5 py-8 text-[#181c21] sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between gap-6">
          <Link href="/" aria-label="Voltar para a página inicial" className="flex items-center gap-2.5">
            <Image
              src="/brand/headbarber_simbolo_duas_cores_transparente.png"
              alt=""
              width={256}
              height={256}
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              priority
            />
            <span className="font-montserrat text-base font-extrabold tracking-[-0.02em] text-[#1b1b1e] sm:text-lg">
              HeadBarber
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[#47464b] transition-colors hover:text-[#181c21] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C79A4A]"
          >
            Voltar ao site
          </Link>
        </header>

        <section className="overflow-hidden rounded-2xl bg-[#1b1b1e] text-white">
          <div className="flex flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:flex-row lg:items-end lg:justify-between lg:px-14 lg:py-16">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#C79A4A]/15 px-3 py-1.5 text-sm font-semibold text-[#e8c57f]">
                <Scissors aria-hidden="true" className="h-4 w-4" />
                Demonstração segura
              </div>
              <h1 className="max-w-xl text-balance font-montserrat text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
                Experimente a HeadBarber antes de decidir.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[#c9c7cc] sm:text-lg">
                Navegue por uma barbearia fictícia, veja a operação por dentro e
                crie um agendamento de teste. Os dados principais ficam protegidos.
              </p>
            </div>

            <div className="flex max-w-sm items-start gap-3 rounded-xl bg-white/7 p-4 text-sm leading-6 text-[#dedce1]">
              <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C79A4A]" />
              A demo não permite excluir cadastros, alterar preços, configurações
              ou dados financeiros.
            </div>
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-xl bg-[#fff1ee] px-5 py-4 text-sm font-medium text-[#8c1d18]">
            A demonstração está indisponível agora. Tente novamente em instantes.
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="flex flex-col justify-between rounded-2xl bg-white p-7 ring-1 ring-[#dfe1e8] sm:p-9">
            <div>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#C79A4A]/12 text-[#916821]">
                <CalendarDays aria-hidden="true" className="h-6 w-6" />
              </div>
              <h2 className="text-balance font-montserrat text-2xl font-bold tracking-[-0.02em]">
                Testar como cliente
              </h2>
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-[#5f5e63]">
                Conheça a experiência pública de quem escolhe profissional,
                serviço, data e horário.
              </p>
            </div>
            <Link
              href={`/booking/${bookingSlug}`}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#29292d] px-5 text-sm font-bold text-[#1b1b1e] transition-colors hover:bg-[#f1f3fa] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C79A4A]"
            >
              Testar agendamento
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="flex flex-col justify-between rounded-2xl bg-white p-7 ring-1 ring-[#dfe1e8] sm:p-9">
            <div>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b1b1e] text-[#C79A4A]">
                <Eye aria-hidden="true" className="h-6 w-6" />
              </div>
              <h2 className="text-balance font-montserrat text-2xl font-bold tracking-[-0.02em]">
                Conhecer o painel da barbearia
              </h2>
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-[#5f5e63]">
                Entre direto, sem e-mail ou senha. Explore os dados e crie um
                agendamento sem risco de alterar a estrutura da demo.
              </p>
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Áreas disponíveis">
                {visibleAreas.map((area) => (
                  <span key={area} className="rounded-full bg-[#f1f3fa] px-3 py-1 text-xs font-semibold text-[#47464b]">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <form action="/auth/demo" method="post" className="mt-8">
              <button
                type="submit"
                className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C79A4A] px-5 text-sm font-bold text-[#1b1b1e] transition-colors hover:bg-[#d6aa5b] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8a641f]"
              >
                Abrir painel demo
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>
        </section>

        <p className="text-center text-xs leading-5 text-[#65646a]">
          Os dados exibidos são fictícios e podem ser restaurados periodicamente.
        </p>
      </div>
    </main>
  )
}
