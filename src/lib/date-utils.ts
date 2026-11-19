/** Devuelve la fecha local en formato `YYYY-MM-DD` (sin desfase por zona horaria UTC). */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Devuelve la fecha y hora local en formato `YYYY-MM-DD HH:mm`. */
export function formatLocalDateTime(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatLocalDate(date)} ${hh}:${mm}`;
}
