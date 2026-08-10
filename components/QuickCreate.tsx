"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { suggestedChecklists } from "@/lib/suggested-checklists"

type Entity = "client" | "project" | "task"
type Option = { id: string; name?: string; title?: string }
type BillingStatus = { proAccess: boolean }

const statusOptions = ["Planejamento", "Em andamento"]
const taskStatusOptions = ["Pendente", "Em andamento", "Concluída"]
const priorityOptions = ["Baixa", "Média", "Alta", "Urgente"]

export default function QuickCreate() {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isExternalRoute = pathname === "/" || pathname.startsWith("/auth") || pathname === "/terms" || pathname === "/privacy" || pathname === "/pricing" || pathname === "/settings" || pathname === "/help" || pathname === "/about"

  const [open, setOpen] = useState(false)
  const [entity, setEntity] = useState<Entity>("task")
  const [clients, setClients] = useState<Option[]>([])
  const [projects, setProjects] = useState<Option[]>([])
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [phone, setPhone] = useState("")

  const [parentId, setParentId] = useState("")
  const [status, setStatus] = useState(statusOptions[0])
  const [taskStatus, setTaskStatus] = useState(taskStatusOptions[0])
  const [priority, setPriority] = useState("Média")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")
  const [projectValue, setProjectValue] = useState("")
  const [commercialStatus, setCommercialStatus] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [suggestedChecklistId, setSuggestedChecklistId] = useState("")

  const proAccess = Boolean(billingStatus?.proAccess)
  const selectedChecklist = useMemo(() => suggestedChecklists.find((item) => item.id === suggestedChecklistId) ?? null, [suggestedChecklistId])

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch("/api/clients").then((response) => response.ok ? response.json() : []),
      fetch("/api/projects").then((response) => response.ok ? response.json() : []),
      fetch("/api/billing/status").then((response) => response.ok ? response.json() : { proAccess: false }),
    ])
      .then(([clientData, projectData, billingData]) => {
        setClients(Array.isArray(clientData) ? clientData : [])
        setProjects(Array.isArray(projectData) ? projectData : [])
        setBillingStatus(billingData)
      })
      .catch(() => setError("Não foi possível carregar os relacionamentos"))
  }, [open])

  function reset() {
    setName("")
    setEmail("")
    setCompany("")
    setPhone("")
    setParentId("")
    setStatus(statusOptions[0])
    setTaskStatus(taskStatusOptions[0])
    setPriority("Média")
    setStartDate(new Date().toISOString().slice(0, 10))
    setDueDate("")
    setDescription("")
    setProjectValue("")
    setCommercialStatus("")
    setInternalNotes("")
    setSuggestedChecklistId("")
    setError(null)
  }

  function switchEntity(value: Entity) {
    reset()
    setEntity(value)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const parsedValue = projectValue ? Number(projectValue.replace(",", ".")) : null
    const payload = entity === "client"
      ? { name, email, company, phone }
      : entity === "project"
        ? {
          name,
          clientId: parentId,
          status,
          priority,
          startDate,
          dueDate: dueDate || null,
          description,
          projectValueCents: parsedValue && parsedValue > 0 ? Math.round(parsedValue * 100) : null,
          commercialStatus: commercialStatus || null,
          internalNotes: internalNotes || null,
        }
        : {
          title: name,
          projectId: parentId || null,
          status: taskStatus,
          priority,
          dueDate: dueDate || null,
          description,
          suggestedChecklistId: proAccess ? suggestedChecklistId || null : null,
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
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-xl transition hover:bg-indigo-700 md:bottom-8 md:right-8"
        aria-label="Criar registro"
      >
        +
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end overflow-hidden bg-slate-950/50 px-0 py-0 sm:block sm:overflow-y-auto sm:px-4 sm:py-8" role="dialog" aria-modal="true" aria-label="Criação rápida">
          <form onSubmit={submit} className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-b-0 border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:mx-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-3xl sm:border sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Fluxo rápido</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Novo registro</h2>
              </div>
              <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["client", "project", "task"] as Entity[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchEntity(value)}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    entity === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {value === "client" ? "Cliente" : value === "project" ? "Projeto" : "Tarefa"}
                </button>
              ))}
            </div>

            {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

            <div className="mt-5 space-y-4">
              <Field label={entity === "task" ? "Título" : "Nome"}>
                <input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
              </Field>

              {entity === "client" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
                  <Field label="Empresa"><input required value={company} onChange={(event) => setCompany(event.target.value)} className={inputClass} /></Field>
                  <Field label="Telefone"><input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} placeholder="Opcional" /></Field>
                </div>
              ) : entity === "project" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Cliente">
                      <select required value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}>
                        <option value="">Selecione o cliente</option>
                        {clients.map((option) => <option key={option.id} value={option.id}>{option.name || option.title}</option>)}
                      </select>
                    </Field>
                    <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Prioridade"><select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClass}>{priorityOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Data de início"><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></Field>
                    <Field label="Prazo final"><input type="date" value={dueDate} min={startDate || undefined} onChange={(event) => setDueDate(event.target.value)} className={inputClass} /></Field>
                    <Field label="Valor do projeto"><input type="number" min="0" step="0.01" value={projectValue} onChange={(event) => setProjectValue(event.target.value)} className={inputClass} placeholder="0,00" /></Field>
                    <Field label="Status comercial"><input value={commercialStatus} onChange={(event) => setCommercialStatus(event.target.value)} className={inputClass} placeholder="Proposta, aprovado, pago..." /></Field>
                  </div>
                  <Field label="Descrição"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={inputClass} /></Field>
                  <Field label="Observações internas"><textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} className={inputClass} /></Field>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Projeto">
                      <select value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}>
                        <option value="">Sem projeto</option>
                        {projects.map((option) => <option key={option.id} value={option.id}>{option.name || option.title}</option>)}
                      </select>
                    </Field>
                    <Field label="Status"><select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)} className={inputClass}>{taskStatusOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Prioridade"><select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClass}>{priorityOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Prazo"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} /></Field>
                  </div>
                  <Field label="Descrição"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className={inputClass} /></Field>
                  <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950 dark:text-white">Checklists Inteligentes</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Aplique uma execução pronta para este tipo de entrega.</p>
                      </div>
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Pro</span>
                    </div>
                    {proAccess ? (
                      <>
                        <select value={suggestedChecklistId} onChange={(event) => setSuggestedChecklistId(event.target.value)} className={`mt-3 ${inputClass}`}>
                          <option value="">Criar sem checklist</option>
                          {suggestedChecklists.map((checklist) => <option key={checklist.id} value={checklist.id}>{checklist.name}</option>)}
                        </select>
                        {selectedChecklist ? <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">{selectedChecklist.items.slice(0, 5).map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /> <span>{item}</span></li>)}</ul> : null}
                      </>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Preview disponível. Assine o Pro para aplicar automaticamente.</p>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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

const inputClass = "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-950 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
      {label}
      {children}
    </label>
  )
}

