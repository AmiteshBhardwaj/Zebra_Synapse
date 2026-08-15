import { getSupabase } from "./supabase";
import { BIOMARKER_DEFINITIONS, getBiomarkerDefinition } from "./biomarkerCatalog";
import { getGeminiApiKey, getGeminiModels } from "./geminiKey";
import type { MetricAssessment } from "./labInsights";

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

/**
 * Fetch all queries for a specific uploaded lab report.
 */
export async function fetchQueriesForReport(uploadId: string): Promise<LabReportQueryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lab_report_queries")
    .select(LAB_REPORT_QUERY_SELECT)
    .eq("upload_id", uploadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[labReportChat] fetchQueriesForReport error:", error);
    return [];
  }

  return (data as unknown as LabReportQueryRow[]) || [];
}

/**
 * Fetch all queries for a patient across all reports.
 */
export async function fetchPatientAllQueries(patientId: string): Promise<LabReportQueryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lab_report_queries")
    .select(LAB_REPORT_QUERY_SELECT)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[labReportChat] fetchPatientAllQueries error:", error);
    return [];
  }

  return (data as unknown as LabReportQueryRow[]) || [];
}

/**
 * Fetch pending or all queries for a doctor to review.
 */
export async function fetchDoctorPatientQueries(options: {
  doctorId: string;
  patientId?: string;
  statusOnly?: LabReportQueryStatus;
}): Promise<LabReportQueryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("lab_report_queries")
    .select(LAB_REPORT_QUERY_SELECT);

  if (options.patientId) {
    query = query.eq("patient_id", options.patientId);
  }
  if (options.statusOnly) {
    query = query.eq("status", options.statusOnly);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[labReportChat] fetchDoctorPatientQueries error:", error);
    return [];
  }

  return (data as unknown as LabReportQueryRow[]) || [];
}

/**
 * Fetch count of pending reviews across all assigned patients for a doctor.
 */
export async function fetchDoctorPendingReviewCount(doctorId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("lab_report_queries")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  if (error) {
    console.error("[labReportChat] fetchDoctorPendingReviewCount error:", error);
    return 0;
  }

  return count || 0;
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
}): Promise<LabReportQueryRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    upload_id: params.uploadId,
    patient_id: params.patientId,
    doctor_id: params.doctorId || null,
    user_query: params.userQuery.trim(),
    ai_response: params.aiResponse.trim(),
    status: "pending_review" as const,
  };

  const { data, error } = await supabase
    .from("lab_report_queries")
    .insert(payload)
    .select(LAB_REPORT_QUERY_SELECT)
    .single();

  if (error) {
    console.error("[labReportChat] submitLabReportQuery error:", error);
    throw error;
  }

  return data as unknown as LabReportQueryRow;
}

/**
 * Doctor verifies the AI response (ticks it as medically accurate).
 */
export async function verifyLabReportQuery(params: {
  queryId: string;
  doctorId: string;
  doctorNotes?: string;
}): Promise<LabReportQueryRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

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
    console.error("[labReportChat] verifyLabReportQuery error:", error);
    throw error;
  }

  return data as unknown as LabReportQueryRow;
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
  const supabase = getSupabase();
  if (!supabase) return null;

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
    console.error("[labReportChat] rejectAndReplaceLabReportQuery error:", error);
    throw error;
  }

  return data as unknown as LabReportQueryRow;
}

/**
 * Clear all queries for a specific uploaded lab report.
 */
export async function clearQueriesForReport(uploadId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("lab_report_queries")
    .delete()
    .eq("upload_id", uploadId);

  if (error) {
    console.error("[labReportChat] clearQueriesForReport error:", error);
    throw error;
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
 * Generate a clinically grounded, empathetic AI response for a patient query based on their lab report.
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
      const prompt = `
You are Zebra Synapse AI, an intelligent, empathetic, and clinical-grade medical lab report assistant.
A patient has uploaded their lab report ("${context.reportName}") and is asking a question.

PATIENT'S LAB REPORT DATA:
${biomarkerSummaries.length > 0 ? biomarkerSummaries.join("\n") : "No specific structured biomarkers extracted yet, but patient report is on file."}

${context.rawSnippet ? `EXTRACTED REPORT TEXT SNIPPET:\n${context.rawSnippet.slice(0, 1000)}\n` : ""}

PATIENT'S CONFIGURED PROFILE & HEALTH SETTINGS:
- Primary Diet Preference: ${context.dietaryPreference ? context.dietaryPreference.toUpperCase() : "Omnivore"}
- Food Allergies & Intolerances: ${context.foodAllergies && context.foodAllergies.length > 0 ? context.foodAllergies.join(", ") : "None reported"}
- Digestive & Health Conditions: ${context.dietaryConditions && context.dietaryConditions.length > 0 ? context.dietaryConditions.map(c => c.toUpperCase()).join(", ") : "None reported"}
- Custom Dietary Notes: ${context.dietaryNotes || "None"}
- Height / Weight: ${context.heightCm ? `${context.heightCm} cm` : "N/A"} / ${context.weightKg ? `${context.weightKg} kg` : "N/A"}${context.bmi ? ` (BMI: ${context.bmi} kg/m²${context.bmiCategory ? `, ${context.bmiCategory}` : ""})` : ""}

PATIENT'S QUESTION:
"${userQuery}"

CRITICAL INSTRUCTIONS & GUARDRAILS:
1. DO NOT INDIVIDUALLY ASK the patient for their dietary preferences, food allergies, height/weight, or health conditions! All necessary data is already configured in the profile settings above.
2. STRICTLY HONOR THE PATIENT'S DIETARY PREFERENCE:
   - If VEGAN: Recommend ONLY 100% plant-based foods, proteins (tofu, tempeh, lentils, beans, edamame, chia seeds, nuts), and plant milks. NEVER recommend meat, poultry, fish, seafood, eggs, milk, cheese, or dairy.
   - If VEGETARIAN: No meat, poultry, fish, or seafood.
   - If JAIN: No root vegetables, no animal meats.
   - If LACTOSE INTOLERANT: Avoid dairy / cow's milk.
   - If GLUTEN-FREE: Recommend gluten-free grains (quinoa, brown rice, certified GF oats); avoid wheat, barley, rye.
   - If GERD / ACID REFLUX: Avoid citrus, tomatoes, deep-fried foods, heavy spices, late-night meals.
   - If HYPERTENSION: Enforce low-sodium DASH diet guidelines (< 1,500-2,000 mg/day).
3. START DIRECTLY by answering the patient's specific question/symptom in the very first sentence using their relevant lab values.
   - Example style: "You might feel dizzy because your Potassium (2 mmol/L), Calcium (5 mg/dL), and Vitamin B12 (12 pg/mL) levels are significantly lower than standard reference ranges."
   - DO NOT start with generic robotic greetings or an unhelpful raw data dump.
4. EXPLAIN THE CLINICAL MECHANISM: Explain in clear, patient-friendly terms why these specific abnormal values cause the symptom they asked about (e.g., how low potassium and low calcium disrupt nerve signaling, vascular tone, and cause lightheadedness; how low B12 causes neurological symptoms and orthostatic dizziness; how low MCHC/hemoglobin reduces oxygen delivery).
5. STRICTLY RELEVANT BIOMARKERS ONLY: ONLY mention and discuss biomarkers that are directly relevant to the patient's question. DO NOT include or dump unrelated out-of-range biomarkers.
6. NEXT STEPS: Provide supportive, actionable next steps aligned with their configured diet and remind the patient that their connected doctor has automatically received this query for review and verification.
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

  // 3. Robust Clinical Inference Engine (offline / keyless)
  return generateGroundedRuleBasedAnswer(queryLower, relevantFindings, context.reportName, context);
}

/**
 * Helper to look up a biomarker finding by regular expression.
 */
function findFinding(findings: GroundedFinding[], pattern: RegExp): GroundedFinding | undefined {
  return findings.find((f) => pattern.test(f.label) || pattern.test(f.label.replace(/[\s()_-]/g, "")));
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
      const names = electrolyteDeficits.map((f) => `**${f.label} (${f.value} ${f.unit}, Low)**`).join(", ");
      bullets.push(
        `• **Electrolyte Deficits (${names})**: Low levels in these minerals directly cause **dizziness, lightheadedness, muscle cramps, and physical weakness** by disrupting nerve conduction and vascular tone.`
      );
    }

    if (vitaminDeficits.length > 0) {
      const names = vitaminDeficits.map((f) => `**${f.label} (${f.value} ${f.unit}, Low)**`).join(", ");
      bullets.push(
        `• **Vitamin & Blood Count Deficits (${names})**: Depleted levels lead to **fatigue, brain fog, and low physical stamina** due to reduced cellular energy and impaired oxygen transport.`
      );
    }

    if (organOrMetabolicHigh.length > 0) {
      const names = organOrMetabolicHigh.map((f) => `**${f.label} (${f.value} ${f.unit}, ${f.status.toUpperCase()})`).join(", ");
      bullets.push(
        `• **Elevated Metabolic & Organ Markers (${names})**: Point to metabolic variability, dehydration, or hepatic/renal filtration stress.`
      );
    }

    // Fallback if specific groupings were empty
    if (bullets.length === 0) {
      abnormalFindings.slice(0, 6).forEach((f) => {
        bullets.push(`• **${f.label}**: ${f.value} ${f.unit} (${f.status.toUpperCase()}, Normal: ${f.reference})`);
      });
    }

    // Check if query had a symptom word or general query
    const cleanedQuery = query.replace(/[?.,!]/g, "").trim();
    const queryHeader = cleanedQuery.length > 3
      ? `Regarding your question (*"${cleanedQuery}"*), your symptoms may be directly caused by the following abnormal biomarkers in your report (${reportName}):`
      : `Based on your lab report (${reportName}), here are the key out-of-range biomarkers detected and how they affect how you feel:`;

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

