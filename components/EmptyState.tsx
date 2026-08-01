export default function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}
