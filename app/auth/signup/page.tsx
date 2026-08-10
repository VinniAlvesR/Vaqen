"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { usePublicConfig } from "@/hooks/usePublicConfig"

export default function SignupPage() {
  const router = useRouter()
  const { signup, loginWithGoogle, user, loading: authLoading } = useAuth()
  const { googleAuthEnabled } = usePublicConfig()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupCompleted, setSignupCompleted] = useState(false)

  useEffect(() => {
    if (user && !signupCompleted) router.replace("/today")
  }, [router, user, signupCompleted])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      setSignupCompleted(true)
      await signup(name, normalizedEmail, password, confirmPassword, legalAccepted, marketingConsent)
      router.replace(`/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
    } catch (err) {
      setSignupCompleted(false)
      setError(err instanceof Error ? err.message : "Erro ao criar conta")
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
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="hidden lg:block">
          <Link href="/" className="flex items-center gap-3 text-lg font-black text-white">
            <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="rounded-xl" priority />
            <span>Vaqen</span>
          </Link>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.24em] text-indigo-300">Acesso</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">
            Crie sua central de trabalho em poucos minutos.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Comece com clientes, organize projetos e use a Tela Hoje para decidir o que precisa da sua atenção.
          </p>
          <div className="mt-8 grid gap-3">
            {["30 dias de trial Pro", "Histórico preservado", "Fluxo rápido em qualquer tela"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-semibold text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <Link href="/" className="flex items-center gap-3 text-lg font-black text-white lg:hidden">
              <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="rounded-xl" priority />
              <span>Vaqen</span>
            </Link>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-indigo-300 lg:mt-0">Cadastro</p>
            <h1 className="mt-3 text-3xl font-black">Criar conta</h1>
            <p className="mt-2 text-slate-300">Organize seus projetos com mais clareza.</p>
          </div>

          {error ? <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div> : null}

          <form onSubmit={handleSignup} className="space-y-4">
            <Field label="Nome">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} required className={inputClass} placeholder="Seu nome" />
            </Field>

            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className={inputClass} placeholder="seu@email.com" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Senha">
                <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className={inputClass} placeholder="Mínimo 8 caracteres" />
              </Field>
              <Field label="Confirmar senha">
                <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} required className={inputClass} placeholder="Confirme sua senha" />
              </Field>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <label className="grid grid-cols-[1rem_1fr] items-start gap-3 text-sm leading-6 text-slate-300">
                <input type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} required className="mt-1" />
                <span>
                  Aceito os <Link href="/terms" className="font-bold text-indigo-200 hover:text-white">Termos de Uso</Link> e a <Link href="/privacy" className="font-bold text-indigo-200 hover:text-white">Política de Privacidade</Link>.
                </span>
              </label>

              <label className="grid grid-cols-[1rem_1fr] items-start gap-3 text-sm leading-6 text-slate-400">
                <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1" />
                <span>Quero receber novidades do Vaqen. Opcional.</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !legalAccepted} className="w-full rounded-full bg-indigo-500 py-3 font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400 disabled:opacity-50">
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
          {googleAuthEnabled ? (
            <button type="button" onClick={() => loginWithGoogle()} disabled={loading || !legalAccepted} className="mt-3 w-full rounded-full border border-white/15 bg-white/10 py-3 font-bold text-white transition hover:bg-white/15 disabled:opacity-50">
              Registrar com Google
            </button>
          ) : null}

          <p className="mt-6 text-center text-sm text-slate-300">
            Já tem conta?{" "}
            <Link href="/auth/login" className="font-bold text-indigo-200 hover:text-white">
              Fazer login
            </Link>
          </p>
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
