export type Task = {
  id: string
  title: string
  projectId?: string
  projectName?: string
  status: string
  priority?: string
  week?: string
  dueDate?: string
  description?: string
  completedAt?: string | null
}
