"use client"

import { FormEvent, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

type Entity = "client" | "project" | "task"
type Option = { id: string; name?: string; title?: string }

export default function QuickCreate() {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isExternalRoute = pathname === "/" || pathname.startsWith("/auth") || pathname === "/terms" || pathname === "/privacy" || pathname === "/pricing" || pathname === "/settings" || pathname === "/help" || pathname === "/about"
  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState<Entity>("task")
  const [clients, setClients] = useState<Option[]>([])
  const [projects, setProjects] = useState<Option[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [parentId, setParentId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("Média")

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch("/api/clients").then((response) => response.json()),
      fetch("/api/projects").then((response) => response.json()),
    ])
      .then(([clientData, projectData]) => {
        setClients(clientData)
        setProjects(projectData)
      })
      .catch(() => setError("Não foi possível carregar os relacionamentos"))
  }, [open])

  function reset() {
    setName("")
    setEmail("")
    setCompany("")
    setParentId("")
    setDueDate("")
    setPriority("Média")
    setError(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const payload = entity === "client"
      ? { name, email, company }
      : entity === "project"
        ? {
          name,
          clientId: parentId,
          status: "Planejamento",
          priority,
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: dueDate || null,
          description: "",
        }
        : {
          title: name,
          projectId: parentId || null,
          status: "Pendente",
          priority,
          dueDate: dueDate || null,
          description: "",
        }

    try {
      const response = await fetch(`/api/${entity}s`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? body?.error ?? "Não foi possível criar o registro")
      }

      window.dispatchEvent(new CustomEvent("vaqen:data-changed", { detail: { entity } }))
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setBusy(false)
    }
  }

  if (!isAuthenticated || isExternalRoute) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-xl transition hover:bg-indigo-700 md:bottom-8 md:right-8"
        aria-label="Criar registro"
      >
        +
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 px-3 py-4 sm:px-4 sm:py-8" role="dialog" aria-modal="true" aria-label="Criação rápida">
          <form onSubmit={submit} className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Fluxo rápido</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Novo registro</h2>
              </div>
              <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["client", "project", "task"] as Entity[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { reset(); setEntity(value) }}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                    entity === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {value === "client" ? "Cliente" : value === "project" ? "Projeto" : "Tarefa"}
                </button>
              ))}
            </div>

            {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

            <div className="mt-5 space-y-4">
              <Field label={entity === "task" ? "Título" : "Nome"}>
                <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
              </Field>

              {entity === "client" ? (
                <>
                  <Field label="Email">
                    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Empresa">
                    <input required value={company} onChange={(event) => setCompany(event.target.value)} className={inputClass} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={entity === "project" ? "Cliente" : "Projeto"}>
                    <select required={entity === "project"} value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}>
                      <option value="">{entity === "project" ? "Selecione" : "Sem projeto"}</option>
                      {(entity === "project" ? clients : projects).map((option) => (
                        <option key={option.id} value={option.id}>{option.name || option.title}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Prioridade">
                      <select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClass}>
                        {["Baixa", "Média", "Alta", "Urgente"].map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Prazo">
                      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
                    </Field>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button disabled={busy} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}

const inputClass = "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  )
}
