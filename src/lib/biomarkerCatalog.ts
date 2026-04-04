export type BiomarkerDefinition = {
  key: string;
  label: string;
  units: string[];
  patterns: RegExp[];
  exclude?: RegExp[];
  reference?: string;
  low?: number;
  high?: number;
  borderlineLow?: number;
  borderlineHigh?: number;
  priority: number;
  legacyField?:
    | "hemoglobin_a1c"
    | "fasting_glucose"
    | "total_cholesterol"
    | "ldl"
    | "hdl"
    | "triglycerides"
    | "hemoglobin"
    | "wbc"
    | "platelets"
    | "creatinine";
};

export const BIOMARKER_DEFINITIONS: BiomarkerDefinition[] = [
  { key: "hemoglobin_a1c", label: "Hemoglobin A1c", units: ["%"], patterns: [/\b(?:hemoglobin\s*a1c|hba1c|glycated\s+hemoglobin)\b/i], reference: "< 5.7", borderlineHigh: 5.7, high: 6.5, priority: 100, legacyField: "hemoglobin_a1c" },
  { key: "fasting_glucose", label: "Fasting Glucose", units: ["mg/dL"], patterns: [/\b(?:fasting\s+glucose|glucose,\s*fasting|fasting\s+blood\s+glucose|fasting\s+blood\s+sugar|fbs)\b/i], exclude: [/\bmean\s+blood\s+glucose\b/i], reference: "70-99", low: 70, borderlineHigh: 100, high: 126, priority: 99, legacyField: "fasting_glucose" },
  { key: "total_cholesterol", label: "Total Cholesterol", units: ["mg/dL"], patterns: [/\b(?:total\s+cholesterol|cholesterol,\s*total|cholesterol)\b/i], exclude: [/\b(?:hdl|ldl|vldl|chol\/hdl|ldl\/hdl)\b/i], reference: "< 200", borderlineHigh: 200, high: 240, priority: 90, legacyField: "total_cholesterol" },
  { key: "ldl", label: "LDL Cholesterol", units: ["mg/dL"], patterns: [/\b(?:direct\s+ldl|ldl(?:\s+cholesterol)?|ldl-c)\b/i], reference: "< 100", borderlineHigh: 100, high: 160, priority: 95, legacyField: "ldl" },
  { key: "hdl", label: "HDL Cholesterol", units: ["mg/dL"], patterns: [/\b(?:hdl(?:\s+cholesterol)?|hdl-c)\b/i], reference: ">= 40", low: 40, priority: 88, legacyField: "hdl" },
  { key: "triglycerides", label: "Triglycerides", units: ["mg/dL"], patterns: [/\btriglycerides?\b/i], reference: "< 150", borderlineHigh: 150, high: 200, priority: 92, legacyField: "triglycerides" },
  { key: "hemoglobin", label: "Hemoglobin", units: ["g/dL"], patterns: [/\b(?:hemoglobin|hgb)\b/i], exclude: [/\bhba1c\b/i], reference: "12-17", low: 12, high: 17, priority: 82, legacyField: "hemoglobin" },
  { key: "wbc", label: "White Blood Cells", units: ["/cmm"], patterns: [/\b(?:white\s+blood\s+cell(?:\s+count)?|wbc(?:\s+count)?)\b/i], reference: "4000-11000", low: 4000, high: 11000, priority: 80, legacyField: "wbc" },
  { key: "platelets", label: "Platelets", units: ["/cmm"], patterns: [/\bplatelet(?:s|\s+count)?\b/i], reference: "150000-450000", low: 150000, high: 450000, priority: 78, legacyField: "platelets" },
  { key: "creatinine", label: "Creatinine", units: ["mg/dL"], patterns: [/\bcreatinine(?:,\s*serum)?\b/i], reference: "0.6-1.3", low: 0.6, high: 1.3, priority: 84, legacyField: "creatinine" },
  { key: "rbc_count", label: "RBC Count", units: ["million/cmm"], patterns: [/\brbc\s+count\b/i], reference: "4.5-5.5", low: 4.5, high: 5.5, priority: 58 },
  { key: "hematocrit", label: "Hematocrit", units: ["%"], patterns: [/\bhematocrit\b/i], reference: "40-49", low: 40, high: 49, priority: 58 },
  { key: "mcv", label: "MCV", units: ["fL"], patterns: [/\bmcv\b/i], reference: "83-101", low: 83, high: 101, priority: 54 },
  { key: "mch", label: "MCH", units: ["pg"], patterns: [/\bmch\b/i], exclude: [/\bmchc\b/i], reference: "27.1-32.5", low: 27.1, high: 32.5, priority: 50 },
  { key: "mchc", label: "MCHC", units: ["g/dL"], patterns: [/\bmchc\b/i], reference: "32.5-36.7", low: 32.5, high: 36.7, priority: 50 },
  { key: "rdw_cv", label: "RDW CV", units: ["%"], patterns: [/\brdw\s*cv\b/i], reference: "11.6-14", low: 11.6, high: 14, priority: 44 },
  { key: "neutrophils_percent", label: "Neutrophils", units: ["%"], patterns: [/\bneutrophils?\b/i], reference: "40-80", low: 40, high: 80, priority: 48 },
  { key: "lymphocytes_percent", label: "Lymphocytes", units: ["%"], patterns: [/\blymphocytes?\b/i], reference: "20-40", low: 20, high: 40, priority: 48 },
  { key: "eosinophils_percent", label: "Eosinophils", units: ["%"], patterns: [/\beosinophils?\b/i], reference: "1-6", low: 1, high: 6, priority: 42 },
  { key: "monocytes_percent", label: "Monocytes", units: ["%"], patterns: [/\bmonocytes?\b/i], reference: "2-10", low: 2, high: 10, priority: 42 },
  { key: "basophils_percent", label: "Basophils", units: ["%"], patterns: [/\bbasophils?\b/i], reference: "0-2", low: 0, high: 2, priority: 38 },
  { key: "absolute_neutrophil_count", label: "Absolute Neutrophil Count", units: ["/cmm"], patterns: [/\bneutrophils?\b/i], reference: "2000-6700", low: 2000, high: 6700, priority: 46 },
  { key: "absolute_lymphocyte_count", label: "Absolute Lymphocyte Count", units: ["/cmm"], patterns: [/\blymphocytes?\b/i], reference: "1100-3300", low: 1100, high: 3300, priority: 46 },
  { key: "absolute_eosinophil_count", label: "Absolute Eosinophil Count", units: ["/cmm"], patterns: [/\beosinophils?\b/i], reference: "0-400", low: 0, high: 400, priority: 40 },
  { key: "absolute_monocyte_count", label: "Absolute Monocyte Count", units: ["/cmm"], patterns: [/\bmonocytes?\b/i], reference: "200-700", low: 200, high: 700, priority: 40 },
  { key: "absolute_basophil_count", label: "Absolute Basophil Count", units: ["/cmm"], patterns: [/\bbasophils?\b/i], reference: "0-100", low: 0, high: 100, priority: 36 },
  { key: "mpv", label: "Mean Platelet Volume", units: ["fL"], patterns: [/\bmpv\b/i], reference: "7.5-10.3", low: 7.5, high: 10.3, priority: 34 },
  { key: "esr", label: "ESR", units: ["mm/1hr"], patterns: [/\b(?:erythrocyte\s+sedimentation\s+rate|esr)\b/i], reference: "0-14", low: 0, high: 14, priority: 36 },
  { key: "vldl", label: "VLDL", units: ["mg/dL"], patterns: [/\bvldl\b/i], reference: "15-35", low: 15, high: 35, priority: 30 },
  { key: "chol_hdl_ratio", label: "Chol/HDL Ratio", units: [""], patterns: [/\bchol\/hdl\s+ratio\b/i], reference: "<= 5", high: 5, priority: 40 },
  { key: "ldl_hdl_ratio", label: "LDL/HDL Ratio", units: [""], patterns: [/\bldl\/hdl\s+ratio\b/i], reference: "<= 3.5", high: 3.5, priority: 40 },
  { key: "mean_blood_glucose", label: "Mean Blood Glucose", units: ["mg/dL"], patterns: [/\bmean\s+blood\s+glucose\b/i], reference: "Contextual", priority: 38 },
  { key: "t3", label: "T3", units: ["ng/mL"], patterns: [/\bt3\s*-\s*triiodothyronine\b/i, /\bt3\b/i], reference: "0.58-1.59", low: 0.58, high: 1.59, priority: 48 },
  { key: "t4", label: "T4", units: ["mg/mL"], patterns: [/\bt4\s*-\s*thyroxine\b/i, /\bt4\b/i], reference: "4.87-11.72", low: 4.87, high: 11.72, priority: 48 },
  { key: "tsh", label: "TSH", units: ["microIU/mL"], patterns: [/\btsh(?:\s*-\s*thyroid\s+stimulating\s+hormone)?\b/i], reference: "0.35-4.94", low: 0.35, high: 4.94, priority: 72 },
  { key: "microalbumin_urine", label: "Urine Microalbumin", units: ["mg/L"], patterns: [/\bmicroalbumin\s*\(per\s+urine\s+volume\)\b/i, /\bmicroalbumin\b/i], reference: "< 16.7", high: 16.7, priority: 70 },
  { key: "total_protein", label: "Total Protein", units: ["g/dL"], patterns: [/\btotal\s+protein\b/i], reference: "6.3-8.2", low: 6.3, high: 8.2, priority: 34 },
  { key: "albumin", label: "Albumin", units: ["g/dL"], patterns: [/\balbumin\b/i], exclude: [/\bmicroalbumin\b/i], reference: "3.5-5.0", low: 3.5, high: 5.0, priority: 36 },
  { key: "globulin", label: "Globulin", units: ["g/dL"], patterns: [/\bglobulin\b/i], reference: "2.3-3.5", low: 2.3, high: 3.5, priority: 28 },
  { key: "ag_ratio", label: "A/G Ratio", units: [""], patterns: [/\ba\/g\s+ratio\b/i], reference: "1.3-1.7", low: 1.3, high: 1.7, priority: 24 },
  { key: "total_bilirubin", label: "Total Bilirubin", units: ["mg/dL"], patterns: [/\btotal\s+bilirubin\b/i], reference: "0.2-1.3", low: 0.2, high: 1.3, priority: 34 },
  { key: "conjugated_bilirubin", label: "Conjugated Bilirubin", units: ["mg/dL"], patterns: [/\bconjugated\s+bilirubin\b/i], reference: "0.0-0.3", low: 0, high: 0.3, priority: 28 },
  { key: "unconjugated_bilirubin", label: "Unconjugated Bilirubin", units: ["mg/dL"], patterns: [/\bunconjugated\s+bilirubin\b/i], reference: "0.0-1.1", low: 0, high: 1.1, priority: 28 },
  { key: "delta_bilirubin", label: "Delta Bilirubin", units: ["mg/dL"], patterns: [/\bdelta\s+bilirubin\b/i], reference: "0.0-0.2", low: 0, high: 0.2, priority: 18 },
  { key: "iron", label: "Iron", units: ["micro g/dL"], patterns: [/\biron\b/i], exclude: [/\btotal\s+iron\s+binding\s+capacity\b/i], reference: "49-181", low: 49, high: 181, priority: 44 },
  { key: "tibc", label: "Total Iron Binding Capacity", units: [""], patterns: [/\btotal\s+iron\s+binding\s+capacity\b/i, /\btibc\b/i], reference: "261-462", low: 261, high: 462, priority: 44 },
  { key: "transferrin_saturation", label: "Transferrin Saturation", units: ["%"], patterns: [/\btransferrin\s+saturation\b/i], reference: "20-50", low: 20, high: 50, priority: 40 },
  { key: "homocysteine", label: "Homocysteine", units: ["micromol/L"], patterns: [/\bhomocysteine(?:,\s*serum)?\b/i], reference: "6-14.8", low: 6, high: 14.8, priority: 74 },
  { key: "urea", label: "Urea", units: ["mg/dL"], patterns: [/\burea\b/i], exclude: [/\bblood\s+urea\s+nitrogen\b/i], reference: "19.3-43", low: 19.3, high: 43, priority: 32 },
  { key: "blood_urea_nitrogen", label: "Blood Urea Nitrogen", units: ["mg/dL"], patterns: [/\bblood\s+urea\s+nitrogen\b/i], reference: "9-20", low: 9, high: 20, priority: 32 },
  { key: "uric_acid", label: "Uric Acid", units: ["mg/dL"], patterns: [/\buric\s+acid\b/i], reference: "3.5-8.5", low: 3.5, high: 8.5, priority: 34 },
  { key: "calcium", label: "Calcium", units: ["mg/dL"], patterns: [/\bcalcium\b/i], reference: "8.4-10.2", low: 8.4, high: 10.2, priority: 40 },
  { key: "sgpt", label: "SGPT", units: ["U/L"], patterns: [/\bsgpt\b/i, /\balt\b/i], reference: "0-50", low: 0, high: 50, priority: 62 },
  { key: "sgot", label: "SGOT", units: ["U/L"], patterns: [/\bsgot\b/i, /\bast\b/i], reference: "17-59", low: 17, high: 59, priority: 58 },
  { key: "sodium", label: "Sodium", units: ["mmol/L"], patterns: [/\bsodium\s*\(na\+\)\b/i, /\bsodium\b/i], reference: "136-145", low: 136, high: 145, priority: 64 },
  { key: "potassium", label: "Potassium", units: ["mmol/L"], patterns: [/\bpotassium\s*\(k\+\)\b/i, /\bpotassium\b/i], reference: "3.5-5.1", low: 3.5, high: 5.1, priority: 68 },
  { key: "chloride", label: "Chloride", units: ["mmol/L"], patterns: [/\bchloride\s*\(cl-\)\b/i, /\bchloride\b/i], reference: "98-107", low: 98, high: 107, priority: 52 },
  { key: "vitamin_d_25_oh", label: "25(OH) Vitamin D", units: ["ng/mL"], patterns: [/\b25\(oh\)\s*vitamin\s*d\b/i, /\bvitamin\s*d\b/i], reference: "30-100", low: 30, high: 100, priority: 76 },
  { key: "vitamin_b12", label: "Vitamin B12", units: ["pg/mL"], patterns: [/\bvitamin\s*b12\b/i], reference: "187-833", low: 187, high: 833, priority: 76 },
  { key: "psa_total", label: "PSA Total", units: ["ng/mL"], patterns: [/\bpsa[-\s]*prostate\s+specific\s+antigen,\s*total\b/i, /\bpsa\b/i], reference: "0-4", low: 0, high: 4, priority: 46 },
  { key: "ige", label: "IgE", units: ["IU/mL"], patterns: [/\bige\b/i], reference: "0-87", low: 0, high: 87, priority: 56 },
  { key: "hiv_p24", label: "HIV I & II Ab/Ag with P24 Ag", units: ["S/Co"], patterns: [/\bhiv\s*i\s*&\s*ii\s*ab\/ag\s*with\s*p24\s*ag\b/i, /\bhiv\b/i], reference: "< 1", high: 1, priority: 20 },
  { key: "hbsag", label: "HBsAg", units: ["S/Co"], patterns: [/\bhbsag\b/i], reference: "< 1", high: 1, priority: 20 },
  { key: "hb_a", label: "Hb A", units: ["%"], patterns: [/\bhb\s*a\b/i], exclude: [/\bhba1c\b/i, /\bhb\s*a2\b/i], reference: "96.8-97.8", low: 96.8, high: 97.8, priority: 24 },
  { key: "hb_a2", label: "Hb A2", units: ["%"], patterns: [/\bhb\s*a2\b/i], reference: "2.2-3.2", low: 2.2, high: 3.2, priority: 24 },
  { key: "p2_peak", label: "P2 Peak", units: ["%"], patterns: [/\bp2\s+peak\b/i], reference: "< 10", high: 10, priority: 12 },
  { key: "p3_peak", label: "P3 Peak", units: ["%"], patterns: [/\bp3\s+peak\b/i], reference: "< 10", high: 10, priority: 12 },
  { key: "foetal_hb", label: "Foetal Hb", units: ["%"], patterns: [/\bfoetal\s+hb\b/i, /\bfetal\s+hb\b/i], reference: "0-1", low: 0, high: 1, priority: 20 },
  { key: "urine_ph", label: "Urine pH", units: [""], patterns: [/\bpH\b/i], reference: "4.6-8.0", low: 4.6, high: 8, priority: 18 },
  { key: "urine_specific_gravity", label: "Urine Specific Gravity", units: [""], patterns: [/\bspecific\s+gravity\b/i], reference: "1.005-1.030", low: 1.005, high: 1.03, priority: 18 },
];

export const BIOMARKER_DEFINITION_MAP = new Map(
  BIOMARKER_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function getBiomarkerDefinition(key: string): BiomarkerDefinition | undefined {
  return BIOMARKER_DEFINITION_MAP.get(key);
}

