import Link from "next/link"

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Planos simples</h1>
        <p className="mt-3 text-slate-600">Teste o Pro por 30 dias. Cartão não é exigido no cadastro.</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Plan title="Gratuito" price="R$ 0" items={["5 clientes", "10 projetos", "50 tarefas", "Exportação e leitura preservadas"]} />
        <Plan title="Pro" price="R$ 39/mês" items={["Clientes, projetos e tarefas sem limite do Gratuito", "30 dias de trial", "Cobrança e cancelamento pelo portal Stripe"]} featured />
      </div>
      <p className="mt-8 text-center"><Link href="/auth/signup" className="font-semibold text-indigo-700">Começar agora</Link></p>
    </main>
  )
}

function Plan({ title, price, items, featured = false }: { title: string; price: string; items: string[]; featured?: boolean }) {
  return (
    <section className={`rounded-2xl border p-7 ${featured ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"}`}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-3xl font-bold">{price}</p>
      <ul className="mt-6 space-y-2 text-slate-700">{items.map((item) => <li key={item}>✓ {item}</li>)}</ul>
    </section>
  )
}
