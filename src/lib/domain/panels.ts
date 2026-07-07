import type { BiomarkerCategory } from "./types";

// Common panel shortcuts used by the New Test Session screen to pre-populate
// marker rows. Kept in sync with scripts/biomarker-catalog.mjs (PANELS).
export type Panel = {
  id: string;
  name: string;
  biomarkerIds: string[];
};

export const PANELS: Panel[] = [
  { id: "lipid", name: "Lipid Panel", biomarkerIds: ["total-cholesterol", "ldl-cholesterol", "hdl-cholesterol", "triglycerides", "non-hdl-cholesterol"] },
  { id: "cbc", name: "Complete Blood Count", biomarkerIds: ["hemoglobin", "hematocrit", "white-blood-cells", "red-blood-cells", "platelets", "mcv", "mch", "mchc", "rdw"] },
  { id: "cmp", name: "Comprehensive Metabolic", biomarkerIds: ["fasting-glucose", "bun", "creatinine", "sodium", "potassium", "chloride", "bicarbonate", "calcium", "albumin", "total-protein", "alt", "ast", "alkaline-phosphatase", "total-bilirubin"] },
  { id: "thyroid", name: "Thyroid Panel", biomarkerIds: ["tsh", "free-t4", "free-t3"] },
  { id: "hba1c", name: "HbA1c", biomarkerIds: ["hba1c"] },
  { id: "vitamin-d", name: "Vitamin D", biomarkerIds: ["vitamin-d"] },
  { id: "iron", name: "Iron Studies", biomarkerIds: ["ferritin", "serum-iron", "tibc", "transferrin-saturation"] },
  { id: "liver", name: "Liver Panel", biomarkerIds: ["alt", "ast", "alkaline-phosphatase", "ggt", "total-bilirubin", "albumin"] },
];

export const CATEGORY_LABEL: Record<BiomarkerCategory, string> = {
  LIPIDS: "Lipids",
  GLUCOSE: "Glucose & Metabolic",
  THYROID: "Thyroid",
  CBC: "Complete Blood Count",
  LIVER: "Liver",
  KIDNEY: "Kidney & Electrolytes",
  VITAMINS: "Vitamins",
  IRON: "Iron Studies",
  HORMONES: "Hormones",
  OTHER: "Other & Inflammation",
};

export const CATEGORY_ORDER: BiomarkerCategory[] = [
  "LIPIDS",
  "GLUCOSE",
  "THYROID",
  "CBC",
  "LIVER",
  "KIDNEY",
  "IRON",
  "VITAMINS",
  "HORMONES",
  "OTHER",
];
