"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { createSession, type SessionActionState } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn, formatNumber } from "@/lib/utils";
import {
  PANELS,
  parseDecimal,
  resolveRange,
  type Biomarker,
  type Sex,
} from "@/lib/domain";

type Row = {
  biomarkerId: string;
  valueText: string;
  unit: string;
  labMinText: string;
  labMaxText: string;
  note: string;
};

function emptyRow(b: Biomarker): Row {
  return {
    biomarkerId: b.id,
    valueText: "",
    unit: b.canonicalUnit,
    labMinText: "",
    labMaxText: "",
    note: "",
  };
}

export function NewSessionForm({
  profileId,
  profileSex,
  biomarkers,
  today,
}: {
  profileId: string;
  profileSex: Sex;
  biomarkers: Biomarker[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Session meta
  const [date, setDate] = useState(today);
  const [labName, setLabName] = useState("");
  const [orderedBy, setOrderedBy] = useState("");
  const [fasting, setFasting] = useState(false);
  const [notes, setNotes] = useState("");

  // Result rows
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [serverState, setServerState] = useState<SessionActionState>({});
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  const byId = useMemo(() => new Map(biomarkers.map((b) => [b.id, b])), [biomarkers]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const inRows = new Set(rows.map((r) => r.biomarkerId));
    return biomarkers
      .filter(
        (b) =>
          !inRows.has(b.id) &&
          (b.name.toLowerCase().includes(q) ||
            b.aliases.some((a) => a.toLowerCase().includes(q))),
      )
      .slice(0, 8);
  }, [query, biomarkers, rows]);

  function addBiomarker(b: Biomarker) {
    setRows((rs) => (rs.some((r) => r.biomarkerId === b.id) ? rs : [...rs, emptyRow(b)]));
    setQuery("");
  }

  function addPanel(panelId: string) {
    const panel = PANELS.find((p) => p.id === panelId);
    if (!panel) return;
    setRows((rs) => {
      const have = new Set(rs.map((r) => r.biomarkerId));
      const added = panel.biomarkerIds
        .filter((id) => !have.has(id) && byId.has(id))
        .map((id) => emptyRow(byId.get(id)!));
      return [...rs, ...added];
    });
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  const filledRows = rows.filter((r) => r.valueText.trim() !== "");
  const invalidRows = filledRows.filter((r) => parseDecimal(r.valueText) == null);

  function submit(extraConfirmed: string[] = []) {
    const confirmed = [...confirmedIds, ...extraConfirmed];
    const payload = {
      profileId,
      date,
      labName: labName || undefined,
      orderedBy: orderedBy || undefined,
      fasting: fasting || undefined,
      notes: notes || undefined,
      confirmedBiomarkerIds: confirmed,
      results: filledRows.map((r) => ({
        biomarkerId: r.biomarkerId,
        value: parseDecimal(r.valueText)!,
        enteredUnit: r.unit,
        labRangeMin: parseDecimal(r.labMinText) ?? undefined,
        labRangeMax: parseDecimal(r.labMaxText) ?? undefined,
        note: r.note || undefined,
      })),
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      const res = await createSession({}, fd);
      setServerState(res);
      setConfirmedIds(confirmed);
      if (res.ok) {
        router.push("/app");
        router.refresh();
      }
    });
  }

  const needsConfirm = serverState.needsConfirmation ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      {/* Session metadata */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Collection date *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lab">Lab name</Label>
          <Input
            id="lab"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="e.g. Quest, LabCorp"
          />
        </div>
        <div>
          <Label htmlFor="doctor">Ordered by</Label>
          <Input
            id="doctor"
            value={orderedBy}
            onChange={(e) => setOrderedBy(e.target.value)}
            placeholder="e.g. Dr. Osei"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={fasting}
              onChange={(e) => setFasting(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Fasting sample
          </label>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this test"
          />
        </div>
      </section>

      {/* Panel shortcuts */}
      <section>
        <p className="text-sm font-semibold tracking-wide text-ink-2 uppercase">
          Panel shortcuts
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addPanel(p.id)}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-brand/50 hover:text-brand-strong"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Marker search */}
      <section>
        <Label htmlFor="marker-search">Add a single marker</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            id="marker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or alias — “ldl”, “a1c”, “tsh”…"
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-paper shadow-lg">
              {searchResults.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => addBiomarker(b)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper-2"
                  >
                    <span className="text-ink">{b.name}</span>
                    <span className="text-xs text-ink-3">{b.canonicalUnit}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Value grid */}
      {rows.length > 0 && (
        <section className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-left text-xs tracking-wide text-ink-3 uppercase">
                <th className="px-3 py-2 font-medium">Marker</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium" colSpan={2}>
                  Lab range (from your report, optional)
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => {
                const b = byId.get(row.biomarkerId)!;
                const resolved = resolveRange(null, b.defaultRanges, profileSex);
                const hint = resolved.range
                  ? resolved.range.min != null && resolved.range.max != null
                    ? `${formatNumber(resolved.range.min)}–${formatNumber(resolved.range.max)}`
                    : resolved.range.max != null
                      ? `< ${formatNumber(resolved.range.max)}`
                      : `> ${formatNumber(resolved.range.min!)}`
                  : null;
                return (
                  <tr key={row.biomarkerId} className="bg-paper">
                    <td className="px-3 py-2">
                      <p className="font-medium text-ink">{b.name}</p>
                      {hint && (
                        <p className="text-xs text-ink-3 tnum">typical {hint} {b.canonicalUnit}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        inputMode="decimal"
                        value={row.valueText}
                        onChange={(e) => updateRow(i, { valueText: e.target.value })}
                        className={cn(
                          "h-9 w-24 tnum",
                          row.valueText.trim() !== "" &&
                            parseDecimal(row.valueText) == null &&
                            "border-out",
                        )}
                        placeholder="—"
                        aria-label={`${b.name} value`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {b.altUnits.length > 0 ? (
                        <Select
                          value={row.unit}
                          onChange={(e) => updateRow(i, { unit: e.target.value })}
                          className="h-9 w-28"
                          aria-label={`${b.name} unit`}
                        >
                          <option value={b.canonicalUnit}>{b.canonicalUnit}</option>
                          {b.altUnits.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.unit}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-ink-3">{b.canonicalUnit}</span>
                      )}
                    </td>
                    <td className="py-2 pl-3 pr-1">
                      <Input
                        inputMode="decimal"
                        value={row.labMinText}
                        onChange={(e) => updateRow(i, { labMinText: e.target.value })}
                        className="h-9 w-20 tnum"
                        placeholder="min"
                        aria-label={`${b.name} lab range minimum`}
                      />
                    </td>
                    <td className="py-2 pr-3 pl-1">
                      <Input
                        inputMode="decimal"
                        value={row.labMaxText}
                        onChange={(e) => updateRow(i, { labMaxText: e.target.value })}
                        className="h-9 w-20 tnum"
                        placeholder="max"
                        aria-label={`${b.name} lab range maximum`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(i)}
                        aria-label={`Remove ${b.name}`}
                      >
                        <Trash2 className="size-4 text-ink-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Plausibility confirmation */}
      {needsConfirm.length > 0 && (
        <section className="rounded-lg border border-borderline/30 bg-borderline-soft p-5">
          <p className="font-medium text-ink">Double-check these values</p>
          <ul className="mt-2 space-y-2 text-sm text-ink-2">
            {needsConfirm.map((c) => {
              const b = byId.get(c.biomarkerId);
              return (
                <li key={c.biomarkerId}>
                  <span className="font-medium text-ink">{b?.name}</span>: {" "}
                  <span className="tnum">
                    {formatNumber(c.enteredValue)} {c.enteredUnit}
                  </span>{" "}
                  looks unusual.
                  {c.suggestion && b && (
                    <>
                      {" "}
                      Did you mean{" "}
                      <button
                        type="button"
                        className="font-medium text-brand-strong underline underline-offset-2"
                        onClick={() => {
                          const idx = rows.findIndex((r) => r.biomarkerId === c.biomarkerId);
                          if (idx >= 0) updateRow(idx, { unit: c.suggestion!.unit });
                          setServerState({});
                        }}
                      >
                        {formatNumber(c.enteredValue)} {c.suggestion.unit} (={" "}
                        {formatNumber(c.suggestion.canonicalValue)} {b.canonicalUnit})
                      </button>
                      ?
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => submit(needsConfirm.map((c) => c.biomarkerId))}
              disabled={pending}
            >
              The values are correct — save anyway
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setServerState({})}>
              Let me edit
            </Button>
          </div>
        </section>
      )}

      {serverState.error && (
        <p className="rounded-md border border-out/20 bg-out-soft/60 px-3 py-2 text-sm text-out">
          {serverState.error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button
          type="button"
          onClick={() => submit()}
          disabled={pending || !date || invalidRows.length > 0}
        >
          <Plus />
          {pending ? "Saving…" : `Save session${filledRows.length ? ` (${filledRows.length} results)` : ""}`}
        </Button>
        {invalidRows.length > 0 && (
          <p className="text-sm text-out">Some values aren’t numbers yet.</p>
        )}
      </div>
    </div>
  );
}
