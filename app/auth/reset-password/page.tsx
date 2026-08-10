"use client"

import { FormEvent, Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}> 
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN"
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(invalidToken ? "Link inválido ou expirado. Solicite um novo email de recuperação." : null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)

    if (!token) {
      setMessage("Link inválido ou expirado. Solicite um novo email de recuperação.")
      return
    }
    if (password.length < 8) {
      setMessage("A senha deve ter no mínimo 8 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("As senhas não correspondem.")
      return
    }

    setLoading(true)
    try {
      const result = await authClient.resetPassword({ token, newPassword: password })
      if (result.error) throw new Error(result.error.message || "Não foi possível redefinir a senha.")
      router.replace("/auth/login?password=updated")
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Erro desconhecido ao redefinir a senha.")
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
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-indigo-300">Nova senha</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black tracking-tight">Crie uma senha forte para sua conta.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Use pelo menos 8 caracteres. Depois disso, suas sessões antigas serão encerradas por segurança.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="lg:hidden"><Brand /></div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-indigo-300 lg:mt-0">Redefinir senha</p>
            <h2 className="mt-3 text-3xl font-black">Escolha uma nova senha</h2>
            <p className="mt-2 text-slate-300">Depois de salvar, você poderá fazer login novamente.</p>
          </div>

          {message ? <p className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{message}</p> : null}

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-200">
              Nova senha
              <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading || !token} placeholder="Mínimo 8 caracteres" className={inputClass} />
            </label>
            <label className="block text-sm font-bold text-slate-200">
              Confirmar senha
              <input type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={loading || !token} placeholder="Confirme sua nova senha" className={inputClass} />
            </label>
            <button disabled={loading || !token} className="w-full rounded-full bg-indigo-500 py-3 font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-400 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-300">
            Precisa de outro link? <Link href="/auth/forgot-password" className="font-bold text-indigo-200 hover:text-white">Enviar novamente</Link>
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
      <span className="flex h-[38px] w-[38px] overflow-hidden rounded-xl">
              <Image src="/vaqen-icon.svg" alt="" width={38} height={38} className="scale-[1.1]" priority />
            </span>
      <span>Vaqen</span>
    </Link>
  )
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Carregando...</main>
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
