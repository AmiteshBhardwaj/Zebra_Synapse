import { BIOMARKER_DEFINITIONS, getBiomarkerDefinition } from "./biomarkerCatalog.ts";
import type { LabPanelRow } from "./labPanels";

type MetricStatus = "normal" | "borderline" | "high" | "low";

export type MetricAssessment = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  range: string;
  status: MetricStatus | "missing";
  summary: string;
  priority?: number;
};

export type TriggeredBiomarker = {
  key: string;
  label: string;
  value: number;
  unit: string;
  status: "high" | "low" | "borderline";
  reference?: string;
  trend?: {
    direction: "improving" | "worsening" | "stable" | "single_reading";
    deltaText: string;
    previousValue?: number;
    readingsCount?: number;
  };
};

export type BiomarkerHistoryPoint = {
  panelId: string;
  uploadId: string | null;
  recordedAt: string;
  value: number;
};

export type BiomarkerTrend = {
  key: string;
  label: string;
  unit: string;
  currentValue: number;
  previousValue: number | null;
  delta: number | null;
  percentChange: number | null;
  direction: "improving" | "worsening" | "stable" | "single_reading";
  status: "high" | "low" | "borderline" | "normal";
  readingsCount: number;
  history: BiomarkerHistoryPoint[];
  summaryNote?: string;
};

export type BiomarkerTrendMap = Record<string, BiomarkerTrend>;

export type MultiPanelMetadata = {
  totalReports: number;
  dateRange: {
    earliest: string;
    latest: string;
    spanText: string;
  };
  uniqueBiomarkersCount: number;
  worseningCount: number;
  improvingCount: number;
  stableCount: number;
  reportSources: Array<{
    id: string;
    uploadId: string | null;
    recordedAt: string;
    label: string;
  }>;
};

export type SynthesizedMultiPanel = {
  panel: LabPanelRow;
  trends: BiomarkerTrendMap;
  metadata: MultiPanelMetadata;
};

export type DiseasePrediction = {
  title: string;
  level: "low" | "moderate" | "high";
  rationale: string;
  nextStep: string;
  triggeredBiomarkers?: TriggeredBiomarker[];
};

export type NutritionPlan = {
  headline: string;
  focus: string;
  actions: string[];
};

export type WellnessTip = {
  title: string;
  detail: string;
};

export type TrialMatch = {
  title: string;
  summary: string;
  query: string;
  searchUrl: string;
  studies: TrialStudy[];
};

export type TrialStudy = {
  nctId: string;
  title: string;
  href: string;
  status: string;
  fitNote: string;
};

type TrialCategoryConfig = TrialMatch;

function buildClinicalTrialsSearchUrl(query: string): string {
  return `https://clinicaltrials.gov/search?term=${encodeURIComponent(query)}`;
}

function buildStudy(
  nctId: string,
  title: string,
  status: string,
  fitNote: string,
): TrialStudy {
  return {
    nctId,
    title,
    href: `https://clinicaltrials.gov/study/${nctId}`,
    status,
    fitNote,
  };
}

function createTrialCategory(
  title: string,
  summary: string,
  query: string,
  studies: TrialStudy[],
): TrialCategoryConfig {
  return {
    title,
    summary,
    query,
    searchUrl: buildClinicalTrialsSearchUrl(query),
    studies,
  };
}

const GLUCOSE_TRIAL_CATEGORY = createTrialCategory(
  "Prediabetes and diabetes prevention studies",
  "Your glucose markers suggest a metabolism-focused category often used for prediabetes or diabetes-prevention research screening.",
  "prediabetes OR type 2 diabetes prevention",
  [
    buildStudy(
      "NCT07243821",
      "Metabolic Syndrome and Prediabetes",
      "Recruiting",
      "Fits elevated A1c or glucose patterns that can overlap with metabolic syndrome and prediabetes screening.",
    ),
    buildStudy(
      "NCT05426525",
      "Use of Empagliflozin to Treat Prediabetes",
      "Active, not recruiting",
      "Relevant when glucose markers are above ideal and the focus is delaying progression toward type 2 diabetes.",
    ),
    buildStudy(
      "NCT00004992",
      "Diabetes Prevention Program",
      "Completed",
      "Classic prevention reference for adults at high risk of diabetes based on impaired glucose tolerance.",
    ),
  ],
);

const LIPID_TRIAL_CATEGORY = createTrialCategory(
  "Cholesterol and cardiometabolic studies",
  "Your lipid markers point toward dyslipidemia and cardiometabolic-risk research categories used in cholesterol or triglyceride-focused studies.",
  "dyslipidemia OR hyperlipidemia prevention",
  [
    buildStudy(
      "NCT07223658",
      "Study of ARO-DIMERPA in Adult Participants With Mixed Hyperlipidemia",
      "Recruiting",
      "Useful when LDL and triglyceride elevations suggest a mixed hyperlipidemia pattern.",
    ),
    buildStudy(
      "NCT05852431",
      "To Evaluate the Efficacy and Safety of Pegozafermin in Subjects With Severe Hypertriglyceridemia",
      "Active, not recruiting",
      "Relevant when triglycerides are part of the patient-specific signal driving the match.",
    ),
    buildStudy(
      "NCT01737099",
      "Efficacy and Safety Study of DHA-O in Adults With Hypertriglyceridemia",
      "Completed",
      "Reference study for adults with elevated triglycerides and broader cardiometabolic risk.",
    ),
  ],
);

const KIDNEY_TRIAL_CATEGORY = createTrialCategory(
  "Kidney monitoring studies",
  "Creatinine-driven follow-up can overlap with chronic-kidney-disease research categories focused on progression, monitoring, or kidney-protection strategies.",
  "chronic kidney disease early monitoring",
  [
    buildStudy(
      "NCT06531824",
      "EASi-KIDNEY (The Studies of Heart & Kidney Protection With BI 690517 in Combination With Empagliflozin)",
      "Recruiting",
      "Relevant when kidney follow-up is needed and the concern is progression risk in chronic kidney disease.",
    ),
    buildStudy(
      "NCT06268873",
      "A Phase III Study to Investigate the Efficacy and Safety of Baxdrostat in Combination With Dapagliflozin on CKD Progression in Participants With CKD and High Blood Pressure.",
      "Active, not recruiting",
      "Fits patients whose renal follow-up sits alongside blood pressure and cardiorenal risk management.",
    ),
    buildStudy(
      "NCT05914259",
      "An Observational Study to Learn More How Chronic Kidney Disease Gradually Changes Over Time in Adults Using Electronic Healthcare Records",
      "Completed",
      "Helpful as a reference example for longitudinal CKD monitoring and disease-progression tracking.",
    ),
  ],
);

const ANEMIA_TRIAL_CATEGORY = createTrialCategory(
  "Anemia and iron deficiency studies",
  "Low hemoglobin can align with anemia and iron-deficiency research categories that study cause, treatment response, or symptom improvement.",
  "anemia OR iron deficiency",
  [
    buildStudy(
      "NCT06366698",
      "Intravenous Iron Versus Oral Iron for the Treatment of Iron Deficiency Anemia",
      "Recruiting",
      "Relevant when low hemoglobin raises questions about iron-replacement strategies and treatment response.",
    ),
    buildStudy(
      "NCT05985070",
      "Evaluating the Effectiveness of Various Iron Salts in Oral Iron Therapy for Iron Deficiency and Anemia in Healthy Adults",
      "Active, not recruiting",
      "Useful when the signal suggests iron-deficiency screening terms rather than a single fixed diagnosis.",
    ),
    buildStudy(
      "NCT05185024",
      "Daily Oral Iron Supplementation for Replenishment of Depleted Iron in Adults",
      "Completed",
      "Reference study for adult iron-deficiency correction tied to hemoglobin and ferritin recovery.",
    ),
  ],
);

const GENERIC_TRIAL_CATEGORY = createTrialCategory(
  "General preventive health studies",
  "No strong lab-driven category was detected, so this falls back to a broader prevention search rather than pinned trial records.",
  "preventive health adults",
  [],
);

function statusRank(status: MetricAssessment["status"]): number {
  switch (status) {
    case "high":
    case "low":
      return 3;
    case "borderline":
      return 2;
    case "normal":
      return 1;
    default:
      return 0;
  }
}

export function getLatestLabPanel(
  panels: LabPanelRow[],
): LabPanelRow | null {
  if (panels.length === 0) return null;
  return [...panels].sort((a, b) => {
    const aTime = new Date(`${a.recorded_at}T00:00:00`).getTime();
    const bTime = new Date(`${b.recorded_at}T00:00:00`).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}

function formatValue(value: number | null, unit: string): string {
  if (value == null) return "Not provided";
  return `${value} ${unit}`.trim();
}

function getPanelBiomarkerValue(panel: LabPanelRow, key: string): number | null {
  const biomarkerValue = panel.biomarkers?.[key];
  if (typeof biomarkerValue === "number") return biomarkerValue;
  const definition = getBiomarkerDefinition(key);
  if (!definition?.legacyField) return null;
  const legacyValue = panel[definition.legacyField];
  return typeof legacyValue === "number" ? legacyValue : null;
}

function evaluateConfiguredMetric(
  value: number,
  low?: number,
  high?: number,
  borderlineLow?: number,
  borderlineHigh?: number,
): MetricStatus {
  if (high != null && value > high) return "high";
  if (low != null && value < low) return "low";
  if (borderlineHigh != null && value >= borderlineHigh) return "borderline";
  if (borderlineLow != null && value <= borderlineLow) return "borderline";
  return "normal";
}

function metricSummary(label: string, status: MetricAssessment["status"], range: string): string {
  switch (status) {
    case "high":
      return `${label} is above the configured reference ${range}.`;
    case "low":
      return `${label} is below the configured reference ${range}.`;
    case "borderline":
      return `${label} is near the edge of the configured reference ${range}.`;
    case "normal":
      return `${label} is within the configured reference ${range}.`;
    default:
      return "Add this value to include it in your analysis.";
  }
}

function buildMetric(
  key: string,
  label: string,
  value: number | null,
  unit: string,
  range: string,
  evaluate: (v: number) => MetricStatus,
  summaries: Record<MetricStatus, string>,
): MetricAssessment {
  if (value == null) {
    return {
      key,
      label,
      value,
      unit,
      range,
      status: "missing",
      summary: "Add this value to include it in your analysis.",
    };
  }
  const status = evaluate(value);
  return {
    key,
    label,
    value,
    unit,
    range,
    status,
    summary: summaries[status],
  };
}

export function getMetricAssessments(panel: LabPanelRow): MetricAssessment[] {
  return BIOMARKER_DEFINITIONS.map((definition) => {
    const value = getPanelBiomarkerValue(panel, definition.key);
    const unit = definition.units[0] ?? "";
    const range = definition.reference ?? "Configured in report format";

    if (value == null) {
      return {
        key: definition.key,
        label: definition.label,
        value,
        unit,
        range,
        status: "missing",
        summary: "Add this value to include it in your analysis.",
        priority: definition.priority,
      };
    }

    const status = evaluateConfiguredMetric(
      value,
      definition.low,
      definition.high,
      definition.borderlineLow,
      definition.borderlineHigh,
    );

    return {
      key: definition.key,
      label: definition.label,
      value,
      unit,
      range,
      status,
      summary: metricSummary(definition.label, status, range),
      priority: definition.priority,
    };
  });
}

export function evaluateBiomarkerTrend(
  key: string,
  history: BiomarkerHistoryPoint[],
  def = getBiomarkerDefinition(key)
): BiomarkerTrend | null {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort((a, b) => new Date(`${a.recordedAt}T00:00:00`).getTime() - new Date(`${b.recordedAt}T00:00:00`).getTime());
  const latestPoint = sorted[sorted.length - 1];
  const previousPoint = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const label = def?.label ?? key;
  const unit = def?.units[0] ?? "";
  const currentValue = latestPoint.value;
  const previousValue = previousPoint ? previousPoint.value : null;
  const delta = previousValue != null ? Math.round((currentValue - previousValue) * 100) / 100 : null;
  const percentChange = previousValue != null && previousValue !== 0
    ? Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10
    : null;

  const currentStatus = evaluateConfiguredMetric(
    currentValue,
    def?.low,
    def?.high,
    def?.borderlineLow,
    def?.borderlineHigh
  );

  let direction: "improving" | "worsening" | "stable" | "single_reading" = "single_reading";
  if (previousValue != null && delta != null) {
    const prevStatus = evaluateConfiguredMetric(
      previousValue,
      def?.low,
      def?.high,
      def?.borderlineLow,
      def?.borderlineHigh
    );

    const higherIsBad = [
      "hemoglobin_a1c", "fasting_glucose", "total_cholesterol", "ldl",
      "triglycerides", "creatinine", "total_bilirubin", "sgpt", "sgot", "uric_acid"
    ].includes(key);

    const higherIsGood = ["hdl", "albumin"].includes(key);

    if (higherIsBad) {
      if (delta > 0.03 * (previousValue || 1) || (prevStatus === "normal" && currentStatus !== "normal")) {
        direction = "worsening";
      } else if (delta < -0.03 * (previousValue || 1) || (prevStatus !== "normal" && currentStatus === "normal")) {
        direction = "improving";
      } else {
        direction = "stable";
      }
    } else if (higherIsGood) {
      if (delta > 0.03 * (previousValue || 1) || (prevStatus !== "normal" && currentStatus === "normal")) {
        direction = "improving";
      } else if (delta < -0.03 * (previousValue || 1) || (prevStatus === "normal" && currentStatus !== "normal")) {
        direction = "worsening";
      } else {
        direction = "stable";
      }
    } else {
      const prevIsAbnormal = prevStatus === "high" || prevStatus === "low";
      const currIsAbnormal = currentStatus === "high" || currentStatus === "low";
      if (!prevIsAbnormal && currIsAbnormal) {
        direction = "worsening";
      } else if (prevIsAbnormal && !currIsAbnormal) {
        direction = "improving";
      } else {
        direction = "stable";
      }
    }
  }

  let summaryNote = "";
  if (sorted.length > 1 && delta != null && previousValue != null) {
    const sign = delta > 0 ? "+" : "";
    summaryNote = `${sign}${delta} ${unit} (${direction}) across ${sorted.length} panels`;
  }

  return {
    key,
    label,
    unit,
    currentValue,
    previousValue,
    delta,
    percentChange,
    direction,
    status: currentStatus as "high" | "low" | "borderline" | "normal",
    readingsCount: sorted.length,
    history: sorted,
    summaryNote,
  };
}

export function synthesizeMultiPanelData(panels: LabPanelRow[]): SynthesizedMultiPanel {
  if (!panels || panels.length === 0) {
    const emptyPanel: LabPanelRow = {
      id: "synthesized-comprehensive-panel",
      patient_id: "",
      upload_id: null,
      source_extraction_id: null,
      recorded_at: new Date().toISOString().split("T")[0],
      biomarkers: {},
      hemoglobin_a1c: null,
      fasting_glucose: null,
      total_cholesterol: null,
      ldl: null,
      hdl: null,
      triglycerides: null,
      hemoglobin: null,
      wbc: null,
      platelets: null,
      creatinine: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
    return {
      panel: emptyPanel,
      trends: {},
      metadata: {
        totalReports: 0,
        dateRange: { earliest: "", latest: "", spanText: "No reports uploaded" },
        uniqueBiomarkersCount: 0,
        worseningCount: 0,
        improvingCount: 0,
        stableCount: 0,
        reportSources: [],
      },
    };
  }

  // Sort panels chronologically ascending (oldest to newest)
  const sortedPanels = [...panels].sort((a, b) => {
    const aTime = new Date(`${a.recorded_at}T00:00:00`).getTime();
    const bTime = new Date(`${b.recorded_at}T00:00:00`).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const latestPanel = sortedPanels[sortedPanels.length - 1];
  const earliestPanel = sortedPanels[0];

  // Collect history points for all biomarkers across all panels
  const biomarkerHistories: Record<string, BiomarkerHistoryPoint[]> = {};

  for (const p of sortedPanels) {
    for (const def of BIOMARKER_DEFINITIONS) {
      const val = getPanelBiomarkerValue(p, def.key);
      if (val != null) {
        if (!biomarkerHistories[def.key]) {
          biomarkerHistories[def.key] = [];
        }
        biomarkerHistories[def.key].push({
          panelId: p.id,
          uploadId: p.upload_id,
          recordedAt: p.recorded_at,
          value: val,
        });
      }
    }
  }

  const trends: BiomarkerTrendMap = {};
  const mergedBiomarkers: Record<string, number> = {};
  let worseningCount = 0;
  let improvingCount = 0;
  let stableCount = 0;

  for (const [key, history] of Object.entries(biomarkerHistories)) {
    const trend = evaluateBiomarkerTrend(key, history);
    if (trend) {
      trends[key] = trend;
      mergedBiomarkers[key] = trend.currentValue;
      if (trend.direction === "worsening") worseningCount++;
      else if (trend.direction === "improving") improvingCount++;
      else if (trend.direction === "stable") stableCount++;
    }
  }

  const synthesizedPanel: LabPanelRow = {
    id: "synthesized-comprehensive-panel",
    patient_id: latestPanel.patient_id,
    upload_id: null,
    source_extraction_id: null,
    recorded_at: latestPanel.recorded_at,
    biomarkers: mergedBiomarkers,
    hemoglobin_a1c: mergedBiomarkers.hemoglobin_a1c ?? null,
    fasting_glucose: mergedBiomarkers.fasting_glucose ?? null,
    total_cholesterol: mergedBiomarkers.total_cholesterol ?? null,
    ldl: mergedBiomarkers.ldl ?? null,
    hdl: mergedBiomarkers.hdl ?? null,
    triglycerides: mergedBiomarkers.triglycerides ?? null,
    hemoglobin: mergedBiomarkers.hemoglobin ?? null,
    wbc: mergedBiomarkers.wbc ?? null,
    platelets: mergedBiomarkers.platelets ?? null,
    creatinine: mergedBiomarkers.creatinine ?? null,
    notes: `Comprehensive multi-report synthesis compiled from ${sortedPanels.length} uploaded lab reports.`,
    created_at: latestPanel.created_at,
  };

  const earDate = earliestPanel.recorded_at;
  const latDate = latestPanel.recorded_at;
  const spanText =
    sortedPanels.length === 1
      ? `${earDate}`
      : `${earDate} to ${latDate}`;

  const reportSources = sortedPanels.map((p, idx) => ({
    id: p.id,
    uploadId: p.upload_id,
    recordedAt: p.recorded_at,
    label: `Report ${idx + 1} (${p.recorded_at})`,
  }));

  const metadata: MultiPanelMetadata = {
    totalReports: sortedPanels.length,
    dateRange: {
      earliest: earDate,
      latest: latDate,
      spanText,
    },
    uniqueBiomarkersCount: Object.keys(mergedBiomarkers).length,
    worseningCount,
    improvingCount,
    stableCount,
    reportSources,
  };

  return {
    panel: synthesizedPanel,
    trends,
    metadata,
  };
}

export function getOverallStatus(
  panel: LabPanelRow,
  meta?: MultiPanelMetadata,
): {
  label: string;
  tone: "normal" | "attention";
  summary: string;
} {
  const metrics = getMetricAssessments(panel);
  const severe = metrics.filter((m) => m.status === "high" || m.status === "low");
  const mild = metrics.filter((m) => m.status === "borderline");

  const multiContext = meta && meta.totalReports > 1
    ? `Across ${meta.totalReports} uploaded reports (${meta.uniqueBiomarkersCount} biomarkers): `
    : "";

  if (severe.length > 0) {
    return {
      label: "Needs attention",
      tone: "attention",
      summary: `${multiContext}${severe.length} marker(s) are outside the usual range.`,
    };
  }
  if (mild.length > 0) {
    return {
      label: "Borderline findings",
      tone: "attention",
      summary: `${multiContext}${mild.length} marker(s) are borderline and worth tracking.`,
    };
  }
  return {
    label: "Stable",
    tone: "normal",
    summary: `${multiContext}Recorded markers are within the usual reference ranges.`,
  };
}

function buildTrigger(
  key: string,
  label: string,
  value: number,
  unit: string,
  status: "high" | "low" | "borderline",
  reference: string,
  trends?: BiomarkerTrendMap,
): TriggeredBiomarker {
  const trendData = trends?.[key];
  let trend: TriggeredBiomarker["trend"] = undefined;
  if (trendData && trendData.readingsCount > 1 && trendData.delta != null) {
    const sign = trendData.delta > 0 ? "+" : "";
    trend = {
      direction: trendData.direction,
      deltaText: `${sign}${trendData.delta} ${unit}`,
      previousValue: trendData.previousValue ?? undefined,
      readingsCount: trendData.readingsCount,
    };
  }
  return {
    key,
    label,
    value,
    unit,
    status,
    reference,
    trend,
  };
}

export function getDiseasePredictions(
  panel: LabPanelRow,
  trends?: BiomarkerTrendMap,
): DiseasePrediction[] {
  const list: DiseasePrediction[] = [];

  // Diabetes / Glucose
  const glucoseTriggers: TriggeredBiomarker[] = [];
  const a1cVal = panel.hemoglobin_a1c ?? panel.biomarkers?.hemoglobin_a1c;
  const gluVal = panel.fasting_glucose ?? panel.biomarkers?.fasting_glucose;

  if (a1cVal != null && a1cVal >= 5.7) {
    glucoseTriggers.push(
      buildTrigger(
        "hemoglobin_a1c",
        "Hemoglobin A1c",
        a1cVal,
        "%",
        a1cVal >= 6.5 ? "high" : "borderline",
        "< 5.7",
        trends,
      ),
    );
  }
  if (gluVal != null && gluVal >= 100) {
    glucoseTriggers.push(
      buildTrigger(
        "fasting_glucose",
        "Fasting Glucose",
        gluVal,
        "mg/dL",
        gluVal >= 126 ? "high" : "borderline",
        "70-99",
        trends,
      ),
    );
  }

  const glucoseWorsening = glucoseTriggers.some((t) => t.trend?.direction === "worsening");
  const glucoseImproving = glucoseTriggers.some((t) => t.trend?.direction === "improving");
  const glucoseTrendNote = glucoseWorsening
    ? " Upward trajectory across multiple reports suggests accelerating glycemic stress."
    : glucoseImproving
      ? " Trending downward toward normal bounds across recent uploads."
      : "";

  if (
    (a1cVal != null && a1cVal >= 6.5) ||
    (gluVal != null && gluVal >= 126)
  ) {
    list.push({
      title: "Diabetes-range glucose pattern",
      level: "high",
      rationale: `A1c or fasting glucose is in a range associated with diabetes.${glucoseTrendNote}`,
      nextStep: "Review the report with your clinician for confirmation and treatment planning.",
      triggeredBiomarkers: glucoseTriggers,
    });
  } else if (glucoseTriggers.length > 0) {
    list.push({
      title: "Prediabetes risk",
      level: "moderate",
      rationale: `Glucose markers are above ideal but below common diabetes thresholds.${glucoseTrendNote}`,
      nextStep: "Focus on weight, activity, sleep, and lower-refined-carbohydrate meals.",
      triggeredBiomarkers: glucoseTriggers,
    });
  }

  // Lipid / Cardiovascular
  const lipidTriggers: TriggeredBiomarker[] = [];
  const ldlVal = panel.ldl ?? panel.biomarkers?.ldl;
  const tgVal = panel.triglycerides ?? panel.biomarkers?.triglycerides;
  const hdlVal = panel.hdl ?? panel.biomarkers?.hdl;
  const tcVal = panel.total_cholesterol ?? panel.biomarkers?.total_cholesterol;

  if (ldlVal != null && ldlVal >= 100) {
    lipidTriggers.push(
      buildTrigger("ldl", "LDL Cholesterol", ldlVal, "mg/dL", ldlVal >= 160 ? "high" : "borderline", "< 100", trends),
    );
  }
  if (tgVal != null && tgVal >= 150) {
    lipidTriggers.push(
      buildTrigger("triglycerides", "Triglycerides", tgVal, "mg/dL", tgVal >= 200 ? "high" : "borderline", "< 150", trends),
    );
  }
  if (hdlVal != null && hdlVal < 40) {
    lipidTriggers.push(
      buildTrigger("hdl", "HDL Cholesterol", hdlVal, "mg/dL", "low", ">= 40", trends),
    );
  }
  if (tcVal != null && tcVal >= 200) {
    lipidTriggers.push(
      buildTrigger("total_cholesterol", "Total Cholesterol", tcVal, "mg/dL", tcVal >= 240 ? "high" : "borderline", "< 200", trends),
    );
  }

  const lipidWorsening = lipidTriggers.some((t) => t.trend?.direction === "worsening");
  const lipidImproving = lipidTriggers.some((t) => t.trend?.direction === "improving");
  const lipidTrendNote = lipidWorsening
    ? " Unfavorable progression detected across successive panels."
    : lipidImproving
      ? " Favorable reduction in lipid markers noted across recent uploads."
      : "";

  if (
    (ldlVal != null && ldlVal >= 160) ||
    (tgVal != null && tgVal >= 200) ||
    (hdlVal != null && hdlVal < 40)
  ) {
    list.push({
      title: "Cardiometabolic risk",
      level: "high",
      rationale: `Cholesterol and lipid markers suggest elevated cardiovascular risk.${lipidTrendNote}`,
      nextStep: "Discuss lipid management, exercise targets, and medication need with your clinician.",
      triggeredBiomarkers: lipidTriggers,
    });
  } else if (lipidTriggers.length > 0) {
    list.push({
      title: "Emerging lipid imbalance",
      level: "moderate",
      rationale: `Some lipid markers are above ideal and worth tracking.${lipidTrendNote}`,
      nextStep: "Reduce saturated fat, improve fiber intake, and recheck labs on schedule.",
      triggeredBiomarkers: lipidTriggers,
    });
  }

  // Hematologic / Anemia
  const hbVal = panel.hemoglobin ?? panel.biomarkers?.hemoglobin;
  if (hbVal != null && hbVal < 12) {
    const hbTrigger = buildTrigger("hemoglobin", "Hemoglobin", hbVal, "g/dL", "low", "12-17", trends);
    const hbTrendNote = hbTrigger.trend?.direction === "worsening"
      ? " Downward trend in hemoglobin across reports indicates worsening anemia."
      : hbTrigger.trend?.direction === "improving"
        ? " Hemoglobin is climbing toward normal bounds compared to earlier reports."
        : "";

    list.push({
      title: "Possible anemia pattern",
      level: "moderate",
      rationale: `Hemoglobin is below the usual reference range (12-17 g/dL).${hbTrendNote}`,
      nextStep: "Review iron studies, symptoms, and possible causes with your clinician.",
      triggeredBiomarkers: [hbTrigger],
    });
  }

  // Renal / Kidney Function
  const creatinineVal = panel.creatinine ?? panel.biomarkers?.creatinine;
  if (creatinineVal != null && creatinineVal > 1.3) {
    const crTrigger = buildTrigger("creatinine", "Creatinine", creatinineVal, "mg/dL", "high", "0.6-1.3", trends);
    const crTrendNote = crTrigger.trend?.direction === "worsening"
      ? " Upward movement in creatinine across panels warrants active kidney monitoring."
      : "";

    list.push({
      title: "Kidney function follow-up",
      level: "moderate",
      rationale: `Creatinine is above the usual reference range (0.6-1.3 mg/dL).${crTrendNote}`,
      nextStep: "Review hydration, medications, blood pressure, and kidney follow-up labs.",
      triggeredBiomarkers: [crTrigger],
    });
  }

  // Hepatic / Liver Function
  const liverTriggers: TriggeredBiomarker[] = [];
  const biliVal = panel.biomarkers?.total_bilirubin;
  const sgptVal = panel.biomarkers?.sgpt;
  const sgotVal = panel.biomarkers?.sgot;
  const albVal = panel.biomarkers?.albumin;
  const tpVal = panel.biomarkers?.total_protein;

  if (biliVal != null && biliVal > 1.2) {
    liverTriggers.push(
      buildTrigger("total_bilirubin", "Total Bilirubin", biliVal, "mg/dL", biliVal >= 3.0 ? "high" : "borderline", "0.2-1.3", trends),
    );
  }
  if (sgptVal != null && sgptVal > 35) {
    liverTriggers.push(
      buildTrigger("sgpt", "SGPT (ALT)", sgptVal, "U/L", sgptVal >= 60 ? "high" : "borderline", "< 35", trends),
    );
  }
  if (sgotVal != null && sgotVal > 35) {
    liverTriggers.push(
      buildTrigger("sgot", "SGOT (AST)", sgotVal, "U/L", sgotVal >= 60 ? "high" : "borderline", "17-59", trends),
    );
  }
  if (albVal != null && albVal < 3.5) {
    liverTriggers.push(
      buildTrigger("albumin", "Serum Albumin", albVal, "g/dL", albVal <= 2.5 ? "high" : "low", "3.5-5.0", trends),
    );
  }
  if (tpVal != null && tpVal < 6.3) {
    liverTriggers.push(
      buildTrigger("total_protein", "Total Protein", tpVal, "g/dL", tpVal <= 5.0 ? "high" : "low", "6.3-8.2", trends),
    );
  }

  if (liverTriggers.length > 0) {
    const isSevere = (biliVal != null && biliVal >= 3.0) || (albVal != null && albVal <= 2.5);
    const liverWorsening = liverTriggers.some((t) => t.trend?.direction === "worsening");
    const liverTrendNote = liverWorsening ? " Upward movement in liver enzymes across panels indicates active hepatic irritation." : "";

    list.push({
      title: "Hepatic function & liver enzyme elevation",
      level: isSevere ? "high" : "moderate",
      rationale: `Elevated Bilirubin/ALT or low Albumin levels indicate deranged liver function requiring clinical evaluation.${liverTrendNote}`,
      nextStep: "Consult a physician or gastroenterologist to evaluate liver enzyme patterns, diet, and clinical causes.",
      triggeredBiomarkers: liverTriggers,
    });
  }

  // Thyroid Profile
  const thyroidTriggers: TriggeredBiomarker[] = [];
  const tshVal = panel.biomarkers?.tsh;
  const t3Val = panel.biomarkers?.t3;
  const t4Val = panel.biomarkers?.t4;

  if (tshVal != null && (tshVal > 4.94 || tshVal < 0.35)) {
    thyroidTriggers.push(
      buildTrigger("tsh", "TSH", tshVal, "uIU/mL", tshVal > 4.94 ? "high" : "low", "0.35-4.94", trends),
    );
  }
  if (t4Val != null && (t4Val < 4.87 || t4Val > 11.72)) {
    thyroidTriggers.push(
      buildTrigger("t4", "T4", t4Val, "ug/dL", t4Val < 4.87 ? "low" : "high", "4.87-11.72", trends),
    );
  }
  if (t3Val != null && (t3Val < 0.58 || t3Val > 1.59)) {
    thyroidTriggers.push(
      buildTrigger("t3", "T3", t3Val, "ng/mL", t3Val < 0.58 ? "low" : "high", "0.58-1.59", trends),
    );
  }

  if (thyroidTriggers.length > 0) {
    list.push({
      title: "Thyroid function & hormone variation",
      level: "moderate",
      rationale: "Thyroid hormone levels (T3, T4, or TSH) deviate from standard endocrine reference ranges.",
      nextStep: "Review thyroid markers with your clinician for formal interpretation and endocrine follow-up.",
      triggeredBiomarkers: thyroidTriggers,
    });
  }

  // Electrolytes & Minerals
  const mineralTriggers: TriggeredBiomarker[] = [];
  const calciumVal = panel.biomarkers?.calcium;
  const sodiumVal = panel.biomarkers?.sodium;

  if (calciumVal != null && (calciumVal < 8.4 || calciumVal > 10.2)) {
    mineralTriggers.push(
      buildTrigger("calcium", "Calcium", calciumVal, "mg/dL", calciumVal < 8.4 ? "low" : "high", "8.4-10.2", trends),
    );
  }
  if (sodiumVal != null && (sodiumVal < 136 || sodiumVal > 145)) {
    mineralTriggers.push(
      buildTrigger("sodium", "Sodium", sodiumVal, "mmol/L", sodiumVal > 145 ? "high" : "low", "136-145", trends),
    );
  }

  if (mineralTriggers.length > 0) {
    list.push({
      title: "Electrolyte & mineral balance alert",
      level: "moderate",
      rationale: "Serum calcium or sodium levels deviate from optimal physiological reference bounds.",
      nextStep: "Review dietary calcium, hydration, and renal/parathyroid markers with your doctor.",
      triggeredBiomarkers: mineralTriggers,
    });
  }

  if (list.length === 0) {
    list.push({
      title: "No strong rule-based risk flags",
      level: "low",
      rationale: "The available markers do not cross the app's simple risk thresholds.",
      nextStep: "Continue routine monitoring and rely on your clinician for formal interpretation.",
    });
  }

  return list;
}

export function getNutritionPlans(
  panel: LabPanelRow,
  trends?: BiomarkerTrendMap,
): NutritionPlan[] {
  const plans: NutritionPlan[] = [];

  const glucoseVal = panel.fasting_glucose ?? panel.biomarkers?.fasting_glucose;
  const a1cVal = panel.hemoglobin_a1c ?? panel.biomarkers?.hemoglobin_a1c;
  if ((a1cVal != null && a1cVal >= 5.7) || (glucoseVal != null && glucoseVal >= 100)) {
    const isWorsening =
      trends?.fasting_glucose?.direction === "worsening" ||
      trends?.hemoglobin_a1c?.direction === "worsening";
    const isImproving =
      trends?.fasting_glucose?.direction === "improving" ||
      trends?.hemoglobin_a1c?.direction === "improving";

    const actions = [
      "Center meals on lean protein, vegetables, beans, and high-fiber carbs.",
      "Reduce sugary drinks, juices, desserts, and large refined-carb portions.",
      "Aim for a 10 to 15 minute walk after meals when possible.",
    ];

    if (isWorsening) {
      actions.push("Accelerate glycemic control: tighten post-meal walking and cut hidden refined sugars due to upward trend across reports.");
    } else if (isImproving) {
      actions.push("Maintain positive dietary momentum: recent glucose readings show improvement over earlier reports.");
    }

    plans.push({
      headline: "Glucose control",
      focus: "Lower glycemic load and steadier post-meal blood sugar.",
      actions,
    });
  }

  const ldlVal = panel.ldl ?? panel.biomarkers?.ldl;
  const tgVal = panel.triglycerides ?? panel.biomarkers?.triglycerides;
  const hdlVal = panel.hdl ?? panel.biomarkers?.hdl;
  if ((ldlVal != null && ldlVal >= 100) || (tgVal != null && tgVal >= 150) || (hdlVal != null && hdlVal < 40)) {
    const isWorsening =
      trends?.ldl?.direction === "worsening" ||
      trends?.triglycerides?.direction === "worsening";
    const isImproving =
      trends?.ldl?.direction === "improving" ||
      trends?.triglycerides?.direction === "improving";

    const actions = [
      "Increase soluble fiber from oats, beans, lentils, fruit, and vegetables.",
      "Replace fried foods and processed snacks with nuts, seeds, olive oil, and fish.",
      "Limit alcohol and added sugar if triglycerides are elevated.",
    ];

    if (isWorsening) {
      actions.push("Address upward lipid trajectory: strictly limit saturated fats and introduce 2 tbsp daily ground flaxseed or chia.");
    } else if (isImproving) {
      actions.push("Lipid profile shows favorable progress from prior panels: continue healthy unsaturated fat choices.");
    }

    plans.push({
      headline: "Lipid improvement",
      focus: "Improve LDL, HDL, and triglyceride balance.",
      actions,
    });
  }

  const biliVal = panel.biomarkers?.total_bilirubin;
  const sgptVal = panel.biomarkers?.sgpt;
  const albVal = panel.biomarkers?.albumin;
  if ((biliVal != null && biliVal > 1.2) || (sgptVal != null && sgptVal > 35) || (albVal != null && albVal < 3.5)) {
    plans.push({
      headline: "Liver & hepatic support",
      focus: "Lighten hepatic metabolic load and support liver cell recovery.",
      actions: [
        "Eliminate alcohol completely and avoid deep-fried, oily, or unhygienic foods.",
        "Emphasize antioxidant-rich foods like leafy greens, beets, berries, and cruciferous vegetables.",
        "Maintain clean hydration (2 to 2.5 liters water daily) and adequate light protein intake.",
      ],
    });
  }

  const calciumVal = panel.biomarkers?.calcium;
  if (calciumVal != null && calciumVal < 8.4) {
    plans.push({
      headline: "Calcium & bone support",
      focus: "Increase bioavailable dietary calcium and supportive co-factors.",
      actions: [
        "Include calcium-rich foods like low-fat dairy, ragi, sesame seeds, almonds, and green leafy vegetables.",
        "Pair calcium sources with Vitamin D (sunlight exposure/supplements) for optimal intestinal absorption.",
        "Limit excess caffeine, soft drinks, and alcohol, which inhibit calcium retention.",
      ],
    });
  }

  const hbVal = panel.hemoglobin ?? panel.biomarkers?.hemoglobin;
  if (hbVal != null && hbVal < 12) {
    plans.push({
      headline: "Iron-supportive meals",
      focus: "Support low hemoglobin with nutrient-dense food choices.",
      actions: [
        "Include iron-rich foods such as legumes, leafy greens, lean meats, or fortified cereals.",
        "Pair iron sources with vitamin C foods like citrus, berries, or peppers.",
        "Ask your clinician before starting iron supplements on your own.",
      ],
    });
  }

  if (plans.length === 0) {
    plans.push({
      headline: "Maintenance plan",
      focus: "Keep current markers stable with broadly heart-healthy habits.",
      actions: [
        "Keep meals mostly minimally processed and rich in fiber.",
        "Stay hydrated and keep protein distributed across the day.",
        "Repeat labs on schedule to catch any trend changes early.",
      ],
    });
  }

  return plans;
}

export function getWellnessTips(
  panel: LabPanelRow,
  trends?: BiomarkerTrendMap,
): WellnessTip[] {
  const tips: WellnessTip[] = [];
  const metrics = getMetricAssessments(panel);
  const worst = [...metrics]
    .filter((m) => m.status !== "missing")
    .sort((a, b) => statusRank(b.status) - statusRank(a.status))
    .slice(0, 4);

  // If trends show multiple reports with worsening or improving markers, add contextual lifestyle tips
  if (trends) {
    const worseningList = Object.values(trends).filter((t) => t.direction === "worsening");
    const improvingList = Object.values(trends).filter((t) => t.direction === "improving");

    if (worseningList.length > 0) {
      const names = worseningList.slice(0, 2).map((t) => t.label).join(" and ");
      tips.push({
        title: `Target upward shift in ${names}`,
        detail: `Multi-panel tracking shows upward movement in ${names}. Prioritize consistent sleep (7-8 hours), hydration, and daily movement to reverse this trajectory.`,
      });
    } else if (improvingList.length > 0) {
      const names = improvingList.slice(0, 2).map((t) => t.label).join(" and ");
      tips.push({
        title: `Sustain progress in ${names}`,
        detail: `Your latest results show measurable improvement in ${names} compared to earlier records. Keep your current habits steady.`,
      });
    }
  }

  for (const metric of worst) {
    if (metric.key === "hemoglobin_a1c" || metric.key === "fasting_glucose") {
      tips.push({
        title: "Move after meals",
        detail: "Short walks after eating can improve post-meal glucose handling.",
      });
    } else if (
      metric.key === "ldl" ||
      metric.key === "hdl" ||
      metric.key === "triglycerides"
    ) {
      tips.push({
        title: "Protect cardiovascular health",
        detail: "Combine regular aerobic exercise with higher-fiber meals and less ultra-processed food.",
      });
    } else if (
      metric.key === "total_bilirubin" ||
      metric.key === "sgpt" ||
      metric.key === "sgot" ||
      metric.key === "albumin"
    ) {
      tips.push({
        title: "Protect liver health",
        detail: "Avoid alcohol, reduce heavy greasy foods, avoid OTC painkiller overuse, and rest.",
      });
    } else if (metric.key === "calcium") {
      tips.push({
        title: "Support bone density",
        detail: "Engage in light weight-bearing exercise and get safe daily sunlight exposure for Vitamin D.",
      });
    } else if (metric.key === "hemoglobin") {
      tips.push({
        title: "Watch fatigue and exertion",
        detail: "Low hemoglobin can contribute to low energy, so track fatigue, dizziness, or shortness of breath.",
      });
    } else if (metric.key === "creatinine") {
      tips.push({
        title: "Review hydration and medications",
        detail: "Kidney-related markers are easier to interpret with hydration, blood pressure, and medication context.",
      });
    } else if (metric.key === "tsh" || metric.key === "t4" || metric.key === "t3") {
      tips.push({
        title: "Track energy and thyroid signals",
        detail: "Note any changes in energy, cold tolerance, skin/hair, and discuss thyroid follow-up with your doctor.",
      });
    }
  }

  if (tips.length === 0) {
    tips.push({
      title: "Keep your baseline healthy",
      detail: "The current recorded markers look stable, so focus on consistency with food, movement, and sleep.",
    });
  }

  const seen = new Set<string>();
  return tips.filter((tip) => {
    const key = `${tip.title}::${tip.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getTrialMatches(panel: LabPanelRow): TrialMatch[] {
  const trials: TrialMatch[] = [];

  if (
    (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 5.7) ||
    (panel.fasting_glucose != null && panel.fasting_glucose >= 100)
  ) {
    trials.push(GLUCOSE_TRIAL_CATEGORY);
  }

  if (
    (panel.ldl != null && panel.ldl >= 100) ||
    (panel.triglycerides != null && panel.triglycerides >= 150)
  ) {
    trials.push(LIPID_TRIAL_CATEGORY);
  }

  if (panel.creatinine != null && panel.creatinine > 1.3) {
    trials.push(KIDNEY_TRIAL_CATEGORY);
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
    trials.push(ANEMIA_TRIAL_CATEGORY);
  }

  if (trials.length === 0) {
    trials.push(GENERIC_TRIAL_CATEGORY);
  }

  return trials;
}

export function getMetricsForDashboard(panel: LabPanelRow, limit = 20) {
  return getMetricAssessments(panel)
    .filter((m) => m.status !== "missing")
    .sort((a, b) => {
      const statusDiff = statusRank(b.status) - statusRank(a.status);
      if (statusDiff !== 0) return statusDiff;
      return (b.priority ?? 0) - (a.priority ?? 0);
    })
    .slice(0, limit);
}

export function getMetricValueLabel(metric: MetricAssessment): string {
  return formatValue(metric.value, metric.unit);
}
