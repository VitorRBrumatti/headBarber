import { Button } from "@/components/ui/button"
import { Scissors, CalendarCheck, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <nav className="fixed top-0 w-full z-50 glass-dark border-b-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">HeadBarber</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-300 hover:text-white">Login</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(217,119,6,0.5)]">
                Acessar Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10" />
          
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-sm text-zinc-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              O futuro da gestão para barbearias
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
              Eleve sua Barbearia <br className="hidden md:block" />
              ao Próximo Nível
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              Um sistema completo, impecável e focado na experiência. Gerencie agendamentos, profissionais e finanças em uma única plataforma premium.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-base shadow-[0_0_30px_rgba(217,119,6,0.4)]">
                  Começar Agora
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-zinc-800 hover:bg-zinc-900">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="py-20 bg-zinc-950/50 border-t border-zinc-900">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: CalendarCheck,
                  title: "Agendamento Inteligente",
                  desc: "Evite conflitos, gerencie filas e encante seus clientes com um fluxo de reservas simples."
                },
                {
                  icon: Scissors,
                  title: "Gestão de Equipe",
                  desc: "Acompanhe comissões, horários de trabalho e a performance individual de cada barbeiro."
                },
                {
                  icon: TrendingUp,
                  title: "Controle Financeiro",
                  desc: "Métricas claras, fluxo de caixa e relatórios precisos para o crescimento do seu negócio."
                }
              ].map((feat, i) => (
                <div key={i} className="p-8 rounded-2xl glass-dark hover:bg-zinc-900/80 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feat.icon className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
