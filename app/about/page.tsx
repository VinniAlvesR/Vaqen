import Link from "next/link"
import Image from "next/image"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 overflow-hidden rounded-2xl">
            <Image src="/vaqen-icon.svg" alt="" width={48} height={48} className="scale-[1.1]" priority />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Sobre</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Vaqen</h1>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          O Vaqen é uma plataforma de gestão para organizar clientes, projetos e tarefas com foco em clareza, velocidade e execução diária.
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-slate-600 dark:text-slate-300">
          Desenvolvido pela Next Devz, o Vaqen foi pensado para profissionais, freelancers, empreendedores e pequenas equipes que precisam decidir rapidamente o próximo passo.
        </p>

        <Link href="/today" className="mt-8 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Voltar ao Hoje</Link>
      </section>
    </main>
  )
}