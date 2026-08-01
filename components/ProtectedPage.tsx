"use client"

import { useAuth } from "@/hooks/useAuth"
import LoadingState from "@/components/LoadingState"

type ProtectedPageProps = {
  children: React.ReactNode
}

/**
 * Componente wrapper para proteger páginas
 * Mostra loading enquanto verifica autenticação
 */
export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { loading } = useAuth()

  if (loading) {
    return <LoadingState message="Verificando autenticação..." />
  }

  return <>{children}</>
}
