import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { LimitedResource } from "@/lib/plan-rules"

const enabled = process.env.RUN_INTEGRATION_TESTS === "true"
let prisma: Awaited<typeof import("@/lib/prisma")>["prisma"]
let assertCanCreate: (userId: string, resource: LimitedResource) => Promise<void>
const emails = [
  `isolation-a-${Date.now()}@example.test`,
  `isolation-b-${Date.now()}@example.test`,
  `limits-${Date.now()}@example.test`,
  `cascade-${Date.now()}@example.test`,
]

describe.skipIf(!enabled)("isolamento entre usuários no Postgres", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma
    assertCanCreate = (await import("@/lib/plans")).assertCanCreate
  })

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { email: { in: emails } } })
  })

  it("não retorna registros de outro proprietário", async () => {
    const [a, b] = await Promise.all(emails.slice(0, 2).map((email) => prisma.user.create({ data: { email, name: email } })))
    await prisma.client.create({ data: { userId: a.id, name: "Somente A" } })
    expect(await prisma.client.count({ where: { userId: b.id } })).toBe(0)
  })

  it("conta arquivados e ignora itens na lixeira nos três limites", async () => {
    const user = await prisma.user.create({ data: { email: emails[2], name: "Limits" } })

    const clients = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      prisma.client.create({
        data: {
          userId: user.id,
          name: `Cliente ${index}`,
          archivedAt: index === 0 ? new Date() : null,
        },
      })
    ))
    await expect(assertCanCreate(user.id, "client")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" })
    await prisma.client.update({ where: { id: clients[1].id }, data: { deletedAt: new Date() } })
    await expect(assertCanCreate(user.id, "client")).resolves.toBeUndefined()

    const activeClient = clients[2]
    const projects = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      prisma.project.create({
        data: {
          userId: user.id,
          clientId: activeClient.id,
          name: `Projeto ${index}`,
          archivedAt: index === 0 ? new Date() : null,
        },
      })
    ))
    await expect(assertCanCreate(user.id, "project")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" })
    await prisma.project.update({ where: { id: projects[1].id }, data: { deletedAt: new Date() } })
    await expect(assertCanCreate(user.id, "project")).resolves.toBeUndefined()

    const activeProject = projects[2]
    const tasks = await prisma.task.createManyAndReturn({
      data: Array.from({ length: 50 }, (_, index) => ({
        userId: user.id,
        projectId: activeProject.id,
        title: `Tarefa ${index}`,
      })),
    })
    await expect(assertCanCreate(user.id, "task")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" })
    await prisma.task.update({ where: { id: tasks[0].id }, data: { deletedAt: new Date() } })
    await expect(assertCanCreate(user.id, "task")).resolves.toBeUndefined()
  })

  it("remove dependências sem deixar registros órfãos", async () => {
    const user = await prisma.user.create({ data: { email: emails[3], name: "Cascade" } })
    const client = await prisma.client.create({ data: { userId: user.id, name: "Cliente" } })
    const project = await prisma.project.create({ data: { userId: user.id, clientId: client.id, name: "Projeto" } })
    const task = await prisma.task.create({ data: { userId: user.id, projectId: project.id, title: "Tarefa" } })
    await Promise.all([
      prisma.checklistItem.create({ data: { taskId: task.id, text: "Item" } }),
      prisma.subtask.create({ data: { taskId: task.id, title: "Subtarefa" } }),
      prisma.taskComment.create({ data: { taskId: task.id, userId: user.id, content: "Comentário" } }),
    ])

    await prisma.client.delete({ where: { id: client.id } })

    const [projects, tasks, checklist, subtasks, comments] = await Promise.all([
      prisma.project.count({ where: { id: project.id } }),
      prisma.task.count({ where: { id: task.id } }),
      prisma.checklistItem.count({ where: { taskId: task.id } }),
      prisma.subtask.count({ where: { taskId: task.id } }),
      prisma.taskComment.count({ where: { taskId: task.id } }),
    ])
    expect({ projects, tasks, checklist, subtasks, comments }).toEqual({
      projects: 0,
      tasks: 0,
      checklist: 0,
      subtasks: 0,
      comments: 0,
    })
  })
})
