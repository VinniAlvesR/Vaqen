import { redirect } from "next/navigation"

/**
 * Rota raiz /auth redireciona para login
 */
export default function AuthPage() {
  redirect("/auth/login")
}
