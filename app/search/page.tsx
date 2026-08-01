"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type SearchResult = {
  id: string
  title: string
  subtitle: string | null
  detail: string | null
  entity: "client" | "project" | "task"
}

const entityLabels: Record<SearchResult["entity"], string> = {
  client: "Cliente",
  project: "Projeto",
  task: "Tarefa",
}

const entityHref: Record<SearchResult["entity"], string> = {
  client: "clients",
  project: "projects",
  task: "tasks",
}

const entityStyles: Record<SearchResult["entity"], string> = {
  client: "bg-indigo-100 text-indigo-700",
  project: "bg-sky-100 text-sky-700",
  task: "bg-emerald-100 text-emerald-700",
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(searchTerm: string) {
    setLoading(true)
    setError(null)

    try {
      const url = `/api/search${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ""}`
      const response = await fetch(url)
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || "Erro ao buscar")
      }
      setResults(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSearch("")
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Busca global</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Encontre qualquer registro</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Pesquise clientes, projetos e tarefas em um único lugar.
            </p>
          </div>

          <div className="w-full lg:max-w-xl">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="global-search">
              Termo de pesquisa
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="global-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runSearch(query)
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="Buscar por nome, projeto ou tarefa"
              />
              <button onClick={() => runSearch(query)} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      <section className="mt-6">
        {loading ? (
          <EmptyState title="Buscando resultados..." description="Consultando clientes, projetos e tarefas." />
        ) : results.length === 0 ? (
          <EmptyState title="Nenhum resultado encontrado" description="Tente outro termo ou limpe a busca para visualizar todos os registros disponíveis." />
        ) : (
          <div className="grid gap-4">
            {results.map((result) => (
              <Link
                key={`${result.entity}-${result.id}`}
                href={`/${entityHref[result.entity]}/${result.id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entityStyles[result.entity]}`}>
                      {entityLabels[result.entity]}
                    </span>
                    <h2 className="mt-3 truncate text-xl font-bold text-slate-950">{result.title}</h2>
                    {result.detail ? <p className="mt-2 text-sm text-slate-600">{result.detail}</p> : null}
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    {result.subtitle || "Sem referência"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-500">{description}</p>
    </div>
  )
}
