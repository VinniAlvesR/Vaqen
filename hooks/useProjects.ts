"use client"

import { useCallback, useEffect, useState } from "react"
import { Project } from "@/types/project"
import { Client } from "@/types/client"
import {
  createProject,
  deleteProject,
  fetchClients,
  fetchProjects,
  updateProject,
} from "@/services/api"

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [projectsData, clientsData] = await Promise.all([fetchProjects(), fetchClients()])
      setProjects(projectsData)
      setClients(clientsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar projetos")
    } finally {
      setLoading(false)
    }
  }, [])

  const addProject = useCallback(async (payload: Omit<Project, "id" | "clientName">) => {
    setError(null)
    try {
      const project = await createProject(payload)
      setProjects((prev) => [project, ...prev])
      return project
    } catch (err) {
      throw err
    }
  }, [])

  const editProject = useCallback(async (payload: Omit<Project, "clientName">) => {
    setError(null)
    try {
      const project = await updateProject(payload)
      setProjects((prev) => prev.map((item) => (item.id === project.id ? project : item)))
      return project
    } catch (err) {
      throw err
    }
  }, [])

  const removeProject = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((project) => project.id !== id))
    } catch (err) {
      throw err
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    projects,
    clients,
    loading,
    error,
    loadData,
    addProject,
    editProject,
    removeProject,
    setError,
  }
}
