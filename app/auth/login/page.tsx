"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { usePublicConfig } from "@/hooks/usePublicConfig"

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth()
  const { googleAuthEnabled } = usePublicConfig()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) router.replace("/dashboard")
  }, [router, user])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Verificando sessão...
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <AuthBackground />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="hidden lg:block">
          <Link href="/" className="flex items-center gap-3 text-lg font-black text-white">
            <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="rounded-xl" priority />
            <span>Vaqen Beta</span>
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.24em] text-indigo-300">Bem-vindo de volta</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Entre e volte direto para suas prioridades.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Dashboard, Tela Hoje, projetos e tarefas em um só fluxo para você continuar de onde parou.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-3 text-lg font-black text-white lg:hidden">
              <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="rounded-xl" priority />
              <span>Vaqen Beta</span>
            </Link>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-indigo-300 lg:mt-0">Login</p>
            <h1 className="mt-3 text-3xl font-black">Acesse sua conta</h1>
            <p className="mt-2 text-slate-300">Entre para continuar organizando seu trabalho.</p>
          </div>

          {error ? <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div> : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className={inputClass} placeholder="seu@email.com" />
            </Field>

            <Field label="Senha">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className={inputClass} placeholder="Sua senha" />
            </Field>

            <button type="submit" disabled={loading} className="w-full rounded-full bg-indigo-500 py-3 font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400 disabled:opacity-50">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {googleAuthEnabled ? (
            <button type="button" onClick={() => loginWithGoogle()} disabled={loading} className="mt-3 w-full rounded-full border border-white/15 bg-white/10 py-3 font-bold text-white transition hover:bg-white/15 disabled:opacity-50">
              Continuar com Google
            </button>
          ) : null}

          <div className="mt-6 space-y-3 text-center text-sm text-slate-300">
            <p>
              Não tem conta?{" "}
              <Link href="/auth/signup" className="font-bold text-indigo-200 hover:text-white">
                Criar conta
              </Link>
            </p>
            <Link href="/auth/forgot-password" className="font-semibold text-slate-300 hover:text-white">
              Esqueci minha senha
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

const inputClass = "mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-300 focus:bg-white/[0.14]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}
      {children}
    </label>
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
