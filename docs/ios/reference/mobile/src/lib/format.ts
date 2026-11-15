const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-01-15" → "15 Jan 2026", with no timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Today as a plain calendar date in the device's timezone. */
export function todayISO(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function monthsSince(iso: string): number {
  const then = new Date(`${iso.split('T')[0]}T00:00:00`);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

/** Typeset a unit for display: 10^3/µL → 10³/µL. Never for stored values. */
export function prettyUnit(unit: string): string {
  return unit.replace(/\^(\d)/g, (_, d: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
}

/** A Date from a picker → "2026-01-15" in the device's timezone. */
export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "2026-01-15" → a Date at local midnight, for a picker's value. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** A range whose bounds are already in the display unit: "70–99", "under 100", "over 40", "—". */
export function formatRange(range: { min?: number; max?: number } | null | undefined, fmt: (n: number) => string): string {
  if (!range || (range.min == null && range.max == null)) return '—';
  if (range.min != null && range.max != null) return `${fmt(range.min)}–${fmt(range.max)}`;
  if (range.max != null) return `under ${fmt(range.max)}`;
  return `over ${fmt(range.min!)}`;
}

/** Escape text for insertion into an HTML document (the doctor summary PDF). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
