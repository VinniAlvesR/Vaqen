"use client"

import { useCallback, useEffect, useState } from "react"
import { Client } from "@/types/client"
import { createClient, deleteClient, fetchClients, updateClient } from "@/services/api"

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchClients()
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }, [])

  const addClient = useCallback(async (payload: Omit<Client, "id" | "createdAt">) => {
    setError(null)
    try {
      const newClient = await createClient(payload)
      setClients((prev) => [newClient, ...prev])
      return newClient
    } catch (err) {
      throw err
    }
  }, [])

  const editClient = useCallback(async (payload: Omit<Client, "createdAt">) => {
    setError(null)
    try {
      const updatedClient = await updateClient(payload)
      setClients((prev) => prev.map((client) => (client.id === updatedClient.id ? updatedClient : client)))
      return updatedClient
    } catch (err) {
      throw err
    }
  }, [])

  const removeClient = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteClient(id)
      setClients((prev) => prev.filter((client) => client.id !== id))
    } catch (err) {
      throw err
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  return {
    clients,
    loading,
    error,
    loadClients,
    addClient,
    editClient,
    removeClient,
    setError,
  }
}
