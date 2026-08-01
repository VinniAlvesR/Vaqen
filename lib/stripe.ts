import Stripe from "stripe"
import { getServerEnv } from "@/lib/env"

let client: Stripe | undefined

export function getStripe() {
  const key = getServerEnv().STRIPE_SECRET_KEY
  if (!key) throw new Error("Stripe não configurado")
  client ??= new Stripe(key)
  return client
}
