import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";
import { Buffer } from "node:buffer";
import { getDocument } from "npm:pdfjs-dist@5.6.205/legacy/build/pdf.mjs";
import { BIOMARKER_DEFINITIONS, BIOMARKER_DEFINITION_MAP } from "../../../src/lib/biomarkerCatalog.ts";
import { buildPanelPayloadFromExtraction } from "../../../src/lib/labReportAnalysis.ts";

type ServiceClient = SupabaseClient;

type JobRow = {
  id: string;
  upload_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempt_count: number;
  available_at: string;
};

type UploadRow = {
  id: string;
  patient_id: string;
  storage_path: string;
  original_filename: string;
  analysis_status: string;
};

type ExtractedCandidate = {
  key: string;
  value: number;
  confidence: number;
  page: number | null;
  snippet: string | null;
  original_value: string | null;
  unit: string | null;
};

type ProviderExtractionResult = {
  document_type: "lab_report" | "unsupported";
  recorded_at: string | null;
  warnings: string[];
  biomarkers: ExtractedCandidate[];
};

type FinalizedExtraction = {
  recordedAt: string;
  biomarkers: Record<string, number>;
  fieldSources: Record<string, { page: number | null; snippet: string | null; originalValue: string | null; unit: string | null }>;
  fieldConfidence: Record<string, number>;
  warnings: string[];
  averageConfidence: number;
  autopublish: boolean;
  reviewState: "review_required" | "auto_published";
};

const PDF_TEXT_MIN_LENGTH = 160;
const ANALYSIS_VERSION = "lab-pipeline-v1";
const EXTRACTION_SCHEMA_VERSION = "lab-extraction-v1";
const AI_PROVIDER = "gemini";
const DEFAULT_MODEL = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-2.5-flash";
const FALLBACK_MODEL = Deno.env.get("GEMINI_MODEL_FALLBACK")?.trim() || "gemini-2.5-flash-lite";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")?.trim() || "";

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["document_type", "recorded_at", "warnings", "biomarkers"],
  properties: {
    document_type: { type: "string", enum: ["lab_report", "unsupported"] },
    recorded_at: {
      anyOf: [
        { type: "string", description: "ISO date YYYY-MM-DD if known." },
        { type: "null" },
      ],
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    biomarkers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value", "confidence", "page", "snippet", "original_value", "unit"],
        properties: {
          key: { type: "string", enum: BIOMARKER_DEFINITIONS.map((definition) => definition.key) },
          value: { type: "number" },
          confidence: { type: "number" },
          page: { anyOf: [{ type: "integer" }, { type: "null" }] },
          snippet: { anyOf: [{ type: "string" }, { type: "null" }] },
          original_value: { anyOf: [{ type: "string" }, { type: "null" }] },
          unit: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
  },
} as const;

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    document_type: {
      type: "STRING",
      enum: ["lab_report", "unsupported"],
    },
    recorded_at: {
      nullable: true,
      type: "STRING",
      description: "ISO date YYYY-MM-DD if known.",
    },
    warnings: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    biomarkers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: {
            type: "STRING",
            enum: BIOMARKER_DEFINITIONS.map((definition) => definition.key),
          },
          value: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
          page: { nullable: true, type: "INTEGER" },
          snippet: { nullable: true, type: "STRING" },
          original_value: { nullable: true, type: "STRING" },
          unit: { nullable: true, type: "STRING" },
        },
        required: ["key", "value", "confidence", "page", "snippet", "original_value", "unit"],
      },
    },
  },
  required: ["document_type", "recorded_at", "warnings", "biomarkers"],
} as const;

class RetryableQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableQuotaError";
  }
}

function getServiceClient(): ServiceClient {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env.");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function truncateText(value: string | null | undefined, max = 2000): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return truncateText(error.message, 400) ?? "Unknown error";
  return "Unknown error";
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
  try {
    const pdf = await getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;

    const chunks: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => {
          if (!item || typeof item !== "object" || !("str" in item)) return "";
          const candidate = item as { str?: unknown };
          return typeof candidate.str === "string" ? candidate.str : "";
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (strings) chunks.push(strings);
    }

    const text = chunks.join("\n").trim();
    return text ? text.slice(0, 120000) : null;
  } catch {
    return null;
  }
}

function buildPrompt(rawTextAvailable: boolean): string {
  const supportedUnits = BIOMARKER_DEFINITIONS.map((definition) => `${definition.key}: ${definition.units.join(" / ") || "unitless"}`).join("; ");
  return [
    "Extract structured lab biomarkers from this patient lab report.",
    "Rules:",
    "- Return document_type='unsupported' if document is not a lab/diagnostic report.",
    "- Only include biomarkers explicitly supported by schema.",
    "- Normalize numeric values into the expected units when the source clearly indicates a conversion.",
    "- If unit is ambiguous or conversion is uncertain, lower confidence and add a warning.",
    "- Use ISO date YYYY-MM-DD for recorded_at when present.",
    "- Confidence must be between 0 and 1.",
    "- snippet must quote the shortest useful evidence fragment.",
    rawTextAvailable
      ? "- The provided report_text comes from server-side PDF text extraction. Use it as primary evidence."
      : "- The PDF may lack a readable text layer. Use Gemini native PDF understanding and lower confidence where the page evidence is unclear.",
    `Supported biomarker units: ${supportedUnits}`,
  ].join("\n");
}

function isRetryableGeminiStatus(status: number, payload: unknown): boolean {
  const message = JSON.stringify(payload ?? "").toLowerCase();
  return status === 429 ||
    status === 503 ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("capacity");
}

async function callGeminiExtractionWithModel(args: {
  model: string;
  fileBytes: Uint8Array;
  rawText: string | null;
}): Promise<ProviderExtractionResult> {
  const parts: Array<Record<string, unknown>> = [
    {
      text: buildPrompt(Boolean(args.rawText && args.rawText.length >= PDF_TEXT_MIN_LENGTH)),
    },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: Buffer.from(args.fileBytes).toString("base64"),
      },
    },
  ];

  if (args.rawText && args.rawText.length >= PDF_TEXT_MIN_LENGTH) {
    parts.push({
      text: `report_text:\n${args.rawText.slice(0, 100000)}`,
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (isRetryableGeminiStatus(response.status, payload)) {
      throw new RetryableQuotaError(`Gemini extraction hit a retryable quota/capacity limit on model ${args.model}.`);
    }
    throw new Error(`Gemini extraction failed with status ${response.status}.`);
  }

  const outputText =
    payload?.candidates?.flatMap?.((candidate: Record<string, unknown>) =>
      Array.isArray(candidate?.content?.parts)
        ? candidate.content.parts
            .filter((part: Record<string, unknown>) => typeof part?.text === "string")
            .map((part: Record<string, unknown>) => part.text as string)
        : [],
    )?.join?.("") ||
    "";

  if (!outputText) {
    throw new Error("Gemini extraction returned no structured output.");
  }

  return JSON.parse(outputText) as ProviderExtractionResult;
}

async function extractStructuredLabData(args: {
  fileBytes: Uint8Array;
  rawText: string | null;
}): Promise<ProviderExtractionResult> {
  if (AI_PROVIDER !== "gemini") {
    throw new Error(`Unsupported AI provider '${AI_PROVIDER}'.`);
  }
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY for PDF analysis.");
  }

  try {
    return await callGeminiExtractionWithModel({
      model: DEFAULT_MODEL,
      fileBytes: args.fileBytes,
      rawText: args.rawText,
    });
  } catch (error) {
    if (!(error instanceof RetryableQuotaError)) throw error;
    if (!FALLBACK_MODEL || FALLBACK_MODEL === DEFAULT_MODEL) throw error;

    return await callGeminiExtractionWithModel({
      model: FALLBACK_MODEL,
      fileBytes: args.fileBytes,
      rawText: args.rawText,
    });
  }
}

function classifyTextAsLabReport(rawText: string | null): boolean {
  const normalized = (rawText ?? "").toLowerCase();
  if (!normalized) return false;
  return [
    "glucose",
    "cholesterol",
    "hemoglobin",
    "creatinine",
    "platelet",
    "triglyceride",
    "report date",
    "specimen",
  ].some((token) => normalized.includes(token));
}

function sanitizeCandidate(candidate: ExtractedCandidate): ExtractedCandidate | null {
  const definition = BIOMARKER_DEFINITION_MAP.get(candidate.key);
  if (!definition) return null;
  if (!Number.isFinite(candidate.value)) return null;
  if (!Number.isFinite(candidate.confidence)) return null;
  const confidence = Math.max(0, Math.min(1, candidate.confidence));
  const value = Number(candidate.value);
  if (value < 0) return null;
  return {
    key: candidate.key,
    value,
    confidence,
    page: candidate.page == null ? null : Number(candidate.page),
    snippet: truncateText(candidate.snippet, 800),
    original_value: truncateText(candidate.original_value, 120),
    unit: truncateText(candidate.unit, 40),
  };
}

function finalizeExtraction(result: ProviderExtractionResult): FinalizedExtraction {
  const warnings = [...(result.warnings ?? [])];
  const chosen = new Map<string, ExtractedCandidate>();

  for (const rawCandidate of result.biomarkers ?? []) {
    const candidate = sanitizeCandidate(rawCandidate);
    if (!candidate) continue;

    const definition = BIOMARKER_DEFINITION_MAP.get(candidate.key);
    if (!definition) continue;

    const expectedUnits = definition.units.map((unit) => unit.toLowerCase()).filter(Boolean);
    if (candidate.unit && expectedUnits.length && !expectedUnits.includes(candidate.unit.toLowerCase())) {
      warnings.push(`${definition.label}: source unit '${candidate.unit}' may not match expected ${definition.units.join(" / ")}.`);
      candidate.confidence = Math.max(0, candidate.confidence - 0.12);
    }

    const existing = chosen.get(candidate.key);
    if (!existing) {
      chosen.set(candidate.key, candidate);
      continue;
    }

    if (Math.abs(existing.value - candidate.value) > 0.001) {
      warnings.push(`${definition.label}: conflicting values detected (${existing.value} vs ${candidate.value}).`);
    }

    if (candidate.confidence > existing.confidence) {
      chosen.set(candidate.key, candidate);
    }
  }

  const biomarkers: Record<string, number> = {};
  const fieldSources: Record<string, { page: number | null; snippet: string | null; originalValue: string | null; unit: string | null }> = {};
  const fieldConfidence: Record<string, number> = {};

  for (const [key, candidate] of chosen.entries()) {
    biomarkers[key] = candidate.value;
    fieldSources[key] = {
      page: candidate.page,
      snippet: candidate.snippet,
      originalValue: candidate.original_value,
      unit: candidate.unit,
    };
    fieldConfidence[key] = candidate.confidence;
  }

  const confidences = Object.values(fieldConfidence);
  const averageConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0;
  const lowConfidenceCount = confidences.filter((value) => value < 0.78).length;
  const hasConflictWarning = warnings.some((warning) => warning.toLowerCase().includes("conflicting"));
  const autopublish = confidences.length > 0 && averageConfidence >= 0.86 && lowConfidenceCount === 0 && !hasConflictWarning;

  return {
    recordedAt: normalizeIsoDate(result.recorded_at) ?? new Date().toISOString().slice(0, 10),
    biomarkers,
    fieldSources,
    fieldConfidence,
    warnings: Array.from(new Set(warnings.map((warning) => truncateText(warning, 240) ?? "").filter(Boolean))),
    averageConfidence,
    autopublish,
    reviewState: autopublish ? "auto_published" : "review_required",
  };
}

async function fetchUpload(client: ServiceClient, uploadId: string): Promise<UploadRow> {
  const { data, error } = await client
    .from("lab_report_uploads")
    .select("id, patient_id, storage_path, original_filename, analysis_status")
    .eq("id", uploadId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Upload not found.");
  }
  return data as UploadRow;
}

async function downloadUploadBytes(client: ServiceClient, upload: UploadRow): Promise<Uint8Array> {
  const { data, error } = await client.storage.from("lab-reports").download(upload.storage_path);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not download uploaded file.");
  }
  return new Uint8Array(await data.arrayBuffer());
}

async function upsertExtraction(client: ServiceClient, args: {
  uploadId: string;
  rawText: string | null;
  ocrText: string | null;
  finalized: FinalizedExtraction;
}) {
  const { data, error } = await client
    .from("lab_report_extractions")
    .upsert(
      {
        upload_id: args.uploadId,
        schema_version: EXTRACTION_SCHEMA_VERSION,
        raw_text: args.rawText,
        ocr_text: args.ocrText,
        extracted_recorded_at: args.finalized.recordedAt,
        biomarkers_json: args.finalized.biomarkers,
        field_sources_json: args.finalized.fieldSources,
        field_confidence_json: args.finalized.fieldConfidence,
        warnings_json: args.finalized.warnings,
        review_state: args.finalized.reviewState,
      },
      { onConflict: "upload_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not save extraction.");
  }
  return data as { id: string };
}

async function publishLabPanel(client: ServiceClient, args: {
  patientId: string;
  uploadId: string;
  extractionId: string;
  finalized: FinalizedExtraction;
}) {
  const payload = buildPanelPayloadFromExtraction({
    patientId: args.patientId,
    uploadId: args.uploadId,
    extractionId: args.extractionId,
    recordedAt: args.finalized.recordedAt,
    biomarkers: args.finalized.biomarkers,
    notes: "Auto-published from uploaded PDF after server-side extraction.",
  });

  const { error } = await client.from("lab_panels").upsert(payload, { onConflict: "upload_id" });
  if (error) {
    throw new Error(error.message);
  }
}

async function completeJob(client: ServiceClient, jobId: string, uploadId: string, args: {
  status: "ready" | "review_required" | "failed";
  documentType: "lab_report" | "unsupported";
  lastError?: string | null;
  jobStatus?: "completed" | "failed";
}) {
  const now = new Date().toISOString();
  const { error: uploadError } = await client
    .from("lab_report_uploads")
    .update({
      analysis_status: args.status,
      document_type: args.documentType,
      analysis_version: ANALYSIS_VERSION,
      last_error: args.lastError ?? null,
      processed_at: args.status === "failed" ? null : now,
    })
    .eq("id", uploadId);
  if (uploadError) throw new Error(uploadError.message);

  const { error: jobError } = await client
    .from("lab_report_analysis_jobs")
    .update({
      status: args.jobStatus ?? (args.status === "failed" ? "failed" : "completed"),
      locked_at: null,
      last_error: args.lastError ?? null,
      available_at: args.status === "failed"
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : now,
    })
    .eq("id", jobId);
  if (jobError) throw new Error(jobError.message);
}

export async function claimQueuedJobs(args: { uploadId?: string; limit?: number } = {}): Promise<JobRow[]> {
  const client = getServiceClient();
  const now = new Date().toISOString();
  let query = client
    .from("lab_report_analysis_jobs")
    .select("id, upload_id, status, attempt_count, available_at")
    .in("status", ["queued", "failed"])
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(args.limit ?? 1);

  if (args.uploadId) {
    query = query.eq("upload_id", args.uploadId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const claimed: JobRow[] = [];
  for (const row of (data ?? []) as JobRow[]) {
    const { data: updated, error: updateError } = await client
      .from("lab_report_analysis_jobs")
      .update({
        status: "processing",
        locked_at: now,
        attempt_count: row.attempt_count + 1,
        last_error: null,
      })
      .eq("id", row.id)
      .in("status", ["queued", "failed"])
      .select("id, upload_id, status, attempt_count, available_at")
      .single();

    if (!updateError && updated) {
      claimed.push(updated as JobRow);
      await client
        .from("lab_report_uploads")
        .update({
          analysis_status: "processing",
          last_error: null,
          analysis_version: ANALYSIS_VERSION,
        })
        .eq("id", row.upload_id);
    }
  }

  return claimed;
}

export async function processClaimedJob(job: JobRow) {
  const client = getServiceClient();
  const upload = await fetchUpload(client, job.upload_id);

  try {
    const fileBytes = await downloadUploadBytes(client, upload);
    const rawText = await extractPdfText(fileBytes);
    const localLooksLikeLab = classifyTextAsLabReport(rawText);
    const providerResult = await extractStructuredLabData({
      fileBytes,
      rawText,
    });

    if (providerResult.document_type === "unsupported" || (!localLooksLikeLab && providerResult.biomarkers.length === 0)) {
      await completeJob(client, job.id, upload.id, {
        status: "failed",
        documentType: "unsupported",
        lastError: "The uploaded PDF was not recognized as a supported lab report.",
      });
      return { ok: false as const, uploadId: upload.id, status: "failed" as const };
    }

    const finalized = finalizeExtraction(providerResult);
    if (!Object.keys(finalized.biomarkers).length) {
      await completeJob(client, job.id, upload.id, {
        status: "failed",
        documentType: "lab_report",
        lastError: "No supported biomarkers were extracted from this report.",
      });
      return { ok: false as const, uploadId: upload.id, status: "failed" as const };
    }

    const extraction = await upsertExtraction(client, {
      uploadId: upload.id,
      rawText,
      ocrText: rawText && rawText.length >= PDF_TEXT_MIN_LENGTH ? null : null,
      finalized,
    });

    if (finalized.autopublish) {
      await publishLabPanel(client, {
        patientId: upload.patient_id,
        uploadId: upload.id,
        extractionId: extraction.id,
        finalized,
      });
      await client
        .from("lab_report_extractions")
        .update({
          review_state: "auto_published",
        })
        .eq("id", extraction.id);

      await completeJob(client, job.id, upload.id, {
        status: "ready",
        documentType: "lab_report",
      });
      return { ok: true as const, uploadId: upload.id, status: "ready" as const };
    }

    await client
      .from("lab_report_extractions")
      .update({
        review_state: "review_required",
      })
      .eq("id", extraction.id);

    await completeJob(client, job.id, upload.id, {
      status: "review_required",
      documentType: "lab_report",
    });
    return { ok: true as const, uploadId: upload.id, status: "review_required" as const };
  } catch (error) {
    const message = safeErrorMessage(error);
    await completeJob(client, job.id, upload.id, {
      status: "failed",
      documentType: "lab_report",
      lastError: message,
      jobStatus: "failed",
    });
    return { ok: false as const, uploadId: upload.id, status: "failed" as const, error: message };
  }
}
