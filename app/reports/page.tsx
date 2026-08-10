"use client"

import { useEffect, useState } from "react"
import type { Client } from "@/types/client"
import type { Project } from "@/types/project"

type ReportRow = Record<string, string | number>

type ReportData = { title: string; rows: ReportRow[] }

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"

export default function ReportsPage() {
  const [type, setType] = useState<"client" | "project">("client")
  const [id, setId] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetch("/api/clients"), fetch("/api/projects?lifecycle=all")]).then(async ([clientRes, projectRes]) => {
      if (clientRes.ok) setClients(await clientRes.json())
      if (projectRes.ok) setProjects(await projectRes.json())
    }).catch(() => null)
  }, [])

  async function loadReport() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ type, format: "json" })
      if (id) params.set("id", id)
      const response = await fetch(`/api/reports?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? "Não foi possível carregar o relatório")
      setReport(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  function exportUrl(format: "csv" | "pdf") {
    const params = new URLSearchParams({ type, format })
    if (id) params.set("id", id)
    return `/api/reports?${params.toString()}`
  }

  const options = type === "client" ? clients : projects

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 sm:px-6 sm:py-6 lg:px-8 dark:text-white">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Pro</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Relatórios</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Gere relatórios por cliente ou projeto e exporte em CSV/PDF básico.</p>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <label><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo</span><select className={inputClass} value={type} onChange={(event) => { setType(event.target.value as "client" | "project"); setId(""); setReport(null) }}><option value="client">Cliente</option><option value="project">Projeto</option></select></label>
          <label><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Registro</span><select className={inputClass} value={id} onChange={(event) => setId(event.target.value)}><option value="">Todos</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button type="button" onClick={loadReport} disabled={loading} className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? "Gerando..." : "Gerar relatório"}</button>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      </section>

      {report && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Resultado</p><h2 className="mt-1 text-2xl font-black">{report.title}</h2></div>
            <div className="flex gap-2"><a href={exportUrl("csv")} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Exportar CSV</a><a href={exportUrl("pdf")} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">Exportar PDF</a></div>
          </div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 dark:border-slate-800">{Object.keys(report.rows[0] ?? {}).map((key) => <th key={key} className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400">{key}</th>)}</tr></thead><tbody>{report.rows.map((row, index) => <tr key={index} className="border-b border-slate-100 dark:border-slate-800">{Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-3 py-3 text-slate-700 dark:text-slate-300">{value}</td>)}</tr>)}</tbody></table></div>
          {!report.rows.length && <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">Nenhum dado encontrado.</p>}
        </section>
      )}
    </main>
  )
}