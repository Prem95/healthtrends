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
