export type Activity = {
  id: string
  userId: string
  entity: string
  entityId: string | null
  action: string
  detail: string | null
  createdAt: string
}
