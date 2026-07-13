import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Full data export — CSV or JSON. FREE-tier feature forever: data ownership is
 * never paywalled. Uses the user's own RLS-scoped client, so it can only ever
 * export their rows.
 *   GET /api/export?format=json | csv
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const [profiles, sessions, results, events, customBiomarkers] = await Promise.all([
    supabase.from("profiles").select("id, name, sex, date_of_birth"),
    supabase
      .from("test_sessions")
      .select("id, profile_id, date, lab_name, ordered_by, fasting, notes"),
    supabase
      .from("test_results")
      .select("id, session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note"),
    supabase.from("life_events").select("id, profile_id, date, label"),
    supabase
      .from("biomarkers")
      .select("id, name, category, canonical_unit, alt_units, default_ranges, archived")
      .eq("is_custom", true),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "bbiom",
      schemaVersion: 1,
      profiles: profiles.data ?? [],
      testSessions: sessions.data ?? [],
      testResults: results.data ?? [],
      lifeEvents: events.data ?? [],
      customBiomarkers: customBiomarkers.data ?? [],
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="bbiom-export-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // CSV: one flat results table joined with session/profile context.
  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const sessionById = new Map((sessions.data ?? []).map((s) => [s.id, s]));

  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = [
    "profile", "session_date", "lab_name", "fasting",
    "biomarker_id", "value", "entered_unit", "lab_range", "flag_on_report", "note",
  ];
  const lines = [header.join(",")];
  for (const r of results.data ?? []) {
    const session = sessionById.get(r.session_id);
    const profile = session ? profileById.get(session.profile_id) : undefined;
    lines.push(
      [
        esc(profile?.name),
        esc(session?.date),
        esc(session?.lab_name),
        esc(session?.fasting),
        esc(r.biomarker_id),
        esc(r.value),
        esc(r.entered_unit),
        esc(r.lab_range),
        esc(r.flag_on_report),
        esc(r.note),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbiom-export-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
