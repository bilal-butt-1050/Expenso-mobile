const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// "2026-08" -> "Aug 2026"
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// "2026-08" -> "Aug"  (compact form for chart axes)
export function formatMonthShort(monthKey: string): string {
  const month = Number(monthKey.split("-")[1]);
  return MONTH_NAMES[month - 1];
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return toMonthKey(d);
}

export function isCurrentOrFutureMonth(monthKey: string): boolean {
  return monthKey >= currentMonthKey();
}

// "2026-08-05T00:00:00.000Z" -> "05 Aug 2026"
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
