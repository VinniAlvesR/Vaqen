"use client"

import { createContext, ReactNode, useContext, useRef, useState } from "react"

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "primary"
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  function confirm(nextOptions: ConfirmOptions) {
    setOptions(nextOptions)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  function close(result: boolean) {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }

  const isDanger = options?.variant === "danger"

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6" role="dialog" aria-modal="true" aria-label={options.title}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isDanger ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"}`}>
              {isDanger ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{options.title}</h2>
            {options.description ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{options.description}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {options.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold text-white transition ${isDanger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {options.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error("useConfirm deve ser usado dentro de ConfirmProvider")
  return context
}