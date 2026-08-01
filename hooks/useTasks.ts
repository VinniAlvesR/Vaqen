"use client"

import { useCallback, useEffect, useState } from "react"
import { Task } from "@/types/task"
import { Project } from "@/types/project"
import { createTask, deleteTask, fetchProjects, fetchTasks, updateTask } from "@/services/api"

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [tasksData, projectsData] = await Promise.all([fetchTasks(), fetchProjects()])
      setTasks(tasksData)
      setProjects(projectsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas")
    } finally {
      setLoading(false)
    }
  }, [])

  const addTask = useCallback(async (payload: Omit<Task, "id" | "projectName">) => {
    setError(null)
    try {
      const task = await createTask(payload)
      setTasks((prev) => [task, ...prev])
      return task
    } catch (err) {
      throw err
    }
  }, [])

  const editTask = useCallback(async (payload: Omit<Task, "projectName">) => {
    setError(null)
    try {
      const task = await updateTask(payload)
      setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)))
      return task
    } catch (err) {
      throw err
    }
  }, [])

  const removeTask = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (err) {
      throw err
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    tasks,
    projects,
    loading,
    error,
    loadData,
    addTask,
    editTask,
    removeTask,
    setError,
  }
}
