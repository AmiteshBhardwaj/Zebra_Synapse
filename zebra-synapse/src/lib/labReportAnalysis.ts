import { BIOMARKER_DEFINITION_MAP, BIOMARKER_DEFINITIONS, type BiomarkerDefinition } from "./biomarkerCatalog";

export type UploadAnalysisStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "review_required"
  | "ready"
  | "failed";

export type UploadDocumentType = "lab_report" | "unsupported" | null;

export type ReviewState =
  | "pending"
  | "review_required"
  | "published"
  | "auto_published"
  | "rejected";

export type LabReportUploadRow = {
  id: string;
  original_filename: string;
  created_at: string;
  analysis_status: UploadAnalysisStatus;
  document_type: UploadDocumentType;
  analysis_version: string;
  last_error: string | null;
  processed_at: string | null;
};

export type LabReportFieldSource = {
  page?: number | null;
  snippet?: string | null;
  originalValue?: string | null;
  unit?: string | null;
};

export type LabReportExtractionRow = {
  id: string;
  upload_id: string;
  schema_version: string;
  raw_text: string | null;
  ocr_text: string | null;
  extracted_recorded_at: string | null;
  biomarkers_json: Record<string, number> | null;
  field_sources_json: Record<string, LabReportFieldSource> | null;
  field_confidence_json: Record<string, number> | null;
  warnings_json: string[] | null;
  review_state: ReviewState;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type LegacyField = Exclude<BiomarkerDefinition["legacyField"], undefined>;

export const LAB_REPORT_UPLOAD_SELECT = `
  id,
  original_filename,
  created_at,
  analysis_status,
  document_type,
  analysis_version,
  last_error,
  processed_at
`.trim();

export const LAB_REPORT_EXTRACTION_SELECT = `
  id,
  upload_id,
  schema_version,
  raw_text,
  ocr_text,
  extracted_recorded_at,
  biomarkers_json,
  field_sources_json,
  field_confidence_json,
  warnings_json,
  review_state,
  review_notes,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`.trim();

const STATUS_META: Record<UploadAnalysisStatus, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  uploaded: { label: "Uploaded", tone: "neutral" },
  queued: { label: "Queued", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  review_required: { label: "Review required", tone: "warning" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

const LEGACY_FIELD_BY_KEY = new Map(
  BIOMARKER_DEFINITIONS.flatMap((definition) =>
    definition.legacyField ? [[definition.key, definition.legacyField satisfies LegacyField]] : [],
  ),
);

export function getUploadStatusMeta(status: UploadAnalysisStatus) {
  return STATUS_META[status] ?? STATUS_META.uploaded;
}

export function isPendingUploadStatus(status: UploadAnalysisStatus): boolean {
  return status === "uploaded" || status === "queued" || status === "processing";
}

export function coerceBiomarkerMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    const numeric = typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isFinite(numeric)) {
      result[key] = numeric;
    }
  }
  return result;
}

export function coerceFieldConfidenceMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    const numeric = typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isFinite(numeric)) {
      result[key] = Math.max(0, Math.min(1, numeric));
    }
  }
  return result;
}

export function coerceFieldSourcesMap(value: unknown): Record<string, LabReportFieldSource> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, LabReportFieldSource> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (!candidate || typeof candidate !== "object") continue;
    const source = candidate as Record<string, unknown>;
    result[key] = {
      page: typeof source.page === "number" ? source.page : source.page == null ? null : Number(source.page),
      snippet: typeof source.snippet === "string" ? source.snippet : null,
      originalValue: typeof source.originalValue === "string" ? source.originalValue : null,
      unit: typeof source.unit === "string" ? source.unit : null,
    };
  }
  return result;
}

export function sortBiomarkerKeys(keys: string[]): string[] {
  return [...keys].sort((left, right) => {
    const leftPriority = BIOMARKER_DEFINITION_MAP.get(left)?.priority ?? -1;
    const rightPriority = BIOMARKER_DEFINITION_MAP.get(right)?.priority ?? -1;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    const leftLabel = BIOMARKER_DEFINITION_MAP.get(left)?.label ?? left;
    const rightLabel = BIOMARKER_DEFINITION_MAP.get(right)?.label ?? right;
    return leftLabel.localeCompare(rightLabel);
  });
}

export function mapBiomarkersToLegacyFields(biomarkers: Record<string, number>) {
  const legacy: Partial<Record<LegacyField, number | null>> = {};
  for (const [key, value] of Object.entries(biomarkers)) {
    const legacyField = LEGACY_FIELD_BY_KEY.get(key);
    if (!legacyField) continue;
    legacy[legacyField] = value;
  }
  return legacy;
}

export function buildPanelPayloadFromExtraction(args: {
  patientId: string;
  uploadId: string;
  extractionId: string;
  recordedAt: string;
  biomarkers: Record<string, number>;
  notes?: string | null;
}) {
  const legacy = mapBiomarkersToLegacyFields(args.biomarkers);
  return {
    patient_id: args.patientId,
    upload_id: args.uploadId,
    source_extraction_id: args.extractionId,
    recorded_at: args.recordedAt,
    biomarkers: args.biomarkers,
    hemoglobin_a1c: legacy.hemoglobin_a1c ?? null,
    fasting_glucose: legacy.fasting_glucose ?? null,
    total_cholesterol: legacy.total_cholesterol ?? null,
    ldl: legacy.ldl ?? null,
    hdl: legacy.hdl ?? null,
    triglycerides: legacy.triglycerides ?? null,
    hemoglobin: legacy.hemoglobin ?? null,
    wbc: legacy.wbc ?? null,
    platelets: legacy.platelets ?? null,
    creatinine: legacy.creatinine ?? null,
    notes: args.notes?.trim() || null,
  };
}

export function summarizeExtractionWarnings(warnings: string[] | null | undefined): string | null {
  if (!warnings?.length) return null;
  return warnings.slice(0, 3).join(" ");
}

export function buildPublishedPanelSummary(biomarkers: Record<string, number>): string {
  const keys = sortBiomarkerKeys(Object.keys(biomarkers)).slice(0, 4);
  if (!keys.length) return "No biomarkers were published from this report yet.";
  const labels = keys.map((key) => BIOMARKER_DEFINITION_MAP.get(key)?.label ?? key);
  return `Published biomarkers: ${labels.join(", ")}${Object.keys(biomarkers).length > keys.length ? ", and more." : "."}`;
}
