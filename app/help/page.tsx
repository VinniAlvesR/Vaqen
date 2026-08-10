import Link from "next/link"

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Ajuda</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Central de ajuda</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Encontre orientação para usar o Vaqen e organizar clientes, projetos e tarefas.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <HelpCard title="Primeiros passos" text="Crie clientes, conecte projetos e acompanhe suas tarefas pela Tela Hoje." />
          <HelpCard title="Conta e segurança" text="Gerencie perfil, senha, sessões, exportação e exclusão de dados em Configurações." />
          <HelpCard title="Planos e cobrança" text="Consulte limites do plano, assinatura e acesso ao portal de cobrança." />
          <HelpCard title="Suporte" text="Fale com o suporte pelo email vaqen.suporte@gmail.com." />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/today" className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Voltar ao Hoje</Link>
        </div>
      </section>
    </main>
  )
}

function HelpCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <h2 className="font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </article>
  )
}

