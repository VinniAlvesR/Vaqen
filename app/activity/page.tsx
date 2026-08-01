"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import { useCallback, useEffect, useState } from "react"
import { Activity } from "@/types/activity"

const entityOptions = [
  { value: "", label: "Todas" },
  { value: "client", label: "Cliente" },
  { value: "project", label: "Projeto" },
  { value: "task", label: "Tarefa" },
  { value: "auth", label: "Autenticação" },
]

const actionOptions = [
  { value: "", label: "Todas" },
  { value: "created", label: "Criado" },
  { value: "updated", label: "Atualização" },
  { value: "deleted", label: "Deletado" },
  { value: "completed", label: "Concluído" },
  { value: "reopened", label: "Reaberto" },
  { value: "archived", label: "Arquivado" },
  { value: "unarchived", label: "Desarquivado" },
  { value: "login", label: "Login" },
  { value: "signup", label: "Cadastro" },
  { value: "logout", label: "Logout" },
]

const actionLevels: Record<string, { label: string; className: string }> = {
  created: { label: "Sucesso", className: "bg-emerald-100 text-emerald-700" },
  updated: { label: "Atualização", className: "bg-sky-100 text-sky-700" },
  deleted: { label: "Aviso", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Sucesso", className: "bg-emerald-100 text-emerald-700" },
  reopened: { label: "Atualização", className: "bg-sky-100 text-sky-700" },
  archived: { label: "Arquivo", className: "bg-slate-200 text-slate-700" },
  unarchived: { label: "Atualização", className: "bg-sky-100 text-sky-700" },
  login: { label: "Info", className: "bg-indigo-100 text-indigo-700" },
  signup: { label: "Info", className: "bg-indigo-100 text-indigo-700" },
  logout: { label: "Info", className: "bg-indigo-100 text-indigo-700" },
}

const entityLabels: Record<string, string> = {
  client: "Cliente",
  project: "Projeto",
  task: "Tarefa",
  auth: "Autenticação",
}

export default function ActivityPage() {
  const confirmAction = useConfirm()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchActivities = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (entityFilter) params.set("entity", entityFilter)
      if (actionFilter) params.set("action", actionFilter)
      params.set("page", String(pageToLoad))
      params.set("limit", "12")

      const response = await fetch(`/api/activity?${params.toString()}`)
      if (!response.ok) throw new Error("Não foi possível carregar o histórico")

      const data = await response.json()
      if (!data.activities) throw new Error("Resposta de histórico inválida")

      setActivities((current) => (append ? [...current, ...data.activities] : data.activities))
      setHasMore(Boolean(data.hasMore))
      setPage(pageToLoad)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [actionFilter, entityFilter, search])

  useEffect(() => {
    fetchActivities(1, false)
  }, [fetchActivities])

  function handleLoadMore() {
    fetchActivities(page + 1, true)
  }

  async function handleDelete(activityId: string) {
    if (!(await confirmAction({ title: "Excluir atividade?", description: "Esta atividade será removida do histórico definitivamente.", confirmLabel: "Excluir", variant: "danger" }))) return

    try {
      setDeletingId(activityId)
      setError(null)
      const response = await fetch("/api/activity", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Não foi possível excluir a atividade")
      }

      setActivities((current) => current.filter((activity) => activity.id !== activityId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Histórico</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Histórico de atividades</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Audite ações importantes do fluxo de trabalho e remova registros que não precisam ficar visíveis.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Nesta página" value={activities.length} />
          <SummaryCard label="Página atual" value={page} />
          <SummaryCard label="Tem mais" value={hasMore ? "Sim" : "Não"} />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
          <Field label="Buscar">
            <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Termo, entidade ou detalhe" />
          </Field>
          <Field label="Categoria">
            <select className={inputClass} value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
              {entityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Ação">
            <select className={inputClass} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => {
              setSearch("")
              setEntityFilter("")
              setActionFilter("")
            }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      <section className="mt-6">
        {loading && activities.length === 0 ? (
          <EmptyState title="Carregando histórico..." description="Buscando registros de atividade." />
        ) : activities.length === 0 ? (
          <EmptyState title="Nenhuma atividade encontrada" description="Ajuste os filtros ou execute ações no sistema para gerar histórico." />
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const level = actionLevels[activity.action]
              return (
                <article key={activity.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-slate-950">{formatAction(activity.action)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {entityLabels[activity.entity] ?? activity.entity}
                        </span>
                        {level ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ${level.className}`}>{level.label}</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{new Date(activity.createdAt).toLocaleString("pt-BR")}</p>
                      <p className="mt-3 text-slate-600">{activity.detail || "Sem detalhe registrado."}</p>
                      <p className="mt-2 text-xs font-medium text-slate-400">ID {activity.entityId ?? "-"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(activity.id)}
                      disabled={deletingId === activity.id}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Excluir atividade ${activity.id}`}
                    >
                      {deletingId === activity.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </article>
              )
            })}

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <button type="button" onClick={handleLoadMore} disabled={loading} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-8 text-center shadow-sm"><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-2 text-slate-500">{description}</p></div>
}

function formatAction(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}
