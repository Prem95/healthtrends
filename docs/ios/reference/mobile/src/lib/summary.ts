import {
  STATUS_LABEL,
  formatInUnit,
  formatMeasured,
  rangeInUnit,
  resolveDisplayUnit,
  statusTone,
  type ResultStatus,
} from '@domain';

import type { BiomarkerSummary } from '@/lib/analytics';
import { escapeHtml, formatDate, formatRange, prettyUnit, todayISO } from '@/lib/format';

/*
  The doctor summary as data, then as an HTML page for the PDF. Pure, so the
  window arithmetic and the escaping can be tested without a device.
*/

export const DISCLAIMER =
  'This app tracks values you enter; it does not provide medical advice. Reference ranges vary by lab and individual. Discuss results with your healthcare provider.';

export type SummaryWindow = '6m' | '1y' | '3y' | 'all';

export const WINDOWS: { value: SummaryWindow; label: string; months: number | null }[] = [
  { value: '6m', label: '6M', months: 6 },
  { value: '1y', label: '1Y', months: 12 },
  { value: '3y', label: '3Y', months: 36 },
  { value: 'all', label: 'All', months: null },
];

export type SummaryLine = {
  id: string;
  name: string;
  value: string;
  unit: string;
  date: string;
  reference: string;
  status: ResultStatus;
};

export type DoctorSummary = {
  lines: SummaryLine[];
  flagged: SummaryLine[];
  latestDate: string | null;
  windowText: string;
};

/** "2026-11-15" minus `months` → "2026-05-15" (clamped to the month's last day). */
export function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  const last = new Date(ty, tm, 0).getDate();
  return `${ty}-${String(tm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export function buildSummary(
  summaries: BiomarkerSummary[],
  unitPrefs: Record<string, string>,
  window: SummaryWindow,
  today: string = todayISO(),
): DoctorSummary {
  const months = WINDOWS.find((w) => w.value === window)?.months ?? null;
  const cutoff = months == null ? null : monthsBefore(today, months);

  const lines: SummaryLine[] = [];
  for (const s of summaries) {
    const inWindow = cutoff ? s.points.filter((p) => p.date >= cutoff) : s.points;
    const latest = inWindow[inWindow.length - 1];
    if (!latest) continue;
    const unit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
    lines.push({
      id: s.biomarker.id,
      name: s.biomarker.name,
      value: formatInUnit(s.biomarker, latest.value, unit),
      unit: prettyUnit(unit),
      date: latest.date,
      reference: formatRange(rangeInUnit(s.biomarker, latest.appliedRange, unit), formatMeasured),
      status: latest.status,
    });
  }
  lines.sort((a, b) => a.name.localeCompare(b.name));

  const rank = (st: ResultStatus) => (statusTone(st) === 'out' ? 0 : 1);
  const flagged = lines
    .filter((l) => statusTone(l.status) === 'out' || statusTone(l.status) === 'borderline')
    .sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name));

  const latestDate = lines.reduce<string | null>((acc, l) => (acc && acc > l.date ? acc : l.date), null);
  return { lines, flagged, latestDate, windowText: months ? `last ${months} months` : 'all recorded history' };
}

const GLYPH: Record<ResultStatus, string> = {
  IN_RANGE: '<circle cx="5" cy="5" r="4" fill="#0A8F6C"/>',
  BORDERLINE_LOW: '<path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="#D07C00"/>',
  BORDERLINE_HIGH: '<path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="#D07C00"/>',
  HIGH: '<path d="M5 1 9.5 9H0.5Z" fill="#D1345B"/>',
  LOW: '<path d="M5 9 0.5 1h9Z" fill="#D1345B"/>',
  NO_RANGE: '<circle cx="5" cy="5" r="3.25" fill="none" stroke="#84908C" stroke-width="1.5"/>',
};

function statusCell(status: ResultStatus): string {
  return `<span class="st"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">${GLYPH[status]}</svg>${escapeHtml(STATUS_LABEL[status])}</span>`;
}

/** One printable page: black on white, the status shapes the only colour, the disclaimer as footer. */
export function summaryHtml(profileName: string, summary: DoctorSummary, generatedOn: string = todayISO()): string {
  const e = escapeHtml;
  const flagged = summary.flagged.length
    ? `<h2>Flagged for discussion <span class="muted">${summary.flagged.length}</span></h2>
<table><tbody>${summary.flagged
        .map((l) => `<tr><td class="name">${e(l.name)}</td><td class="num">${e(l.value)} <span class="unit">${e(l.unit)}</span></td><td>${statusCell(l.status)}</td></tr>`)
        .join('')}</tbody></table>`
    : '';
  const rows = summary.lines
    .map(
      (l) =>
        `<tr><td class="name">${e(l.name)}</td><td class="num">${e(l.value)} <span class="unit">${e(l.unit)}</span></td><td class="num">${e(formatDate(l.date))}</td><td class="num">${e(l.reference)}</td><td>${statusCell(l.status)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(profileName)} — results summary</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #13231F; font-size: 11pt; line-height: 1.4; }
  .kicker { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; color: #62706B; }
  h1 { font-size: 18pt; font-weight: 500; margin: 4pt 0 2pt; }
  h2 { font-size: 12pt; font-weight: 500; margin: 18pt 0 6pt; }
  .muted { color: #62706B; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8.5pt; font-weight: 500; color: #62706B; border-bottom: 1px solid #C9CCC6; padding: 4pt 6pt; }
  td { border-bottom: 1px solid #E3E4DF; padding: 5pt 6pt; vertical-align: middle; }
  .name { font-weight: 500; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .unit { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; color: #62706B; }
  .st { display: inline-flex; align-items: center; gap: 5pt; white-space: nowrap; }
  footer { margin-top: 20pt; padding-top: 6pt; border-top: 1px solid #C9CCC6; font-size: 8pt; color: #62706B; }
</style></head><body>
<div class="kicker">Doctor summary</div>
<h1>${e(profileName)}’s results, on one page</h1>
<div class="muted">${summary.lines.length} marker${summary.lines.length === 1 ? '' : 's'}${summary.latestDate ? ` · latest test ${e(formatDate(summary.latestDate))}` : ''} · ${e(summary.windowText)} · prepared ${e(formatDate(generatedOn))}</div>
${flagged}
<h2>All results in this window</h2>
<table><thead><tr><th>Marker</th><th>Latest</th><th>Date</th><th>Reference</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<footer>${e(DISCLAIMER)} Reference shows the range used for that result: the one printed on the report, else the person’s own range, else a typical range.</footer>
</body></html>`;
}
