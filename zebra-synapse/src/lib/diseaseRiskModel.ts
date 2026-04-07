import { getBiomarkerDefinition } from "./biomarkerCatalog";
import type { LabPanelRow } from "./labPanels";
import type { LabReportUploadRow } from "./labReports";
import type { MedicalRecordText } from "./medicalRecordCorpus";

type DiseaseFamily =
  | "Hematological & Oncological"
  | "Autoimmune & Rheumatic"
  | "Rare Metabolic & Genetic"
  | "Cardiovascular";

type DiseaseModelMode = "fusion" | "lab-dominant" | "text-dominant";
type DiseaseRiskLevel = "low" | "moderate" | "high";

type TextSignal = {
  label: string;
  pattern: RegExp;
};

type TrendStats = {
  values: number[];
  first: number | null;
  latest: number | null;
  deltaPct: number | null;
};

type AnalysisContext = {
  uploads: LabReportUploadRow[];
  panels: LabPanelRow[];
  recordTexts: MedicalRecordText[];
  noteCorpus: string;
  latestPanel: LabPanelRow | null;
  longitudinalSpanDays: number;
};

type AssessmentDraft = {
  id: string;
  family: DiseaseFamily;
  disease: string;
  subtitle: string;
  maxRaw: number;
  labRaw: number;
  textRaw: number;
  trendRaw: number;
  evidence: string[];
  missingSignals: string[];
  nextSteps: string[];
  relevantKeys: string[];
};

export type DiseaseRiskAssessment = {
  id: string;
  family: DiseaseFamily;
  disease: string;
  subtitle: string;
  level: DiseaseRiskLevel;
  modality: DiseaseModelMode;
  riskScore: number;
  confidence: number;
  summary: string;
  evidence: string[];
  missingSignals: string[];
  nextSteps: string[];
  branchScores: {
    lab: number;
    text: number;
    trend: number;
  };
};

export type DiseaseFamilySummary = {
  family: DiseaseFamily;
  highlightedDisease: string;
  highestScore: number;
  highestLevel: DiseaseRiskLevel;
  averageScore: number;
};

export type DiseaseRiskProfile = {
  assessments: DiseaseRiskAssessment[];
  families: DiseaseFamilySummary[];
  highestRisk: DiseaseRiskAssessment | null;
  uploadsCount: number;
  panelCount: number;
  textDocumentCount: number;
  longitudinalSpanDays: number;
};

const GENERIC_PANEL_NOTE =
  "auto-extracted from uploaded pdf. review values if the source format is unusual.";

const MDS_TEXT_SIGNALS: TextSignal[] = [
  { label: "fatigue", pattern: /\b(?:fatigue|tiredness|exhaustion)\b/i },
  { label: "bruising or bleeding", pattern: /\b(?:bruising|easy bleeding|bleeding gums|petechiae)\b/i },
  { label: "recurrent infections", pattern: /\b(?:recurrent infections|frequent infections|febrile neutropenia)\b/i },
];

const MYELOMA_TEXT_SIGNALS: TextSignal[] = [
  { label: "back or bone pain", pattern: /\b(?:back pain|bone pain|vertebral pain|skeletal pain)\b/i },
  { label: "fatigue", pattern: /\b(?:fatigue|weakness)\b/i },
  { label: "weight loss", pattern: /\b(?:weight loss|loss of appetite)\b/i },
];

const SLE_TEXT_SIGNALS: TextSignal[] = [
  { label: "joint pain", pattern: /\b(?:joint pain|arthralgia|arthritis|swollen joints)\b/i },
  { label: "rash or photosensitivity", pattern: /\b(?:malar rash|butterfly rash|photosensitivity|sun sensitivity|rash)\b/i },
  { label: "oral ulcers", pattern: /\b(?:oral ulcers?|mouth ulcers?)\b/i },
  { label: "fever or fatigue", pattern: /\b(?:fever|fatigue|malaise)\b/i },
  { label: "renal symptoms", pattern: /\b(?:proteinuria|foamy urine|nephritis|kidney involvement)\b/i },
];

const ANCA_TEXT_SIGNALS: TextSignal[] = [
  { label: "sinus or nasal inflammation", pattern: /\b(?:sinusitis|nasal crusting|epistaxis|nose bleeding)\b/i },
  { label: "pulmonary symptoms", pattern: /\b(?:hemoptysis|coughing blood|shortness of breath|pulmonary infiltrates)\b/i },
  { label: "neuropathy", pattern: /\b(?:neuropathy|numbness|tingling|foot drop)\b/i },
  { label: "purpura or rash", pattern: /\b(?:purpura|vasculitic rash|skin lesions)\b/i },
  { label: "renal symptoms", pattern: /\b(?:hematuria|proteinuria|rapid kidney decline)\b/i },
];

const HEMOCHROMATOSIS_TEXT_SIGNALS: TextSignal[] = [
  { label: "joint pain", pattern: /\b(?:joint pain|arthropathy)\b/i },
  { label: "fatigue", pattern: /\b(?:fatigue|weakness)\b/i },
  { label: "liver symptoms", pattern: /\b(?:liver disease|hepatomegaly|cirrhosis|elevated liver enzymes)\b/i },
];

const AHP_TEXT_SIGNALS: TextSignal[] = [
  { label: "severe abdominal pain", pattern: /\b(?:abdominal pain|severe pain|unexplained pain)\b/i },
  { label: "neurologic symptoms", pattern: /\b(?:neuropathy|weakness|tingling|burning pain|seizures)\b/i },
  { label: "vomiting or nausea", pattern: /\b(?:vomiting|nausea)\b/i },
  { label: "psychiatric symptoms", pattern: /\b(?:anxiety|panic|confusion|hallucinations)\b/i },
  { label: "recurrent emergency visits", pattern: /\b(?:er visit|emergency room|multiple admissions|recurrent attacks)\b/i },
];

const ATTR_TEXT_SIGNALS: TextSignal[] = [
  { label: "carpal tunnel syndrome", pattern: /\b(?:carpal tunnel)\b/i },
  { label: "spinal stenosis", pattern: /\b(?:spinal stenosis|lumbar stenosis)\b/i },
  { label: "tendon rupture", pattern: /\b(?:biceps tendon rupture|tendon rupture)\b/i },
  { label: "heart failure symptoms", pattern: /\b(?:heart failure|edema|shortness of breath|orthopnea)\b/i },
  { label: "arrhythmia or syncope", pattern: /\b(?:arrhythmia|palpitations|syncope|atrial fibrillation)\b/i },
  { label: "neuropathy", pattern: /\b(?:neuropathy|numbness|orthostatic dizziness)\b/i },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function levelFromScore(score: number): DiseaseRiskLevel {
  if (score >= 65) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

function rawToScore(raw: number, maxRaw: number): number {
  if (maxRaw <= 0) return 0;
  return Math.round(clamp((raw / maxRaw) * 100, 0, 100));
}

function modalityFromScores(labAndTrend: number, text: number): DiseaseModelMode {
  if (text >= labAndTrend + 10) return "text-dominant";
  if (labAndTrend >= text + 10) return "lab-dominant";
  return "fusion";
}

function sortPanelsAscending(panels: LabPanelRow[]): LabPanelRow[] {
  return [...panels].sort((a, b) => {
    const aTime = new Date(`${a.recorded_at}T00:00:00`).getTime();
    const bTime = new Date(`${b.recorded_at}T00:00:00`).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function getPanelValue(panel: LabPanelRow, key: string): number | null {
  const biomarkerValue = panel.biomarkers?.[key];
  if (typeof biomarkerValue === "number") return biomarkerValue;

  const definition = getBiomarkerDefinition(key);
  if (!definition?.legacyField) return null;

  const legacyValue = panel[definition.legacyField];
  return typeof legacyValue === "number" ? legacyValue : null;
}

function getLatestValue(context: AnalysisContext, key: string): number | null {
  if (!context.latestPanel) return null;
  return getPanelValue(context.latestPanel, key);
}

function getTrend(context: AnalysisContext, key: string): TrendStats {
  const values = context.panels
    .map((panel) => getPanelValue(panel, key))
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return { values, first: null, latest: null, deltaPct: null };
  }

  const first = values[0];
  const latest = values[values.length - 1];
  const deltaPct = first !== 0 ? ((latest - first) / Math.abs(first)) * 100 : null;

  return { values, first, latest, deltaPct };
}

function getProteinGap(context: AnalysisContext): number | null {
  const totalProtein = getLatestValue(context, "total_protein");
  const albumin = getLatestValue(context, "albumin");
  if (totalProtein == null || albumin == null) return null;
  return totalProtein - albumin;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return `${value}`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatMetricValue(key: string, value: number): string {
  const definition = getBiomarkerDefinition(key);
  const unit = definition?.units[0] ?? "";
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`.trim();
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function meaningfulPanelNotes(panel: LabPanelRow): string {
  const value = panel.notes?.trim() ?? "";
  if (!value || value.toLowerCase() === GENERIC_PANEL_NOTE) return "";
  return value;
}

function collectTextMatches(corpus: string, signals: TextSignal[]): string[] {
  return signals.filter((signal) => signal.pattern.test(corpus)).map((signal) => signal.label);
}

function hasAnyValue(context: AnalysisContext, key: string): boolean {
  return context.panels.some((panel) => getPanelValue(panel, key) != null);
}

function countAbnormalLatestMarkers(context: AnalysisContext): number {
  const latest = context.latestPanel;
  if (!latest?.biomarkers) return 0;

  return Object.entries(latest.biomarkers).reduce((count, [key, value]) => {
    const definition = getBiomarkerDefinition(key);
    if (!definition || typeof value !== "number") return count;

    if (definition.high != null && value > definition.high) return count + 1;
    if (definition.low != null && value < definition.low) return count + 1;
    if (definition.borderlineHigh != null && value >= definition.borderlineHigh) return count + 1;
    if (definition.borderlineLow != null && value <= definition.borderlineLow) return count + 1;
    return count;
  }, 0);
}

function buildContext(args: {
  panels: LabPanelRow[];
  uploads: LabReportUploadRow[];
  recordTexts: MedicalRecordText[];
}): AnalysisContext {
  const panels = sortPanelsAscending(args.panels);
  const latestPanel = panels.length > 0 ? panels[panels.length - 1] : null;
  const noteCorpus = [
    ...panels.map((panel) => meaningfulPanelNotes(panel)).filter(Boolean),
    ...args.recordTexts.map((record) => record.text.trim()).filter(Boolean),
  ]
    .join("\n")
    .toLowerCase();

  const firstDate = panels[0]?.recorded_at ? new Date(`${panels[0].recorded_at}T00:00:00`) : null;
  const lastDate =
    panels[panels.length - 1]?.recorded_at
      ? new Date(`${panels[panels.length - 1].recorded_at}T00:00:00`)
      : null;
  const longitudinalSpanDays =
    firstDate && lastDate
      ? Math.max(0, Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000))
      : 0;

  return {
    uploads: args.uploads,
    panels,
    recordTexts: args.recordTexts,
    noteCorpus,
    latestPanel,
    longitudinalSpanDays,
  };
}

function finalizeAssessment(context: AnalysisContext, draft: AssessmentDraft): DiseaseRiskAssessment {
  const riskScore = rawToScore(draft.labRaw + draft.textRaw + draft.trendRaw, draft.maxRaw);
  const level = levelFromScore(riskScore);
  const modality = modalityFromScores(draft.labRaw + draft.trendRaw, draft.textRaw);
  const availableInputs =
    draft.relevantKeys.filter((key) => hasAnyValue(context, key)).length +
    (context.noteCorpus.length > 0 ? 1 : 0);
  const expectedInputs = draft.relevantKeys.length + 1;
  const confidence = clamp(
    Math.round(
      32 +
        (availableInputs / Math.max(1, expectedInputs)) * 34 +
        Math.min(16, context.panels.length * 5) +
        Math.min(12, context.recordTexts.length * 4),
    ),
    26,
    96,
  );

  const modalityLabel =
    modality === "text-dominant"
      ? "the document-text branch"
      : modality === "lab-dominant"
        ? "structured biomarkers and drift"
        : "both the text and lab branches";

  const summary =
    level === "high"
      ? `${draft.disease} now scores high in this screening view, driven by ${modalityLabel}.`
      : level === "moderate"
        ? `${draft.disease} has partial overlap in the current records, but the pattern is still incomplete.`
        : `${draft.disease} has limited overlap in the current uploads and structured panels.`;

  return {
    id: draft.id,
    family: draft.family,
    disease: draft.disease,
    subtitle: draft.subtitle,
    level,
    modality,
    riskScore,
    confidence,
    summary,
    evidence: draft.evidence.slice(0, 5),
    missingSignals: draft.missingSignals.slice(0, 4),
    nextSteps: draft.nextSteps.slice(0, 3),
    branchScores: {
      lab: rawToScore(draft.labRaw, draft.maxRaw),
      text: rawToScore(draft.textRaw, draft.maxRaw),
      trend: rawToScore(draft.trendRaw, draft.maxRaw),
    },
  };
}

function assessMds(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const hemoglobin = getLatestValue(context, "hemoglobin");
  const wbc = getLatestValue(context, "wbc");
  const platelets = getLatestValue(context, "platelets");
  const mcv = getLatestValue(context, "mcv");
  const rdw = getLatestValue(context, "rdw_cv");

  let cytopenias = 0;
  if (hemoglobin != null) {
    if (hemoglobin < 11) {
      labRaw += 18;
      cytopenias += 1;
      evidence.push(`Hemoglobin is down to ${formatMetricValue("hemoglobin", hemoglobin)}.`);
    } else if (hemoglobin < 12) {
      labRaw += 10;
      cytopenias += 1;
      evidence.push(`Hemoglobin is mildly low at ${formatMetricValue("hemoglobin", hemoglobin)}.`);
    }
  } else {
    missingSignals.push("Recent hemoglobin values are missing.");
  }

  if (wbc != null && wbc < 4000) {
    labRaw += 12;
    cytopenias += 1;
    evidence.push(`White blood cells are suppressed at ${formatMetricValue("wbc", wbc)}.`);
  } else if (wbc == null) {
    missingSignals.push("White blood cell counts are missing.");
  }

  if (platelets != null && platelets < 150000) {
    labRaw += 14;
    cytopenias += 1;
    evidence.push(`Platelets are low at ${formatMetricValue("platelets", platelets)}.`);
  } else if (platelets == null) {
    missingSignals.push("Platelet counts are missing.");
  }

  if (mcv != null && mcv > 100) {
    labRaw += 10;
    evidence.push(`MCV is macrocytic at ${formatMetricValue("mcv", mcv)}.`);
  } else if (mcv == null) {
    missingSignals.push("MCV is not available for marrow-pattern analysis.");
  }

  if (rdw != null && rdw > 14) {
    labRaw += 8;
    evidence.push(`RDW is elevated at ${formatMetricValue("rdw_cv", rdw)}.`);
  } else if (rdw == null) {
    missingSignals.push("RDW is missing, which reduces marrow-pattern confidence.");
  }

  if (cytopenias >= 2) {
    labRaw += 12;
    evidence.push("More than one blood cell line is low at the same time.");
  }

  const hemoglobinTrend = getTrend(context, "hemoglobin");
  const wbcTrend = getTrend(context, "wbc");
  const plateletTrend = getTrend(context, "platelets");

  if (hemoglobinTrend.deltaPct != null && hemoglobinTrend.deltaPct <= -8) {
    trendRaw += 6;
    evidence.push(`Hemoglobin has drifted down ${Math.abs(Math.round(hemoglobinTrend.deltaPct))}% over time.`);
  }
  if (wbcTrend.deltaPct != null && wbcTrend.deltaPct <= -10) {
    trendRaw += 6;
    evidence.push(`White blood cells have drifted down ${Math.abs(Math.round(wbcTrend.deltaPct))}% across panels.`);
  }
  if (plateletTrend.deltaPct != null && plateletTrend.deltaPct <= -10) {
    trendRaw += 6;
    evidence.push(`Platelets have drifted down ${Math.abs(Math.round(plateletTrend.deltaPct))}% across panels.`);
  }

  const noteMatches = collectTextMatches(context.noteCorpus, MDS_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(12, noteMatches.length * 4);
    evidence.push(`Clinical text mentions ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("Symptom text about fatigue, bruising, or infections is sparse.");
  }

  if (context.panels.length < 2) {
    missingSignals.push("At least two CBC panels would improve longitudinal drift detection.");
  }

  return finalizeAssessment(context, {
    id: "mds",
    family: "Hematological & Oncological",
    disease: "Myelodysplastic Syndromes (MDS)",
    subtitle: "Slow marrow dysfunction hidden inside subtle CBC drift.",
    maxRaw: 88,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Review persistent cytopenias and smear findings with hematology.",
      "Compare repeat CBCs rather than a single isolated result.",
    ],
    relevantKeys: ["hemoglobin", "wbc", "platelets", "mcv", "rdw_cv"],
  });
}

function assessMultipleMyeloma(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const proteinGap = getProteinGap(context);
  const globulin = getLatestValue(context, "globulin");
  const agRatio = getLatestValue(context, "ag_ratio");
  const hemoglobin = getLatestValue(context, "hemoglobin");
  const calcium = getLatestValue(context, "calcium");
  const creatinine = getLatestValue(context, "creatinine");

  if (proteinGap != null) {
    if (proteinGap >= 4) {
      labRaw += 24;
      evidence.push(`Protein gap is widened to ${formatNumber(proteinGap)} g/dL.`);
    } else if (proteinGap >= 3.2) {
      labRaw += 12;
      evidence.push(`Protein gap is borderline elevated at ${formatNumber(proteinGap)} g/dL.`);
    }
  } else {
    missingSignals.push("Total protein and albumin are both needed to assess the protein gap.");
  }

  if (globulin != null && globulin > 3.5) {
    labRaw += 12;
    evidence.push(`Globulin is elevated at ${formatMetricValue("globulin", globulin)}.`);
  } else if (globulin == null) {
    missingSignals.push("Globulin is unavailable.");
  }

  if (agRatio != null && agRatio < 1.2) {
    labRaw += 10;
    evidence.push(`A/G ratio is compressed to ${formatMetricValue("ag_ratio", agRatio)}.`);
  } else if (agRatio == null) {
    missingSignals.push("A/G ratio is missing.");
  }

  if (hemoglobin != null && hemoglobin < 12) {
    labRaw += 12;
    evidence.push(`Hemoglobin is low at ${formatMetricValue("hemoglobin", hemoglobin)}.`);
  }

  if (calcium != null && calcium > 10.2) {
    labRaw += 10;
    evidence.push(`Calcium is elevated at ${formatMetricValue("calcium", calcium)}.`);
  } else if (calcium == null) {
    missingSignals.push("Calcium is not available.");
  }

  if (creatinine != null && creatinine > 1.3) {
    labRaw += 8;
    evidence.push(`Creatinine is up to ${formatMetricValue("creatinine", creatinine)}.`);
  }

  const proteinTrend = getTrend(context, "globulin");
  if (proteinTrend.deltaPct != null && proteinTrend.deltaPct >= 10) {
    trendRaw += 8;
    evidence.push(`Globulin has risen ${Math.round(proteinTrend.deltaPct)}% over time.`);
  }

  const noteMatches = collectTextMatches(context.noteCorpus, MYELOMA_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(12, noteMatches.length * 4);
    evidence.push(`Record text references ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("Document text does not clearly mention bone pain or constitutional symptoms.");
  }

  return finalizeAssessment(context, {
    id: "multiple-myeloma",
    family: "Hematological & Oncological",
    disease: "Multiple Myeloma",
    subtitle: "Protein-gap and bone-symptom correlation across records.",
    maxRaw: 84,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Review serum protein studies and repeat CMP/CBC trends with hematology.",
      "Bone pain plus protein abnormalities should be correlated, not reviewed separately.",
    ],
    relevantKeys: ["total_protein", "albumin", "globulin", "ag_ratio", "hemoglobin", "calcium", "creatinine"],
  });
}

function assessSle(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const wbc = getLatestValue(context, "wbc");
  const hemoglobin = getLatestValue(context, "hemoglobin");
  const platelets = getLatestValue(context, "platelets");
  const esr = getLatestValue(context, "esr");
  const creatinine = getLatestValue(context, "creatinine");
  const microalbumin = getLatestValue(context, "microalbumin_urine");

  if (wbc != null && wbc < 4000) {
    labRaw += 10;
    evidence.push(`White blood cells are low at ${formatMetricValue("wbc", wbc)}.`);
  }
  if (hemoglobin != null && hemoglobin < 12) {
    labRaw += 8;
    evidence.push(`Hemoglobin is low at ${formatMetricValue("hemoglobin", hemoglobin)}.`);
  }
  if (platelets != null && platelets < 150000) {
    labRaw += 8;
    evidence.push(`Platelets are low at ${formatMetricValue("platelets", platelets)}.`);
  }
  if (esr != null && esr > 20) {
    labRaw += 10;
    evidence.push(`ESR is elevated at ${formatMetricValue("esr", esr)}.`);
  } else if (esr == null) {
    missingSignals.push("ESR is missing.");
  }
  if (creatinine != null && creatinine > 1.3) {
    labRaw += 8;
    evidence.push(`Creatinine is elevated at ${formatMetricValue("creatinine", creatinine)}.`);
  }
  if (microalbumin != null && microalbumin > 16.7) {
    labRaw += 8;
    evidence.push(`Urine microalbumin is elevated at ${formatMetricValue("microalbumin_urine", microalbumin)}.`);
  } else if (microalbumin == null) {
    missingSignals.push("Urine microalbumin is missing.");
  }

  const noteMatches = collectTextMatches(context.noteCorpus, SLE_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(20, noteMatches.length * 4);
    evidence.push(`Clinical text links ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("Cross-specialty symptom notes are limited.");
  }

  if (noteMatches.length >= 2 && (creatinine != null || microalbumin != null)) {
    trendRaw += 10;
    evidence.push("Multi-organ symptoms and renal markers appear in the same record set.");
  }

  return finalizeAssessment(context, {
    id: "sle",
    family: "Autoimmune & Rheumatic",
    disease: "Systemic Lupus Erythematosus (SLE)",
    subtitle: "Multi-organ symptom clustering across text and subtle labs.",
    maxRaw: 82,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Correlate inflammatory markers, cytopenias, renal labs, and symptom notes with rheumatology.",
      "Repeated low-count or renal signals should be tracked longitudinally, not dismissed as isolated noise.",
    ],
    relevantKeys: ["wbc", "hemoglobin", "platelets", "esr", "creatinine", "microalbumin_urine"],
  });
}

function assessAnca(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const esr = getLatestValue(context, "esr");
  const creatinine = getLatestValue(context, "creatinine");
  const microalbumin = getLatestValue(context, "microalbumin_urine");
  const hemoglobin = getLatestValue(context, "hemoglobin");
  const eosinophils = getLatestValue(context, "eosinophils_percent");

  if (esr != null && esr > 20) {
    labRaw += 12;
    evidence.push(`ESR is elevated at ${formatMetricValue("esr", esr)}.`);
  } else if (esr == null) {
    missingSignals.push("Inflammatory markers such as ESR are missing.");
  }

  if (creatinine != null && creatinine > 1.3) {
    labRaw += 10;
    evidence.push(`Creatinine is elevated at ${formatMetricValue("creatinine", creatinine)}.`);
  }

  if (microalbumin != null && microalbumin > 16.7) {
    labRaw += 10;
    evidence.push(`Urine microalbumin is elevated at ${formatMetricValue("microalbumin_urine", microalbumin)}.`);
  }

  if (hemoglobin != null && hemoglobin < 12) {
    labRaw += 6;
    evidence.push(`Hemoglobin is low at ${formatMetricValue("hemoglobin", hemoglobin)}.`);
  }

  if (eosinophils != null && eosinophils > 6) {
    labRaw += 4;
    evidence.push(`Eosinophils are elevated at ${formatMetricValue("eosinophils_percent", eosinophils)}.`);
  }

  const noteMatches = collectTextMatches(context.noteCorpus, ANCA_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(24, noteMatches.length * 4);
    evidence.push(`Document text mentions ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("The note corpus does not clearly describe vasculitic symptoms.");
  }

  if (
    noteMatches.length >= 2 &&
    ((creatinine != null && creatinine > 1.3) || (microalbumin != null && microalbumin > 16.7))
  ) {
    trendRaw += 12;
    evidence.push("Inflammatory symptoms and kidney involvement appear together.");
  }

  return finalizeAssessment(context, {
    id: "anca-vasculitis",
    family: "Autoimmune & Rheumatic",
    disease: "ANCA-Associated Vasculitis",
    subtitle: "Inflammatory plus renal signals fused with ambiguous symptom text.",
    maxRaw: 84,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Escalate renal plus inflammatory changes to clinician review if symptom text is also concerning.",
      "Rare vasculitis is often a synthesis problem, so keep the chart and labs together during review.",
    ],
    relevantKeys: ["esr", "creatinine", "microalbumin_urine", "hemoglobin", "eosinophils_percent"],
  });
}

function assessHemochromatosis(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const iron = getLatestValue(context, "iron");
  const transferrinSaturation = getLatestValue(context, "transferrin_saturation");
  const sgpt = getLatestValue(context, "sgpt");
  const sgot = getLatestValue(context, "sgot");
  const glucose = getLatestValue(context, "fasting_glucose");
  const a1c = getLatestValue(context, "hemoglobin_a1c");

  if (iron != null) {
    if (iron > 181) {
      labRaw += 18;
      evidence.push(`Iron is elevated at ${formatMetricValue("iron", iron)}.`);
    } else if (iron > 160) {
      labRaw += 10;
      evidence.push(`Iron is borderline high at ${formatMetricValue("iron", iron)}.`);
    }
  } else {
    missingSignals.push("Serum iron is missing.");
  }

  if (transferrinSaturation != null) {
    if (transferrinSaturation > 50) {
      labRaw += 20;
      evidence.push(`Transferrin saturation is high at ${formatMetricValue("transferrin_saturation", transferrinSaturation)}.`);
    } else if (transferrinSaturation > 45) {
      labRaw += 12;
      evidence.push(`Transferrin saturation is borderline high at ${formatMetricValue("transferrin_saturation", transferrinSaturation)}.`);
    }
  } else {
    missingSignals.push("Transferrin saturation is unavailable.");
  }

  if (sgpt != null && sgpt > 50) {
    labRaw += 10;
    evidence.push(`ALT/SGPT is elevated at ${formatMetricValue("sgpt", sgpt)}.`);
  }
  if (sgot != null && sgot > 59) {
    labRaw += 10;
    evidence.push(`AST/SGOT is elevated at ${formatMetricValue("sgot", sgot)}.`);
  }

  if ((glucose != null && glucose >= 100) || (a1c != null && a1c >= 5.7)) {
    labRaw += 6;
    evidence.push("Glucose metabolism is beginning to drift upward.");
  }

  const noteMatches = collectTextMatches(context.noteCorpus, HEMOCHROMATOSIS_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(12, noteMatches.length * 4);
    evidence.push(`Clinical text mentions ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("Joint, fatigue, or liver-symptom text is limited.");
  }

  if ((iron != null && iron > 160) && ((sgpt != null && sgpt > 50) || (sgot != null && sgot > 59))) {
    trendRaw += 10;
    evidence.push("Iron overload and liver-enzyme drift appear together.");
  }

  return finalizeAssessment(context, {
    id: "hemochromatosis",
    family: "Rare Metabolic & Genetic",
    disease: "Hemochromatosis",
    subtitle: "Iron-overload pattern hidden behind mild liver and fatigue clues.",
    maxRaw: 86,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Confirm iron studies rather than reading liver enzymes in isolation.",
      "Trending ferritin and transferrin saturation would strengthen or weaken this signal quickly.",
    ],
    relevantKeys: ["iron", "transferrin_saturation", "sgpt", "sgot", "fasting_glucose", "hemoglobin_a1c"],
  });
}

function assessAhp(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const sodium = getLatestValue(context, "sodium");
  const sgpt = getLatestValue(context, "sgpt");
  const sgot = getLatestValue(context, "sgot");
  const abnormalCount = countAbnormalLatestMarkers(context);

  if (sodium != null) {
    if (sodium < 130) {
      labRaw += 14;
      evidence.push(`Sodium is significantly low at ${formatMetricValue("sodium", sodium)}.`);
    } else if (sodium < 135) {
      labRaw += 10;
      evidence.push(`Sodium is mildly low at ${formatMetricValue("sodium", sodium)}.`);
    }
  } else {
    missingSignals.push("Sodium is unavailable.");
  }

  if ((sgpt != null && sgpt > 50) || (sgot != null && sgot > 59)) {
    labRaw += 6;
    evidence.push("Liver enzymes are mildly abnormal.");
  }

  const noteMatches = collectTextMatches(context.noteCorpus, AHP_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(28, noteMatches.length * 6);
    evidence.push(`Record text contains ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("The chart text does not clearly mention recurrent pain or neurologic spells.");
  }

  if (noteMatches.length >= 2 && abnormalCount <= 3) {
    trendRaw += 8;
    evidence.push("The text burden is stronger than the routine-lab burden, which fits this hidden-pattern phenotype.");
  }

  return finalizeAssessment(context, {
    id: "ahp",
    family: "Rare Metabolic & Genetic",
    disease: "Acute Hepatic Porphyria (AHP)",
    subtitle: "Text-heavy recurrent pain phenotype with often-normal routine labs.",
    maxRaw: 80,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "Repeated unexplained abdominal or neurologic episodes should be escalated even if routine labs look bland.",
      "This is a text-dominant screen and needs clinician confirmation, not independent action.",
    ],
    relevantKeys: ["sodium", "sgpt", "sgot"],
  });
}

function assessAttrCm(context: AnalysisContext): DiseaseRiskAssessment {
  let labRaw = 0;
  let textRaw = 0;
  let trendRaw = 0;
  const evidence: string[] = [];
  const missingSignals: string[] = [];

  const creatinine = getLatestValue(context, "creatinine");
  if (creatinine != null && creatinine > 1.3) {
    labRaw += 4;
    evidence.push(`Creatinine is elevated at ${formatMetricValue("creatinine", creatinine)}.`);
  }

  const noteMatches = collectTextMatches(context.noteCorpus, ATTR_TEXT_SIGNALS);
  if (noteMatches.length > 0) {
    textRaw += Math.min(30, noteMatches.length * 5);
    evidence.push(`Clinical text references ${formatList(noteMatches)}.`);
  } else {
    missingSignals.push("Non-cardiac historical clues like carpal tunnel or spinal stenosis are not documented.");
  }

  const hasFragmentedClue = noteMatches.some((match) =>
    ["carpal tunnel syndrome", "spinal stenosis", "tendon rupture"].includes(match),
  );
  const hasCardiacClue = noteMatches.some((match) =>
    ["heart failure symptoms", "arrhythmia or syncope"].includes(match),
  );

  if (hasFragmentedClue && hasCardiacClue) {
    trendRaw += 12;
    evidence.push("Years-apart non-cardiac clues now overlap with cardiac symptoms.");
  }

  if (context.recordTexts.length === 0) {
    missingSignals.push("Readable PDF text is needed for this text-dominant phenotype.");
  }

  return finalizeAssessment(context, {
    id: "attr-cm",
    family: "Cardiovascular",
    disease: "Transthyretin Amyloid Cardiomyopathy (ATTR-CM)",
    subtitle: "Fragmented clue detection across orthopedic, neurologic, and cardiac text.",
    maxRaw: 70,
    labRaw,
    textRaw,
    trendRaw,
    evidence,
    missingSignals,
    nextSteps: [
      "A cluster of carpal tunnel, spinal stenosis, neuropathy, and heart-failure symptoms should be reviewed together.",
      "This card depends heavily on text clues because routine labs are usually indirect here.",
    ],
    relevantKeys: ["creatinine"],
  });
}

function buildFamilySummaries(assessments: DiseaseRiskAssessment[]): DiseaseFamilySummary[] {
  const grouped = new Map<DiseaseFamily, DiseaseRiskAssessment[]>();

  for (const assessment of assessments) {
    const existing = grouped.get(assessment.family) ?? [];
    existing.push(assessment);
    grouped.set(assessment.family, existing);
  }

  return [...grouped.entries()]
    .map(([family, items]) => {
      const ordered = [...items].sort((a, b) => b.riskScore - a.riskScore);
      const averageScore = Math.round(
        ordered.reduce((sum, item) => sum + item.riskScore, 0) / Math.max(1, ordered.length),
      );

      return {
        family,
        highlightedDisease: ordered[0].disease,
        highestScore: ordered[0].riskScore,
        highestLevel: ordered[0].level,
        averageScore,
      };
    })
    .sort((a, b) => b.highestScore - a.highestScore);
}

export function analyzeDiseaseRiskProfile(args: {
  panels: LabPanelRow[];
  uploads: LabReportUploadRow[];
  recordTexts: MedicalRecordText[];
}): DiseaseRiskProfile {
  const context = buildContext(args);
  const assessments = [
    assessMds(context),
    assessMultipleMyeloma(context),
    assessSle(context),
    assessAnca(context),
    assessHemochromatosis(context),
    assessAhp(context),
    assessAttrCm(context),
  ].sort((a, b) => b.riskScore - a.riskScore);

  return {
    assessments,
    families: buildFamilySummaries(assessments),
    highestRisk: assessments[0] ?? null,
    uploadsCount: context.uploads.length,
    panelCount: context.panels.length,
    textDocumentCount: context.recordTexts.length,
    longitudinalSpanDays: context.longitudinalSpanDays,
  };
}
