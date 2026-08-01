"use client"

import { useCallback, useState } from "react"
import { authClient } from "@/lib/auth-client"

export function useAuth() {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async () => refetch(), [refetch])

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
    inviteCode = "",
    legalAccepted = false,
    marketingConsent = false
  ) => {
    setError(null)
    try {
      if (password.length < 8) throw new Error("A senha deve ter no mínimo 8 caracteres")
      if (password !== confirmPassword) throw new Error("As senhas não correspondem")
      const result = await authClient.signUp.email(
        { name, email, password },
        { headers: {
          "x-beta-invite": inviteCode,
          "x-legal-accepted": String(legalAccepted),
          "x-marketing-consent": String(marketingConsent),
        } }
      )
      if (result.error) throw new Error(result.error.message || "Erro ao criar conta")
      await refetch()
      return { success: true }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao criar conta"
      setError(message)
      throw cause
    }
  }, [refetch])

  const loginWithGoogle = useCallback(async (inviteCode = "") => {
    const result = await authClient.signIn.social(
      { provider: "google", callbackURL: "/dashboard" },
      { headers: { "x-beta-invite": inviteCode } }
    )
    if (result.error) throw new Error(result.error.message || "Erro ao entrar com Google")
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) throw new Error(result.error.message || "Erro ao fazer login")
      await refetch()
      return { success: true }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao fazer login"
      setError(message)
      throw cause
    }
  }, [refetch])

  const logout = useCallback(async () => {
    setError(null)
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error(result.error.message || "Erro ao fazer logout")
      await refetch()
      return { success: true }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao fazer logout"
      setError(message)
      throw cause
    }
  }, [refetch])

  return {
    user: session?.user ?? null,
    loading: isPending,
    error,
    isAuthenticated: Boolean(session?.user),
    signup,
    login,
    logout,
    loginWithGoogle,
    checkAuth,
    setError,
  }
}
