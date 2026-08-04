import Link from "next/link"

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Vaqen Beta</p>
        <h1 className="mt-3 text-4xl font-bold">Acesso Beta gratuito</h1>
        <p className="mt-3 text-slate-600">Durante o Beta, o Vaqen está focado em validação do produto. Cobrança e assinatura ficam fora da versão publicada.</p>
      </div>

      <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 text-center">
        <h2 className="text-2xl font-bold">Beta</h2>
        <p className="mt-3 text-3xl font-bold">R$ 0</p>
        <ul className="mt-6 space-y-2 text-slate-700">
          <li>✓ Clientes, projetos e tarefas para testar o fluxo</li>
          <li>✓ Tela Hoje, histórico, lixeira e feedback</li>
          <li>✓ Exportação e exclusão de dados</li>
        </ul>
      </section>

      <p className="mt-8 text-center">
        <Link href="/auth/signup" className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700">Criar conta</Link>
      </p>
    </main>
  )
}
