import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { hasProAccess } from "@/lib/plan-rules"
import { getUserIdFromRequest } from "@/services/auth"
import { enforceRateLimit } from "@/lib/rate-limit"

type ReportRow = Record<string, string | number>

function proRequired() {
  return NextResponse.json({ error: { code: "PRO_REQUIRED", message: "Relatórios são recursos do Vaqen Pro." } }, { status: 403 })
}

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : ""
}

function formatMoney(value?: number | null) {
  return value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100) : ""
}

function csv(rows: ReportRow[]) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value ?? "").replaceAll('"', '""')}"`
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n")
}

function pdf(title: string, lines: string[]) {
  const safe = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")
  const content = [`BT`, `/F1 18 Tf`, `50 790 Td`, `(${safe(title)}) Tj`, `/F1 10 Tf`, `0 -28 Td`, ...lines.slice(0, 44).map((line) => `(${safe(line)}) Tj 0 -16 Td`), `ET`].join("\n")
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ]
  let body = "%PDF-1.4\n"
  const offsets = [0]
  for (const object of objects) { offsets.push(Buffer.byteLength(body)); body += `${object}\n` }
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(body)
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "read-heavy", userId)
  if (limited) return limited
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription || !hasProAccess(subscription)) return proRequired()

  const params = request.nextUrl.searchParams
  const type = params.get("type") ?? "client"
  const id = params.get("id")
  const format = params.get("format") ?? "json"

  if (type === "project") {
    const projects = await prisma.project.findMany({
      where: { userId, deletedAt: null, ...(id ? { id } : {}) },
      include: { client: { select: { name: true } }, tasks: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    })
    const rows = projects.map((project) => {
      const completed = project.tasks.filter((task) => task.completedAt).length
      return {
        projeto: project.name,
        cliente: project.client?.name ?? "",
        status: project.completedAt ? "Concluído" : project.archivedAt ? "Arquivado" : project.status,
        prioridade: project.priority,
        valor: formatMoney(project.projectValueCents),
        status_comercial: project.commercialStatus ?? "",
        tarefas: project.tasks.length,
        concluidas: completed,
        progresso: project.tasks.length ? `${Math.round((completed / project.tasks.length) * 100)}%` : "0%",
        prazo: formatDate(project.dueDate),
      }
    })
    return reportResponse(format, "Relatório de projetos", rows)
  }

  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null, ...(id ? { id } : {}) },
    include: { projects: { where: { deletedAt: null }, include: { tasks: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: "desc" },
  })
  const rows = clients.map((client) => {
    const tasks = client.projects.flatMap((project) => project.tasks)
    const completedTasks = tasks.filter((task) => task.completedAt).length
    const completedProjects = client.projects.filter((project) => project.completedAt).length
    const value = client.projects.reduce((sum, project) => sum + (project.projectValueCents ?? 0), 0)
    return {
      cliente: client.name,
      empresa: client.company ?? "",
      email: client.email ?? "",
      projetos: client.projects.length,
      projetos_concluidos: completedProjects,
      tarefas: tasks.length,
      tarefas_concluidas: completedTasks,
      valor_total: formatMoney(value),
      criado_em: formatDate(client.createdAt),
    }
  })
  return reportResponse(format, "Relatório de clientes", rows)
}

function reportResponse(format: string, title: string, rows: ReportRow[]) {
  if (format === "csv") return new NextResponse(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${title.toLowerCase().replaceAll(" ", "-")}.csv"` } })
  if (format === "pdf") {
    const lines = rows.flatMap((row, index) => [`${index + 1}. ${Object.values(row).join(" | ")}`])
    return new NextResponse(pdf(title, lines), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${title.toLowerCase().replaceAll(" ", "-")}.pdf"` } })
  }
  return NextResponse.json({ title, rows })
}
