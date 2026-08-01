"use client"

import { useEffect, useState } from "react"

type PublicConfig = {
  googleAuthEnabled: boolean
  emailDeliveryEnabled: boolean
  billingEnabled: boolean
}

const defaults: PublicConfig = {
  googleAuthEnabled: false,
  emailDeliveryEnabled: false,
  billingEnabled: false,
}

export function usePublicConfig() {
  const [config, setConfig] = useState(defaults)

  useEffect(() => {
    let active = true
    fetch("/api/config")
      .then((response) => response.ok ? response.json() : defaults)
      .then((data: PublicConfig) => {
        if (active) setConfig(data)
      })
      .catch(() => {
        if (active) setConfig(defaults)
      })
    return () => {
      active = false
    }
  }, [])

  return config
}
