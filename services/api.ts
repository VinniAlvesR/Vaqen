import { Client } from "@/types/client"
import { Project } from "@/types/project"
import { Task } from "@/types/task"

const API_BASE = "/api"

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Erro na requisição")
  }
  return data
}

export type ClientCreateInput = {
  name: string
  email: string
  company: string
  phone?: string
}

export type ClientUpdateInput = ClientCreateInput & {
  id: string
}

export async function fetchClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE}/clients`)
  return handleResponse<Client[]>(response)
}

export async function createClient(payload: ClientCreateInput): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Client>(response)
}

export async function updateClient(payload: ClientUpdateInput): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Client>(response)
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/clients`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data?.error?.message || data?.message || "Erro ao deletar cliente")
  }
}

export type ProjectCreateInput = {
  name: string
  clientId: string
  status: string
  startDate: string
  description?: string
}

export type ProjectUpdateInput = ProjectCreateInput & {
  id: string
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`)
  return handleResponse<Project[]>(response)
}

export async function createProject(payload: ProjectCreateInput): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Project>(response)
}

export async function updateProject(payload: ProjectUpdateInput): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Project>(response)
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data?.error?.message || data?.message || "Erro ao deletar projeto")
  }
}

export type TaskCreateInput = {
  title: string
  projectId?: string | null
  status: string
  dueDate?: string
  description?: string
}

export type TaskUpdateInput = TaskCreateInput & {
  id: string
}

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`)
  return handleResponse<Task[]>(response)
}

export async function createTask(payload: TaskCreateInput): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Task>(response)
}

export async function updateTask(payload: TaskUpdateInput): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<Task>(response)
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data?.error?.message || data?.message || "Erro ao deletar tarefa")
  }
}
