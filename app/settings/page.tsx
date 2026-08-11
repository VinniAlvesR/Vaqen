"use client"

import { useConfirm } from "@/components/ConfirmDialog"
import { useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"
import { usePublicConfig } from "@/hooks/usePublicConfig"

type ResourceKey = "client" | "project" | "task"
type ResourceMap = Record<ResourceKey, number>
type BillingStatus = {
  proAccess: boolean
  subscription: { status: string; trialEndsAt: string; currentPeriodEnd?: string | null; cancelAtPeriodEnd: boolean; hasStripeCustomer: boolean } | null
  storageUsage: ResourceMap
  storageLimits: ResourceMap
  dailyUsage: ResourceMap
  dailyLimits: ResourceMap
  periodKey: string
  usage?: { clients: number; projects: number; tasks: number }
  limits?: ResourceMap
}
type DeviceSession = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string }
type SettingsTab = "general" | "account" | "security" | "notifications" | "billing" | "data"

const stripePaymentLinkUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL
const notificationKey = "vaqen:device-notifications"

const settingsTabs: Array<{ id: SettingsTab; label: string; description: string }> = [
  { id: "general", label: "Geral", description: "Preferências do app" },
  { id: "account", label: "Conta", description: "Perfil e identidade" },
  { id: "security", label: "Segurança", description: "Senha e sessões" },
  { id: "notifications", label: "Notificações", description: "Alertas do dispositivo" },
  { id: "billing", label: "Plano", description: "Assinatura e limites" },
  { id: "data", label: "Dados", description: "Exportação e exclusão" },
]

function buildStripePaymentLink(baseUrl: string, user: { id: string; email: string }) {
  const url = new URL(baseUrl)
  url.searchParams.set("client_reference_id", user.id)
  url.searchParams.set("locked_prefilled_email", user.email)
  url.searchParams.set("locale", "pt-BR")
  url.searchParams.set("utm_source", "vaqen")
  url.searchParams.set("utm_medium", "app")
  url.searchParams.set("utm_campaign", "pro_checkout")
  return url.toString()
}

export default function SettingsPage() {
  const confirmAction = useConfirm()
  const router = useRouter()
  const { user, loading, checkAuth } = useAuth()
  const { googleAuthEnabled, billingEnabled, pushNotificationsEnabled, vapidPublicKey } = usePublicConfig()
  const [name, setName] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [timezone, setTimezone] = useState("America/Sao_Paulo")
  const [deviceNotifications, setDeviceNotifications] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (isSettingsTab(tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    fetch("/api/billing/status").then((response) => response.ok ? response.json() : null).then(setBilling)
    fetch("/api/account/preferences").then((response) => response.ok ? response.json() : null).then((data) => data?.timezone && setTimezone(data.timezone))
    authClient.listSessions().then((result) => setSessions((result.data ?? []) as DeviceSession[]))
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
      setDeviceNotifications(window.localStorage.getItem(notificationKey) === "true")
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.getRegistration("/sw.js")
          .then((registration) => registration?.pushManager.getSubscription())
          .then((subscription) => {
            const enabled = Boolean(subscription)
            setDeviceNotifications(enabled)
            window.localStorage.setItem(notificationKey, String(enabled))
          })
          .catch(() => null)
      }
    }
  }, [])

  async function updateProfile() {
    setBusy(true)
    const result = await authClient.updateUser({ name: name ?? user?.name ?? "" })
    setMessage(result.error ? result.error.message || "Erro ao atualizar perfil" : "Perfil atualizado.")
    if (!result.error) await checkAuth()
    setBusy(false)
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Use uma imagem JPG, PNG ou WebP de até 2 MB.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 2 MB.")
      return
    }

    setAvatarBusy(true)
    setMessage("")

    try {
      const formData = new FormData()
      formData.append("image", file)
      const response = await fetch("/api/account/avatar", { method: "POST", body: formData })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.image) throw new Error(data.error?.message || "Não foi possível enviar a foto.")
      setAvatarPreview(data.image)
      window.dispatchEvent(new CustomEvent("vaqen:avatar-updated", { detail: { image: data.image } }))
      setMessage("Foto de perfil atualizada.")
      await checkAuth()
    } catch (cause) {
      setAvatarPreview((user as { image?: string | null } | null)?.image ?? null)
      setMessage(cause instanceof Error ? cause.message : "Não foi possível enviar a foto.")
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error?.message || "Não foi possível remover a foto.")
      setAvatarPreview(null)
      window.dispatchEvent(new CustomEvent("vaqen:avatar-updated", { detail: { image: null } }))
      setMessage("Foto de perfil removida.")
      await checkAuth()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível remover a foto.")
    } finally {
      setAvatarBusy(false)
    }
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
    setMessage("")

    try {
      const response = await fetch(`/api/billing/${endpoint}`, { method: "POST" })
      const data = await response.json().catch(() => ({}))

      if (response.ok && data.url) {
        window.location.assign(data.url)
        return
      }

      if (endpoint === "checkout" && stripePaymentLinkUrl && user?.id && user.email) {
        window.location.assign(buildStripePaymentLink(stripePaymentLinkUrl, { id: user.id, email: user.email }))
        return
      }

      setMessage(data.error?.message || "Cobrança indisponível.")
    } catch {
      if (endpoint === "checkout" && stripePaymentLinkUrl && user?.id && user.email) {
        window.location.assign(buildStripePaymentLink(stripePaymentLinkUrl, { id: user.id, email: user.email }))
        return
      }
      setMessage("Cobrança indisponível.")
    } finally {
      setBusy(false)
    }
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

  async function toggleDeviceNotifications(enabled: boolean) {
    if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotificationPermission("unsupported")
      setMessage("Este navegador não suporta notificações Web Push.")
      return
    }

    if (!pushNotificationsEnabled || !vapidPublicKey) {
      setMessage("As notificações Web Push ainda não estáo configuradas no servidor.")
      return
    }

    setBusy(true)
    setMessage("")

    try {
      await navigator.serviceWorker.register("/sw.js")
      const readyRegistration = await navigator.serviceWorker.ready
      const current = await readyRegistration.pushManager.getSubscription()

      if (!enabled) {
        if (current) {
          await fetch("/api/notifications/subscription", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: current.endpoint }),
          }).catch(() => null)
          await current.unsubscribe().catch(() => false)
        }

        window.localStorage.setItem(notificationKey, "false")
        setDeviceNotifications(false)
        window.dispatchEvent(new Event("vaqen:notification-settings-changed"))
        setMessage("Notificações no dispositivo desativadas.")
        return
      }

      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission !== "granted") {
        window.localStorage.setItem(notificationKey, "false")
        setDeviceNotifications(false)
        setMessage("Permissão de notificações negada pelo navegador.")
        return
      }

      const subscription = current ?? await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const response = await fetch("/api/notifications/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        throw new Error("Não foi possível salvar a inscrição de notificações.")
      }

      window.localStorage.setItem(notificationKey, "true")
      setDeviceNotifications(true)
      window.dispatchEvent(new Event("vaqen:notification-settings-changed"))
      new Notification("Notificações ativadas", { body: "O Vaqen pode avisar sobre prazos e alertas importantes.", icon: "/vaqen-icon.svg", badge: "/favicon-32x32.png" })
      setMessage("Notificações no dispositivo ativadas.")
    } catch {
      window.localStorage.setItem(notificationKey, "false")
      setDeviceNotifications(false)
      setMessage("Não foi possível ativar as notificações neste dispositivo.")
    } finally {
      setBusy(false)
    }
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

  if (loading) return <main className="p-5 text-slate-600 sm:p-8">Carregando configurações...</main>
  if (!user) return null

  const profileImage = avatarPreview ?? (user as { image?: string | null }).image ?? null
  const profileInitial = user.name.trim().charAt(0).toUpperCase() || "U"

  const activeSection = (
    <div className="space-y-6">
          {activeTab === "general" && (
            <Section title="Geral">
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Ajustes básicos de idioma, região e uso do Vaqen.</p>
              <label className="block text-sm font-medium">Fuso horário</label>
              <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={inputClass}>
                <option value="America/Sao_Paulo">Brasília</option>
                <option value="America/Manaus">Manaus</option>
                <option value="America/Recife">Recife</option>
              </select>
              <button onClick={savePreferences} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Salvar preferências</button>
            </Section>
          )}

          {activeTab === "account" && (
            <Section title="Conta">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className={profileImage ? "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-cover bg-center shadow-sm dark:border-slate-800" : "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-indigo-100 text-3xl font-black text-indigo-700 shadow-sm dark:border-slate-800 dark:bg-indigo-950 dark:text-indigo-200"} style={profileImage ? { backgroundImage: `url(${profileImage})` } : undefined}>
                  {profileImage ? <span className="sr-only">Foto de perfil</span> : profileInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Foto de perfil</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use uma imagem JPG, PNG ou WebP de até 2 MB.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 aria-disabled:pointer-events-none aria-disabled:opacity-60" aria-disabled={avatarBusy}>
                      Enviar foto
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarBusy} onChange={uploadAvatar} />
                    </label>
                    {profileImage && <button type="button" disabled={avatarBusy} onClick={removeAvatar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Remover foto</button>}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                <label className="block text-sm font-medium">Nome</label>
                <input value={name ?? user.name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                <button disabled={busy} onClick={updateProfile} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 dark:bg-indigo-600">Salvar perfil</button>
              </div>
            </Section>
          )}

          {activeTab === "security" && (
            <Section title="Segurança">
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Senha atual" className={inputClass} />
                <input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nova senha (mínimo 8)" className={inputClass} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button disabled={busy || !currentPassword || newPassword.length < 8} onClick={changePassword} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50 dark:border-slate-700">Alterar senha</button>
                {googleAuthEnabled && <button disabled={busy} onClick={() => authClient.linkSocial({ provider: "google", callbackURL: "/settings" })} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50 dark:border-slate-700">Vincular Google</button>}
              </div>

              <h3 className="mt-8 font-semibold">Sessões ativas</h3>
              <div className="mt-3 space-y-2">
                {sessions.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Nenhuma sessão ativa encontrada.</p>}
                {sessions.map((session) => (
                  <div key={session.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                    <span className="block min-w-0 truncate pr-2" title={(session.userAgent || "Dispositivo desconhecido") + " · " + (session.ipAddress || "IP não informado")}>
                      {session.userAgent || "Dispositivo desconhecido"} · {session.ipAddress || "IP não informado"}
                    </span>
                    <button type="button" onClick={() => revokeSession(session.token)} className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">Encerrar</button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {activeTab === "notifications" && (
            <Section title="Notificações">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Alertas no dispositivo</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Receba avisos do navegador quando tarefas, projetos ou pagamentos exigirem atenção. Com Web Push ativo, os alertas podem chegar mesmo sem o Vaqen aberto, conforme permissões do navegador e do sistema.</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Status do navegador: {notificationPermission === "granted" ? "permitido" : notificationPermission === "denied" ? "bloqueado" : notificationPermission === "default" ? "pendente" : "não suportado"}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => toggleDeviceNotifications(!deviceNotifications)} className={deviceNotifications ? "inline-flex min-w-28 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-center text-sm font-bold leading-none text-white transition hover:bg-emerald-700 disabled:opacity-60" : "inline-flex min-w-28 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold leading-none text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"}>
                  {deviceNotifications ? "Desativar" : "Ativar"}
                </button>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Alertas enviados</p>
                <ul className="mt-2 space-y-1">
                  <li>Tarefas atrasadas ou vencendo hoje.</li>
                  <li>Projetos próximos do prazo.</li>
                  <li>Pagamentos atrasados no financeiro.</li>
                  <li>Atualizações relevantes feitas no sistema.</li>
                </ul>
              </div>
            </Section>
          )}

          {activeTab === "billing" && (
            <Section title="Plano e cobrança">
              <p className="font-semibold">{billing?.proAccess ? "Pro" : "Gratuito"}</p>
              {billing?.proAccess ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Seu trial ou assinatura Pro está ativa. Durante esse período, clientes, projetos e tarefas não têm limite.</p>
              ) : billing ? (
                <>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    <UsageBox title="Estoque do plano" usage={billing.storageUsage} limits={billing.storageLimits} />
                    <UsageBox title="Criações hoje" usage={billing.dailyUsage} limits={billing.dailyLimits} />
                  </div>
                <option value="America/Sao_Paulo">Brasília</option>
                </>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                {billingEnabled && !billing?.proAccess && <button disabled={busy} onClick={() => openBilling("checkout")} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Assinar Pro</button>}
                {billingEnabled && billing?.subscription?.hasStripeCustomer && <button disabled={busy} onClick={() => openBilling("portal")} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold dark:border-slate-700">Gerenciar cobrança</button>}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">A cobrança é processada pela Stripe. O Vaqen envia apenas o identificador da sua conta e seu e-mail para vincular a assinatura; dados de cartão não passam pelos servidores do Vaqen.</p>
            </Section>
          )}

          {activeTab === "data" && (
            <Section title="Dados da conta">
              <div className="flex flex-wrap gap-3">
                <a href="/api/account/export" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold dark:border-slate-700">Exportar ZIP</a>
                <button disabled={busy} onClick={deleteAccount} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">Excluir conta</button>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">A exclusão cancela a assinatura antes de remover os dados permanentemente.</p>
            </Section>
          )}
    </div>
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-950 dark:text-white sm:py-10">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">Configurações</p>
        <h1 className="mt-2 text-3xl font-bold">Central da conta</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Gerencie preferências, segurança, notificações, plano e dados da sua conta.</p>
      </div>

      {message && <p role="status" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">{message}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <nav className="grid gap-1" aria-label="Menu de configurações">
            {settingsTabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <div key={tab.id} className="space-y-2">
                  <button type="button" onClick={() => setActiveTab(tab.id)} className={active ? "w-full rounded-xl bg-indigo-600 px-4 py-3 text-left text-white shadow-sm" : "w-full rounded-xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}>
                    <span className="block text-sm font-bold">{tab.label}</span>
                    <span className={active ? "mt-1 block text-xs text-indigo-100" : "mt-1 block text-xs text-slate-500 dark:text-slate-400"}>{tab.description}</span>
                  </button>
                  {active && <div className="border-t border-slate-200 pt-2 dark:border-slate-800 lg:hidden">{activeSection}</div>}
                </div>
              )
            })}
          </nav>
        </aside>

        <div className="hidden min-w-0 lg:block">{activeSection}</div>
      </div>
    </main>
  )
}

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-500/20"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow dark:border-slate-800 dark:bg-slate-900 sm:p-6"><h2 className="mb-4 text-xl font-semibold">{title}</h2>{children}</section>
}

function UsageBox({ title, usage, limits }: { title: string; usage: ResourceMap; limits: ResourceMap }) {
  const rows: Array<[ResourceKey, string]> = [["client", "clientes"], ["project", "projetos"], ["task", "tarefas"]]
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="font-semibold text-slate-800 dark:text-white">{title}</p>
      <div className="mt-2 space-y-1">
        {rows.map(([key, label]) => {
          const remaining = Math.max(limits[key] - usage[key], 0)
          return <p key={key}>{usage[key]}/{limits[key]} {label} · restam {remaining}</p>
        })}
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "general" || value === "account" || value === "security" || value === "notifications" || value === "billing" || value === "data"
}

