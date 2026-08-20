import { getSupabase } from "./supabase";
import { BIOMARKER_DEFINITIONS, getBiomarkerDefinition } from "./biomarkerCatalog";
import { getGeminiApiKey, getGeminiModels } from "./geminiKey";
import type { MetricAssessment } from "./labInsights";
import {
  buildOmniContextPromptString,
  type PatientPortalContextData,
  ZEBRA_SYNAPSE_KNOWLEDGE,
} from "./patientPortalContext";

export type LabReportQueryStatus = "pending_review" | "verified" | "rejected_and_replaced";

export type LabReportQueryRow = {
  id: string;
  upload_id: string;
  patient_id: string;
  doctor_id: string | null;
  user_query: string;
  ai_response: string;
  status: LabReportQueryStatus;
  doctor_response: string | null;
  doctor_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  reviewer_profile?: { full_name: string | null; role?: string | null } | null;
  upload?: { original_filename: string; created_at: string } | null;
  patient_profile?: { full_name: string | null } | null;
};

export const LAB_REPORT_QUERY_SELECT = `
  id,
  upload_id,
  patient_id,
  doctor_id,
  user_query,
  ai_response,
  status,
  doctor_response,
  doctor_notes,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at,
  reviewer_profile:profiles!lab_report_queries_reviewed_by_fkey ( full_name, role ),
  upload:lab_report_uploads!lab_report_queries_upload_id_fkey ( original_filename, created_at ),
  patient_profile:profiles!lab_report_queries_patient_id_fkey ( full_name )
`.trim();

const STORAGE_LAB_QUERIES_KEY = "zebra_local_lab_report_queries";

function getLocalQueries(): LabReportQueryRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_LAB_QUERIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQueries(queries: LabReportQueryRow[]): void {
  try {
    localStorage.setItem(STORAGE_LAB_QUERIES_KEY, JSON.stringify(queries));
  } catch {
    // ignore
  }
}

/**
 * Fetch all queries for a specific uploaded lab report.
 */
export async function fetchQueriesForReport(uploadId: string): Promise<LabReportQueryRow[]> {
  const localList = getLocalQueries().filter((q) => q.upload_id === uploadId);
  const supabase = getSupabase();
  if (!supabase) return localList;

  try {
    const { data, error } = await supabase
      .from("lab_report_queries")
      .select(LAB_REPORT_QUERY_SELECT)
      .eq("upload_id", uploadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[labReportChat] fetchQueriesForReport Supabase warning, using local fallback:", error.message);
      return localList;
    }

    const remoteRows = (data as unknown as LabReportQueryRow[]) || [];
    const merged = [...remoteRows];
    localList.forEach((loc) => {
      if (!merged.some((r) => r.id === loc.id)) {
        merged.push(loc);
      }
    });
    return merged;
  } catch {
    return localList;
  }
}

/**
 * Fetch all queries for a patient across all reports.
 */
export async function fetchPatientAllQueries(patientId: string): Promise<LabReportQueryRow[]> {
  const localList = getLocalQueries().filter(
    (q) => !patientId || q.patient_id === patientId || q.patient_id === "guest" || patientId.startsWith("demo-")
  );
  const supabase = getSupabase();
  if (!supabase) return localList;

  try {
    const { data, error } = await supabase
      .from("lab_report_queries")
      .select(LAB_REPORT_QUERY_SELECT)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[labReportChat] fetchPatientAllQueries Supabase warning, using local fallback:", error.message);
      return localList;
    }

    const remoteRows = (data as unknown as LabReportQueryRow[]) || [];
    const merged = [...remoteRows];
    localList.forEach((loc) => {
      if (!merged.some((r) => r.id === loc.id)) {
        merged.push(loc);
      }
    });
    return merged;
  } catch {
    return localList;
  }
}

/**
 * Fetch pending or all queries for a doctor to review.
 */
export async function fetchDoctorPatientQueries(options: {
  doctorId: string;
  patientId?: string;
  statusOnly?: LabReportQueryStatus;
}): Promise<LabReportQueryRow[]> {
  let localList = getLocalQueries();
  if (options.patientId) {
    localList = localList.filter((q) => q.patient_id === options.patientId);
  }
  if (options.statusOnly) {
    localList = localList.filter((q) => q.status === options.statusOnly);
  }

  const supabase = getSupabase();
  if (!supabase) return localList;

  try {
    let query = supabase.from("lab_report_queries").select(LAB_REPORT_QUERY_SELECT);
    if (options.patientId) {
      query = query.eq("patient_id", options.patientId);
    }
    if (options.statusOnly) {
      query = query.eq("status", options.statusOnly);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.warn("[labReportChat] fetchDoctorPatientQueries Supabase warning, using local fallback:", error.message);
      return localList;
    }

    const remoteRows = (data as unknown as LabReportQueryRow[]) || [];
    const merged = [...remoteRows];
    localList.forEach((loc) => {
      if (!merged.some((r) => r.id === loc.id)) {
        merged.push(loc);
      }
    });
    return merged;
  } catch {
    return localList;
  }
}

/**
 * Fetch count of pending reviews across all assigned patients for a doctor.
 */
export async function fetchDoctorPendingReviewCount(doctorId: string): Promise<number> {
  const localPending = getLocalQueries().filter((q) => q.status === "pending_review").length;
  const supabase = getSupabase();
  if (!supabase) return localPending;

  try {
    const { count, error } = await supabase
      .from("lab_report_queries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review");

    if (error) {
      console.warn("[labReportChat] fetchDoctorPendingReviewCount Supabase warning:", error.message);
      return localPending;
    }

    return count != null ? count : localPending;
  } catch {
    return localPending;
  }
}

/**
 * Submit a patient's question and initial AI response.
 */
export async function submitLabReportQuery(params: {
  uploadId: string;
  patientId: string;
  doctorId?: string | null;
  userQuery: string;
  aiResponse: string;
  status?: LabReportQueryStatus;
}): Promise<LabReportQueryRow | null> {
  const now = new Date().toISOString();
  const queryStatus: LabReportQueryStatus = params.status || "pending_review";
  const localItem: LabReportQueryRow = {
    id: `local_q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    upload_id: params.uploadId,
    patient_id: params.patientId,
    doctor_id: params.doctorId || null,
    user_query: params.userQuery.trim(),
    ai_response: params.aiResponse.trim(),
    status: queryStatus,
    doctor_response: null,
    doctor_notes: null,
    reviewed_by: queryStatus === "verified" ? "ai-verified" : null,
    reviewed_at: queryStatus === "verified" ? now : null,
    created_at: now,
    updated_at: now,
  };

  const existingLocal = getLocalQueries();
  saveLocalQueries([localItem, ...existingLocal]);

  const supabase = getSupabase();
  if (!supabase) return localItem;

  const payload = {
    upload_id: params.uploadId,
    patient_id: params.patientId,
    doctor_id: params.doctorId || null,
    user_query: params.userQuery.trim(),
    ai_response: params.aiResponse.trim(),
    status: queryStatus,
  };

  try {
    const { data, error } = await supabase
      .from("lab_report_queries")
      .insert(payload)
      .select(LAB_REPORT_QUERY_SELECT)
      .single();

    if (error) {
      console.warn("[labReportChat] submitLabReportQuery Supabase insert fallback to local storage:", error.message);
      return localItem;
    }

    return (data as unknown as LabReportQueryRow) || localItem;
  } catch {
    return localItem;
  }
}

/**
 * Doctor verifies the AI response (ticks it as medically accurate).
 */
export async function verifyLabReportQuery(params: {
  queryId: string;
  doctorId: string;
  doctorNotes?: string;
}): Promise<LabReportQueryRow | null> {
  const localList = getLocalQueries();
  const index = localList.findIndex((q) => q.id === params.queryId);
  let updatedLocal: LabReportQueryRow | null = null;

  if (index >= 0) {
    localList[index] = {
      ...localList[index],
      status: "verified",
      reviewed_by: params.doctorId,
      reviewed_at: new Date().toISOString(),
      doctor_notes: params.doctorNotes?.trim() || null,
    };
    saveLocalQueries(localList);
    updatedLocal = localList[index];
  }

  const supabase = getSupabase();
  if (!supabase) return updatedLocal;

  try {
    const payload = {
      status: "verified" as const,
      reviewed_by: params.doctorId,
      reviewed_at: new Date().toISOString(),
      doctor_notes: params.doctorNotes?.trim() || null,
    };

    const { data, error } = await supabase
      .from("lab_report_queries")
      .update(payload)
      .eq("id", params.queryId)
      .select(LAB_REPORT_QUERY_SELECT)
      .single();

    if (error) {
      console.warn("[labReportChat] verifyLabReportQuery Supabase warning:", error.message);
      return updatedLocal;
    }

    return (data as unknown as LabReportQueryRow) || updatedLocal;
  } catch {
    return updatedLocal;
  }
}

/**
 * Doctor rejects the AI response and replaces it with their own clinical explanation.
 */
export async function rejectAndReplaceLabReportQuery(params: {
  queryId: string;
  doctorId: string;
  doctorResponse: string;
  doctorNotes?: string;
}): Promise<LabReportQueryRow | null> {
  const localList = getLocalQueries();
  const index = localList.findIndex((q) => q.id === params.queryId);
  let updatedLocal: LabReportQueryRow | null = null;

  if (index >= 0) {
    localList[index] = {
      ...localList[index],
      status: "rejected_and_replaced",
      doctor_response: params.doctorResponse.trim(),
      reviewed_by: params.doctorId,
      reviewed_at: new Date().toISOString(),
      doctor_notes: params.doctorNotes?.trim() || null,
    };
    saveLocalQueries(localList);
    updatedLocal = localList[index];
  }

  const supabase = getSupabase();
  if (!supabase) return updatedLocal;

  try {
    const payload = {
      status: "rejected_and_replaced" as const,
      doctor_response: params.doctorResponse.trim(),
      reviewed_by: params.doctorId,
      reviewed_at: new Date().toISOString(),
      doctor_notes: params.doctorNotes?.trim() || null,
    };

    const { data, error } = await supabase
      .from("lab_report_queries")
      .update(payload)
      .eq("id", params.queryId)
      .select(LAB_REPORT_QUERY_SELECT)
      .single();

    if (error) {
      console.warn("[labReportChat] rejectAndReplaceLabReportQuery Supabase warning:", error.message);
      return updatedLocal;
    }

    return (data as unknown as LabReportQueryRow) || updatedLocal;
  } catch {
    return updatedLocal;
  }
}

/**
 * Clear all queries for a specific uploaded lab report.
 */
export async function clearQueriesForReport(uploadId: string): Promise<boolean> {
  const remaining = getLocalQueries().filter((q) => q.upload_id !== uploadId);
  saveLocalQueries(remaining);

  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from("lab_report_queries")
      .delete()
      .eq("upload_id", uploadId);

    if (error) {
      console.warn("[labReportChat] clearQueriesForReport Supabase warning:", error.message);
    }
  } catch {
    // ignore
  }

  return true;
}


// ---------------------------------------------------------------------------
// Context Grounding & Gemini AI Generation
// ---------------------------------------------------------------------------

export type LabReportContext = {
  reportName: string;
  recordedAt?: string | null;
  biomarkers?: Record<string, number> | null;
  metrics?: MetricAssessment[];
  rawSnippet?: string | null;
  dietaryPreference?: string | null;
  foodAllergies?: string[] | null;
  dietaryConditions?: string[] | null;
  dietaryNotes?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  portalData?: PatientPortalContextData;
};

export type GroundedFinding = {
  label: string;
  value: number;
  unit: string;
  status: string;
  reference: string;
  def?: any;
};

/**
 * Categorize if a patient query is medical/clinical (e.g. symptoms, lab values, medication interactions)
 * versus platform/scheduling/diet navigation.
 */
export function isMedicalClinicalQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (isGreetingOrSmallTalk(q)) return false;
  if (/zebra\s*synapse|what is this platform|how does this app work|who made|who built|is my data safe|privacy|hipaa/i.test(q)) return false;
  if (/^when is my next appointment|how to book appointment|how do i book|reschedule appointment|clinic location/i.test(q)) return false;
  if (/^what is my diet plan|^what should i eat|^show my workout|^what is my workout|^how much water/i.test(q)) return false;
  if (/what can you do|how can you help|help me navigate|overview of the portal/i.test(q)) return false;

  // Clinical indicators
  if (/symptom|dizz|weak|tired|fatigue|pain|ache|cramp|numb|tingl|palpitat|heart|chest|sugar|glucose|diabetes|cholesterol|kidney|liver|blood|pressure|hypertension|medicine|medication|drug|dose|dosage|side effect|contraindicat|risk|disease|lab|biomarker|potassium|hemoglobin|b12|calcium/i.test(q)) {
    return true;
  }
  return true;
}

/**
 * Generate a clinically grounded, empathetic AI response for a patient query based on their lab report,
 * portal data across all leftbar tabs, and Zebra Synapse platform knowledge.
 */
export async function generateLabReportAiAnswer(
  userQuery: string,
  context: LabReportContext,
): Promise<string> {
  const queryLower = userQuery.toLowerCase().trim();

  // 1. Build structured biomarker summary
  const biomarkerSummaries: string[] = [];
  const relevantFindings: GroundedFinding[] = [];

  if (context.metrics && context.metrics.length > 0) {
    for (const m of context.metrics) {
      if (m.value != null) {
        biomarkerSummaries.push(
          `- ${m.label}: ${m.value} ${m.unit} (Status: ${m.status.toUpperCase()}, Normal Range: ${m.range})`
        );
        relevantFindings.push({
          label: m.label,
          value: m.value,
          unit: m.unit,
          status: m.status,
          reference: m.range,
        });
      }
    }
  } else if (context.biomarkers) {
    for (const [k, v] of Object.entries(context.biomarkers)) {
      const def = getBiomarkerDefinition(k);
      const label = def?.label || k.replace(/_/g, " ");
      const unit = def?.units[0] || "";
      const ref = def?.reference || "N/A";
      let status = "normal";
      if (def?.low != null && v < def.low) status = "low";
      else if (def?.high != null && v > def.high) status = "high";
      else if (def?.borderlineHigh != null && v >= def.borderlineHigh) status = "borderline";

      biomarkerSummaries.push(`- ${label}: ${v} ${unit} (Status: ${status.toUpperCase()}, Range: ${ref})`);
      relevantFindings.push({ label, value: v, unit, status, reference: ref, def });
    }
  }

  // 2. Try Gemini API if API key is provided
  const geminiApiKey = getGeminiApiKey();
  if (geminiApiKey) {
    try {
      const omniSection = context.portalData ? buildOmniContextPromptString(context.portalData) : "";

      const prompt = `
You are Zebra Synapse AI, an omni-context, intelligent, empathetic, and clinical-grade health assistant and platform copilot for the Zebra Synapse patient portal.
A patient is asking a question. You have access to their entire portal context across all leftbar tabs as well as full platform knowledge.

${omniSection}

ACTIVE LAB REPORT CONTEXT ("${context.reportName}"):
${biomarkerSummaries.length > 0 ? biomarkerSummaries.join("\n") : "No specific structured biomarkers extracted yet, but patient report is on file."}
${context.rawSnippet ? `\nEXTRACTED REPORT TEXT SNIPPET:\n${context.rawSnippet.slice(0, 1000)}\n` : ""}

PATIENT'S QUESTION:
"${userQuery}"

CRITICAL INSTRUCTIONS & GUARDRAILS:
1. INTENT DETECTION & MULTI-TAB EXPERTISE:
   - ABOUT ZEBRA SYNAPSE: Explain our mission, 3D anatomical health twin, biomarker AI trends, and doctor-in-the-loop verification that guarantees licensed physician oversight.
   - LEFTBAR TABS: Answer questions about Health Overview, Medical Records, Appointments, Teleconsultation, Prescriptions, Disease Prediction, Diet & Fitness, Clinical Trials, and Wellness Tips accurately using the data provided.
   - LAB REPORTS & SYMPTOMS: Explain physiological mechanisms in patient-friendly terms, referencing specific lab values and reference ranges.
   - MEDICATIONS & DOSAGE: State active prescriptions, timing, instructions, and food interactions accurately from the prescription records.
   - APPOINTMENTS: Reference upcoming dates, doctor names, clinics, and times accurately.
   - DIET & FITNESS: Strictly honor configured dietary preferences (Vegan: 100% plant-based, no animal products; Vegetarian: no meat/fish; Jain: no root vegetables/meat; etc.).
2. DEEP-LINK ACTION SHORTCUTS:
   - When referencing a portal feature, append an action tag on its own line at the end of the response:
     * [ACTION:navigate:/patient/appointments:📅 View Appointments]
     * [ACTION:navigate:/patient/prescription:💊 View Prescriptions]
     * [ACTION:navigate:/patient/diet-fitness:🥗 Open Diet & Fitness]
     * [ACTION:navigate:/patient/disease-prediction:🔮 View Disease Predictions]
     * [ACTION:navigate:/patient/clinical-trials:🔬 View Clinical Trials]
     * [ACTION:navigate:/patient/teleconsult:📹 Open Teleconsultation]
     * [ACTION:navigate:/patient/medical-records:📁 View Medical Records]
     * [ACTION:navigate:/patient:🏠 Health Overview]
     * [ACTION:navigate:/patient/wellness-tips:✨ View Wellness Tips]
3. EMPATHY & DOCTOR-IN-THE-LOOP:
   - Keep answers supportive and structured with clean markdown.
   - For clinical symptom/lab queries, reassure the patient that their response has been automatically submitted to their connected doctor for verification.
`.trim();

      const chatModels = getGeminiModels();
      for (const model of chatModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 1000,
                },
              }),
            }
          );

          if (response.ok) {
            const json = await response.json();
            const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generatedText && generatedText.trim().length > 20) {
              return generatedText.trim();
            }
          }
        } catch {
          // Fallback to next model
        }
      }
    } catch (e) {
      console.warn("[labReportChat] Gemini call failed, falling back to clinical inference engine:", e);
    }
  }

  // 3. Robust Clinical & Portal Inference Engine (offline / keyless)
  return generateGroundedRuleBasedAnswer(queryLower, relevantFindings, context.reportName, context);
}

/**
 * Helper to look up a biomarker finding by regular expression.
 */
function findFinding(findings: GroundedFinding[], pattern: RegExp): GroundedFinding | undefined {
  return findings.find((f) => pattern.test(f.label) || pattern.test(f.label.replace(/[\s()_-]/g, "")));
}

/**
 * Detect simple conversational greetings or basic small talk.
 */
export function isGreetingOrSmallTalk(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/[.,!?]/g, "");
  const greetings = [
    "hello", "hi", "hey", "hola", "namaste", "good morning", "good afternoon",
    "good evening", "howdy", "greetings", "hey there", "hi there", "hello there",
    "who are you", "what are you", "what can you do", "what can you help me with",
    "help", "how do you work", "thanks", "thank you", "thx", "cool", "great",
    "bye", "goodbye", "ok", "okay", "yo", "sup"
  ];

  if (greetings.includes(q)) return true;
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(q) && q.length < 25) {
    return true;
  }
  if (/^(who are you|what can you do|how can you help|what is this)\b/i.test(q)) {
    return true;
  }
  return false;
}

/**
 * Detect queries requesting a general report summary or overview.
 */
export function isReportOverviewQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  return /overview|summarize|summary|explain my report|show my report|what are my results|tell me about my report|analyze my report|report summary/i.test(q);
}

/**
 * Friendly conversational greeting response.
 */
function generateGreetingAnswer(reportName: string, abnormalCount: number): string {
  const reportContextNotice = reportName && reportName !== "Lab Report"
    ? `I have your active lab report (**${reportName}**) loaded and ready.`
    : `I am connected to your Zebra Synapse health profile and uploaded lab records.`;

  const abnormalNotice = abnormalCount > 0
    ? ` I noticed **${abnormalCount} biomarker(s)** outside standard reference ranges in this report.`
    : ` All tested biomarkers in this report are currently in the normal reference range.`;

  return (
    `Hello! 👋 I am **Zebra Synapse AI**, your clinical health and lab report assistant.\n\n` +
    `${reportContextNotice}${abnormalNotice}\n\n` +
    `Here are some helpful things you can ask me:\n` +
    `• **"Why do I feel weak and tired?"** *(Analyzes Vitamin B12, Hemoglobin, Vitamin D, Potassium)*\n` +
    `• **"Why am I feeling dizzy?"** *(Analyzes electrolytes, MCHC, B12, blood pressure)*\n` +
    `• **"Give me a summary of my report"** *(Full breakdown of normal vs. out-of-range values)*\n` +
    `• **"What should I eat to improve my results?"** *(Tailored to your configured dietary preferences)*\n\n` +
    `How can I assist you with your health today?`
  );
}

/**
 * Comprehensive structured report overview response.
 */
function generateReportOverviewAnswer(
  reportName: string,
  findings: GroundedFinding[],
  context?: LabReportContext
): string {
  const abnormal = findings.filter(
    (f) => f.status === "high" || f.status === "low" || f.status === "borderline"
  );
  const normal = findings.filter((f) => f.status === "normal");

  let text = `### 📋 Clinical Overview: ${reportName}\n\n`;

  if (findings.length === 0) {
    return (
      `### 📋 Clinical Overview: ${reportName}\n\n` +
      `Your report file is attached to your account. Structured biomarker values are currently on file or queued for doctor review.\n\n` +
      `You can ask me any health or symptom questions anytime!`
    );
  }

  text += `**Total Biomarkers Analyzed:** ${findings.length}\n`;
  text += `• **Optimal / Normal:** ${normal.length}\n`;
  text += `• **Attention Required (Out of Range):** ${abnormal.length}\n\n`;

  if (abnormal.length > 0) {
    text += `#### 🚨 Out-of-Range Biomarkers:\n`;
    abnormal.forEach((f) => {
      const statusLabel = f.status === "high" ? "HIGH ⬆️" : f.status === "low" ? "LOW ⬇️" : "BORDERLINE ⚠️";
      text += `• **${f.label}**: **${f.value} ${f.unit}** (${statusLabel}) — *Ref: ${f.reference}*\n`;
    });
    text += `\n`;
  }

  if (normal.length > 0) {
    text += `#### ✅ Normal Biomarkers:\n`;
    normal.slice(0, 8).forEach((f) => {
      text += `• **${f.label}**: ${f.value} ${f.unit} (Normal) — *Ref: ${f.reference}*\n`;
    });
    if (normal.length > 8) {
      text += `• *...and ${normal.length - 8} more normal biomarkers.*\n`;
    }
    text += `\n`;
  }

  const dietPref = context?.dietaryPreference ? context.dietaryPreference.toUpperCase() : null;
  text += `**Recommended Next Steps:**\n`;
  text += `Review these results with your doctor. Your query and report summary have been recorded for physician verification.`;
  if (dietPref) {
    text += ` Recommendations will strictly respect your configured **${dietPref}** dietary preferences.`;
  }

  return text;
}

/**
 * High-quality grounded clinical inference generator for offline or keyless mode.
 */
function generateGroundedRuleBasedAnswer(
  query: string,
  findings: GroundedFinding[],
  reportName: string,
  context?: LabReportContext,
): string {
  // 1. Check for Greetings & Small Talk FIRST
  if (isGreetingOrSmallTalk(query)) {
    const abnormalCount = findings.filter(
      (f) => f.status === "high" || f.status === "low" || f.status === "borderline"
    ).length;
    return generateGreetingAnswer(reportName, abnormalCount);
  }

  // 2. Check for Report Overview / Summary Requests
  if (isReportOverviewQuery(query)) {
    return generateReportOverviewAnswer(reportName, findings, context);
  }

  const portal = context?.portalData;

  // -------------------------------------------------------------------------
  // A. Zebra Synapse Platform Identity & Capabilities
  // -------------------------------------------------------------------------
  const isZebraSynapseQuery =
    /zebra\s*synapse|what is this platform|what is this app|how does (this|synapse) work|who (made|built|developed|owns)|is my data (safe|secure|private)|hipaa|doctor\s*verification|doctor in the loop|what tabs|leftbar/i.test(
      query
    );

  if (isZebraSynapseQuery) {
    if (/safe|secure|private|privacy|hipaa/i.test(query)) {
      return (
        `### 🛡️ Zebra Synapse Security & Privacy Architecture\n\n` +
        `Your health data in **Zebra Synapse** is protected with enterprise-grade clinical privacy standards:\n\n` +
        `• **End-to-End Encryption & Isolation**: All uploaded lab reports, vital records, and personal health identifiers are securely stored in HIPAA/GDPR-compliant encrypted partitions.\n` +
        `• **Doctor-in-the-Loop Oversight**: Every clinical AI analysis is routed to your licensed physician's verification queue so that a real doctor always remains the ultimate authority on your medical care.\n` +
        `• **No Third-Party Ad Tracking**: Your health data is never sold or used for targeted advertising.\n\n` +
        `You can manage your security, profile, and dietary settings anytime.\n\n` +
        `[ACTION:navigate:/patient/settings:⚙️ Profile & Settings]`
      );
    }

    if (/doctor\s*verification|doctor in the loop|verify/i.test(query)) {
      return (
        `### 🩺 How Doctor-in-the-Loop Verification Works\n\n` +
        `In **Zebra Synapse**, AI never operates in isolation without medical oversight:\n\n` +
        `1. **Instant Grounded AI Analysis**: When you ask about your symptoms or lab markers, Synapse AI immediately synthesizes your biomarkers with clinical reference ranges.\n` +
        `2. **Real-Time Doctor Queue**: Your query and the AI's generated response are automatically sent to your assigned doctor's clinical review dashboard.\n` +
        `3. **Doctor Verification or Correction**: Your doctor reviews the answer, attaches personalized clinical notes, or replaces it with specialized medical directives.\n` +
        `4. **Verified Badge**: Once approved, your chat bubble updates to reflect **"Doctor Verified"** with your doctor's seal of approval.\n\n` +
        `[ACTION:navigate:/patient/teleconsult:📹 Teleconsultation & Doctor Chat]`
      );
    }

    return (
      `### ⚡ Welcome to Zebra Synapse\n\n` +
      `**Zebra Synapse** is your **Smart AI Health Companion & Clinical Co-Pilot** designed to seamlessly bridge patient empowerment with licensed physician oversight.\n\n` +
      `#### 🚀 Core Capabilities Across Leftbar Tabs:\n` +
      `• 🏠 **Health Overview**: Interactive 3D Anatomical Health Twin mapping abnormal biomarkers directly to body organs.\n` +
      `• 📁 **Medical Records**: Automated OCR extraction of 40+ biomarker panels and multi-report longitudinal trends.\n` +
      `• 🤖 **Synapse AI Chat**: 24/7 omni-portal medical and health assistant with clinical precision.\n` +
      `• 📅 **Appointments**: Effortlessly schedule, manage, and review doctor consultations.\n` +
      `• 📹 **Teleconsultation**: Live video consultations and direct doctor-patient messaging.\n` +
      `• 💊 **Prescriptions**: Digital medication vault with dosage schedules, timings, and refills.\n` +
      `• 🔮 **Disease Prediction**: Rule-based & predictive intelligence identifying chronic disease risks.\n` +
      `• 🥗 **Diet & Fitness**: 7-day personalized meal plans and workout routines strictly tailored to your medical flags & dietary preferences.\n` +
      `• 🔬 **Clinical Trials**: Real-time AI matching with active medical studies and clinical trials.\n` +
      `• ✨ **Wellness Tips**: Daily actionable recovery, sleep, and lifestyle habits.\n\n` +
      `How can I assist you with your health or portal navigation today?\n\n` +
      `[ACTION:navigate:/patient:🏠 Health Overview]`
    );
  }

  // -------------------------------------------------------------------------
  // B. Appointments & Scheduling
  // -------------------------------------------------------------------------
  const isAppointmentQuery =
    /appointment|schedule|doctor visit|dr\.\s*|dr\s+|consultation date|when is my next|book appointment|reschedule|cancel appointment/i.test(
      query
    );

  if (isAppointmentQuery) {
    const upcoming = portal?.appointments.upcoming || [];
    const past = portal?.appointments.past || [];

    let text = `### 📅 Your Appointments\n\n`;
    if (upcoming.length > 0) {
      text += `#### 🗓️ Upcoming Consultations:\n`;
      upcoming.forEach((a) => {
        text += `• **${a.doctor}** (${a.specialty})\n  - **Date & Time:** ${a.date} at ${a.time}\n  - **Location:** ${a.location || "Zebra Synapse Health Suite"}\n  - **Status:** \`${a.status}\`\n\n`;
      });
    } else {
      text += `You currently have no upcoming doctor appointments scheduled.\n\n`;
    }

    if (past.length > 0) {
      text += `#### 📜 Recent Past Consultations:\n`;
      past.slice(0, 2).forEach((a) => {
        text += `• **${a.doctor}** on ${a.date}${a.notes ? ` — *Notes: ${a.notes}*` : ""}\n`;
      });
      text += `\n`;
    }

    text += `Would you like to book a new consultation or reschedule an existing visit?\n\n`;
    text += `[ACTION:navigate:/patient/appointments:📅 View Appointments]`;
    return text;
  }

  // -------------------------------------------------------------------------
  // C. Prescriptions & Medications
  // -------------------------------------------------------------------------
  const isPrescriptionQuery =
    /prescription|medication|medicine|drug|pill|dosage|dose|metformin|atorvastatin|vitamin\s*d3|cholecalciferol|refill|when do i take/i.test(
      query
    );

  if (isPrescriptionQuery) {
    const prescriptions = portal?.prescriptions || [];
    const active = prescriptions.filter((r) => r.status === "active");

    let text = `### 💊 Your Active Prescriptions & Medications\n\n`;
    if (active.length > 0) {
      active.forEach((rx) => {
        text += `• **${rx.heading}**\n  - **Details:** ${rx.details.replace(/\n/g, " — ")}\n  - **Prescribed by:** ${rx.prescribedBy}\n  - **Issued:** ${rx.date}\n\n`;
      });
    } else {
      text += `You currently have no active prescriptions on file.\n\n`;
    }

    text += `**Important Medication Reminders:**\n`;
    text += `• Always take medications at consistent daily times as directed by your physician.\n`;
    text += `• If you require a refill or experience side effects, please contact your care team or request a refill in your Prescriptions tab.\n\n`;
    text += `[ACTION:navigate:/patient/prescription:💊 View Prescriptions]`;
    return text;
  }

  // -------------------------------------------------------------------------
  // D. Disease Predictions & Health Risk Models
  // -------------------------------------------------------------------------
  const isDiseasePredictionQuery =
    /disease prediction|predict|health risk|risk score|at risk for|cardiovascular risk|heart risk|diabetes risk|hypertension risk|metabolic risk|kidney risk/i.test(
      query
    );

  if (isDiseasePredictionQuery) {
    const predictions = portal?.diseasePredictions || [];

    let text = `### 🔮 Predictive Health Risk Assessment\n\n`;
    if (predictions.length > 0) {
      text += `Based on your recent lab extractions and longitudinal trends, here is your disease risk profile:\n\n`;
      predictions.forEach((p) => {
        const riskEmoji =
          p.level.toLowerCase() === "high"
            ? "🔴"
            : p.level.toLowerCase() === "moderate"
            ? "🟡"
            : "🟢";
        text += `• ${riskEmoji} **${p.title}**: **${p.level.toUpperCase()} RISK**\n`;
        text += `  - **Rationale:** ${p.rationale}\n`;
        text += `  - **Next Steps:** ${p.nextStep}\n`;
        if (p.triggeredBiomarkers && p.triggeredBiomarkers.length > 0) {
          text += `  - **Key Biomarker Drivers:** ${p.triggeredBiomarkers.join(", ")}\n`;
        }
        text += `\n`;
      });
    } else {
      text += `All current biomarker trends indicate optimal risk ranges with no elevated chronic disease flags detected.\n\n`;
    }

    text += `These predictive scores are designed for early preventive intervention. You can review detailed model drivers and clinical pathways in your Disease Prediction dashboard.\n\n`;
    text += `[ACTION:navigate:/patient/disease-prediction:🔮 View Disease Predictions]`;
    return text;
  }

  // -------------------------------------------------------------------------
  // E. Diet & Fitness Plan / Nutrition / Workout
  // -------------------------------------------------------------------------
  const isDietFitnessQuery =
    /diet plan|meal plan|what should i eat|food|breakfast|lunch|dinner|snack|recipe|workout|exercise|fitness|water intake|protein intake|calorie|vegan|vegetarian|jain|gluten/i.test(
      query
    );

  if (isDietFitnessQuery) {
    const diet = portal?.dietAndFitness;
    const pref =
      diet?.preference ||
      (context?.dietaryPreference ? context.dietaryPreference.toUpperCase() : "OMNIVORE");
    const meals = diet?.todayMealHighlights || [];
    const workouts = diet?.todayWorkoutHighlights || [];

    let text = `### 🥗 Your Personalized Diet & Fitness Plan\n\n`;
    text += `• **Dietary Preference:** **${pref}** (Strictly honored)\n`;
    if (diet?.dailyCaloriesTarget) {
      text += `• **Daily Targets:** ${diet.dailyCaloriesTarget} kcal | Protein: ${diet.macros.proteinG}g | Carbs: ${diet.macros.carbsG}g | Fats: ${diet.macros.fatG}g\n`;
      text += `• **Water Intake:** ${diet.waterLoggedMl || 1750} mL logged today\n\n`;
    }

    if (meals.length > 0) {
      text += `#### 🍽️ Today's Recommended Meals:\n`;
      meals.forEach((m) => {
        text += `• ${m}\n`;
      });
      text += `\n`;
    }

    if (workouts.length > 0) {
      text += `#### 🏃 Today's Exercise & Movement Routine:\n`;
      workouts.forEach((w) => {
        text += `• ${w}\n`;
      });
      text += `\n`;
    }

    text += `[ACTION:navigate:/patient/diet-fitness:🥗 Open Diet & Fitness]`;
    return text;
  }

  // -------------------------------------------------------------------------
  // F. Clinical Trials
  // -------------------------------------------------------------------------
  const isClinicalTrialQuery =
    /clinical trial|clinical study|trial match|eligible for trial|enrolling in trial/i.test(query);

  if (isClinicalTrialQuery) {
    const trials = portal?.clinicalTrials || [];

    let text = `### 🔬 Matched Clinical Trials & Research Studies\n\n`;
    if (trials.length > 0) {
      text += `We matched **${trials.length} active clinical study/trial protocol(s)** to your biomarker profile:\n\n`;
      trials.forEach((t) => {
        text += `• **${t.title}**\n  - **Summary:** ${t.summary}\n  - **Sample Study:** ${t.sampleStudy}\n  - **Total Associated Studies:** ${t.studiesCount}\n\n`;
      });
    } else {
      text += `There are currently no active clinical trial protocols matching your specific biomarker criteria.\n\n`;
    }

    text += `You can review trial inclusion criteria or explore study registries in your Clinical Trials dashboard.\n\n`;
    text += `[ACTION:navigate:/patient/clinical-trials:🔬 View Clinical Trials]`;
    return text;
  }

  // -------------------------------------------------------------------------
  // G. Teleconsultation & Doctor Chat
  // -------------------------------------------------------------------------
  const isTeleconsultQuery =
    /teleconsult|video call|video consult|message doctor|chat with doctor|waiting room|virtual visit/i.test(
      query
    );

  if (isTeleconsultQuery) {
    return (
      `### 📹 Teleconsultation & Care Team Messaging\n\n` +
      `You can connect directly with your primary care physician or specialist via **Zebra Synapse Teleconsultation**:\n\n` +
      `• **Live Video Visits**: High-definition, encrypted video consultation with real-time screen sharing and synchronized lab review.\n` +
      `• **Direct Doctor Chat**: Message your care team with follow-up questions, prescription refill requests, or symptom updates.\n` +
      `• **Clinical Summary & Notes**: Following each teleconsultation, your doctor's clinical notes and digital prescriptions are automatically archived in your portal.\n\n` +
      `[ACTION:navigate:/patient/teleconsult:📹 Open Teleconsultation]`
    );
  }

  // -------------------------------------------------------------------------
  // H. Health Overview & Vitals
  // -------------------------------------------------------------------------
  const isVitalsOrOverviewQuery =
    /my vitals|my bmi|blood pressure|heart rate|height and weight|health score|3d twin|health overview/i.test(
      query
    );

  if (isVitalsOrOverviewQuery) {
    const p = portal?.dietAndProfileSettings;
    const height = p?.heightCm ? `${p.heightCm} cm` : "170 cm";
    const weight = p?.weightKg ? `${p.weightKg} kg` : "68 kg";
    const bmi = p?.bmi ? `${p.bmi} kg/m²` : "23.5 kg/m²";
    const bmiCat = p?.bmiCategory || "Normal weight";

    return (
      `### 🏠 Health Overview & Vitals Summary\n\n` +
      `• **Height / Weight:** ${height} / ${weight}\n` +
      `• **Body Mass Index (BMI):** **${bmi}** (${bmiCat})\n` +
      `• **Total Uploaded Reports:** ${portal?.overview.activeReportCount || 1}\n` +
      `• **Total Extracted Biomarkers:** ${portal?.overview.totalBiomarkersCount || findings.length}\n` +
      `• **Out-of-Range Markers:** ${portal?.overview.abnormalBiomarkersCount || 0}\n\n` +
      `You can explore the interactive 3D anatomical twin on your Health Overview dashboard to see how each biomarker connects to your organ systems.\n\n` +
      `[ACTION:navigate:/patient:🏠 Health Overview]`
    );
  }

  // -------------------------------------------------------------------------
  // I. Wellness Tips
  // -------------------------------------------------------------------------
  const isWellnessQuery = /wellness tip|lifestyle tip|sleep tip|recovery tip|daily habit/i.test(query);

  if (isWellnessQuery) {
    const tips = portal?.wellnessTips || [];
    let text = `### ✨ Personalized Wellness & Lifestyle Guidance\n\n`;
    if (tips.length > 0) {
      tips.forEach((t) => {
        text += `• ${t}\n\n`;
      });
    } else {
      text += `• **Hydration:** Aim for 2.0 to 2.5 Liters of water daily to support kidney filtration and cellular vitality.\n\n`;
      text += `• **Sleep Rhythm:** Maintain 7 to 8 hours of consistent nightly sleep to regulate cortisol and insulin sensitivity.\n\n`;
      text += `• **Movement:** Incorporate 20 to 30 minutes of low-impact zone-2 movement (walking, cycling) daily.\n\n`;
    }
    text += `[ACTION:navigate:/patient/wellness-tips:✨ View Wellness Tips]`;
    return text;
  }

  const isDizzy = /dizz|lightheaded|vertigo|spinning|faint|fainting|unsteady|balance|loss of balance|woozy|giddy|passed out/i.test(query);
  const isWeakness = /weak|tired|fatigue|exhaust|energy|low energy|drowsy|sleepy|lazy|brain fog|sluggish|letharg|malaise|worn out/i.test(query);
  const isCrampsOrNumbness = /cramp|spasm|twitch|numb|tingl|pins and needles|paresthesia|soreness|stiff|tightness/i.test(query);
  const isHeartOrPalpitations = /palpitat|racing heart|rapid heart|heart beat|flutter|chest|pulse|arrhythmia|skipping|cardio|blood pressure|hypertension/i.test(query);
  const isJaundiceOrLiver = /yellow|jaundice|liver|bilirubin|eyes yellow|pale stool|dark urine|icterus|hepat/i.test(query);
  const isKidneyOrSwelling = /kidney|creatinine|urea|bun|renal|urine|urination|pee|swelling|swollen|edema|puffy|feet|legs swelling|water retention|foamy/i.test(query);
  const isSugarOrDiabetes = /sugar|glucose|diabetes|hba1c|thirst|thirsty|frequent urination|polyuria|craving|sweet/i.test(query);
  const isCholesterol = /cholesterol|lipid|triglyceride|artery|plaque/i.test(query);
  const isHeadache = /headache|migraine|head pain|throbbing/i.test(query);
  const isImmunity = /infection|immunity|wbc|white blood|sick|fever|cold|flu/i.test(query);
  const isBoneOrJoint = /bone|joint|ache|body ache|muscle pain|gout|uric/i.test(query);

  const abnormalFindings = findings.filter(
    (f) => f.status === "high" || f.status === "low" || f.status === "borderline"
  );

  // -------------------------------------------------------------------------
  // 1. Dizziness / Lightheadedness / Vertigo / Faintness
  // -------------------------------------------------------------------------
  if (isDizzy) {
    const potassium = findFinding(findings, /potassium|\bk\+?\b/i);
    const calcium = findFinding(findings, /calcium|\bca\+?\+?\b/i);
    const vitB12 = findFinding(findings, /vitamin\s*b12|b12|cobalamin/i);
    const vitD = findFinding(findings, /vitamin\s*d|25\(?oh\)?\s*vitamin\s*d/i);
    const mchc = findFinding(findings, /mchc/i);
    const hgb = findFinding(findings, /hemoglobin(?!\s*a1c)|hgb|\bhb\b/i);
    const bun = findFinding(findings, /blood\s*urea\s*nitrogen|\bbun\b/i);
    const urea = findFinding(findings, /\burea\b/i);
    const glucose = findFinding(findings, /glucose|blood\s*sugar|fbs/i);
    const sodium = findFinding(findings, /sodium|\bna\+?\b/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (potassium && (potassium.status === "low" || potassium.value < 3.5)) {
      leadSuspects.push(`Potassium (${potassium.value} ${potassium.unit})`);
      reasons.push(
        `• **Critically Low Potassium (${potassium.value} ${potassium.unit}, Normal: ${potassium.reference})**: Potassium is an essential electrolyte required for cell membrane electrical stability and vascular tone. Hypokalemia (low potassium) is a major direct cause of sudden dizziness, lightheadedness, and profound muscle weakness.`
      );
    }
    if (calcium && (calcium.status === "low" || calcium.value < 8.4)) {
      leadSuspects.push(`Calcium (${calcium.value} ${calcium.unit})`);
      reasons.push(
        `• **Low Calcium (${calcium.value} ${calcium.unit}, Normal: ${calcium.reference})**: Calcium regulates neuromuscular transmission and vascular tone. Low levels frequently present as feeling lightheaded, unsteady, or experiencing tingling sensations.`
      );
    }
    if (vitB12 && (vitB12.status === "low" || vitB12.value < 200)) {
      leadSuspects.push(`Vitamin B12 (${vitB12.value} ${vitB12.unit})`);
      reasons.push(
        `• **Severely Low Vitamin B12 (${vitB12.value} ${vitB12.unit}, Normal: ${vitB12.reference})**: Vitamin B12 maintains nerve myelination and red blood cell formation. Deficiency causes neurological lightheadedness, orthostatic dizziness (feeling faint upon standing), and brain fog.`
      );
    }
    if (mchc && (mchc.status === "low" || mchc.value < 32.5)) {
      reasons.push(
        `• **Low MCHC (${mchc.value} ${mchc.unit}, Normal: ${mchc.reference})**: Reduced mean corpuscular hemoglobin concentration indicates lower oxygen density per red blood cell, impairing cerebral oxygenation during standing or movement.`
      );
    }
    if (hgb && (hgb.status === "low" || hgb.value < 12)) {
      leadSuspects.push(`Hemoglobin (${hgb.value} ${hgb.unit})`);
      reasons.push(
        `• **Low Hemoglobin (${hgb.value} ${hgb.unit}, Normal: ${hgb.reference})**: Anemia reduces oxygen-carrying capacity to the brain, directly causing lightheadedness and exertional fatigue.`
      );
    }
    if (bun && (bun.status === "high" || bun.value > 20)) {
      const ureaStr = urea ? ` & Urea (${urea.value} ${urea.unit})` : "";
      reasons.push(
        `• **Elevated Blood Urea Nitrogen (${bun.value} ${bun.unit})${ureaStr}**: Elevated nitrogen waste markers often point to hypovolemia or dehydration, which reduces effective circulating blood volume and causes orthostatic dizziness.`
      );
    }
    if (sodium && (sodium.status === "low" || sodium.value < 135)) {
      reasons.push(
        `• **Low Sodium (${sodium.value} ${sodium.unit})**: Hyponatremia alters cerebral fluid balance, causing lightheadedness and unsteadiness.`
      );
    }
    if (glucose && (glucose.status === "low" || glucose.value < 70)) {
      reasons.push(
        `• **Low Fasting Glucose (${glucose.value} ${glucose.unit})**: Hypoglycemia starves the brain of immediate glucose, triggering sudden dizziness and shakiness.`
      );
    }
    if (vitD && (vitD.status === "low" || vitD.value < 30)) {
      reasons.push(
        `• **Low 25(OH) Vitamin D (${vitD.value} ${vitD.unit})**: Can contribute to postural muscle weakness and balance instability.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `You might feel **dizzy or lightheaded** because your ${leadSuspects.join(", ")} levels are significantly lower than standard reference ranges.`
        : `You might feel **dizzy or lightheaded** because several key biomarkers in your report are outside optimal physiological ranges.`;

      return (
        `${summaryPrefix}\n\n` +
        `Here is the clinical breakdown of what is contributing to your symptoms:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Because essential electrolytes (like Potassium and Calcium) and Vitamin B12 are significantly depleted, please discuss prompt electrolyte and vitamin replenishment with your physician. Your doctor has received this query and will verify clinical treatment steps.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Weakness / Fatigue / Tiredness / Exhaustion / Low Energy
  // -------------------------------------------------------------------------
  if (isWeakness) {
    const vitB12 = findFinding(findings, /vitamin\s*b12|b12|cobalamin/i);
    const vitD = findFinding(findings, /vitamin\s*d|25\(?oh\)?\s*vitamin\s*d/i);
    const potassium = findFinding(findings, /potassium|\bk\+?\b/i);
    const calcium = findFinding(findings, /calcium|\bca\+?\+?\b/i);
    const hgb = findFinding(findings, /hemoglobin(?!\s*a1c)|hgb|\bhb\b/i);
    const mchc = findFinding(findings, /mchc/i);
    const iron = findFinding(findings, /iron|ferritin/i);
    const a1c = findFinding(findings, /a1c|hba1c/i);
    const glucose = findFinding(findings, /glucose|fbs/i);
    const tsh = findFinding(findings, /tsh|thyroid/i);
    const bun = findFinding(findings, /blood\s*urea\s*nitrogen|\bbun\b/i);
    const urea = findFinding(findings, /\burea\b/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (vitB12 && (vitB12.status === "low" || vitB12.value < 200)) {
      leadSuspects.push(`Vitamin B12 (${vitB12.value} ${vitB12.unit})`);
      reasons.push(
        `• **Severely Low Vitamin B12 (${vitB12.value} ${vitB12.unit}, Normal: ${vitB12.reference})**: Vitamin B12 is essential for cellular ATP energy production and nervous system health. Deficits cause profound chronic fatigue and brain fog.`
      );
    }
    if (vitD && (vitD.status === "low" || vitD.value < 30)) {
      leadSuspects.push(`Vitamin D (${vitD.value} ${vitD.unit})`);
      reasons.push(
        `• **Low 25(OH) Vitamin D (${vitD.value} ${vitD.unit}, Normal: ${vitD.reference})**: Low vitamin D impairs mitochondrial function in skeletal muscle, causing daytime sluggishness and muscle weakness.`
      );
    }
    if (potassium && (potassium.status === "low" || potassium.value < 3.5)) {
      leadSuspects.push(`Potassium (${potassium.value} ${potassium.unit})`);
      reasons.push(
        `• **Low Potassium (${potassium.value} ${potassium.unit}, Normal: ${potassium.reference})**: Hypokalemia impairs neuromuscular excitability, leading directly to physical weakness and heavy fatigue.`
      );
    }
    if (calcium && (calcium.status === "low" || calcium.value < 8.4)) {
      reasons.push(
        `• **Low Calcium (${calcium.value} ${calcium.unit}, Normal: ${calcium.reference})**: Calcium depletion impairs muscle contraction efficiency, worsening overall exhaustion.`
      );
    }
    if (hgb && (hgb.status === "low" || hgb.value < 12)) {
      leadSuspects.push(`Hemoglobin (${hgb.value} ${hgb.unit})`);
      reasons.push(
        `• **Low Hemoglobin (${hgb.value} ${hgb.unit}, Normal: ${hgb.reference})**: Anemia limits oxygen delivery to vital tissues, making everyday physical activity exhausting.`
      );
    }
    if (mchc && (mchc.status === "low" || mchc.value < 32.5)) {
      reasons.push(
        `• **Low MCHC (${mchc.value} ${mchc.unit}, Normal: ${mchc.reference})**: Reflects hypochromic red blood cells with suboptimal oxygen transport.`
      );
    }
    if (iron && iron.status === "low") {
      reasons.push(
        `• **Low Iron / Ferritin (${iron.value} ${iron.unit})**: Depleted iron stores limit cellular respiration and physical endurance.`
      );
    }
    if (a1c && (a1c.status === "high" || a1c.value >= 5.7)) {
      reasons.push(
        `• **Elevated Hemoglobin A1c (${a1c.value} ${a1c.unit})**: Elevated glycemic averages indicate insulin resistance and blood sugar fluctuations, which cause post-meal energy crashes and tiredness.`
      );
    }
    if (tsh && (tsh.status === "high" || tsh.value > 4.5)) {
      reasons.push(
        `• **Elevated TSH (${tsh.value} ${tsh.unit})**: Suggests an underactive thyroid (hypothyroidism), which slows overall metabolic rate and causes weakness.`
      );
    }
    if (bun && (bun.status === "high" || bun.value > 20)) {
      const ureaStr = urea ? ` & Urea (${urea.value} ${urea.unit})` : "";
      reasons.push(
        `• **High BUN (${bun.value} ${bun.unit})${ureaStr}**: Metabolic waste accumulation can cause uremic sluggishness and fatigue.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `You might feel **weak and tired** because your ${leadSuspects.join(", ")} levels are significantly lower than standard reference ranges.`
        : `You might feel **weak and tired** because your report shows notable deficits in key energy and metabolic biomarkers.`;

      return (
        `${summaryPrefix}\n\n` +
        `Here are the primary biomarker findings explaining your fatigue:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Consult your physician to review targeted vitamin supplementation (such as high-dose B12 and Vitamin D3) and electrolyte management.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. Muscle Cramps / Spasms / Twitching / Numbness / Tingling
  // -------------------------------------------------------------------------
  if (isCrampsOrNumbness) {
    const calcium = findFinding(findings, /calcium|\bca\+?\+?\b/i);
    const potassium = findFinding(findings, /potassium|\bk\+?\b/i);
    const vitB12 = findFinding(findings, /vitamin\s*b12|b12|cobalamin/i);
    const vitD = findFinding(findings, /vitamin\s*d|25\(?oh\)?\s*vitamin\s*d/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (calcium && (calcium.status === "low" || calcium.value < 8.4)) {
      leadSuspects.push(`Calcium (${calcium.value} ${calcium.unit})`);
      reasons.push(
        `• **Low Calcium (${calcium.value} ${calcium.unit}, Normal: ${calcium.reference})**: Hypocalcemia increases peripheral neuromuscular excitability, leading directly to muscle twitches, cramps, spasms, and tingling in fingers or around the mouth.`
      );
    }
    if (potassium && (potassium.status === "low" || potassium.value < 3.5)) {
      leadSuspects.push(`Potassium (${potassium.value} ${potassium.unit})`);
      reasons.push(
        `• **Low Potassium (${potassium.value} ${potassium.unit}, Normal: ${potassium.reference})**: Low potassium impairs muscle fiber repolarization, causing involuntary leg and calf muscle cramps and spasms.`
      );
    }
    if (vitB12 && (vitB12.status === "low" || vitB12.value < 200)) {
      leadSuspects.push(`Vitamin B12 (${vitB12.value} ${vitB12.unit})`);
      reasons.push(
        `• **Severely Low Vitamin B12 (${vitB12.value} ${vitB12.unit}, Normal: ${vitB12.reference})**: Vitamin B12 deficiency leads to peripheral neuropathy, manifesting as tingling ("pins and needles"), numbness, and sensory changes.`
      );
    }
    if (vitD && (vitD.status === "low" || vitD.value < 30)) {
      reasons.push(
        `• **Low 25(OH) Vitamin D (${vitD.value} ${vitD.unit})**: Vitamin D is necessary for calcium absorption; low levels exacerbate muscle aches and spasms.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `You might be experiencing **cramps, spasms, or numbness** because your ${leadSuspects.join(", ")} levels are significantly below normal thresholds.`
        : `You might be experiencing **cramps, spasms, or numbness** because your electrolyte and vitamin levels are significantly reduced.`;

      return (
        `${summaryPrefix}\n\n` +
        `Here is why these lab findings cause neuromuscular symptoms:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Electrolyte and vitamin therapy should be initiated under doctor supervision to quickly alleviate cramping and prevent nerve irritation.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Heart Palpitations / Racing Pulse / Chest / Flutter
  // -------------------------------------------------------------------------
  if (isHeartOrPalpitations) {
    const potassium = findFinding(findings, /potassium|\bk\+?\b/i);
    const calcium = findFinding(findings, /calcium|\bca\+?\+?\b/i);
    const hgb = findFinding(findings, /hemoglobin(?!\s*a1c)|hgb|\bhb\b/i);
    const chol = findFinding(findings, /total\s*cholesterol/i);
    const ldl = findFinding(findings, /ldl/i);
    const tg = findFinding(findings, /triglyceride/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (potassium && (potassium.status === "low" || potassium.value < 3.5 || potassium.status === "high")) {
      leadSuspects.push(`Potassium (${potassium.value} ${potassium.unit})`);
      reasons.push(
        `• **Abnormal Potassium (${potassium.value} ${potassium.unit}, Normal: ${potassium.reference})**: Potassium is the primary regulator of myocardial cardiac action potentials. Low potassium directly predisposes to palpitations, extra heartbeats, and rhythm disturbances.`
      );
    }
    if (calcium && (calcium.status === "low" || calcium.value < 8.4)) {
      reasons.push(
        `• **Low Calcium (${calcium.value} ${calcium.unit})**: Hypocalcemia alters cardiac repolarization and myocardial contractility.`
      );
    }
    if (hgb && (hgb.status === "low" || hgb.value < 12)) {
      reasons.push(
        `• **Low Hemoglobin (${hgb.value} ${hgb.unit})**: Anemia triggers compensatory sinus tachycardia (the heart beats faster and harder to deliver oxygen).`
      );
    }
    if (chol && (chol.status === "high" || chol.status === "borderline")) {
      reasons.push(
        `• **Total Cholesterol (${chol.value} ${chol.unit}, Ref: ${chol.reference})**: Borderline/elevated levels indicate long-term vascular plaque risk.`
      );
    }
    if (tg && (tg.status === "high" || tg.status === "borderline")) {
      reasons.push(
        `• **Triglycerides (${tg.value} ${tg.unit}, Ref: ${tg.reference})**: Elevated triglycerides contribute to cardiovascular metabolic strain.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `Your **heart palpitations or pulse changes** may be caused by your ${leadSuspects.join(", ")} level being significantly out of range.`
        : `Your **cardiovascular markers** in ${reportName} show the following notable findings:`;

      return (
        `${summaryPrefix}\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Because low potassium can directly trigger cardiac rhythm changes, discuss these findings with your physician promptly.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 5. Jaundice / Yellow Skin / Yellow Eyes / Liver / Bilirubin
  // -------------------------------------------------------------------------
  if (isJaundiceOrLiver) {
    const unb = findFinding(findings, /unconjugated\s*bilirubin|indirect\s*bilirubin/i);
    const cb = findFinding(findings, /conjugated\s*bilirubin|direct\s*bilirubin/i);
    const tb = findFinding(findings, /total\s*bilirubin/i);
    const sgot = findFinding(findings, /sgot|\bast\b/i);
    const sgpt = findFinding(findings, /sgpt|\balt\b/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (unb && (unb.status === "high" || unb.value > 1.1)) {
      leadSuspects.push(`Unconjugated Bilirubin (${unb.value} ${unb.unit})`);
      reasons.push(
        `• **Markedly Elevated Unconjugated Bilirubin (${unb.value} ${unb.unit}, Normal: ${unb.reference})**: High unconjugated bilirubin indicates increased red blood cell turnover (hemolysis) or impaired hepatic conjugation, which causes visible jaundice (yellowing of skin and eyes).`
      );
    }
    if (cb && (cb.status === "high" || cb.value > 0.3)) {
      leadSuspects.push(`Conjugated Bilirubin (${cb.value} ${cb.unit})`);
      reasons.push(
        `• **Elevated Conjugated Bilirubin (${cb.value} ${cb.unit}, Normal: ${cb.reference})**: Points to biliary excretion slowdown or hepatic processing strain.`
      );
    }
    if (tb && (tb.status === "high" || tb.value > 1.2)) {
      reasons.push(`• **Total Bilirubin (${tb.value} ${tb.unit}, Ref: ${tb.reference})**: Total bilirubin is elevated, confirming hyperbilirubinemia.`);
    }
    if (sgpt && (sgpt.status === "high" || sgpt.value > 45)) {
      reasons.push(`• **Elevated SGPT/ALT (${sgpt.value} ${sgpt.unit})**: Indicates active liver cell stress.`);
    }
    if (sgot && (sgot.status === "high" || sgot.value > 45)) {
      reasons.push(`• **Elevated SGOT/AST (${sgot.value} ${sgot.unit})**: Reflects hepatic/tissue metabolic stress.`);
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `Your **yellow skin/eyes (jaundice) or liver symptoms** are directly explained by your ${leadSuspects.join(" and ")} levels being significantly elevated.`
        : `Your liver panel shows marked bilirubin elevations that explain jaundice and digestive symptoms.`;

      return (
        `${summaryPrefix}\n\n` +
        `Here is the clinical interpretation:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Elevated bilirubin levels warrant prompt evaluation by your doctor (including possible ultrasound or hemolytic workup) to identify the root cause.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 6. Kidneys / Swelling / Creatinine / Urea / BUN
  // -------------------------------------------------------------------------
  if (isKidneyOrSwelling) {
    const creat = findFinding(findings, /creatinine/i);
    const urea = findFinding(findings, /\burea\b/i);
    const bun = findFinding(findings, /blood\s*urea\s*nitrogen|\bbun\b/i);
    const alb = findFinding(findings, /albumin/i);
    const potassium = findFinding(findings, /potassium|\bk\+?\b/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (creat && (creat.status === "high" || creat.value > 1.3)) {
      leadSuspects.push(`Creatinine (${creat.value} ${creat.unit})`);
      reasons.push(
        `• **Elevated Creatinine (${creat.value} ${creat.unit}, Normal: ${creat.reference})**: Indicates reduced glomerular filtration rate (GFR) and kidney filtration stress.`
      );
    }
    if (bun && (bun.status === "high" || bun.value > 20)) {
      leadSuspects.push(`BUN (${bun.value} ${bun.unit})`);
      reasons.push(
        `• **Elevated Blood Urea Nitrogen (${bun.value} ${bun.unit}, Normal: ${bun.reference})**: Suggests nitrogen retention, reduced clearance, or systemic dehydration.`
      );
    }
    if (urea && (urea.status === "high" || urea.value > 43)) {
      reasons.push(
        `• **Elevated Urea (${urea.value} ${urea.unit}, Normal: ${urea.reference})**: Corroborates reduced renal clearance or high protein catabolism.`
      );
    }
    if (alb && (alb.status === "high" || alb.status === "low")) {
      reasons.push(
        `• **Albumin (${alb.value} ${alb.unit}, Ref: ${alb.reference})**: Albumin abnormalities affect oncotic pressure and fluid balance.`
      );
    }
    if (potassium && (potassium.status === "low" || potassium.status === "high")) {
      reasons.push(
        `• **Potassium (${potassium.value} ${potassium.unit})**: Kidneys regulate electrolyte balance; abnormal levels reflect filtration strain.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `Regarding your **kidney function and fluid balance**, your ${leadSuspects.join(" and ")} levels are currently elevated above normal reference ranges.`
        : `Your renal and filtration markers in ${reportName} indicate kidney filtration stress.`;

      return (
        `${summaryPrefix}\n\n` +
        `Here is what these markers mean:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Ensure adequate hydration and consult your physician for renal function monitoring and dietary sodium/protein optimization.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 7. Blood Sugar / Diabetes / Thirst / HbA1c / Glucose
  // -------------------------------------------------------------------------
  if (isSugarOrDiabetes) {
    const a1c = findFinding(findings, /a1c|hba1c/i);
    const fbs = findFinding(findings, /glucose|fbs/i);
    const tg = findFinding(findings, /triglyceride/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (a1c && (a1c.status === "high" || a1c.status === "borderline" || a1c.value >= 5.7)) {
      leadSuspects.push(`Hemoglobin A1c (${a1c.value} ${a1c.unit})`);
      const stage = a1c.value >= 6.5 ? "diabetic threshold (>= 6.5%)" : "prediabetes range (5.7 - 6.4%)";
      reasons.push(
        `• **Elevated Hemoglobin A1c (${a1c.value} ${a1c.unit}, Normal: ${a1c.reference})**: Reflects average blood sugar over the last 90 days in the ${stage}. This causes excessive thirst, frequent urination, and energy fluctuations.`
      );
    }
    if (fbs && (fbs.status === "high" || fbs.value >= 100)) {
      leadSuspects.push(`Fasting Glucose (${fbs.value} ${fbs.unit})`);
      reasons.push(
        `• **Elevated Fasting Glucose (${fbs.value} ${fbs.unit}, Normal: ${fbs.reference})**: Indicates impaired fasting glycemic regulation.`
      );
    }
    if (tg && (tg.status === "high" || tg.value >= 150)) {
      reasons.push(
        `• **Elevated Triglycerides (${tg.value} ${tg.unit})**: Strongly correlated with metabolic syndrome and insulin resistance.`
      );
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `Regarding your **blood sugar and metabolic questions**, your ${leadSuspects.join(" and ")} levels are currently elevated above standard healthy targets.`
        : `Your glycemic and metabolic markers indicate elevated blood sugar levels.`;

      const dietPref = (context?.dietaryPreference || "").toLowerCase();
      const isVegan = dietPref === "vegan";

      return (
        `${summaryPrefix}\n\n` +
        `Here is the clinical breakdown:\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Discuss with your doctor whether lifestyle adjustments (${isVegan ? "low-glycemic plant-based whole foods with post-meal walks" : "low-glycemic nutrition with post-meal walks"}, consistent cardio/strength training) or medical therapy are indicated.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 8. Cholesterol / Lipid Panel
  // -------------------------------------------------------------------------
  if (isCholesterol) {
    const chol = findFinding(findings, /total\s*cholesterol/i);
    const ldl = findFinding(findings, /ldl/i);
    const tg = findFinding(findings, /triglyceride/i);
    const hdl = findFinding(findings, /hdl/i);

    const reasons: string[] = [];

    if (chol) {
      reasons.push(`• **Total Cholesterol**: ${chol.value} ${chol.unit} (${chol.status.toUpperCase()}, Normal: ${chol.reference})`);
    }
    if (ldl) {
      reasons.push(`• **LDL (Bad) Cholesterol**: ${ldl.value} ${ldl.unit} (${ldl.status.toUpperCase()}, Normal: ${ldl.reference})`);
    }
    if (tg) {
      reasons.push(`• **Triglycerides**: ${tg.value} ${tg.unit} (${tg.status.toUpperCase()}, Normal: ${tg.reference})`);
    }
    if (hdl) {
      reasons.push(`• **HDL (Good) Cholesterol**: ${hdl.value} ${hdl.unit} (${hdl.status.toUpperCase()}, Normal: ${hdl.reference})`);
    }

    if (reasons.length > 0) {
      const dietPref = (context?.dietaryPreference || "").toLowerCase();
      const isVegan = dietPref === "vegan";
      const isVeg = isVegan || dietPref === "vegetarian" || dietPref === "jain" || dietPref === "eggetarian";

      const dietAdvice = isVegan
        ? "high-fiber plant-based whole foods (oats, beans, lentils, chia seeds, flaxseed, avocados, olive oil) and reduced saturated fats"
        : isVeg
        ? "high-fiber whole grains, legumes, chia, flaxseed, walnuts, olive oil, and low-fat dairy"
        : "high-fiber Mediterranean dietary habits (legumes, oats, olive oil, omega-3 rich fish), and reduced saturated fats";

      return (
        `Here is the cardiovascular and lipid breakdown from your report (${reportName}):\n\n` +
        reasons.join("\n") +
        `\n\n**Clinical Takeaway:**\n` +
        `Elevated LDL or triglycerides indicate increased risk of arterial plaque accumulation. Cardiovascular health improves with ${dietAdvice}, regular aerobic exercise, and reduced refined sugars.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 9. Headaches / Head Pain
  // -------------------------------------------------------------------------
  if (isHeadache) {
    const bun = findFinding(findings, /blood\s*urea\s*nitrogen|\bbun\b/i);
    const urea = findFinding(findings, /\burea\b/i);
    const vitB12 = findFinding(findings, /vitamin\s*b12|b12/i);
    const hgb = findFinding(findings, /hemoglobin(?!\s*a1c)|hgb/i);
    const mchc = findFinding(findings, /mchc/i);

    const reasons: string[] = [];
    const leadSuspects: string[] = [];

    if (bun && (bun.status === "high" || bun.value > 20)) {
      leadSuspects.push(`BUN (${bun.value} ${bun.unit})`);
      reasons.push(`• **Elevated BUN (${bun.value} ${bun.unit})**: Dehydration and electrolyte shifts are leading physiological triggers for headaches.`);
    }
    if (vitB12 && (vitB12.status === "low" || vitB12.value < 200)) {
      leadSuspects.push(`Vitamin B12 (${vitB12.value} ${vitB12.unit})`);
      reasons.push(`• **Low Vitamin B12 (${vitB12.value} ${vitB12.unit})**: Severe deficits trigger neural hyperexcitability and tension headaches.`);
    }
    if (mchc && mchc.status === "low") {
      reasons.push(`• **Low MCHC (${mchc.value} ${mchc.unit})**: Mild cerebral hypoxia from reduced hemoglobin density can cause throbbing headaches.`);
    }

    if (reasons.length > 0) {
      const summaryPrefix = leadSuspects.length > 0
        ? `You might experience **headaches or head discomfort** because your ${leadSuspects.join(" and ")} levels are currently outside normal ranges.`
        : `Your lab report shows several markers that may be contributing to your headaches.`;

      return (
        `${summaryPrefix}\n\n` +
        reasons.join("\n\n") +
        `\n\n**Recommended Next Steps:**\n` +
        `Stay well hydrated and review these results with your physician.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 10. General Question or Multi-Abnormal Synthesis
  // -------------------------------------------------------------------------
  if (abnormalFindings.length > 0) {
    // Group abnormal findings by physiological domain
    const electrolyteDeficits = abnormalFindings.filter((f) =>
      /potassium|calcium|sodium|magnesium/i.test(f.label) && f.status === "low"
    );
    const vitaminDeficits = abnormalFindings.filter((f) =>
      /vitamin|b12|folate|iron|ferritin|hemoglobin|mchc/i.test(f.label) && f.status === "low"
    );
    const organOrMetabolicHigh = abnormalFindings.filter((f) =>
      /urea|bun|creatinine|bilirubin|glucose|a1c|cholesterol|triglyceride|sgot|sgpt|alt|ast/i.test(f.label) &&
      (f.status === "high" || f.status === "borderline")
    );

    const bullets: string[] = [];

    if (electrolyteDeficits.length > 0) {
      const names = electrolyteDeficits.map((f) => `**${f.label}** (${f.value} ${f.unit}, Low)`).join(", ");
      bullets.push(
        `• **Electrolyte Deficits**: ${names}. Low levels in these minerals directly cause **dizziness, lightheadedness, muscle cramps, and physical weakness** by disrupting nerve conduction and vascular tone.`
      );
    }

    if (vitaminDeficits.length > 0) {
      const names = vitaminDeficits.map((f) => `**${f.label}** (${f.value} ${f.unit}, Low)`).join(", ");
      bullets.push(
        `• **Vitamin & Blood Count Deficits**: ${names}. Depleted levels lead to **fatigue, brain fog, and low physical stamina** due to reduced cellular energy and impaired oxygen transport.`
      );
    }

    if (organOrMetabolicHigh.length > 0) {
      const names = organOrMetabolicHigh.map((f) => `**${f.label}** (${f.value} ${f.unit}, ${f.status.toUpperCase()})`).join(", ");
      bullets.push(
        `• **Elevated Metabolic & Organ Markers**: ${names}. Point to metabolic variability, dehydration, or hepatic/renal filtration stress.`
      );
    }

    // Fallback if specific groupings were empty
    if (bullets.length === 0) {
      abnormalFindings.slice(0, 6).forEach((f) => {
        bullets.push(`• **${f.label}**: ${f.value} ${f.unit} (${f.status.toUpperCase()}, Normal: ${f.reference})`);
      });
    }

    const cleanedQuery = query.replace(/[?.,!]/g, "").trim();
    const queryHeader = cleanedQuery.length > 0
      ? `Based on your lab report (**${reportName}**), here are the key out-of-range biomarkers relevant to your query (*"${cleanedQuery}"*):`
      : `Based on your lab report (**${reportName}**), here are the key out-of-range biomarkers detected:`;

    return (
      `${queryHeader}\n\n` +
      bullets.join("\n\n") +
      `\n\n**Recommended Next Steps:**\n` +
      `Because key biomarkers are outside standard reference ranges, please review these results with your doctor for personalized dietary adjustments or clinical interventions. This response has been queued for your physician's clinical verification.`
    );
  }

  // -------------------------------------------------------------------------
  // 11. Normal Report Case
  // -------------------------------------------------------------------------
  if (findings.length > 0) {
    const sample = findings
      .slice(0, 5)
      .map((f) => `• **${f.label}**: ${f.value} ${f.unit} (Status: ${f.status.toUpperCase()}, Normal: ${f.reference})`)
      .join("\n");

    return (
      `According to your lab report (${reportName}), your tested biomarkers are all within standard physiological reference ranges:\n\n` +
      sample +
      `\n\nIf you are experiencing symptoms (such as dizziness, fatigue, or discomfort), they may be related to non-laboratory factors like hydration, sleep quality, stress, blood pressure fluctuations, or inner-ear balance. Your doctor has received this query and will provide personalized clinical guidance.`
    );
  }

  return (
    `I have analyzed your request against your uploaded report (${reportName}). ` +
    `Your query has been recorded and submitted to your connected physician for clinical review.`
  );
}

