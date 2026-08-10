"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: "/auth/reset-password",
      })

      if (result.error) throw new Error(result.error.message || "Não foi possível enviar as instruções.")
      setMessage("Se o email estiver cadastrado, enviaremos as instruções para redefinir sua senha.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido ao solicitar recuperação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <AuthBackground />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="hidden lg:block">
          <Brand />
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-indigo-300">Acesso seguro</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black tracking-tight">Recupere o acesso sem perder seu fluxo.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Enviaremos um link temporário para você criar uma nova senha e voltar ao Vaqen.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="lg:hidden"><Brand /></div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-indigo-300 lg:mt-0">Recuperar senha</p>
            <h2 className="mt-3 text-3xl font-black">Informe seu email</h2>
            <p className="mt-2 text-slate-300">Se a conta existir, você receberá as instruções em alguns minutos.</p>
          </div>

          {error ? <p className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}
          {message ? <p className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">{message}</p> : null}

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-200">
              Email
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="seu@email.com" className={inputClass} />
            </label>
            <button disabled={loading} className="w-full rounded-full bg-indigo-500 py-3 font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400 disabled:opacity-50">
              {loading ? "Enviando..." : "Enviar instruções"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-300">
            Lembrou a senha? <Link href="/auth/login" className="font-bold text-indigo-200 hover:text-white">Fazer login</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-300 focus:bg-white/[0.14]"

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-lg font-black text-white">
      <span className="flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-xl"><Image src="/vaqen-icon.svg" alt="" width={42} height={42} className="max-w-none shrink-0 rounded-xl" priority /></span>
      <span>Vaqen</span>
    </Link>
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
