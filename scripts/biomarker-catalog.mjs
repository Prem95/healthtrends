// Source of truth for the built-in biomarker catalog (~70 markers).
// Consumed by scripts/generate-seed.mjs to emit the seed migration.
// Ranges are in each marker's canonical unit. altUnits.toCanonical is the
// factor to MULTIPLY an entered value in that unit by to get the canonical value.

/** @typedef {{ unit: string, toCanonical: number }} AltUnit */
/** @typedef {{ sex?: 'M'|'F', min?: number, max?: number }} RefRange */

export const CATALOG = [
  // ---------------- LIPIDS ----------------
  { id: "total-cholesterol", name: "Total Cholesterol", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["cholesterol", "total chol", "chol"], altUnits: [{ unit: "mmol/L", toCanonical: 38.67 }], defaultRanges: [{ max: 200 }] },
  { id: "ldl-cholesterol", name: "LDL Cholesterol", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["ldl", "ldl-c", "low density lipoprotein"], altUnits: [{ unit: "mmol/L", toCanonical: 38.67 }], defaultRanges: [{ max: 100 }] },
  { id: "hdl-cholesterol", name: "HDL Cholesterol", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["hdl", "hdl-c", "high density lipoprotein"], altUnits: [{ unit: "mmol/L", toCanonical: 38.67 }], defaultRanges: [{ sex: "M", min: 40 }, { sex: "F", min: 50 }] },
  { id: "triglycerides", name: "Triglycerides", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["trig", "tg", "trigs"], altUnits: [{ unit: "mmol/L", toCanonical: 88.57 }], defaultRanges: [{ max: 150 }] },
  { id: "vldl-cholesterol", name: "VLDL Cholesterol", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["vldl"], altUnits: [], defaultRanges: [{ min: 5, max: 40 }] },
  { id: "non-hdl-cholesterol", name: "Non-HDL Cholesterol", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["non hdl", "non-hdl"], altUnits: [{ unit: "mmol/L", toCanonical: 38.67 }], defaultRanges: [{ max: 130 }] },
  { id: "apolipoprotein-b", name: "Apolipoprotein B", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["apob", "apo b"], altUnits: [], defaultRanges: [{ max: 90 }] },
  { id: "lipoprotein-a", name: "Lipoprotein(a)", category: "LIPIDS", canonicalUnit: "mg/dL", aliases: ["lp(a)", "lpa"], altUnits: [], defaultRanges: [{ max: 30 }] },

  // ---------------- GLUCOSE ----------------
  { id: "fasting-glucose", name: "Fasting Glucose", category: "GLUCOSE", canonicalUnit: "mg/dL", aliases: ["glucose", "blood sugar", "fbs", "fasting blood glucose"], altUnits: [{ unit: "mmol/L", toCanonical: 18.0182 }], defaultRanges: [{ min: 70, max: 99 }] },
  { id: "hba1c", name: "HbA1c", category: "GLUCOSE", canonicalUnit: "%", aliases: ["a1c", "hemoglobin a1c", "glycated hemoglobin"], altUnits: [], defaultRanges: [{ min: 4.0, max: 5.6 }] },
  { id: "fasting-insulin", name: "Fasting Insulin", category: "GLUCOSE", canonicalUnit: "µIU/mL", aliases: ["insulin"], altUnits: [], defaultRanges: [{ min: 2.6, max: 24.9 }] },
  { id: "c-peptide", name: "C-Peptide", category: "GLUCOSE", canonicalUnit: "ng/mL", aliases: ["c peptide"], altUnits: [], defaultRanges: [{ min: 0.8, max: 3.1 }] },
  { id: "estimated-average-glucose", name: "Estimated Average Glucose", category: "GLUCOSE", canonicalUnit: "mg/dL", aliases: ["eag"], altUnits: [{ unit: "mmol/L", toCanonical: 18.0182 }], defaultRanges: [{ min: 70, max: 126 }] },

  // ---------------- THYROID ----------------
  { id: "tsh", name: "TSH", category: "THYROID", canonicalUnit: "mIU/L", aliases: ["thyroid stimulating hormone", "thyrotropin"], altUnits: [], defaultRanges: [{ min: 0.4, max: 4.0 }] },
  { id: "free-t4", name: "Free T4", category: "THYROID", canonicalUnit: "ng/dL", aliases: ["ft4", "free thyroxine"], altUnits: [], defaultRanges: [{ min: 0.8, max: 1.8 }] },
  { id: "free-t3", name: "Free T3", category: "THYROID", canonicalUnit: "pg/mL", aliases: ["ft3", "free triiodothyronine"], altUnits: [], defaultRanges: [{ min: 2.3, max: 4.2 }] },
  { id: "total-t4", name: "Total T4", category: "THYROID", canonicalUnit: "µg/dL", aliases: ["t4", "thyroxine"], altUnits: [], defaultRanges: [{ min: 5.0, max: 12.0 }] },
  { id: "total-t3", name: "Total T3", category: "THYROID", canonicalUnit: "ng/dL", aliases: ["t3", "triiodothyronine"], altUnits: [], defaultRanges: [{ min: 80, max: 200 }] },
  { id: "tpo-antibodies", name: "TPO Antibodies", category: "THYROID", canonicalUnit: "IU/mL", aliases: ["anti-tpo", "thyroid peroxidase antibodies"], altUnits: [], defaultRanges: [{ max: 9 }] },
  { id: "thyroglobulin-antibodies", name: "Thyroglobulin Antibodies", category: "THYROID", canonicalUnit: "IU/mL", aliases: ["anti-tg", "tg antibodies"], altUnits: [], defaultRanges: [{ max: 4 }] },

  // ---------------- CBC ----------------
  { id: "hemoglobin", name: "Hemoglobin", category: "CBC", canonicalUnit: "g/dL", aliases: ["hgb", "hb", "haemoglobin"], altUnits: [{ unit: "g/L", toCanonical: 0.1 }], defaultRanges: [{ sex: "M", min: 13.5, max: 17.5 }, { sex: "F", min: 12.0, max: 15.5 }] },
  { id: "hematocrit", name: "Hematocrit", category: "CBC", canonicalUnit: "%", aliases: ["hct", "haematocrit"], altUnits: [], defaultRanges: [{ sex: "M", min: 41, max: 50 }, { sex: "F", min: 36, max: 44 }] },
  { id: "white-blood-cells", name: "White Blood Cells", category: "CBC", canonicalUnit: "10^3/µL", aliases: ["wbc", "leukocytes", "white cell count"], altUnits: [], defaultRanges: [{ min: 3.4, max: 10.8 }] },
  { id: "red-blood-cells", name: "Red Blood Cells", category: "CBC", canonicalUnit: "10^6/µL", aliases: ["rbc", "erythrocytes"], altUnits: [], defaultRanges: [{ sex: "M", min: 4.35, max: 5.65 }, { sex: "F", min: 3.92, max: 5.13 }] },
  { id: "platelets", name: "Platelets", category: "CBC", canonicalUnit: "10^3/µL", aliases: ["plt", "platelet count"], altUnits: [], defaultRanges: [{ min: 150, max: 450 }] },
  { id: "mcv", name: "MCV", category: "CBC", canonicalUnit: "fL", aliases: ["mean corpuscular volume"], altUnits: [], defaultRanges: [{ min: 80, max: 100 }] },
  { id: "mch", name: "MCH", category: "CBC", canonicalUnit: "pg", aliases: ["mean corpuscular hemoglobin"], altUnits: [], defaultRanges: [{ min: 27, max: 33 }] },
  { id: "mchc", name: "MCHC", category: "CBC", canonicalUnit: "g/dL", aliases: ["mean corpuscular hemoglobin concentration"], altUnits: [], defaultRanges: [{ min: 32, max: 36 }] },
  { id: "rdw", name: "RDW", category: "CBC", canonicalUnit: "%", aliases: ["red cell distribution width"], altUnits: [], defaultRanges: [{ min: 11.5, max: 14.5 }] },
  { id: "neutrophils", name: "Neutrophils", category: "CBC", canonicalUnit: "%", aliases: ["neut", "neutrophil"], altUnits: [], defaultRanges: [{ min: 40, max: 70 }] },
  { id: "lymphocytes", name: "Lymphocytes", category: "CBC", canonicalUnit: "%", aliases: ["lymph", "lymphocyte"], altUnits: [], defaultRanges: [{ min: 20, max: 40 }] },

  // ---------------- LIVER ----------------
  { id: "alt", name: "ALT", category: "LIVER", canonicalUnit: "U/L", aliases: ["alanine aminotransferase", "sgpt"], altUnits: [], defaultRanges: [{ min: 7, max: 56 }] },
  { id: "ast", name: "AST", category: "LIVER", canonicalUnit: "U/L", aliases: ["aspartate aminotransferase", "sgot"], altUnits: [], defaultRanges: [{ min: 10, max: 40 }] },
  { id: "alkaline-phosphatase", name: "Alkaline Phosphatase", category: "LIVER", canonicalUnit: "U/L", aliases: ["alp", "alk phos"], altUnits: [], defaultRanges: [{ min: 44, max: 147 }] },
  { id: "total-bilirubin", name: "Total Bilirubin", category: "LIVER", canonicalUnit: "mg/dL", aliases: ["bilirubin", "tbil"], altUnits: [{ unit: "µmol/L", toCanonical: 0.0585 }], defaultRanges: [{ min: 0.1, max: 1.2 }] },
  { id: "direct-bilirubin", name: "Direct Bilirubin", category: "LIVER", canonicalUnit: "mg/dL", aliases: ["conjugated bilirubin"], altUnits: [{ unit: "µmol/L", toCanonical: 0.0585 }], defaultRanges: [{ max: 0.3 }] },
  { id: "albumin", name: "Albumin", category: "LIVER", canonicalUnit: "g/dL", aliases: ["alb"], altUnits: [{ unit: "g/L", toCanonical: 0.1 }], defaultRanges: [{ min: 3.5, max: 5.0 }] },
  { id: "total-protein", name: "Total Protein", category: "LIVER", canonicalUnit: "g/dL", aliases: ["protein total"], altUnits: [{ unit: "g/L", toCanonical: 0.1 }], defaultRanges: [{ min: 6.0, max: 8.3 }] },
  { id: "ggt", name: "GGT", category: "LIVER", canonicalUnit: "U/L", aliases: ["gamma-glutamyl transferase", "gamma gt"], altUnits: [], defaultRanges: [{ min: 8, max: 61 }] },

  // ---------------- KIDNEY / METABOLIC ----------------
  { id: "creatinine", name: "Creatinine", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["creat", "cr"], altUnits: [{ unit: "µmol/L", toCanonical: 0.0113 }], defaultRanges: [{ sex: "M", min: 0.74, max: 1.35 }, { sex: "F", min: 0.59, max: 1.04 }] },
  { id: "bun", name: "BUN", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["blood urea nitrogen", "urea nitrogen"], altUnits: [], defaultRanges: [{ min: 7, max: 20 }] },
  { id: "egfr", name: "eGFR", category: "KIDNEY", canonicalUnit: "mL/min/1.73m²", aliases: ["estimated gfr", "glomerular filtration rate"], altUnits: [], defaultRanges: [{ min: 60 }] },
  { id: "uric-acid", name: "Uric Acid", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["urate"], altUnits: [{ unit: "µmol/L", toCanonical: 0.0168 }], defaultRanges: [{ sex: "M", min: 3.4, max: 7.0 }, { sex: "F", min: 2.4, max: 6.0 }] },
  { id: "cystatin-c", name: "Cystatin C", category: "KIDNEY", canonicalUnit: "mg/L", aliases: ["cystatin"], altUnits: [], defaultRanges: [{ min: 0.6, max: 1.0 }] },
  { id: "sodium", name: "Sodium", category: "KIDNEY", canonicalUnit: "mmol/L", aliases: ["na"], altUnits: [], defaultRanges: [{ min: 135, max: 145 }] },
  { id: "potassium", name: "Potassium", category: "KIDNEY", canonicalUnit: "mmol/L", aliases: ["k"], altUnits: [], defaultRanges: [{ min: 3.5, max: 5.2 }] },
  { id: "chloride", name: "Chloride", category: "KIDNEY", canonicalUnit: "mmol/L", aliases: ["cl"], altUnits: [], defaultRanges: [{ min: 96, max: 106 }] },
  { id: "bicarbonate", name: "Bicarbonate", category: "KIDNEY", canonicalUnit: "mmol/L", aliases: ["co2", "carbon dioxide", "hco3"], altUnits: [], defaultRanges: [{ min: 20, max: 29 }] },
  { id: "calcium", name: "Calcium", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["ca"], altUnits: [{ unit: "mmol/L", toCanonical: 4.008 }], defaultRanges: [{ min: 8.6, max: 10.3 }] },
  { id: "phosphorus", name: "Phosphorus", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["phosphate", "po4"], altUnits: [], defaultRanges: [{ min: 2.5, max: 4.5 }] },
  { id: "magnesium", name: "Magnesium", category: "KIDNEY", canonicalUnit: "mg/dL", aliases: ["mg"], altUnits: [{ unit: "mmol/L", toCanonical: 2.43 }], defaultRanges: [{ min: 1.7, max: 2.2 }] },

  // ---------------- VITAMINS ----------------
  { id: "vitamin-d", name: "Vitamin D (25-OH)", category: "VITAMINS", canonicalUnit: "ng/mL", aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxyvitamin d", "vit d"], altUnits: [{ unit: "nmol/L", toCanonical: 0.4 }], defaultRanges: [{ min: 30, max: 100 }] },
  { id: "vitamin-b12", name: "Vitamin B12", category: "VITAMINS", canonicalUnit: "pg/mL", aliases: ["b12", "cobalamin"], altUnits: [{ unit: "pmol/L", toCanonical: 1.355 }], defaultRanges: [{ min: 200, max: 900 }] },
  { id: "folate", name: "Folate", category: "VITAMINS", canonicalUnit: "ng/mL", aliases: ["folic acid", "vitamin b9"], altUnits: [], defaultRanges: [{ min: 3.0 }] },
  { id: "vitamin-b6", name: "Vitamin B6", category: "VITAMINS", canonicalUnit: "µg/L", aliases: ["pyridoxine"], altUnits: [], defaultRanges: [{ min: 5, max: 50 }] },

  // ---------------- IRON ----------------
  { id: "ferritin", name: "Ferritin", category: "IRON", canonicalUnit: "ng/mL", aliases: ["ferritin level"], altUnits: [], defaultRanges: [{ sex: "M", min: 24, max: 336 }, { sex: "F", min: 11, max: 307 }] },
  { id: "serum-iron", name: "Serum Iron", category: "IRON", canonicalUnit: "µg/dL", aliases: ["iron"], altUnits: [{ unit: "µmol/L", toCanonical: 5.587 }], defaultRanges: [{ sex: "M", min: 65, max: 175 }, { sex: "F", min: 50, max: 170 }] },
  { id: "tibc", name: "TIBC", category: "IRON", canonicalUnit: "µg/dL", aliases: ["total iron binding capacity"], altUnits: [], defaultRanges: [{ min: 250, max: 450 }] },
  { id: "transferrin-saturation", name: "Transferrin Saturation", category: "IRON", canonicalUnit: "%", aliases: ["tsat", "iron saturation"], altUnits: [], defaultRanges: [{ min: 20, max: 50 }] },
  { id: "transferrin", name: "Transferrin", category: "IRON", canonicalUnit: "mg/dL", aliases: ["transferrin level"], altUnits: [], defaultRanges: [{ min: 200, max: 360 }] },

  // ---------------- HORMONES ----------------
  { id: "testosterone-total", name: "Total Testosterone", category: "HORMONES", canonicalUnit: "ng/dL", aliases: ["testosterone", "total t"], altUnits: [{ unit: "nmol/L", toCanonical: 28.84 }], defaultRanges: [{ sex: "M", min: 264, max: 916 }, { sex: "F", min: 8, max: 60 }] },
  { id: "free-testosterone", name: "Free Testosterone", category: "HORMONES", canonicalUnit: "pg/mL", aliases: ["free t"], altUnits: [], defaultRanges: [{ sex: "M", min: 50, max: 210 }, { sex: "F", min: 1, max: 8.5 }] },
  { id: "estradiol", name: "Estradiol", category: "HORMONES", canonicalUnit: "pg/mL", aliases: ["e2", "oestradiol"], altUnits: [{ unit: "pmol/L", toCanonical: 0.2724 }], defaultRanges: [{ min: 15, max: 350 }] },
  { id: "cortisol", name: "Cortisol", category: "HORMONES", canonicalUnit: "µg/dL", aliases: ["am cortisol", "morning cortisol"], altUnits: [{ unit: "nmol/L", toCanonical: 0.0362 }], defaultRanges: [{ min: 6.2, max: 19.4 }] },
  { id: "dhea-s", name: "DHEA-S", category: "HORMONES", canonicalUnit: "µg/dL", aliases: ["dhea sulfate", "dheas"], altUnits: [], defaultRanges: [{ min: 35, max: 430 }] },
  { id: "psa", name: "PSA", category: "HORMONES", canonicalUnit: "ng/mL", aliases: ["prostate specific antigen"], altUnits: [], defaultRanges: [{ max: 4 }] },
  { id: "progesterone", name: "Progesterone", category: "HORMONES", canonicalUnit: "ng/mL", aliases: ["prog"], altUnits: [], defaultRanges: [{ min: 0.1, max: 25 }] },

  // ---------------- OTHER / INFLAMMATION ----------------
  { id: "crp", name: "CRP", category: "OTHER", canonicalUnit: "mg/L", aliases: ["c-reactive protein"], altUnits: [{ unit: "mg/dL", toCanonical: 10 }], defaultRanges: [{ max: 3.0 }] },
  { id: "hs-crp", name: "hs-CRP", category: "OTHER", canonicalUnit: "mg/L", aliases: ["high sensitivity crp", "cardiac crp"], altUnits: [{ unit: "mg/dL", toCanonical: 10 }], defaultRanges: [{ max: 1.0 }] },
  { id: "homocysteine", name: "Homocysteine", category: "OTHER", canonicalUnit: "µmol/L", aliases: ["hcy"], altUnits: [], defaultRanges: [{ max: 15 }] },
  { id: "esr", name: "ESR", category: "OTHER", canonicalUnit: "mm/hr", aliases: ["sed rate", "erythrocyte sedimentation rate"], altUnits: [], defaultRanges: [{ sex: "M", max: 15 }, { sex: "F", max: 20 }] },
];

// Common panel shortcuts → catalog ids. Used by the New Test Session screen.
export const PANELS = [
  { id: "lipid", name: "Lipid Panel", biomarkerIds: ["total-cholesterol", "ldl-cholesterol", "hdl-cholesterol", "triglycerides", "non-hdl-cholesterol"] },
  { id: "cbc", name: "Complete Blood Count", biomarkerIds: ["hemoglobin", "hematocrit", "white-blood-cells", "red-blood-cells", "platelets", "mcv", "mch", "mchc", "rdw"] },
  { id: "cmp", name: "Comprehensive Metabolic", biomarkerIds: ["fasting-glucose", "bun", "creatinine", "sodium", "potassium", "chloride", "bicarbonate", "calcium", "albumin", "total-protein", "alt", "ast", "alkaline-phosphatase", "total-bilirubin"] },
  { id: "thyroid", name: "Thyroid Panel", biomarkerIds: ["tsh", "free-t4", "free-t3"] },
  { id: "hba1c", name: "HbA1c", biomarkerIds: ["hba1c"] },
  { id: "vitamin-d", name: "Vitamin D", biomarkerIds: ["vitamin-d"] },
  { id: "iron", name: "Iron Studies", biomarkerIds: ["ferritin", "serum-iron", "tibc", "transferrin-saturation"] },
  { id: "liver", name: "Liver Panel", biomarkerIds: ["alt", "ast", "alkaline-phosphatase", "ggt", "total-bilirubin", "albumin"] },
];
