function safeCell(value: unknown) {
  if (value === null || value === undefined) return ""
  const raw = value instanceof Date ? value.toISOString() : String(value)
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${neutralized.replaceAll('"', '""')}"`
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return ""
  const columns = Object.keys(rows[0])
  return [
    columns.map(safeCell).join(","),
    ...rows.map((row) => columns.map((column) => safeCell(row[column])).join(",")),
  ].join("\r\n")
}
