import { createClient } from "npm:@supabase/supabase-js@2";
import {
  AI_RISK_INSIGHTS_SELECT,
  AI_RISK_MODEL_KEY,
  AI_RISK_MODEL_VERSION,
  buildAiRiskInsightFromPayload,
  buildAiRiskPayload,
  computeAiRiskSnapshotHash,
  type AiRiskCareSnapshot,
  type AiRiskInferenceRequest,
  type AiRiskStoredRow,
} from "../../../src/lib/aiRiskInsights.ts";
import { LAB_PANEL_SELECT, type LabPanelRow } from "../../../src/lib/labPanels.ts";
import type { LabReportUploadRow } from "../../../src/lib/labReports.ts";
import {
  mapMedicalRecordCorpusRow,
  MEDICAL_RECORD_CORPUS_SELECT,
  type MedicalRecordCorpusRow,
} from "../../../src/lib/medicalRecordCorpus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

function isMissingMedicalRecordCorpusError(message: string | undefined): boolean {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("medical_record_corpus");
}

async function loadPatientContext(args: {
  supabase: ReturnType<typeof createClient>;
  patientId: string;
}) {
  const [uploadsResult, panelsResult, corpusResult, careSnapshotResult] = await Promise.all([
    args.supabase
      .from("lab_report_uploads")
      .select("id, patient_id, storage_path, original_filename, created_at")
      .eq("patient_id", args.patientId)
      .order("created_at", { ascending: false }),
    args.supabase
      .from("lab_panels")
      .select(LAB_PANEL_SELECT)
      .eq("patient_id", args.patientId)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false }),
    args.supabase
      .from("medical_record_corpus")
      .select(MEDICAL_RECORD_CORPUS_SELECT)
      .eq("patient_id", args.patientId)
      .order("created_at", { ascending: false }),
    args.supabase
      .from("care_relationships")
      .select(
        "last_visit, primary_condition, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, glucose, health_status, risk_flags, created_at",
      )
      .eq("patient_id", args.patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (uploadsResult.error) {
    return { error: uploadsResult.error.message };
  }

  if (panelsResult.error) {
    return { error: panelsResult.error.message };
  }

  if (corpusResult.error && !isMissingMedicalRecordCorpusError(corpusResult.error.message)) {
    return { error: corpusResult.error.message };
  }

  if (careSnapshotResult.error) {
    return { error: careSnapshotResult.error.message };
  }

  return {
    error: null,
    payload: buildAiRiskPayload({
      patientId: args.patientId,
      uploads: ((uploadsResult.data ?? []) as unknown) as LabReportUploadRow[],
      panels: ((panelsResult.data ?? []) as unknown) as LabPanelRow[],
      recordTexts: (((corpusResult.data ?? []) as unknown) as MedicalRecordCorpusRow[]).map(
        mapMedicalRecordCorpusRow,
      ),
      careSnapshot:
        ((careSnapshotResult.data as AiRiskCareSnapshot | null | undefined) ?? null),
    }),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return badRequest("Method not allowed", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey) {
    return badRequest("Supabase environment variables are missing.", 500);
  }

  if (!authHeader) {
    return badRequest("Missing Authorization header.", 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return badRequest("Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const payload = (body ?? null) as AiRiskInferenceRequest | null;
  const patientId = payload?.patientId?.trim();
  const forceRefresh = payload?.forceRefresh === true;

  if (!patientId) {
    return badRequest("Missing patientId in request payload.");
  }

  if (user.id !== patientId) {
    const { data: relationship, error: relationshipError } = await supabase
      .from("care_relationships")
      .select("patient_id")
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (relationshipError) {
      return badRequest(relationshipError.message, 403);
    }

    if (!relationship) {
      return badRequest("Doctor-patient relationship not found.", 403);
    }
  }

  const loaded = await loadPatientContext({ supabase, patientId });
  if (loaded.error || !loaded.payload) {
    return badRequest(loaded.error ?? "Could not assemble patient context.", 403);
  }

  const normalizedPayload = loaded.payload;
  const inputSnapshotHash = computeAiRiskSnapshotHash(normalizedPayload);

  if (!forceRefresh) {
    const { data: existing, error: existingError } = await supabase
      .from("ai_risk_insights")
      .select(AI_RISK_INSIGHTS_SELECT)
      .eq("patient_id", normalizedPayload.patientId)
      .eq("model_key", AI_RISK_MODEL_KEY)
      .eq("model_version", AI_RISK_MODEL_VERSION)
      .eq("input_snapshot_hash", inputSnapshotHash)
      .maybeSingle();

    if (existingError) {
      return badRequest(existingError.message, 403);
    }

    if (existing) {
      return json({
        insight: existing,
        cached: true,
      });
    }
  }

  const generated = buildAiRiskInsightFromPayload(normalizedPayload);
  const insertPayload = {
    patient_id: normalizedPayload.patientId,
    requested_by: user.id,
    model_key: generated.modelKey,
    model_version: generated.modelVersion,
    status: generated.status,
    source: generated.source,
    input_snapshot_hash: inputSnapshotHash,
    input_coverage: generated.inputCoverage,
    risks: generated.risks,
    disclaimer: generated.disclaimer,
    generated_at: generated.generatedAt,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("ai_risk_insights")
    .insert(insertPayload)
    .select(AI_RISK_INSIGHTS_SELECT)
    .single();

  if (insertError) {
    const { data: fallback } = await supabase
      .from("ai_risk_insights")
      .select(AI_RISK_INSIGHTS_SELECT)
      .eq("patient_id", patientId)
      .eq("model_key", AI_RISK_MODEL_KEY)
      .eq("model_version", AI_RISK_MODEL_VERSION)
      .eq("input_snapshot_hash", inputSnapshotHash)
      .maybeSingle();

    if (fallback) {
      return json({
        insight: fallback,
        cached: true,
      });
    }

    return badRequest(insertError.message, 403);
  }

  return json({
    insight: inserted satisfies AiRiskStoredRow,
    cached: false,
  });
});
