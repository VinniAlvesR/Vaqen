const freeItems = [
  "9 clientes, 9 projetos e 9 tarefas ativos",
  "Cota diária de criação: 3 clientes, 3 projetos e 3 tarefas",
  "Tela Hoje básica",]

const stripePaymentLinkUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL || "https://buy.stripe.com/bJe8wR9gTcWaclj2i90Ny03"

const proItems = [
  "Clientes, projetos e tarefas sem limite do Gratuito",
  "Trial Pro de 30 dias",
  "Central de Foco avançada com próxima melhor ação",
  "Alertas internos de prazos, tarefas paradas e clientes sem movimento",
  "Dashboard avançado com métricas semanais e mensais",
  "Métricas por cliente e por projeto",
  "Relatórios, modelos e recorrências",
  "Controle financeiro por projeto",
  "Recebíveis, pagamentos atrasados e receita por cliente",
]

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14 text-slate-950 dark:text-white sm:py-16">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">Planos Vaqen</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Produtividade, foco e controle de prazos.</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">O Pro não é apenas mais limite. Ele ajuda você a decidir o que fazer, acompanhar entregas, evitar perder prazo e controlar o dinheiro a receber.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={stripePaymentLinkUrl} className="rounded-full bg-indigo-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-indigo-700">Testar 30 dias grátis</a>
            </div>
          </div>
          <div className="rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-6 dark:border-indigo-500/30 dark:from-indigo-950/30 dark:to-slate-950">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">Pro</p>
            <p className="mt-3 text-5xl font-black">R$ 39,90</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">por mês após o trial</p>
            <p className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">Ideal para freelancers, pequenos times e prestadores que precisam enxergar prioridade, entrega e risco antes de perder prazo.</p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Plan title="Gratuito" price="R$ 0" description="Para usar de verdade com limites controlados." items={freeItems} />
        <Plan title="Pro" price="R$ 39,90/mês" description="Para ganhar velocidade, foco diário e visão profissional." items={proItems} featured />
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500 dark:text-slate-400">Os pagamentos são processados pela Stripe. O Vaqen não armazena dados completos de cartão e usa dados de cobrança somente para liberar e gerenciar a assinatura.</p>
    </main>
  )
}

function Plan({ title, price, description, items, featured = false }: { title: string; price: string; description: string; items: string[]; featured?: boolean }) {
  return (
    <section className={`rounded-[2rem] border p-7 shadow-sm ${featured ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p></div>
        {featured && <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">Recomendado</span>}
      </div>
      <p className="mt-5 text-3xl font-black">{price}</p>
      <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
        {items.map((item) => <li key={item} className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" /> <span>{item}</span></li>)}
      </ul>
    </section>
  )
}