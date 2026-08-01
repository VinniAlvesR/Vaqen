export default function LoadingState({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 shadow-sm">
      <p className="font-medium">{message}</p>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 w-2/5 animate-pulse rounded-full bg-slate-400" />
      </div>
    </div>
  )
}
