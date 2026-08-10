"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

const expandedWidth = 280
const collapsedWidth = 72

type Theme = "light" | "dark"
type IconName =
  | "dashboard"
  | "today"
  | "clients"
  | "projects"
  | "tasks"
  | "reports"
  | "finance"
  | "trash"
  | "settings"
  | "logout"
  | "user"
  | "billing"
  | "theme"
  | "help"
  | "info"
  | "menu"
  | "close"

const appLinks: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/today", label: "Hoje", icon: "today" },
  { href: "/clients", label: "Clientes", icon: "clients" },
  { href: "/projects", label: "Projetos", icon: "projects" },
  { href: "/tasks", label: "Tarefas", icon: "tasks" },
  { href: "/reports", label: "Relatórios", icon: "reports" },
  { href: "/finance", label: "Financeiro", icon: "finance" },
  { href: "/trash", label: "Lixeira", icon: "trash" },
]

const fullPageRoutes = ["/", "/terms", "/privacy", "/help", "/about", "/pricing", "/billing/success"]

const bottomNavLinks: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/today", label: "Hoje", icon: "today" },
  { href: "/clients", label: "Clientes", icon: "clients" },
  { href: "/projects", label: "Projetos", icon: "projects" },
  { href: "/tasks", label: "Tarefas", icon: "tasks" },
]

const mobileMenuLinks: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/finance", label: "Financeiro", icon: "finance" },
  { href: "/reports", label: "Relatórios", icon: "reports" },
  { href: "/trash", label: "Lixeira", icon: "trash" },
  { href: "/settings?tab=general", label: "Configurações", icon: "settings" },
  { href: "/help", label: "Ajuda", icon: "help" },
  { href: "/about", label: "Sobre", icon: "info" },
  { href: "/terms", label: "Termos", icon: "billing" },
  { href: "/privacy", label: "Privacidade", icon: "user" },
]

export default function Navbar() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light"
    return window.localStorage.getItem("vaqen:theme") === "dark" ? "dark" : "light"
  })
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("vaqen:sidebar-collapsed") === "true"
  })

  useEffect(() => {
    if (!isAuthenticated) {
      document.documentElement.style.removeProperty("--sidebar-width")
      return
    }

    document.documentElement.style.setProperty("--sidebar-width", `${collapsed ? collapsedWidth : expandedWidth}px`)
    window.localStorage.setItem("vaqen:sidebar-collapsed", String(collapsed))
  }, [authLoading, collapsed, isAuthenticated])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem("vaqen:theme", theme)
  }, [theme])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  async function handleLogout() {
    await logout()
    setMobileOpen(false)
    router.push("/")
  }

  if (fullPageRoutes.includes(pathname) || pathname.startsWith("/auth")) return null
  if (authLoading) return null

  if (!isAuthenticated) return null

  const userImage = (user as { image?: string | null } | null)?.image ?? null

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <Link href="/today" className="flex min-w-0 items-center gap-3">
          <Image src="/vaqen-icon.svg" alt="" width={34} height={34} className="rounded-xl" priority />
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-slate-950 dark:text-white">Vaqen</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Central de gestão</p>
          </div>
        </Link>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Menu do Vaqen">
          <button className="absolute inset-0 bg-slate-950/55" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center justify-between gap-3">
              <Link href="/today" onClick={() => setMobileOpen(false)} className="flex min-w-0 items-center gap-3">
                <Image src="/vaqen-icon.svg" alt="" width={42} height={42} className="rounded-2xl" priority />
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-950 dark:text-white">Vaqen</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">Menu principal</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                aria-label="Fechar menu"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <Avatar name={user?.name ?? "Usuário"} image={userImage} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{user?.name ?? "Usuário"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "Conta Vaqen"}</p>
              </div>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-2">
              {mobileMenuLinks.map((link) => (
                <MobileSheetLink key={link.href} href={link.href} icon={link.icon} active={isActive(pathname, link.href.split("?")[0])} onNavigate={() => setMobileOpen(false)}>
                  {link.label}
                </MobileSheetLink>
              ))}
            </nav>

            <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3"><Icon name="theme" /> Tema</span>
                <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${theme === "dark" ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <span className={`h-4 w-4 rounded-full bg-white transition ${theme === "dark" ? "translate-x-5" : ""}`} />
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 hover:text-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70 dark:hover:text-white"
              >
                <Icon name="logout" />
                Sair
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomNavLinks.map((link) => (
            <MobileBottomItem key={link.href} href={link.href} icon={link.icon} active={isActive(pathname, link.href)}>
              {link.label}
            </MobileBottomItem>
          ))}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${mobileOpen ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}
            aria-label="Abrir menu"
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${mobileOpen ? "bg-white/15" : "bg-slate-100 dark:bg-slate-900"}`}><Icon name="menu" /></span>
            <span className="truncate">Menu</span>
          </button>
        </div>
      </nav>

      <aside className="vaqen-desktop-sidebar fixed inset-y-0 left-0 z-50 hidden max-h-dvh border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-[width] duration-200 md:block md:w-[var(--sidebar-width,280px)]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {!collapsed ? (
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-4">
              <Link href="/today" className="flex min-w-0 items-center gap-3">
                <Image src="/vaqen-icon.svg" alt="" width={40} height={40} className="rounded-xl" priority />
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-950">Vaqen</p>
                  <p className="hidden truncate text-xs text-slate-500 md:mt-1 md:block">Central de gestão</p>
                </div>
              </Link>
              <SidebarButton label="Fechar sidebar" onClick={() => setCollapsed(true)} collapsed={false} icon={<ChevronIcon direction="left" />} />
            </header>
          ) : null}

          <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
            {collapsed ? (
              <SidebarButton label="Abrir sidebar" onClick={() => setCollapsed(false)} collapsed icon={<ChevronIcon direction="right" />} />
            ) : null}

            {appLinks.map((link) => (
              <SidebarLink key={link.href} href={link.href} icon={link.icon} active={isActive(pathname, link.href)} collapsed={collapsed}>
                {link.label}
              </SidebarLink>
            ))}
          </nav>

          <footer className="shrink-0 p-3">
            {accountOpen ? (
              <AccountCard
                name={user?.name ?? "Usuário"}
                email={user?.email ?? ""}
                image={userImage}
                theme={theme}
                onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                onLogout={handleLogout}
                onNavigate={() => setAccountOpen(false)}
              />
            ) : null}

            <button
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              className={`flex min-w-0 items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-100 ${collapsed ? "justify-center" : "w-full"}`}
              aria-label="Abrir menu da conta"
              title="Conta"
            >
              <Avatar name={user?.name ?? "Usuário"} image={userImage} />
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{user?.name ?? "Usuário"}</p>
                  <p className="truncate text-xs text-slate-500">Conta ativa</p>
                </div>
              ) : null}
            </button>
          </footer>
        </div>
      </aside>
    </>
  )
}

function MobileBottomItem({ href, icon, active, children }: {
  href: string
  icon: IconName
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
      }`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"}`}>
        <Icon name={icon} />
      </span>
      <span className="truncate">{children}</span>
    </Link>
  )
}

function MobileSheetLink({ href, icon, active, onNavigate, children }: {
  href: string
  icon: IconName
  active: boolean
  onNavigate?: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-20 flex-col justify-between rounded-3xl border p-3 text-sm font-bold transition ${
        active
          ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? "bg-white/15 text-white" : "bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-300"}`}>
        <Icon name={icon} />
      </span>
      <span className="truncate">{children}</span>
    </Link>
  )
}

function AccountCard({ name, email, image, theme, onToggleTheme, onLogout, onNavigate }: {
  name: string
  email: string
  image?: string | null
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => void
  onNavigate: () => void
}) {
  return (
    <div className="fixed bottom-20 left-3 z-[70] w-64 overflow-visible rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <Avatar name={name} image={image} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{name}</p>
          <p className="truncate text-xs text-slate-500">{email || "Conta Vaqen"}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
        <AccountLink href="/settings?tab=account" icon="user" onClick={onNavigate}>Perfil</AccountLink>
        <AccountLink href="/settings?tab=general" icon="settings" onClick={onNavigate}>Configurações</AccountLink>
        <AccountLink href="/settings?tab=billing" icon="billing" onClick={onNavigate}>Plano e cobrança</AccountLink>
        <HelpSubmenu onNavigate={onNavigate} />
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <span className="flex items-center gap-3">
            <Icon name="theme" />
            Modo escuro
          </span>
          <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${theme === "dark" ? "bg-indigo-600" : "bg-slate-300"}`}>
            <span className={`h-4 w-4 rounded-full bg-white transition ${theme === "dark" ? "translate-x-5" : ""}`} />
          </span>
        </button>
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/50 dark:hover:text-red-100"
        >
          <Icon name="logout" />
          Sair
        </button>
      </div>
    </div>
  )
}


function HelpSubmenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="group/help relative">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        <span className="flex items-center gap-3">
          <Icon name="help" />
          Ajuda
        </span>
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div className="invisible absolute bottom-0 left-full z-[90] ml-2 w-56 translate-x-1 opacity-0 transition group-hover/help:visible group-hover/help:translate-x-0 group-hover/help:opacity-100 group-focus-within/help:visible group-focus-within/help:translate-x-0 group-focus-within/help:opacity-100">
        <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
          <AccountLink href="/help" icon="help" onClick={onNavigate}>Central de ajuda</AccountLink>
          <AccountLink href="/about" icon="info" onClick={onNavigate}>Sobre</AccountLink>
          <AccountLink href="/terms" icon="billing" onClick={onNavigate}>Termos de Uso</AccountLink>
          <AccountLink href="/privacy" icon="user" onClick={onNavigate}>Política de Privacidade</AccountLink>
        </div>
      </div>
    </div>
  )
}
function AccountLink({ href, icon, onClick, children }: {
  href: string
  icon: IconName
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
      <Icon name={icon} />
      {children}
    </Link>
  )
}

function SidebarButton({ label, icon, collapsed, onClick }: {
  label: string
  icon: React.ReactNode
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex min-w-0 shrink-0 items-center gap-3 rounded-2xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 md:shrink ${
        collapsed ? "px-4 py-3 md:justify-center md:px-0" : "h-10 w-10 justify-center p-0"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </span>
    </button>
  )
}

function SidebarLink({ href, icon, active, collapsed, children }: {
  href: string
  icon: IconName
  active: boolean
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`flex min-w-0 shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition md:shrink ${
        collapsed ? "md:justify-center md:px-0" : ""
      } ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
        <Icon name={icon} />
      </span>
      <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{children}</span>
    </Link>
  )
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U"

  return (
    <span className={image ? "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cover bg-center" : "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700"} style={image ? { backgroundImage: `url(${image})` } : undefined}>
      {image ? <span className="sr-only">Foto de perfil</span> : initial}
    </span>
  )
}

function Icon({ name }: { name: IconName }) {
  const common = {
    className: "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
    case "today":
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-5" /></svg>
    case "clients":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case "projects":
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M8 13h8" /><path d="M8 16h5" /></svg>
    case "tasks":
      return <svg {...common}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    case "reports":
      return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></svg>
    case "finance":
      return <svg {...common}><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" /></svg>
    case "trash":
      return <svg {...common}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.23.37.57.71 1 1 .34.2.72.33 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.41.2Z" /></svg>
    case "logout":
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
    case "user":
      return <svg {...common}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
    case "billing":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></svg>
    case "theme":
      return <svg {...common}><path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z" /></svg>
    case "help":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 1 1 5.8 1c-.8 1.1-1.9 1.5-2.4 2.5" /><path d="M12 17h.01" /></svg>
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
    case "menu":
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
    case "close":
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>
  }
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  )
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

