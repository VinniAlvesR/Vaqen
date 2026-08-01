import ContextMenu from "@/components/ContextMenu"

type ClientCardProps = {
  name: string
  company: string
  phone?: string
  createdAt?: string
  archivedAt?: string | null
  onDelete: () => void
  onEdit: () => void
  onView?: () => void
  onArchive: () => void
}

export default function ClientCard({
  name,
  company,
  phone,
  createdAt,
  archivedAt,
  onDelete,
  onEdit,
  onView,
  onArchive,
}: ClientCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-bold text-slate-950">{name}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${archivedAt ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
              {archivedAt ? "Arquivado" : "Ativo"}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-slate-600">{company}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            {phone ? <span>Telefone: {phone}</span> : null}
            {createdAt ? <span>Criado em: {new Date(createdAt).toLocaleDateString("pt-BR")}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          {onView ? (
            <button
              onClick={onView}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Detalhes
            </button>
          ) : null}
          <ContextMenu>
            <button onClick={onEdit}>Editar</button>
            <button onClick={onArchive}>{archivedAt ? "Reativar" : "Arquivar"}</button>
            <button onClick={onDelete} className="text-red-700">
              Apagar
            </button>
          </ContextMenu>
        </div>
      </div>
    </article>
  )
}
