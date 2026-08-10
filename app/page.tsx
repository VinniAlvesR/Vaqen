import Link from "next/link"
import Image from "next/image"

const audiences = ["Freelancers", "Agências", "Consultores", "Prestadores de serviço"]

const pillars = [
  ["Clientes", "quem você atende"],
  ["Projetos", "o que está em andamento"],
  ["Tarefas", "o que precisa ser feito agora"],
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-9rem] h-96 w-96 rounded-full bg-indigo-600/35 blur-3xl" />
        <div className="absolute right-[-8rem] top-20 h-[26rem] w-[26rem] rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-black tracking-tight">
            <Image src="/vaqen-icon.svg" alt="" width={36} height={36} className="rounded-xl" priority />
            <span>Vaqen</span>
          </Link>
          <div />
        </nav>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-indigo-300/30 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-100">
              Para quem vende serviço e precisa controlar entregas
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
              Organize clientes, projetos e tarefas
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-200 to-sky-200 bg-clip-text text-transparent">
                sem perder o foco do dia.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              O Vaqen ajuda você a saber quem atender, qual entrega está próxima do prazo e qual tarefa deve ser resolvida agora.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {audiences.map((audience) => (
                <span key={audience} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-slate-200">
                  {audience}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400">
                Começar agora
              </Link>
              <Link href="/auth/login" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-indigo-500/25 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-300">Hoje</p>
                    <h2 className="mt-2 text-2xl font-black">O que precisa de atenção?</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-200">Central de foco</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <PreviewCard label="Atrasadas" value="2" color="text-red-300" />
                  <PreviewCard label="Urgentes" value="3" color="text-orange-300" />
                  <PreviewCard label="Vencem hoje" value="4" color="text-sky-300" />
                  <PreviewCard label="Projetos próximos" value="2" color="text-indigo-300" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {pillars.map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-400">{description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="font-black text-emerald-100">Menos planilha solta. Mais decisão clara.</p>
                <p className="mt-1 text-sm text-emerald-200/80">Entre, veja prioridades e execute.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function PreviewCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
    </div>
  )
}
