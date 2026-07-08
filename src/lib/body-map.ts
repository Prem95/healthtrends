import type { BiomarkerCategory, ResultStatus } from "@/lib/domain";

/**
 * Body-map config: each biomarker category is pinned to a region of the
 * mannequin. Positions are in scene units on the procedural figure
 * (y up, origin at the navel, figure is about 3.4 units tall).
 * x is the viewer's right when the figure faces the camera.
 */
/** Which organ silhouette to draw for a region. */
export type OrganShape =
  | "thyroid"
  | "heart"
  | "liver"
  | "pancreas"
  | "kidneys"
  | "droplet"
  | "node"
  | "glow";

export type BodyRegion = {
  category: BiomarkerCategory;
  label: string;
  /** Anatomical rationale shown in the panel. */
  note: string;
  position: [number, number, number];
  shape: OrganShape;
  /** Which side the DOM callout extends toward. */
  side: "left" | "right";
};

// Positions are on a front-facing figure (y up, origin near the navel, figure
// ~3.4 units tall). Organs sit slightly forward (z > 0) so they read clearly
// against the translucent body. x is the viewer's right.
export const BODY_REGIONS: BodyRegion[] = [
  { category: "THYROID", label: "Thyroid", note: "Thyroid gland, base of the neck", position: [0, 1.16, 0.34], shape: "thyroid", side: "right" },
  { category: "LIPIDS", label: "Lipids", note: "Heart & cardiovascular system", position: [-0.13, 0.64, 0.42], shape: "heart", side: "left" },
  { category: "OTHER", label: "Inflammation", note: "Systemic & cardiac markers", position: [0.3, 0.82, 0.38], shape: "glow", side: "right" },
  { category: "CBC", label: "Blood count", note: "Whole blood, drawn at the arm", position: [-0.66, 0.1, 0.3], shape: "droplet", side: "left" },
  { category: "IRON", label: "Iron", note: "Blood iron & stores", position: [0.55, 0.26, 0.32], shape: "droplet", side: "right" },
  { category: "LIVER", label: "Liver", note: "Right upper abdomen", position: [-0.24, 0.32, 0.42], shape: "liver", side: "left" },
  { category: "GLUCOSE", label: "Glucose", note: "Pancreas & blood sugar", position: [0.16, 0.14, 0.42], shape: "pancreas", side: "right" },
  { category: "KIDNEY", label: "Kidneys", note: "Kidneys & electrolytes", position: [0.26, -0.06, 0.34], shape: "kidneys", side: "right" },
  { category: "HORMONES", label: "Hormones", note: "Endocrine system", position: [0, -0.36, 0.36], shape: "node", side: "left" },
  { category: "VITAMINS", label: "Vitamins", note: "Bone & general stores", position: [-0.28, -0.58, 0.32], shape: "node", side: "left" },
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
