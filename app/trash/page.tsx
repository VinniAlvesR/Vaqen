"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

interface TrashItem {
  id: string
  name: string
  type: string
  deletedAt: string
  parentName?: string | null
}

export default function TrashPage() {
  const confirmAction = useConfirm()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchTrash = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true)
      let url = `/api/trash?page=${pageNum}&limit=12`
      if (selectedFilter !== "all") url += `&entity=${selectedFilter}`

      const res = await fetch(url)
      if (!res.ok) throw new Error("Erro ao buscar lixeira")
      const data = await res.json()
      setItems(data.items)
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar lixeira")
    } finally {
      setLoading(false)
    }
  }, [selectedFilter])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRestore = async (id: string, type: string) => {
    try {
      setRestoring(id)
      const res = await fetch(`/api/${type}s/${id}/restore`, { method: "POST" })
      if (!res.ok) throw new Error("Erro ao restaurar")

      setItems(items.filter((item) => item.id !== id))
      if (items.length === 1 && page > 1) {
        setPage(page - 1)
        fetchTrash(page - 1)
      }
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Erro ao restaurar" })
    } finally {
      setRestoring(null)
    }
  }

  const handleDelete = async (id: string, type: string) => {
    if (!(await confirmAction({
      title: "Excluir definitivamente?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "danger",
    }))) return

    try {
      setDeleting(id)
      const res = await fetch(`/api/${type}s/${id}/restore`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")

      setItems(items.filter((item) => item.id !== id))
      if (items.length === 1 && page > 1) {
        setPage(page - 1)
        fetchTrash(page - 1)
      }
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Erro ao excluir" })
    } finally {
      setDeleting(null)
    }
  }
  const handleClearAll = async () => {
    if (!(await confirmAction({
      title: "Limpar histórico?",
      description: "Todas as atividades da lixeira serão removidas definitivamente. Esta ação não pode ser desfeita.",
      confirmLabel: "Limpar",
      variant: "danger",
    }))) return

    try {
      const res = await fetch("/api/activity", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      })

      if (!res.ok) throw new Error("Erro ao limpar histórico")
      setNotice({ type: "success", message: "Histórico de atividades limpo com sucesso." })
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Erro ao limpar histórico" })
    }
  }
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client: "Cliente",
      project: "Projeto",
      task: "Tarefa",
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      client: "bg-blue-100 text-blue-800",
      project: "bg-purple-100 text-purple-800",
      task: "bg-indigo-100 text-indigo-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  return (
    <main className="vaqen-trash-page min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/dashboard" className="mb-4 inline-block text-sm font-semibold text-indigo-600 transition hover:text-indigo-700">Voltar</Link>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Sistema</p>
                <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">Lixeira</h1>
                <p className="mt-2 text-slate-600">Visualize e restaure itens excluídos.</p>
              </div>
              <button
                onClick={handleClearAll}
                className="w-fit rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
Limpar histórico
              </button>
            </div>
          </section>
        </div>

        {notice ? (
          <div className={`mb-6 rounded-2xl border p-4 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"}`}>
            {notice.message}
          </div>
        ) : null}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
          <label className="mb-3 block text-sm font-semibold text-slate-700">Filtrar por tipo</label>
          <div className="flex flex-wrap gap-2">
            {["all", "client", "project", "task"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedFilter === filter
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {filter === "all" ? "Todos" : getTypeLabel(filter)}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-lg font-semibold text-slate-700">Nenhum item na lixeira</p>
            <Link href="/clients" className="font-semibold text-indigo-600 transition hover:text-indigo-700">
              Voltar para clientes
            </Link>
          </section>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <article key={`${item.type}-${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeColor(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                        <h3 className="truncate text-lg font-semibold text-slate-950">{item.name}</h3>
                      </div>
                      {item.parentName ? <p className="text-sm text-slate-600">{item.parentName}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">
                        Deletado: {new Date(item.deletedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRestore(item.id, item.type)}
                        disabled={restoring === item.id || deleting === item.id}
                        className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        {restoring === item.id ? "Restaurando..." : "Restaurar"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.type)}
                        disabled={deleting === item.id || restoring === item.id}
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === item.id ? "Deletando..." : "Deletar"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchTrash(page + 1)}
                  className="rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  Carregar mais
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
