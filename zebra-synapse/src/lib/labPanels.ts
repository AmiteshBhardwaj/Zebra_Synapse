export type LabPanelRow = {
  id: string;
  patient_id: string;
  upload_id: string | null;
  source_extraction_id: string | null;
  recorded_at: string;
  biomarkers: Record<string, number> | null;
  hemoglobin_a1c: number | null;
  fasting_glucose: number | null;
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  hemoglobin: number | null;
  wbc: number | null;
  platelets: number | null;
  creatinine: number | null;
  notes: string | null;
  created_at: string;
};

export const LAB_PANEL_SELECT = `
  id,
  patient_id,
  upload_id,
  source_extraction_id,
  recorded_at,
  biomarkers,
  hemoglobin_a1c,
  fasting_glucose,
  total_cholesterol,
  ldl,
  hdl,
  triglycerides,
  hemoglobin,
  wbc,
  platelets,
  creatinine,
  notes,
  created_at
`.trim();

export type LabPanelInput = {
  uploadId: string;
  recordedAt: string;
  hemoglobinA1c: string;
  fastingGlucose: string;
  totalCholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  hemoglobin: string;
  wbc: string;
  platelets: string;
  creatinine: string;
  notes: string;
};

export const EMPTY_LAB_PANEL_INPUT: LabPanelInput = {
  uploadId: "",
  recordedAt: "",
  hemoglobinA1c: "",
  fastingGlucose: "",
  totalCholesterol: "",
  ldl: "",
  hdl: "",
  triglycerides: "",
  hemoglobin: "",
  wbc: "",
  platelets: "",
  creatinine: "",
  notes: "",
};

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildLabPanelInsertPayload(
  patientId: string,
  input: LabPanelInput,
) {
  return {
    patient_id: patientId,
    upload_id: input.uploadId || null,
    recorded_at: input.recordedAt,
    biomarkers: {
      ...(parseNullableNumber(input.hemoglobinA1c) != null ? { hemoglobin_a1c: parseNullableNumber(input.hemoglobinA1c)! } : {}),
      ...(parseNullableNumber(input.fastingGlucose) != null ? { fasting_glucose: parseNullableNumber(input.fastingGlucose)! } : {}),
      ...(parseNullableNumber(input.totalCholesterol) != null ? { total_cholesterol: parseNullableNumber(input.totalCholesterol)! } : {}),
      ...(parseNullableNumber(input.ldl) != null ? { ldl: parseNullableNumber(input.ldl)! } : {}),
      ...(parseNullableNumber(input.hdl) != null ? { hdl: parseNullableNumber(input.hdl)! } : {}),
      ...(parseNullableNumber(input.triglycerides) != null ? { triglycerides: parseNullableNumber(input.triglycerides)! } : {}),
      ...(parseNullableNumber(input.hemoglobin) != null ? { hemoglobin: parseNullableNumber(input.hemoglobin)! } : {}),
      ...(parseNullableNumber(input.wbc) != null ? { wbc: parseNullableNumber(input.wbc)! } : {}),
      ...(parseNullableNumber(input.platelets) != null ? { platelets: parseNullableNumber(input.platelets)! } : {}),
      ...(parseNullableNumber(input.creatinine) != null ? { creatinine: parseNullableNumber(input.creatinine)! } : {}),
    },
    hemoglobin_a1c: parseNullableNumber(input.hemoglobinA1c),
    fasting_glucose: parseNullableNumber(input.fastingGlucose),
    total_cholesterol: parseNullableNumber(input.totalCholesterol),
    ldl: parseNullableNumber(input.ldl),
    hdl: parseNullableNumber(input.hdl),
    triglycerides: parseNullableNumber(input.triglycerides),
    hemoglobin: parseNullableNumber(input.hemoglobin),
    wbc: parseNullableNumber(input.wbc),
    platelets: parseNullableNumber(input.platelets),
    creatinine: parseNullableNumber(input.creatinine),
    notes: input.notes.trim() || null,
  };
}

export function formatLabDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
