export type LabPanelRow = {
  id: string;
  patient_id: string;
  upload_id: string | null;
  recorded_at: string;
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
  recorded_at,
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
