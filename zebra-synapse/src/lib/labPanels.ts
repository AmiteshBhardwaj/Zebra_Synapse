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

function clampNumber(value: number | null, max: number, decimals = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > max || value < -max) return null;
  return Number(value.toFixed(decimals));
}

export function buildLabPanelInsertPayload(
  patientId: string,
  input: LabPanelInput,
) {
  const hba1c = parseNullableNumber(input.hemoglobinA1c);
  const fglu = parseNullableNumber(input.fastingGlucose);
  const tchol = parseNullableNumber(input.totalCholesterol);
  const ldl = parseNullableNumber(input.ldl);
  const hdl = parseNullableNumber(input.hdl);
  const trig = parseNullableNumber(input.triglycerides);
  const hgb = parseNullableNumber(input.hemoglobin);
  const wbc = parseNullableNumber(input.wbc);
  const plt = parseNullableNumber(input.platelets);
  const creat = parseNullableNumber(input.creatinine);

  return {
    patient_id: patientId,
    upload_id: input.uploadId || null,
    recorded_at: input.recordedAt,
    biomarkers: {
      ...(hba1c != null ? { hemoglobin_a1c: hba1c } : {}),
      ...(fglu != null ? { fasting_glucose: fglu } : {}),
      ...(tchol != null ? { total_cholesterol: tchol } : {}),
      ...(ldl != null ? { ldl: ldl } : {}),
      ...(hdl != null ? { hdl: hdl } : {}),
      ...(trig != null ? { triglycerides: trig } : {}),
      ...(hgb != null ? { hemoglobin: hgb } : {}),
      ...(wbc != null ? { wbc: wbc } : {}),
      ...(plt != null ? { platelets: plt } : {}),
      ...(creat != null ? { creatinine: creat } : {}),
    },
    hemoglobin_a1c: clampNumber(hba1c, 999.9, 1),
    fasting_glucose: clampNumber(fglu, 9999.9, 1),
    total_cholesterol: clampNumber(tchol, 9999.9, 1),
    ldl: clampNumber(ldl, 9999.9, 1),
    hdl: clampNumber(hdl, 9999.9, 1),
    triglycerides: clampNumber(trig, 99999.9, 1),
    hemoglobin: clampNumber(hgb, 999.9, 1),
    wbc: clampNumber(wbc, 99999.9, 1),
    platelets: clampNumber(plt, 999999.9, 1),
    creatinine: clampNumber(creat, 99.99, 2),
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
