"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = useMemo(() => searchParams.get("email")?.trim().toLowerCase() ?? "", [searchParams])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resendVerification() {
    if (!email) {
      setError("Não foi possível identificar o email da conta. Volte para o cadastro ou tente fazer login.")
      return
    }

    setBusy(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/dashboard" }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.message ?? body?.error?.message ?? "Não foi possível reenviar o email de verificação.")
      }

      setMessage("Email de verificação reenviado. Verifique a caixa de entrada e o spam.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido ao reenviar o email.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <AuthBackground />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="hidden lg:block">
          <Link href="/" className="flex items-center gap-3 text-lg font-black text-white">
            <Image src="/vaqen-icon.svg" alt="" width={40} height={40} className="rounded-xl border border-white bg-white" priority />
            <span>Vaqen Beta</span>
          </Link>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-indigo-300">Confirmação de conta</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black tracking-tight">Falta só verificar seu email.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Esse passo protege sua conta e garante que você consiga recuperar acesso ao Vaqen depois.
          </p>
          <div className="mt-8 grid gap-3">
            {["Abra o email enviado pelo Vaqen", "Clique no botão de confirmação", "Depois entre normalmente na sua conta"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-semibold text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <Link href="/" className="mb-8 flex items-center gap-3 text-lg font-black text-white lg:hidden">
            <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="rounded-xl border border-white bg-white" priority />
            <span>Vaqen Beta</span>
          </Link>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30">
            <MailIcon />
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-indigo-300">Verifique seu email</p>
          <h2 className="mt-3 text-3xl font-black">Conta criada com sucesso</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Enviamos um link de verificação para {email ? <strong className="text-white">{email}</strong> : "o email cadastrado"}. Abra o email e confirme a conta antes de fazer login.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            Se não encontrar o email, confira a pasta de spam ou lixo eletrônico. Alguns provedores podem demorar alguns minutos para entregar.
          </div>

          {message ? <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">{message}</p> : null}
          {error ? <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{error}</p> : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href="https://mail.google.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-indigo-500 px-5 py-3 text-center text-sm font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400"
            >
              Abrir Gmail
            </a>
            <button
              type="button"
              onClick={resendVerification}
              disabled={busy || !email}
              className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Reenviando..." : "Reenviar email"}
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-300 sm:flex-row sm:justify-center">
            <Link href="/auth/login" className="font-bold text-indigo-200 hover:text-white">Já verifiquei. Fazer login</Link>
            <span className="hidden text-slate-600 sm:inline">•</span>
            <Link href="/auth/signup" className="font-bold text-slate-300 hover:text-white">Usar outro email</Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function VerifyEmailLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
      Carregando verificação...
    </main>
  )
}

function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-indigo-600/35 blur-3xl" />
      <div className="absolute right-[-12rem] top-28 h-[28rem] w-[28rem] rounded-full bg-violet-500/25 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-1/3 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
    </div>
  )
}

function MailIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}
