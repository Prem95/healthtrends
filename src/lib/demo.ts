import { BUILTIN_BIOMARKERS } from "@/lib/catalog";
import { summarize, type BiomarkerSummary } from "@/lib/analytics";
import type { ResultWithSession } from "@/lib/data";
import type { LifeEvent, Profile, TestSession } from "@/lib/domain";

/*
  The sample profile behind /demo and the product previews on the landing
  page: eight years of invented bloodwork for one adult, run through the same
  domain rules (ranges, status, trend) as a real account. Nothing here is a
  real person's data.
*/

export const DEMO_PROFILE: Profile = {
  id: "demo-profile",
  name: "Alex",
  sex: "M",
  dateOfBirth: "1984-06-02",
};

const SESSIONS: { date: string; lab: string; fasting: boolean; notes?: string }[] = [
  { date: "2019-03-12", lab: "Northside Pathology", fasting: true },
  { date: "2020-02-25", lab: "Northside Pathology", fasting: true },
  { date: "2021-04-06", lab: "Northside Pathology", fasting: true },
  { date: "2022-03-15", lab: "Harbour Medical Lab", fasting: true },
  {
    date: "2023-03-21",
    lab: "Harbour Medical Lab",
    fasting: true,
    notes: "Annual check. GP flagged LDL and suggested a follow-up in six months.",
  },
  { date: "2023-10-10", lab: "Harbour Medical Lab", fasting: true, notes: "Six-month lipid follow-up." },
  { date: "2024-04-16", lab: "Harbour Medical Lab", fasting: true },
  { date: "2025-04-08", lab: "Harbour Medical Lab", fasting: true },
  { date: "2025-11-04", lab: "Harbour Medical Lab", fasting: true, notes: "Follow-up on glucose." },
  { date: "2026-09-18", lab: "Harbour Medical Lab", fasting: true },
];

// One value per session above (null = not on that report). Canonical units.
const N = null;
const VALUES: Record<string, (number | null)[]> = {
  "total-cholesterol": [182, 190, 204, 215, 232, 201, 188, 181, 178, 176],
  "ldl-cholesterol": [96, 104, 118, 131, 148, 119, 104, 97, 95, 94],
  "hdl-cholesterol": [52, 50, 48, 47, 45, 47, 49, 51, 52, 54],
  triglycerides: [110, 124, 138, 151, 172, 148, 131, 122, 118, 112],
  "fasting-glucose": [88, 89, 91, 93, 95, N, 97, 99, 101, 104],
  hba1c: [4.9, 5.0, 5.0, 5.1, 5.2, N, 5.3, 5.4, 5.5, 5.5],
  tsh: [1.8, 2.1, 1.9, 2.4, 2.2, N, 2.0, 2.3, N, 2.1],
  "free-t4": [1.2, 1.3, 1.2, 1.1, 1.2, N, 1.3, 1.2, N, 1.2],
  hemoglobin: [15.2, 15.4, 15.1, 15.3, 15.0, N, 15.2, 15.5, N, 15.3],
  "white-blood-cells": [6.1, 5.8, 6.4, 7.0, 6.2, N, 5.9, 6.3, N, 6.0],
  platelets: [248, 255, 239, 262, 251, N, 244, 258, N, 250],
  alt: [24, 27, 31, 38, 44, 49, 41, 46, N, 52],
  ast: [22, 23, 25, 27, 30, 31, 28, 29, N, 31],
  ggt: [28, 30, 33, 36, 41, N, 38, 40, N, 43],
  creatinine: [0.98, 0.96, 1.01, 0.99, 1.02, N, 1.0, 1.03, N, 1.01],
  egfr: [98, 97, 94, 95, 92, N, 93, 90, N, 91],
  "uric-acid": [5.4, 5.6, 5.8, 6.0, 6.1, N, 5.9, 5.7, N, 5.6],
  "vitamin-d": [22, 19, 21, 20, 23, N, 21, 38, 44, 27],
  "vitamin-b12": [480, 455, 470, 440, 462, N, 451, 468, N, 459],
  ferritin: [142, 150, 138, 145, 151, N, 148, 139, N, 144],
  "testosterone-total": [N, N, 612, N, 588, N, N, 571, N, 560],
  "hs-crp": [0.6, 0.7, 0.8, 1.1, 1.4, N, 0.8, 0.7, N, 0.6],
};

const EVENTS: { date: string; label: string }[] = [
  { date: "2023-04-03", label: "Started statin" },
  { date: "2024-11-05", label: "Started vitamin D" },
  { date: "2026-01-15", label: "Stopped vitamin D" },
];

export type DemoData = {
  profile: Profile;
  biomarkers: typeof BUILTIN_BIOMARKERS;
  sessions: TestSession[]; // newest first, like the real data layer
  results: ResultWithSession[];
  events: LifeEvent[];
  watched: string[];
  summaries: BiomarkerSummary[];
};

let cached: DemoData | null = null;

export function getDemoData(): DemoData {
  if (cached) return cached;

  const sessions: TestSession[] = SESSIONS.map((s, i) => ({
    id: `demo-session-${i + 1}`,
    profileId: DEMO_PROFILE.id,
    date: s.date,
    labName: s.lab,
    fasting: s.fasting,
    notes: s.notes,
    createdAt: `${s.date}T09:00:00Z`,
  }));

  const results: ResultWithSession[] = [];
  for (const b of BUILTIN_BIOMARKERS) {
    const series = VALUES[b.id];
    if (!series) continue;
    series.forEach((value, i) => {
      if (value == null) return;
      const session = sessions[i];
      results.push({
        id: `${session.id}:${b.id}`,
        sessionId: session.id,
        biomarkerId: b.id,
        value,
        enteredUnit: b.canonicalUnit,
        labRange: null,
        flagOnReport: null,
        note: null,
        sessionDate: session.date,
        labName: session.labName,
        createdAt: session.createdAt,
      });
    });
  }

  const events: LifeEvent[] = EVENTS.map((e, i) => ({
    id: `demo-event-${i + 1}`,
    profileId: DEMO_PROFILE.id,
    date: e.date,
    label: e.label,
  }));

  cached = {
    profile: DEMO_PROFILE,
    biomarkers: BUILTIN_BIOMARKERS,
    sessions: [...sessions].reverse(),
    results,
    events,
    watched: ["ldl-cholesterol", "hba1c"],
    summaries: summarize(results, BUILTIN_BIOMARKERS, DEMO_PROFILE.sex),
  };
  return cached;
}

export function getDemoSummary(id: string): BiomarkerSummary | null {
  return getDemoData().summaries.find((s) => s.biomarker.id === id) ?? null;
}
