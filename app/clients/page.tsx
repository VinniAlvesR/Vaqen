"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import { useCallback, useEffect, useState } from "react"
import ClientCard from "@/components/ClientCard"
import { Client } from "@/types/client"

export default function ClientsPage() {
  const confirmAction = useConfirm()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [lifecycle, setLifecycle] = useState<"active" | "archived" | "all">("active")

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true)
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      const editId = new URLSearchParams(window.location.search).get("edit")
      params.set("lifecycle", editId ? "all" : lifecycle)
      const response = await fetch(`/api/clients${params.toString() ? `?${params.toString()}` : ""}`)

      if (!response.ok) throw new Error("Falha ao buscar clientes")

      const data: Client[] = await response.json()
      setClients(data)
      const clientToEdit = editId ? data.find((client) => client.id === editId) : undefined
      if (clientToEdit) {
        setName(clientToEdit.name)
        setEmail(clientToEdit.email)
        setPhone(clientToEdit.phone ?? "")
        setCompany(clientToEdit.company)
        setEditingClient(clientToEdit)
        setShowForm(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao buscar clientes:", err)
    } finally {
      setLoading(false)
    }
  }, [lifecycle, search])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ entity: string }>).detail?.entity === "client") fetchClients()
    }
    window.addEventListener("vaqen:data-changed", refresh)
    return () => window.removeEventListener("vaqen:data-changed", refresh)
  }, [fetchClients])

  function resetForm() {
    setName("")
    setCompany("")
    setEmail("")
    setPhone("")
    setEditingClient(null)
  }

  async function handleArchiveClient(client: Client) {
    const archived = !client.archivedAt
    try {
      const response = await fetch(`/api/clients/${client.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      })
      if (!response.ok) throw new Error("Não foi possível alterar o cliente")
      await fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }

  async function handleAddClient() {
    if (!name || !company || !email) {
      setError("Preencha todos os campos obrigatórios")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company }),
      })

      if (!response.ok) throw new Error("Erro ao criar cliente")

      resetForm()
      setShowForm(false)
      await fetchClients()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao criar cliente:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClient(id: string) {
    if (!(await confirmAction({ title: "Apagar cliente?", description: "O cliente será movido para a lixeira e poderá ser restaurado depois.", confirmLabel: "Apagar", variant: "danger" }))) return

    try {
      const response = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Erro ao mover cliente para a lixeira")

      setClients((prev) => prev.filter((client) => client.id !== id))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao deletar cliente:", err)
      await fetchClients()
    }
  }

  function handleEditClient(client: Client) {
    setName(client.name)
    setEmail(client.email)
    setPhone(client.phone ?? "")
    setCompany(client.company)
    setEditingClient(client)
    setShowForm(true)
    setError(null)
  }

  async function handleUpdateClient() {
    if (!editingClient) return
    if (!name || !company || !email) {
      setError("Preencha todos os campos obrigatórios")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingClient.id, name, email, phone, company }),
      })

      if (!response.ok) throw new Error("Erro ao atualizar cliente")

      resetForm()
      setShowForm(false)
      await fetchClients()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      console.error("Erro ao atualizar cliente:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCount = clients.filter((client) => !client.archivedAt).length
  const archivedCount = clients.filter((client) => client.archivedAt).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow sm:p-6-sm sm:p-5 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Carteira</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-3xl sm:text-4xl">Clientes</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Organize contatos, empresas e histórico de relacionamento em um painel limpo.
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) resetForm()
              setShowForm(!showForm)
            }}
            className="w-fit rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {showForm ? "Fechar formulário" : "+ Novo cliente"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Na listagem" value={clients.length} />
          <SummaryCard label="Ativos" value={activeCount} />
          <SummaryCard label="Arquivados" value={archivedCount} />
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
      ) : null}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Buscar clientes</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, email ou empresa"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Situação</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              value={lifecycle}
              onChange={(event) => setLifecycle(event.target.value as "active" | "archived" | "all")}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>
          <button
            onClick={() => {
              setSearch("")
              setLifecycle("active")
            }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Limpar
          </button>
        </div>
      </section>

      {showForm ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm">
          <h2 className="text-2xl font-bold">{editingClient ? "Editar cliente" : "Novo cliente"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Nome" value={name} onChange={setName} />
            <Input label="Email" value={email} onChange={setEmail} />
            <Input label="Empresa" value={company} onChange={setCompany} />
            <Input label="Telefone" value={phone} onChange={setPhone} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={editingClient ? handleUpdateClient : handleAddClient}
              disabled={isSubmitting}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              disabled={isSubmitting}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        {loading ? (
          <EmptyState title="Carregando clientes..." description="Buscando sua carteira no banco de dados." />
        ) : clients.length === 0 ? (
          <EmptyState title="Nenhum cliente encontrado" description="Crie um cliente ou ajuste os filtros para ver outros registros." />
        ) : (
          <div className="grid gap-4">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                name={client.name}
                company={client.company}
                phone={client.phone}
                createdAt={client.createdAt}
                archivedAt={client.archivedAt}
                onView={() => window.location.assign(`/clients/${client.id}`)}
                onDelete={() => handleDeleteClient(client.id)}
                onEdit={() => handleEditClient(client)}
                onArchive={() => handleArchiveClient(client)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
