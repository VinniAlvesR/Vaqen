"use client"

import { ReactNode } from "react"

export default function ContextMenu({ children }: { children: ReactNode }) {
  return (
    <details className="group relative">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label="Abrir menu de ações"
      >
        ⋮
      </summary>
      <div className="absolute right-0 z-20 mt-2 flex min-w-48 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl [&>button]:rounded-xl [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:text-sm [&>button]:font-semibold [&>button]:text-slate-700 [&>button:hover]:bg-slate-100">
        {children}
      </div>
    </details>
  )
}
