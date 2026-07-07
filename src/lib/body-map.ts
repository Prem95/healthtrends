import type { BiomarkerCategory, ResultStatus } from "@/lib/domain";

/**
 * Body-map config: each biomarker category is pinned to a region of the
 * mannequin. Positions are in scene units on the procedural figure
 * (y up, origin at the navel, figure is about 3.4 units tall).
 * x is the viewer's right when the figure faces the camera.
 */
export type BodyRegion = {
  category: BiomarkerCategory;
  label: string;
  /** Anatomical rationale shown in the panel. */
  note: string;
  position: [number, number, number];
  /** Which side the DOM callout extends toward. */
  side: "left" | "right";
};

export const BODY_REGIONS: BodyRegion[] = [
  { category: "THYROID", label: "Thyroid", note: "Thyroid gland, base of the neck", position: [0, 1.14, 0.16], side: "right" },
  { category: "LIPIDS", label: "Lipids", note: "Cardiovascular system", position: [0.1, 0.68, 0.3], side: "right" },
  { category: "CBC", label: "Blood count", note: "Whole blood, drawn at the arm", position: [-0.62, 0.3, 0.12], side: "left" },
  { category: "IRON", label: "Iron", note: "Blood iron and stores", position: [0.62, 0.3, 0.12], side: "right" },
  { category: "LIVER", label: "Liver", note: "Right upper abdomen", position: [-0.18, 0.28, 0.28], side: "left" },
  { category: "GLUCOSE", label: "Glucose", note: "Pancreas and blood sugar", position: [0.14, 0.22, 0.26], side: "right" },
  { category: "KIDNEY", label: "Kidneys", note: "Kidneys and electrolytes", position: [0.26, 0.05, 0.18], side: "right" },
  { category: "HORMONES", label: "Hormones", note: "Endocrine system", position: [0, -0.28, 0.26], side: "left" },
  { category: "VITAMINS", label: "Vitamins", note: "Bone and general stores", position: [-0.22, -0.85, 0.2], side: "left" },
  { category: "OTHER", label: "Inflammation", note: "Systemic markers", position: [0.48, 0.82, 0.1], side: "right" },
];

export type RegionMarker = {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  status: ResultStatus;
};

export type RegionData = {
  category: BiomarkerCategory;
  worst: ResultStatus;
  markers: RegionMarker[];
};

const SEVERITY: Record<ResultStatus, number> = {
  NO_RANGE: 0,
  IN_RANGE: 1,
  BORDERLINE_LOW: 2,
  BORDERLINE_HIGH: 2,
  LOW: 3,
  HIGH: 3,
};

export function worstStatus(statuses: ResultStatus[]): ResultStatus {
  let worst: ResultStatus = "NO_RANGE";
  for (const s of statuses) {
    if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  return worst;
}
