"use client"


import { useConfirm } from "@/components/ConfirmDialog"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"
import { usePublicConfig } from "@/hooks/usePublicConfig"

type BillingStatus = {
  proAccess: boolean
  subscription: { status: string; trialEndsAt: string; cancelAtPeriodEnd: boolean } | null
  usage: { clients: number; projects: number; tasks: number }
  limits: { client: number; project: number; task: number }
}
type DeviceSession = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string }

export default function SettingsPage() {
  const confirmAction = useConfirm()
  const router = useRouter()
  const { user, loading, checkAuth } = useAuth()
  const { googleAuthEnabled, billingEnabled } = usePublicConfig()
  const [name, setName] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [timezone, setTimezone] = useState("America/Sao_Paulo")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch("/api/billing/status").then((response) => response.ok ? response.json() : null).then(setBilling)
    fetch("/api/account/preferences").then((response) => response.ok ? response.json() : null).then((data) => data?.timezone && setTimezone(data.timezone))
    authClient.listSessions().then((result) => setSessions((result.data ?? []) as DeviceSession[]))
  }, [])

  async function updateProfile() {
    setBusy(true)
    const result = await authClient.updateUser({ name: name ?? user?.name ?? "" })
    setMessage(result.error ? result.error.message || "Erro ao atualizar perfil" : "Perfil atualizado.")
    if (!result.error) await checkAuth()
    setBusy(false)
  }

  async function changePassword() {
    setBusy(true)
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    setMessage(result.error ? result.error.message || "Erro ao alterar senha" : "Senha alterada e outras sessões encerradas.")
    if (!result.error) {
      setCurrentPassword("")
      setNewPassword("")
    }
    setBusy(false)
  }

  async function openBilling(endpoint: "checkout" | "portal") {
    setBusy(true)
    const response = await fetch(`/api/billing/${endpoint}`, { method: "POST" })
    const data = await response.json()
    if (response.ok && data.url) window.location.assign(data.url)
    else setMessage(data.error?.message || "Cobrança indisponível.")
    setBusy(false)
  }

  async function revokeSession(token: string) {
    await authClient.revokeSession({ token })
    setSessions((current) => current.filter((session) => session.token !== token))
  }

  async function savePreferences() {
    const response = await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "pt-BR", timezone }),
    })
    setMessage(response.ok ? "Preferências atualizadas." : "Não foi possível atualizar as preferências.")
  }

  async function deleteAccount() {
    if (!(await confirmAction({ title: "Excluir conta definitivamente?", description: "Todos os seus dados serão removidos. Esta ação não pode ser desfeita.", confirmLabel: "Excluir conta", variant: "danger" }))) return
    const confirmation = window.prompt('Digite exatamente "EXCLUIR MINHA CONTA"')
    if (!confirmation) return
    setBusy(true)
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "x-account-delete-confirmation": confirmation },
    })
    if (response.ok) router.replace("/")
    else setMessage((await response.json()).error?.message || "Não foi possível excluir a conta.")
    setBusy(false)
  }

  if (loading) return <main className="p-5 sm:p-8 text-slate-600">Carregando configurações...</main>
  if (!user) return null

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <h1 className="text-3xl font-bold">Configurações</h1>
      <p className="mt-2 text-slate-600">Gerencie perfil, segurança, dados e cobrança.</p>
      {message && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3">{message}</p>}

      <div className="mt-8 grid gap-6">
        <Section title="Perfil">
          <label className="block text-sm font-medium">Nome</label>
          <input value={name ?? user.name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
          <p className="mt-3 text-sm text-slate-500">{user.email}</p>
          <button disabled={busy} onClick={updateProfile} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Salvar perfil</button>
        </Section>

        <Section title="Segurança">
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Senha atual" className="rounded-lg border p-2" />
            <input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nova senha (mínimo 8)" className="rounded-lg border p-2" />
          </div>
          <button disabled={busy || !currentPassword || newPassword.length < 8} onClick={changePassword} className="mt-4 rounded-lg border px-4 py-2 disabled:opacity-50">Alterar senha</button>
          {googleAuthEnabled && (
            <button
              disabled={busy}
              onClick={() => authClient.linkSocial({ provider: "google", callbackURL: "/settings" })}
              className="ml-3 mt-4 rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              Vincular Google
            </button>
          )}
          <h3 className="mt-6 font-semibold">Sessões ativas</h3>
          <div className="mt-2 space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="min-w-0 truncate">{session.userAgent || "Dispositivo desconhecido"} · {session.ipAddress || "IP não informado"}</span>
                <button onClick={() => revokeSession(session.token)} className="font-semibold text-red-700">Encerrar</button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Preferências">
          <label className="block text-sm font-medium">Fuso horário</label>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-1 rounded-lg border p-2">
            <option value="America/Sao_Paulo">Brasília</option>
            <option value="America/Manaus">Manaus</option>
            <option value="America/Recife">Recife</option>
          </select>
          <button onClick={savePreferences} className="ml-3 rounded-lg border px-4 py-2">Salvar preferências</button>
        </Section>

        <Section title="Plano e cobrança">
          <p className="font-semibold">{billing?.proAccess ? "Pro" : "Gratuito"}</p>
          {billing && <p className="mt-2 text-sm text-slate-600">Uso: {billing.usage.clients}/{billing.limits.client} clientes · {billing.usage.projects}/{billing.limits.project} projetos · {billing.usage.tasks}/{billing.limits.task} tarefas</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {billingEnabled && !billing?.proAccess && <button disabled={busy} onClick={() => openBilling("checkout")} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Assinar Pro</button>}
            {billingEnabled && billing?.subscription?.status === "ACTIVE" && <button disabled={busy} onClick={() => openBilling("portal")} className="rounded-lg border px-4 py-2">Gerenciar cobrança</button>}
          </div>
        </Section>

        <Section title="Seus dados">
          <div className="flex flex-wrap gap-3">
            <a href="/api/account/export" className="rounded-lg border px-4 py-2">Exportar ZIP</a>
            <button disabled={busy} onClick={deleteAccount} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700">Excluir conta</button>
          </div>
          <p className="mt-3 text-sm text-slate-500">A exclusão cancela a assinatura antes de remover os dados permanentemente.</p>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow sm:p-6-sm"><h2 className="mb-4 text-xl font-semibold">{title}</h2>{children}</section>
}
