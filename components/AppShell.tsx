"use client"

import { usePathname } from "next/navigation"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const fullPageRoutes = pathname === "/" || pathname.startsWith("/auth") || pathname === "/terms" || pathname === "/privacy" || pathname === "/help" || pathname === "/about" || pathname === "/pricing" || pathname === "/billing/success"

  return (
    <main className={`min-h-screen bg-slate-50 transition-[padding] duration-200 dark:bg-slate-950 ${fullPageRoutes ? "" : "pt-16 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[var(--sidebar-width,260px)] md:pt-0"}`}>
      {children}
    </main>
  )
}

