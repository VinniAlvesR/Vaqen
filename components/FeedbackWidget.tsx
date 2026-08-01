"use client"

import { FormEvent, useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { track } from "@vercel/analytics"
import { useAuth } from "@/hooks/useAuth"

type FeedbackType = "PROBLEM" | "SUGGESTION" | "QUESTION" | "PRAISE"

type FeedbackTriggerProps = {
  children?: React.ReactNode
  className?: string
  onOpen?: () => void
}

const externalRoutes = ["/", "/terms", "/privacy", "/pricing"]

const typeOptions: Array<{ value: FeedbackType; label: string; description: string }> = [
  { value: "PROBLEM", label: "Problema", description: "Erro, bloqueio ou comportamento estranho." },
  { value: "SUGGESTION", label: "Sugestao", description: "Melhoria de fluxo, tela ou recurso." },
  { value: "QUESTION", label: "Duvida", description: "Algo que ficou confuso no uso." },
  { value: "PRAISE", label: "Elogio", description: "Algo que funcionou bem." },
]

export function FeedbackTrigger({ children = "Enviar feedback", className, onOpen }: FeedbackTriggerProps) {
  const { isAuthenticated } = useAuth()

  function openFeedback() {
    if (!isAuthenticated) {
      window.location.href = "mailto:vaqen.suporte@gmail.com?subject=Feedback%20Vaqen%20Beta"
      return
    }
    onOpen?.()
    window.dispatchEvent(new CustomEvent("vaqen:open-feedback"))
  }

  return (
    <button
      type="button"
      onClick={openFeedback}
      className={className ?? "rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"}
    >
      {children}
    </button>
  )
}

export default function FeedbackWidget() {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("PROBLEM")
  const [rating, setRating] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isExternalRoute = externalRoutes.includes(pathname) || pathname.startsWith("/auth")

  useEffect(() => {
    function openFeedback() {
      setOpen(true)
    }

    window.addEventListener("vaqen:open-feedback", openFeedback)
    return () => window.removeEventListener("vaqen:open-feedback", openFeedback)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  function reset() {
    setType("PROBLEM")
    setRating("")
    setMessage("")
    setError(null)
    setSuccess(null)
  }

  function close() {
    reset()
    setOpen(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)

    const query = searchParams.toString()
    const pageUrl = `${pathname}${query ? `?${query}` : ""}`

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          rating: rating ? Number(rating) : null,
          message,
          pageUrl,
        }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Nao foi possivel enviar o feedback")
      }

      track("feedback_sent", { type, hasRating: Boolean(rating), page: pathname })
      setMessage("")
      setRating("")
      setSuccess(body?.message ?? "Feedback enviado com sucesso.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido")
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
        className="fixed right-4 top-5 z-40 hidden rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-bold text-slate-700 shadow-lg backdrop-blur transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 md:right-8 md:top-6 md:block dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-200"
      >
        Feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 px-3 py-4 sm:px-4 sm:py-8" role="dialog" aria-modal="true" aria-label="Enviar feedback">
          <form onSubmit={submit} className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Beta Vaqen</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Enviar feedback</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Conte o que travou, confundiu ou poderia ficar melhor.</p>
              </div>
              <button type="button" onClick={close} className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white" aria-label="Fechar">
                x
              </button>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {typeOptions.map((option) => {
                const selected = type === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "vaqen-feedback-option-active border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100 dark:border-indigo-400 dark:bg-indigo-950/60 dark:ring-indigo-500/20"
                        : "vaqen-feedback-option-idle border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <span className="vaqen-feedback-option-title block text-sm font-bold">{option.label}</span>
                    <span className="vaqen-feedback-option-description mt-1 block text-xs leading-5">{option.description}</span>
                  </button>
                )
              })}
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Nota opcional
              <select value={rating} onChange={(event) => setRating(event.target.value)} className={inputClass}>
                <option value="">Sem nota</option>
                <option value="1">1 - Muito ruim</option>
                <option value="2">2 - Ruim</option>
                <option value="3">3 - Ok</option>
                <option value="4">4 - Bom</option>
                <option value="5">5 - Excelente</option>
              </select>
            </label>

            <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Mensagem
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="Descreva o que aconteceu ou o que voce sugere."
                className={`${inputClass} resize-none`}
              />
            </label>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">A pagina atual e o navegador serao anexados automaticamente para facilitar a analise.</p>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
            {success ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{success}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={close} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Fechar
              </button>
              <button disabled={busy} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {busy ? "Enviando..." : "Enviar feedback"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}

const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-950 dark:focus:ring-indigo-500/20"
