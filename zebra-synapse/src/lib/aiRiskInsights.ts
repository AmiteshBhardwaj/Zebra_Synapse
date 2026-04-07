import { analyzeDiseaseRiskProfile } from "./diseaseRiskModel.ts";
import type { LabPanelRow } from "./labPanels.ts";
import type { LabReportUploadRow } from "./labReports.ts";
import type { MedicalRecordText } from "./medicalRecordCorpus.ts";

export const AI_RISK_MODEL_KEY = "rare-disease-screen";
export const AI_RISK_MODEL_VERSION = "ml-adapted-v1";
export const AI_RISK_DISCLAIMER =
  "Assistive clinical decision support only. These AI-generated scores do not diagnose disease and should be reviewed with a clinician.";
export const AI_RISK_STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

export type AiRiskInsightStatus = "ready" | "partial" | "unavailable";
export type AiRiskInsightSource = "structured_lab_panel" | "linked_care_snapshot" | "hybrid";
export type AiRiskBand = "low" | "moderate" | "high";

export type AiRiskPrediction = {
  conditionKey: string;
  title: string;
  score: number;
  band: AiRiskBand;
  confidence: number;
  summary: string;
  drivers: string[];
  recommendedNextStep: string;
};

export type AiRiskInputCoverage = {
  panelCount: number;
  uploadCount: number;
  textDocumentCount: number;
  longitudinalSpanDays: number;
  usedLinkedCareFallback: boolean;
  summary: string;
  missingSignals: string[];
};

export type AiRiskInsight = {
  modelKey: string;
  modelVersion: string;
  generatedAt: string;
  status: AiRiskInsightStatus;
  source: AiRiskInsightSource;
  risks: AiRiskPrediction[];
  inputCoverage: AiRiskInputCoverage;
  disclaimer: string;
};

export type AiRiskInferenceRequest = {
  patientId: string;
  forceRefresh?: boolean;
};

export type AiRiskInferenceResponse = {
  insight: AiRiskStoredRow;
  cached: boolean;
};

export type AiRiskStoredInsight = AiRiskInsight & {
  id: string;
  patientId: string;
  requestedBy: string | null;
  inputSnapshotHash: string;
  createdAt: string;
};

export type AiRiskCareSnapshot = {
  last_visit: string | null;
  primary_condition: string | null;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  glucose: number | null;
  health_status: "normal" | "elevated" | "risk";
  risk_flags: string[] | null;
  created_at: string;
};

export type AiRiskFeaturePayload = {
  patientId: string;
  uploads: LabReportUploadRow[];
  panels: LabPanelRow[];
  recordTexts: MedicalRecordText[];
  careSnapshot: AiRiskCareSnapshot | null;
};

export type AiRiskStoredRow = {
  id: string;
  patient_id: string;
  requested_by: string | null;
  model_key: string;
  model_version: string;
  status: AiRiskInsightStatus;
  source: AiRiskInsightSource;
  input_snapshot_hash: string;
  input_coverage: AiRiskInputCoverage;
  risks: AiRiskPrediction[];
  disclaimer: string;
  generated_at: string;
  created_at: string;
};

export const AI_RISK_INSIGHTS_SELECT = `
  id,
  patient_id,
  requested_by,
  model_key,
  model_version,
  status,
  source,
  input_snapshot_hash,
  input_coverage,
  risks,
  disclaimer,
  generated_at,
  created_at
`.trim();

function describeAiRiskCoverage(args: {
  usedLinkedCareFallback: boolean;
  panelCount: number;
  textDocumentCount: number;
}): string {
  if (args.usedLinkedCareFallback) {
    return "Using a linked-care snapshot fallback because no structured lab panel was available.";
  }

  if (args.panelCount === 0) {
    return "No model-ready structured lab or linked-care snapshot was available.";
  }

  if (args.textDocumentCount > 0) {
    return "Using structured lab panels together with extracted report text.";
  }

  return "Using structured lab panels only. Add readable report text to improve confidence.";
}

export function hasMinimumAiRiskSignals(payload: AiRiskFeaturePayload): boolean {
  const normalized = buildAiRiskPayload(payload);
  if (normalized.panels.length === 0) return false;

  const latestPanel = normalized.panels[normalized.panels.length - 1];
  const numericSignals = Object.values(latestPanel.biomarkers ?? {}).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return numericSignals.length > 0;
}

export function buildUnavailableAiRiskInsight(payload: AiRiskFeaturePayload): AiRiskInsight {
  const normalizedPayload = buildAiRiskPayload(payload);
  const usedLinkedCareFallback =
    payload.panels.length === 0 && normalizedPayload.panels.length > 0 && Boolean(payload.careSnapshot);

  return {
    modelKey: AI_RISK_MODEL_KEY,
    modelVersion: AI_RISK_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    status: "unavailable",
    source: inferAiRiskSource(payload),
    risks: [],
    inputCoverage: {
      panelCount: normalizedPayload.panels.length,
      uploadCount: normalizedPayload.uploads.length,
      textDocumentCount: normalizedPayload.recordTexts.length,
      longitudinalSpanDays: 0,
      usedLinkedCareFallback,
      summary: describeAiRiskCoverage({
        usedLinkedCareFallback,
        panelCount: normalizedPayload.panels.length,
        textDocumentCount: normalizedPayload.recordTexts.length,
      }),
      missingSignals: [
        "At least one structured biomarker value is required before model-driven risk scoring can run.",
      ],
    },
    disclaimer: AI_RISK_DISCLAIMER,
  };
}

export function buildFallbackLabPanelFromCareSnapshot(
  patientId: string,
  snapshot: AiRiskCareSnapshot | null,
): LabPanelRow | null {
  if (!snapshot || snapshot.glucose == null) return null;

  const recordedAt = snapshot.last_visit
    ? snapshot.last_visit.slice(0, 10)
    : snapshot.created_at.slice(0, 10);

  return {
    id: `care-${patientId}`,
    patient_id: patientId,
    upload_id: null,
    recorded_at: recordedAt,
    biomarkers: { fasting_glucose: snapshot.glucose },
    hemoglobin_a1c: null,
    fasting_glucose: snapshot.glucose,
    total_cholesterol: null,
    ldl: null,
    hdl: null,
    triglycerides: null,
    hemoglobin: null,
    wbc: null,
    platelets: null,
    creatinine: null,
    notes: snapshot.primary_condition,
    created_at: snapshot.created_at,
  };
}

export function buildAiRiskPayload(args: AiRiskFeaturePayload): AiRiskFeaturePayload {
  const normalizedTexts = args.recordTexts.map((record) => ({
    ...record,
    text: record.text.trim().slice(0, 12000),
    charCount: record.text.trim().slice(0, 12000).length,
  }));

  if (args.panels.length > 0) {
    return {
      ...args,
      recordTexts: normalizedTexts,
    };
  }

  const fallbackPanel = buildFallbackLabPanelFromCareSnapshot(args.patientId, args.careSnapshot);
  if (!fallbackPanel) {
    return {
      ...args,
      recordTexts: normalizedTexts,
    };
  }

  return {
    ...args,
    recordTexts: normalizedTexts,
    panels: [fallbackPanel],
  };
}

export function inferAiRiskSource(payload: AiRiskFeaturePayload): AiRiskInsightSource {
  if (payload.panels.length === 0 && payload.careSnapshot) return "linked_care_snapshot";
  if (payload.careSnapshot) return "hybrid";
  return "structured_lab_panel";
}

export function computeAiRiskSnapshotHash(payload: AiRiskFeaturePayload): string {
  const normalized = JSON.stringify({
    patientId: payload.patientId,
    uploads: payload.uploads.map((upload) => ({
      id: upload.id,
      created_at: upload.created_at,
      original_filename: upload.original_filename,
    })),
    panels: payload.panels.map((panel) => ({
      id: panel.id,
      recorded_at: panel.recorded_at,
      created_at: panel.created_at,
      biomarkers: panel.biomarkers ?? {},
      hemoglobin_a1c: panel.hemoglobin_a1c,
      fasting_glucose: panel.fasting_glucose,
      total_cholesterol: panel.total_cholesterol,
      ldl: panel.ldl,
      hdl: panel.hdl,
      triglycerides: panel.triglycerides,
      hemoglobin: panel.hemoglobin,
      wbc: panel.wbc,
      platelets: panel.platelets,
      creatinine: panel.creatinine,
      notes: panel.notes,
    })),
    careSnapshot: payload.careSnapshot,
  });

  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${Math.abs(hash >>> 0).toString(16)}`;
}

export function buildAiRiskInsightFromPayload(payload: AiRiskFeaturePayload): AiRiskInsight {
  const normalizedPayload = buildAiRiskPayload(payload);
  if (!hasMinimumAiRiskSignals(normalizedPayload)) {
    return buildUnavailableAiRiskInsight(normalizedPayload);
  }

  const profile = analyzeDiseaseRiskProfile({
    panels: normalizedPayload.panels,
    uploads: normalizedPayload.uploads,
    recordTexts: normalizedPayload.recordTexts,
  });
  const usedLinkedCareFallback =
    payload.panels.length === 0 && normalizedPayload.panels.length > 0 && Boolean(payload.careSnapshot);

  const risks: AiRiskPrediction[] = profile.assessments.map((assessment) => ({
    conditionKey: assessment.id,
    title: assessment.disease,
    score: assessment.riskScore,
    band: assessment.level,
    confidence: assessment.confidence,
    summary: assessment.summary,
    drivers: assessment.evidence.slice(0, 3),
    recommendedNextStep: assessment.nextSteps[0] ?? "Review this pattern with a clinician.",
  }));

  const missingSignals = [...new Set(profile.assessments.flatMap((assessment) => assessment.missingSignals))]
    .slice(0, 6);
  const status: AiRiskInsightStatus =
    normalizedPayload.recordTexts.length > 0 || normalizedPayload.panels.length > 1
        ? "ready"
        : "partial";
  const source = inferAiRiskSource(payload);
  const inputCoverage: AiRiskInputCoverage = {
    panelCount: normalizedPayload.panels.length,
    uploadCount: normalizedPayload.uploads.length,
    textDocumentCount: normalizedPayload.recordTexts.length,
    longitudinalSpanDays: profile.longitudinalSpanDays,
    usedLinkedCareFallback,
    summary: describeAiRiskCoverage({
      usedLinkedCareFallback,
      panelCount: normalizedPayload.panels.length,
      textDocumentCount: normalizedPayload.recordTexts.length,
    }),
    missingSignals,
  };

  return {
    modelKey: AI_RISK_MODEL_KEY,
    modelVersion: AI_RISK_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    status,
    source,
    risks,
    inputCoverage,
    disclaimer: AI_RISK_DISCLAIMER,
  };
}

export function mapAiRiskRow(row: AiRiskStoredRow): AiRiskStoredInsight {
  return {
    id: row.id,
    patientId: row.patient_id,
    requestedBy: row.requested_by,
    modelKey: row.model_key,
    modelVersion: row.model_version,
    status: row.status,
    source: row.source,
    inputSnapshotHash: row.input_snapshot_hash,
    inputCoverage: row.input_coverage,
    risks: Array.isArray(row.risks) ? row.risks : [],
    disclaimer: row.disclaimer,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
  };
}

export function isAiRiskInsightStale(
  insight: Pick<AiRiskStoredInsight, "generatedAt" | "inputSnapshotHash" | "modelVersion">,
  snapshotHash: string | null,
): boolean {
  if (!snapshotHash) return true;
  if (insight.inputSnapshotHash !== snapshotHash) return true;
  if (insight.modelVersion !== AI_RISK_MODEL_VERSION) return true;

  const generatedAt = new Date(insight.generatedAt).getTime();
  if (Number.isNaN(generatedAt)) return true;

  return Date.now() - generatedAt > AI_RISK_STALE_AFTER_MS;
}
