"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <main className="max-w-md rounded-xl border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="mt-3 text-slate-600">O erro foi registrado. Tente novamente.</p>
          <button onClick={reset} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-white">Tentar novamente</button>
        </main>
      </body>
    </html>
  )
}
