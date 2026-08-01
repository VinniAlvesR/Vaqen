export type Project = {
  id: string
  name: string
  clientId: string
  clientName?: string
  status: string
  priority?: string
  startDate: string
  dueDate?: string | null
  description: string
  completedAt?: string | null
  archivedAt?: string | null
}
