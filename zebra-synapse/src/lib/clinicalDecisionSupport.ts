import type { LabPanelRow } from "./labPanels";
import type { BiomarkerTrendMap } from "./labInsights";
import type { PrescriptionRow } from "./prescriptions";

export type ClinicalRiskTier = "low" | "borderline" | "intermediate" | "high" | "critical";

export type ASCVDRiskResult = {
  scorePercent: number;
  tier: ClinicalRiskTier;
  label: string;
  statinRecommendation: {
    intensity: "none" | "moderate" | "high";
    rationale: string;
    targetLdl: string;
  };
  bpTarget: string;
  aspirinIndication: string;
  drivers: string[];
};

export type KDIGOCkdStage = {
  stage: "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";
  eGfr: number;
  description: string;
  severity: "normal" | "mild" | "moderate" | "severe" | "critical";
  clinicalActions: string[];
  doseAdjustments: string[];
};

export type MetabolicAssessment = {
  classification: "euglycemic" | "prediabetes" | "diabetes" | "uncontrolled_diabetes";
  label: string;
  a1cValue: number | null;
  glucoseValue: number | null;
  discordanceFlag: string | null;
  guidelineTarget: string;
  microvascularChecklist: Array<{ item: string; status: "due" | "recommended" | "urgent"; rationale: string }>;
};

export type HepaticAssessment = {
  astAltRatio: number | null;
  pattern: "normal" | "nafld_pattern" | "alcoholic_pattern" | "acute_injury" | "indeterminate";
  label: string;
  summary: string;
  hepatotoxicityAlert: boolean;
};

export type HematologyAssessment = {
  hemoglobin: number | null;
  severity: "normal" | "mild_anemia" | "moderate_anemia" | "severe_anemia";
  label: string;
  differentialWorkup: string[];
};

export type DrugLabInteractionAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  drugName: string;
  drugClass: string;
  triggerBiomarker: string;
  biomarkerValue: string;
  mechanism: string;
  clinicalRecommendation: string;
  guidelineSource: string;
};

export type GDMTGapAlert = {
  id: string;
  condition: string;
  recommendedTherapy: string;
  evidenceBase: string;
  rationale: string;
};

export type ActionableClinicalOrder = {
  id: string;
  category: "lab" | "imaging" | "monitoring" | "consult";
  title: string;
  urgency: "routine" | "soon" | "urgent";
  indication: string;
  icdRationale: string;
};

export type ClinicalDecisionSupportResult = {
  ascvd: ASCVDRiskResult | null;
  ckd: KDIGOCkdStage | null;
  metabolic: MetabolicAssessment;
  hepatic: HepaticAssessment;
  hematology: HematologyAssessment;
  drugAlerts: DrugLabInteractionAlert[];
  gdmtGaps: GDMTGapAlert[];
  actionableOrders: ActionableClinicalOrder[];
  soapSummary: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    fullText: string;
  };
};

/**
 * CKD-EPI 2021 eGFR Calculation (without race variable)
 */
export function calculateCKDEPIeGFR(creatinine: number, age: number, isFemale: boolean): number {
  if (creatinine <= 0 || age <= 0) return 90;
  const k = isFemale ? 0.7 : 0.9;
  const a = isFemale ? -0.241 : -0.302;
  const femaleFactor = isFemale ? 1.012 : 1.0;
  const crRatio = creatinine / k;
  const minPart = Math.min(crRatio, 1) ** a;
  const maxPart = Math.max(crRatio, 1) ** -1.2;
  const ageFactor = 0.9938 ** age;
  const egfr = 142 * minPart * maxPart * ageFactor * femaleFactor;
  return Math.round(egfr * 10) / 10;
}

/**
 * 10-Year ASCVD Risk Score Estimator (ACC/AHA Pooled Cohort Equations model)
 */
export function calculateASCVDRisk(params: {
  age: number;
  gender: string;
  systolicBp: number;
  totalCholesterol: number | null;
  hdl: number | null;
  isSmoker?: boolean;
  hasDiabetes?: boolean;
  onBpMedication?: boolean;
}): ASCVDRiskResult {
  const age = Math.max(20, Math.min(79, params.age || 45));
  const isFemale = (params.gender || "").toLowerCase().startsWith("f");
  const sbp = Math.max(90, Math.min(200, params.systolicBp || 120));
  const tc = Math.max(130, Math.min(320, params.totalCholesterol || 190));
  const hdl = Math.max(20, Math.min(100, params.hdl || 50));
  const hasDiabetes = !!params.hasDiabetes;

  // Standardized Pooled Cohort natural logarithm regression approximation
  let score = 0;
  if (isFemale) {
    score =
      -29.799 +
      4.884 * Math.log(age) +
      13.54 * Math.log(tc) -
      3.114 * Math.log(age) * Math.log(tc) -
      13.578 * Math.log(hdl) +
      3.149 * Math.log(age) * Math.log(hdl) +
      2.019 * Math.log(sbp) +
      (hasDiabetes ? 0.661 : 0);
  } else {
    score =
      12.344 * Math.log(age) +
      11.853 * Math.log(tc) -
      2.664 * Math.log(age) * Math.log(tc) -
      7.99 * Math.log(hdl) +
      1.769 * Math.log(age) * Math.log(hdl) +
      1.797 * Math.log(sbp) +
      (hasDiabetes ? 0.658 : 0) -
      29.18;
  }

  // Convert log-odds baseline to percentage
  let riskPercent = Math.round(Math.max(1, Math.min(65, Math.exp(score) / (1 + Math.exp(score)) * 100)) * 10) / 10;
  if (isNaN(riskPercent)) {
    // Fallback baseline estimation
    riskPercent = age >= 60 ? 14.5 : age >= 50 ? 8.2 : 3.5;
    if (sbp >= 140) riskPercent += 4.5;
    if (tc >= 220) riskPercent += 3.0;
    if (hasDiabetes) riskPercent += 5.0;
  }

  let tier: ClinicalRiskTier = "low";
  let label = "Low Risk (<5.0%)";
  let statinRecommendation: ASCVDRiskResult["statinRecommendation"] = {
    intensity: "none",
    rationale: "Lifestyle optimization; routine 5-year ASCVD re-evaluation.",
    targetLdl: "< 100 mg/dL",
  };

  if (riskPercent >= 20.0 || (params.totalCholesterol && params.totalCholesterol >= 280)) {
    tier = "high";
    label = `High Risk (${riskPercent}%) - ACC/AHA Primary Target`;
    statinRecommendation = {
      intensity: "high",
      rationale: "High-intensity statin therapy indicated (Atorvastatin 40-80mg or Rosuvastatin 20-40mg) aiming for ≥50% LDL-C reduction.",
      targetLdl: "< 70 mg/dL (or < 55 mg/dL with extreme risk)",
    };
  } else if (riskPercent >= 7.5 || hasDiabetes) {
    tier = "intermediate";
    label = `Intermediate Risk (${riskPercent}%)`;
    statinRecommendation = {
      intensity: "moderate",
      rationale: "Moderate-intensity statin therapy recommended (Atorvastatin 10-20mg or Rosuvastatin 5-10mg) to reduce major adverse cardiovascular events.",
      targetLdl: "< 100 mg/dL",
    };
  } else if (riskPercent >= 5.0) {
    tier = "borderline";
    label = `Borderline Risk (${riskPercent}%)`;
    statinRecommendation = {
      intensity: "moderate",
      rationale: "Consider moderate-intensity statin if risk-enhancing factors present (elevated hs-CRP, metabolic syndrome, or family history of premature CAD).",
      targetLdl: "< 100 mg/dL",
    };
  }

  const drivers: string[] = [];
  if (sbp >= 130) drivers.push(`Elevated SBP (${sbp} mmHg)`);
  if (params.totalCholesterol && params.totalCholesterol >= 200) drivers.push(`Elevated TC (${params.totalCholesterol} mg/dL)`);
  if (params.hdl && params.hdl < 40) drivers.push(`Low HDL protective factor (${params.hdl} mg/dL)`);
  if (hasDiabetes) drivers.push("Established Diabetes Mellitus");
  if (age >= 60) drivers.push(`Age-related vascular stiffness (${age} yrs)`);

  return {
    scorePercent: riskPercent,
    tier,
    label,
    statinRecommendation,
    bpTarget: "< 130/80 mmHg (ACC/AHA Guideline)",
    aspirinIndication: riskPercent >= 15 && age >= 50 && age <= 70 ? "Consider low-dose aspirin 81mg if low bleeding risk" : "Aspirin primary prevention not routinely indicated without established ASCVD",
    drivers: drivers.length > 0 ? drivers : ["Optimal baseline parameters"],
  };
}

/**
 * KDIGO CKD Staging from Creatinine and eGFR
 */
export function evaluateKDIGOCkd(params: {
  creatinine: number | null;
  age: number;
  gender: string;
}): KDIGOCkdStage | null {
  if (params.creatinine == null) return null;
  const isFemale = (params.gender || "").toLowerCase().startsWith("f");
  const egfr = calculateCKDEPIeGFR(params.creatinine, params.age || 45, isFemale);

  if (egfr >= 90) {
    return {
      stage: "G1",
      eGfr: egfr,
      description: "Stage G1: Normal or High Renal Clearance",
      severity: "normal",
      clinicalActions: [
        "Maintain routine annual renal surveillance if hypertension or diabetes present.",
        "Check urine albumin-to-creatinine ratio (uACR) annually for occult glomerular leak.",
      ],
      doseAdjustments: ["Standard drug dosing; no renal dose adjustments required."],
    };
  }
  if (egfr >= 60) {
    return {
      stage: "G2",
      eGfr: egfr,
      description: "Stage G2: Mildly Decreased GFR",
      severity: "mild",
      clinicalActions: [
        "Monitor blood pressure with target < 130/80 mmHg.",
        "Screen for proteinuria with spot uACR.",
        "Evaluate nephrotoxic exposure (avoid chronic NSAIDs, adjust IV contrast protocols).",
      ],
      doseAdjustments: ["Standard dosing for most agents; monitor renal profile when starting ACEi/ARB."],
    };
  }
  if (egfr >= 45) {
    return {
      stage: "G3a",
      eGfr: egfr,
      description: "Stage G3a: Mild-to-Moderately Decreased GFR",
      severity: "moderate",
      clinicalActions: [
        "KDIGO recommendation: Monitor eGFR and electrolytes every 6 months.",
        "Consider cardiorenal protection (SGLT2 inhibitor or ACEi/ARB indicated).",
        "Dietary sodium restriction (< 2g/day) and adequate hydration.",
      ],
      doseAdjustments: [
        "Metformin: Max dose 1000mg/day with 3-6 month renal checks.",
        "Dose titration review for renally excreted antibiotics and NOACs.",
      ],
    };
  }
  if (egfr >= 30) {
    return {
      stage: "G3b",
      eGfr: egfr,
      description: "Stage G3b: Moderately-to-Severely Decreased GFR",
      severity: "severe",
      clinicalActions: [
        "Active CKD management: Nephrology consultation recommended.",
        "Screen for CKD complications: Anemia of CKD, bone-mineral disorder (PTH, Vitamin D, Phosphate).",
        "Aggressive BP and glycemic control with strict potassium monitoring.",
      ],
      doseAdjustments: [
        "Metformin: Extreme caution; reduce to 500mg or discontinue if unstable.",
        "Mandatory dose reductions for DOACs, Gabapentin/Pregabalin, and Allopurinol.",
      ],
    };
  }
  if (egfr >= 15) {
    return {
      stage: "G4",
      eGfr: egfr,
      description: "Stage G4: Severely Decreased GFR (Pre-ESRD)",
      severity: "critical",
      clinicalActions: [
        "Urgent Nephrology referral for vascular access planning and RRT education.",
        "Strict hyperkalemia and acidosis management (Sodium Bicarbonate, Potassium binders).",
      ],
      doseAdjustments: [
        "Metformin: Strictly CONTRAINDICATED (Lactic Acidosis black-box risk).",
        "Avoid all NSAIDs and potassium-sparing diuretics.",
      ],
    };
  }
  return {
    stage: "G5",
    eGfr: egfr,
    description: "Stage G5: Kidney Failure / End-Stage Renal Disease (ESRD)",
    severity: "critical",
    clinicalActions: [
      "Immediate renal replacement therapy (RRT) / Hemodialysis / Transplant evaluation.",
    ],
    doseAdjustments: ["Renal specialist dosing protocols mandatory."],
  };
}

/**
 * ADA 2024 Metabolic Staging & Microvascular Surveillance Assessment
 */
export function evaluateMetabolicStatus(params: {
  fastingGlucose: number | null;
  hba1c: number | null;
}): MetabolicAssessment {
  const glu = params.fastingGlucose;
  const a1c = params.hba1c;

  let classification: MetabolicAssessment["classification"] = "euglycemic";
  let label = "Normoglycemic / Controlled";
  let guidelineTarget = "Fasting Glucose 70-99 mg/dL | HbA1c < 5.7%";

  if ((a1c != null && a1c >= 8.0) || (glu != null && glu >= 180)) {
    classification = "uncontrolled_diabetes";
    label = "Uncontrolled Diabetes Mellitus (ADA High Risk)";
    guidelineTarget = "ADA Target: HbA1c < 7.0% (Post-meal < 180 mg/dL, Fasting 80-130 mg/dL)";
  } else if ((a1c != null && a1c >= 6.5) || (glu != null && glu >= 126)) {
    classification = "diabetes";
    label = "Type 2 Diabetes Mellitus Glycemic Range";
    guidelineTarget = "ADA Target: HbA1c < 7.0% to prevent microvascular end-organ damage";
  } else if ((a1c != null && a1c >= 5.7) || (glu != null && glu >= 100)) {
    classification = "prediabetes";
    label = "Impaired Fasting Glucose / Prediabetes Pattern";
    guidelineTarget = "Target: Normalize fasting glucose < 100 mg/dL and HbA1c < 5.7% (Diabetes Prevention Program Protocol)";
  }

  let discordanceFlag: string | null = null;
  if (glu != null && a1c != null) {
    if (glu < 100 && a1c >= 6.0) {
      discordanceFlag = "Discordance Alert: Normal fasting glucose with elevated HbA1c suggests significant postprandial glycemic excursions or hemoglobinopathy.";
    } else if (glu >= 130 && a1c < 5.7) {
      discordanceFlag = "Discordance Alert: Acute fasting hyperglycemia with normal HbA1c suggests transient stress-hyperglycemia or recent acute onset.";
    }
  }

  const microvascularChecklist: MetabolicAssessment["microvascularChecklist"] = [];
  if (classification === "diabetes" || classification === "uncontrolled_diabetes") {
    microvascularChecklist.push({
      item: "Spot Urine Albumin-to-Creatinine Ratio (uACR)",
      status: "urgent",
      rationale: "Screen for early diabetic nephropathy and initiate ACEi/ARB/SGLT2i if uACR > 30 mg/g.",
    });
    microvascularChecklist.push({
      item: "Annual Dilated Retinal Eye Examination",
      status: "recommended",
      rationale: "Early detection of proliferative or non-proliferative diabetic retinopathy.",
    });
    microvascularChecklist.push({
      item: "Comprehensive 10g Semmes-Weinstein Foot Exam",
      status: "recommended",
      rationale: "Assess peripheral sensory neuropathy and peripheral arterial pulse palpation.",
    });
  } else if (classification === "prediabetes") {
    microvascularChecklist.push({
      item: "Repeat HbA1c in 6 Months",
      status: "recommended",
      rationale: "Assess glycemic trajectory and progression toward clinical diabetes.",
    });
  }

  return {
    classification,
    label,
    a1cValue: a1c,
    glucoseValue: glu,
    discordanceFlag,
    guidelineTarget,
    microvascularChecklist,
  };
}

/**
 * Hepatic Transaminase Pattern Analysis & De Ritis Ratio
 */
export function evaluateHepaticProfile(params: {
  ast: number | null;
  alt: number | null;
  bilirubin: number | null;
  albumin: number | null;
}): HepaticAssessment {
  const ast = params.ast;
  const alt = params.alt;
  const bili = params.bilirubin;

  let astAltRatio: number | null = null;
  if (ast != null && alt != null && alt > 0) {
    astAltRatio = Math.round((ast / alt) * 100) / 100;
  }

  let pattern: HepaticAssessment["pattern"] = "normal";
  let label = "Normal Hepatic Profile";
  let summary = "Transaminases and synthetic liver function markers are within expected physiological limits.";
  let hepatotoxicityAlert = false;

  const isAltElevated = alt != null && alt > 35;
  const isAstElevated = ast != null && ast > 35;
  const isBiliElevated = bili != null && bili > 1.2;

  if (alt != null && alt > 105) {
    hepatotoxicityAlert = true;
  }

  if (isAltElevated || isAstElevated || isBiliElevated) {
    if (astAltRatio != null && astAltRatio > 2.0 && isAstElevated) {
      pattern = "alcoholic_pattern";
      label = "De Ritis Ratio > 2.0 (AST Dominant)";
      summary = "AST significantly exceeds ALT. Characteristic of toxic/alcoholic hepatic injury or advanced fibrotic remodeling.";
    } else if (astAltRatio != null && astAltRatio < 1.0 && isAltElevated) {
      pattern = "nafld_pattern";
      label = "ALT-Dominant Pattern (De Ritis < 1.0)";
      summary = "ALT elevation exceeds AST. Highly suggestive of Metabolic Dysfunction-Associated Steatotic Liver Disease (MASLD / NAFLD).";
    } else {
      pattern = "indeterminate";
      label = "Mild Transaminase Derangement";
      summary = "Transaminases or bilirubin slightly elevated. Recommend monitoring alongside medications and metabolic panel.";
    }
  }

  return {
    astAltRatio,
    pattern,
    label,
    summary,
    hepatotoxicityAlert,
  };
}

/**
 * Hematology & Anemia Morphology Differential
 */
export function evaluateHematologyProfile(params: {
  hemoglobin: number | null;
  gender: string;
  platelets: number | null;
  wbc: number | null;
}): HematologyAssessment {
  const hb = params.hemoglobin;
  const isFemale = (params.gender || "").toLowerCase().startsWith("f");
  const lowerLimit = isFemale ? 12.0 : 13.0;

  if (hb == null) {
    return {
      hemoglobin: null,
      severity: "normal",
      label: "Hemoglobin Not Evaluated",
      differentialWorkup: [],
    };
  }

  if (hb >= lowerLimit) {
    return {
      hemoglobin: hb,
      severity: "normal",
      label: `Normal Hemoglobin (${hb} g/dL)`,
      differentialWorkup: [],
    };
  }

  let severity: HematologyAssessment["severity"] = "mild_anemia";
  let label = `Mild Anemia (${hb} g/dL)`;
  if (hb < 8.0) {
    severity = "severe_anemia";
    label = `Severe Anemia (${hb} g/dL) - Urgent Clinical Review`;
  } else if (hb < 10.5) {
    severity = "moderate_anemia";
    label = `Moderate Anemia (${hb} g/dL)`;
  }

  const differentialWorkup: string[] = [
    "Order Serum Iron, Total Iron Binding Capacity (TIBC), and Ferritin to evaluate Iron Deficiency Anemia.",
    "Order Reticulocyte Count & Peripheral Blood Smear to differentiate hypoproliferative vs hemolytic etiology.",
    "Consider Fecal Immunochemical Test (FIT) or endoscopy if occult GI blood loss suspected.",
    "Review renal function for diminished erythropoietin production (Anemia of CKD).",
  ];

  return {
    hemoglobin: hb,
    severity,
    label,
    differentialWorkup,
  };
}

/**
 * Scan Active Medications for Drug-Lab Contraindications & Safety Alerts
 */
export function scanPharmacotherapySafety(params: {
  prescriptions: PrescriptionRow[];
  panel: LabPanelRow | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  heartRate: number | null;
  glucose: number | null;
  age: number;
  gender: string;
}): { alerts: DrugLabInteractionAlert[]; gdmtGaps: GDMTGapAlert[] } {
  const alerts: DrugLabInteractionAlert[] = [];
  const gdmtGaps: GDMTGapAlert[] = [];
  const activeRx = params.prescriptions.filter((r) => r.status === "active");

  const rxText = activeRx.map((r) => r.details.toLowerCase()).join(" ");

  const hasMetformin = rxText.includes("metformin");
  const hasStatin = rxText.includes("statin") || rxText.includes("atorvastatin") || rxText.includes("rosuvastatin") || rxText.includes("simvastatin");
  const hasAceOrArb = rxText.includes("pril") || rxText.includes("sartan") || rxText.includes("lisinopril") || rxText.includes("losartan") || rxText.includes("telmisartan") || rxText.includes("valsartan");
  const hasBetaBlocker = rxText.includes("lol") || rxText.includes("metoprolol") || rxText.includes("atenolol") || rxText.includes("carvedilol") || rxText.includes("bisoprolol");
  const hasNsaid = rxText.includes("ibuprofen") || rxText.includes("naproxen") || rxText.includes("diclofenac") || rxText.includes("celecoxib") || rxText.includes("meloxicam");

  const creatinine = params.panel?.creatinine ?? params.panel?.biomarkers?.creatinine ?? null;
  const isFemale = (params.gender || "").toLowerCase().startsWith("f");
  const egfr = creatinine != null ? calculateCKDEPIeGFR(creatinine, params.age || 45, isFemale) : null;
  const alt = params.panel?.biomarkers?.sgpt ?? null;
  const ast = params.panel?.biomarkers?.sgot ?? null;
  const ldl = params.panel?.ldl ?? params.panel?.biomarkers?.ldl ?? null;
  const sbp = params.systolicBp;
  const hr = params.heartRate;

  // 1. Metformin + Renal Clearance
  if (hasMetformin && egfr != null) {
    if (egfr < 30) {
      alerts.push({
        id: "alert-metformin-contraindicated",
        severity: "critical",
        drugName: "Metformin",
        drugClass: "Biguanide Antidiabetic",
        triggerBiomarker: "eGFR",
        biomarkerValue: `${egfr} mL/min/1.73m² (CKD G4/G5)`,
        mechanism: "Severe reduction in renal clearance markedly elevates systemic metformin accumulation, increasing risk of fatal Lactic Acidosis.",
        clinicalRecommendation: "Discontinue Metformin immediately. Transition to insulin or renal-safe DPP-4i (Linagliptin) / GLP-1 RA as appropriate.",
        guidelineSource: "FDA Black Box Warning / ADA Standards of Care 2024",
      });
    } else if (egfr < 45) {
      alerts.push({
        id: "alert-metformin-dose-reduction",
        severity: "warning",
        drugName: "Metformin",
        drugClass: "Biguanide Antidiabetic",
        triggerBiomarker: "eGFR",
        biomarkerValue: `${egfr} mL/min/1.73m² (CKD G3b)`,
        mechanism: "Moderate renal impairment decreases excretion velocity.",
        clinicalRecommendation: "Limit maximum dose to 1000 mg/day (500mg BID). Monitor eGFR every 3 months.",
        guidelineSource: "KDIGO 2024 / ADA 2024 Clinical Guidelines",
      });
    }
  }

  // 2. Statin + Transaminitis
  if (hasStatin && (alt != null || ast != null)) {
    const maxTransaminase = Math.max(alt ?? 0, ast ?? 0);
    if (maxTransaminase > 105) { // >3x ULN
      alerts.push({
        id: "alert-statin-hepatotoxicity",
        severity: "warning",
        drugName: "Statin Therapy",
        drugClass: "HMG-CoA Reductase Inhibitor",
        triggerBiomarker: "Serum ALT/AST",
        biomarkerValue: `ALT ${alt ?? "—"} U/L, AST ${ast ?? "—"} U/L (>3x ULN)`,
        mechanism: "Significant transaminitis can indicate statin-induced hepatocellular irritation or myositis.",
        clinicalRecommendation: "Hold or reduce statin dose. Check Creatine Kinase (CK) to rule out rhabdomyolysis and recheck LFTs in 4-6 weeks.",
        guidelineSource: "NLA Statin Safety Task Force",
      });
    }
  }

  // 3. Beta Blocker + Hemodynamic Bradycardia
  if (hasBetaBlocker && hr != null && hr < 55) {
    alerts.push({
      id: "alert-beta-blocker-bradycardia",
      severity: "warning",
      drugName: "Beta Blocker",
      drugClass: "Cardioselective Beta-1 Antagonist",
      triggerBiomarker: "Heart Rate",
      biomarkerValue: `${hr} bpm (Sinus Bradycardia)`,
      mechanism: "Negative chronotropic and inotropic effects may precipitate symptomatic hypoperfusion or AV conduction blocks.",
      clinicalRecommendation: "Assess for orthostatic dizziness/syncope. Perform 12-lead ECG and consider downward titration.",
      guidelineSource: "ACC/AHA/HRS Bradycardia Management Guideline",
    });
  }

  // 4. ACEi / ARB + Renal Function Monitoring
  if (hasAceOrArb && creatinine != null && creatinine >= 1.5) {
    alerts.push({
      id: "alert-acei-renal-perfusion",
      severity: "warning",
      drugName: "ACE Inhibitor / ARB",
      drugClass: "Renin-Angiotensin System Blocker",
      triggerBiomarker: "Serum Creatinine",
      biomarkerValue: `${creatinine} mg/dL`,
      mechanism: "Efferent arteriolar vasodilation can cause a functional drop in intraglomerular pressure, precipitating acute kidney injury.",
      clinicalRecommendation: "Check Serum Potassium (hyperkalemia risk) and repeat creatinine in 2 weeks. Ensure serum creatinine has not risen >30% from baseline.",
      guidelineSource: "KDIGO Blood Pressure & CKD Practice Guideline",
    });
  }

  // 5. NSAID + Hypertension / CKD
  if (hasNsaid && ((sbp != null && sbp >= 130) || (egfr != null && egfr < 60))) {
    alerts.push({
      id: "alert-nsaid-renal-vasoconstriction",
      severity: "warning",
      drugName: "NSAID",
      drugClass: "Non-Steroidal Anti-Inflammatory",
      triggerBiomarker: "Blood Pressure & Renal Clearance",
      biomarkerValue: `BP ${sbp ?? "—"} mmHg, eGFR ${egfr ?? "—"}`,
      mechanism: "Inhibition of renal prostaglandins causes afferent arteriolar constriction, sodium retention, and blunt antihypertensive efficacy.",
      clinicalRecommendation: "Deprescribe chronic NSAIDs. Switch to Acetaminophen or topical analgesics to protect nephrons and optimize BP control.",
      guidelineSource: "AHA Scientific Statement on Drug-Induced Hypertension",
    });
  }

  // GDMT Gaps:
  // Gap 1: Elevated LDL / High Risk not on Statin
  if (!hasStatin && ldl != null && ldl >= 160) {
    gdmtGaps.push({
      id: "gap-statin-indicated",
      condition: "Severe Hypercholesterolemia / ASCVD Risk",
      recommendedTherapy: "Initiate Moderate-to-High Intensity Statin (Atorvastatin 20-40mg)",
      evidenceBase: "Class I, Level of Evidence A (ACC/AHA Multi-Society Cholesterol Guideline)",
      rationale: `Patient's LDL is ${ldl} mg/dL without active lipid-lowering pharmacotherapy. Statin therapy provides robust plaque stabilization and event reduction.`,
    });
  }

  // Gap 2: Diabetes + Hypertension not on ACEi/ARB
  const hasDiabetes = (params.glucose != null && params.glucose >= 126) || (params.panel?.hemoglobin_a1c != null && params.panel.hemoglobin_a1c >= 6.5);
  const hasHypertension = (sbp != null && sbp >= 130);
  if (hasDiabetes && hasHypertension && !hasAceOrArb) {
    gdmtGaps.push({
      id: "gap-acei-renal-protection",
      condition: "Hypertension with Diabetes Mellitus",
      recommendedTherapy: "Initiate Renin-Angiotensin System Blocker (ACEi or ARB: e.g. Lisinopril 10mg or Telmisartan 40mg)",
      evidenceBase: "Class I, Level of Evidence A (ADA & KDIGO 2024 Guidelines)",
      rationale: "First-line antihypertensive in diabetic patients to reduce intraglomerular hypertension and delay diabetic kidney disease progression.",
    });
  }

  return { alerts, gdmtGaps };
}

/**
 * Generate Actionable Diagnostic Orders based on CDS findings
 */
export function generateActionableOrders(params: {
  ascvd: ASCVDRiskResult | null;
  ckd: KDIGOCkdStage | null;
  metabolic: MetabolicAssessment;
  hepatic: HepaticAssessment;
  hematology: HematologyAssessment;
  systolicBp: number | null;
  diastolicBp: number | null;
}): ActionableClinicalOrder[] {
  const orders: ActionableClinicalOrder[] = [];

  // Cardiorenal / Urine Albumin
  if (params.metabolic.classification === "diabetes" || (params.ckd && params.ckd.stage !== "G1")) {
    orders.push({
      id: "order-uacr",
      category: "lab",
      title: "Spot Urine Albumin-to-Creatinine Ratio (uACR)",
      urgency: "urgent",
      indication: "Screen for early diabetic nephropathy and quantify microalbuminuria.",
      icdRationale: "ICD-10 Z13.89 (Encounter for screening for endocrine/nutritional/metabolic disorders)",
    });
  }

  // Blood Pressure / ABPM
  if (params.systolicBp != null && (params.systolicBp >= 135 || (params.diastolicBp != null && params.diastolicBp >= 85))) {
    orders.push({
      id: "order-abpm",
      category: "monitoring",
      title: "24-Hour Ambulatory Blood Pressure Monitoring (ABPM)",
      urgency: "soon",
      indication: "Rule out white-coat hypertension, assess nocturnal dipping status, and confirm sustained hypertension.",
      icdRationale: "ACC/AHA Guideline Gold-Standard Diagnostic Protocol",
    });
  }

  // Lipid / Apolipoprotein Follow-up
  if (params.ascvd && params.ascvd.tier !== "low") {
    orders.push({
      id: "order-lipid-panel",
      category: "lab",
      title: "Comprehensive Fasting Lipid Profile + Apolipoprotein B",
      urgency: "soon",
      indication: "Establish baseline atherogenic particle burden prior to / monitoring statin therapy.",
      icdRationale: "AHA/ACC 2018 Cholesterol Guideline Target Monitoring",
    });
  }

  // Anemia Workup
  if (params.hematology.severity !== "normal") {
    orders.push({
      id: "order-iron-panel",
      category: "lab",
      title: "Serum Iron, Ferritin, TIBC & Reticulocyte Count",
      urgency: "soon",
      indication: `Differentiate microcytic/normocytic anemia (Hemoglobin: ${params.hematology.hemoglobin} g/dL).`,
      icdRationale: "ICD-10 D50.9 (Iron deficiency anemia, unspecified)",
    });
  }

  // Hepatic Ultrasound
  if (params.hepatic.pattern === "nafld_pattern" || params.hepatic.pattern === "alcoholic_pattern") {
    orders.push({
      id: "order-liver-us",
      category: "imaging",
      title: "Hepatic Ultrasound / Transient Elastography (FibroScan)",
      urgency: "routine",
      indication: "Evaluate degree of hepatic parenchymal echogenicity, steatosis grade, and liver stiffness score.",
      icdRationale: "AASLD Practice Guidance on MASLD",
    });
  }

  // Routine Comprehensive Panel
  if (orders.length === 0) {
    orders.push({
      id: "order-routine-cmp",
      category: "lab",
      title: "Comprehensive Metabolic Panel (CMP) + Lipid Panel",
      urgency: "routine",
      indication: "Annual preventive cardiometabolic health surveillance.",
      icdRationale: "USPSTF Preventive Care Recommendations",
    });
  }

  return orders;
}

/**
 * Generate Structured SOAP / SBAR Note for EHR insertion
 */
export function generateSOAPClinicalSummary(params: {
  patientName: string;
  age: number;
  gender: string;
  vitals: { systolicBp: number | null; diastolicBp: number | null; heartRate: number | null; glucose: number | null; bmi: number | null };
  ascvd: ASCVDRiskResult | null;
  ckd: KDIGOCkdStage | null;
  metabolic: MetabolicAssessment;
  hepatic: HepaticAssessment;
  hematology: HematologyAssessment;
  drugAlerts: DrugLabInteractionAlert[];
  gdmtGaps: GDMTGapAlert[];
  actionableOrders: ActionableClinicalOrder[];
}): { subjective: string; objective: string; assessment: string; plan: string; fullText: string } {
  const name = params.patientName || "Patient";
  const genderStr = params.gender || "Unspecified gender";
  const ageStr = params.age ? `${params.age}yo` : "Age unspecified";

  const subjective = `PATIENT: ${name} (${ageStr}, ${genderStr}). Routine clinical surveillance encounter. Review of linked biometric signals, longitudinal lab markers, and active pharmacotherapy regimen.`;

  const bpStr = params.vitals.systolicBp && params.vitals.diastolicBp ? `${params.vitals.systolicBp}/${params.vitals.diastolicBp} mmHg` : "Not recorded";
  const hrStr = params.vitals.heartRate ? `${params.vitals.heartRate} bpm` : "Not recorded";
  const bmiStr = params.vitals.bmi ? `${params.vitals.bmi} kg/m²` : "Not recorded";
  const gluStr = params.vitals.glucose ? `${params.vitals.glucose} mg/dL` : "Not recorded";

  const objective = `VITALS & BIOMETRICS:
- Blood Pressure: ${bpStr}
- Heart Rate: ${hrStr}
- BMI: ${bmiStr}
- Point-of-Care Glucose: ${gluStr}

LABORATORY & FUNCTIONAL INDICES:
- Glycemic Profile: Fasting Glucose ${params.metabolic.glucoseValue ?? "—"} mg/dL | HbA1c ${params.metabolic.a1cValue ?? "—"}%
- Renal Clearance: eGFR ${params.ckd?.eGfr ?? "—"} mL/min/1.73m² (${params.ckd?.stage ?? "Stage Unspecified"})
- Cardiovascular: 10-Yr ASCVD Risk ~ ${params.ascvd?.scorePercent ?? "—"}% (${params.ascvd?.tier.toUpperCase() ?? "N/A"})
- Hepatic Profile: ${params.hepatic.label} (De Ritis AST/ALT: ${params.hepatic.astAltRatio ?? "—"})
- Hematology: ${params.hematology.label}`;

  const assessmentLines: string[] = [];
  assessmentLines.push(`1. Cardiometabolic Risk: ${params.ascvd?.label ?? "Stable baseline"}. Primary drivers: ${params.ascvd?.drivers.join(", ") ?? "None"}.`);
  assessmentLines.push(`2. Glycemic Status: ${params.metabolic.label}. ${params.metabolic.guidelineTarget}.`);
  if (params.ckd) {
    assessmentLines.push(`3. Renal Status: ${params.ckd.description}.`);
  }
  if (params.drugAlerts.length > 0) {
    assessmentLines.push(`4. Pharmacotherapy Safety Alerts (${params.drugAlerts.length}): ${params.drugAlerts.map((a) => `${a.drugName} - ${a.mechanism}`).join("; ")}.`);
  }
  if (params.gdmtGaps.length > 0) {
    assessmentLines.push(`5. Guideline-Directed Medical Therapy (GDMT) Opportunities: ${params.gdmtGaps.map((g) => g.recommendedTherapy).join("; ")}.`);
  }
  const assessment = assessmentLines.join("\n");

  const planLines: string[] = [];
  planLines.push("DIAGNOSTIC WORKUP & ORDERS:");
  params.actionableOrders.forEach((o, i) => {
    planLines.push(`  ${i + 1}. [${o.urgency.toUpperCase()}] ${o.title} — Indication: ${o.indication}`);
  });
  planLines.push("\nTHERAPEUTIC & PHARMACOTHERAPY PLAN:");
  if (params.ascvd?.statinRecommendation.intensity !== "none") {
    planLines.push(`  - Lipid Management: ${params.ascvd?.statinRecommendation.rationale} (Target LDL: ${params.ascvd?.statinRecommendation.targetLdl})`);
  }
  if (params.ckd && params.ckd.doseAdjustments.length > 0) {
    planLines.push(`  - Renal Dosing: ${params.ckd.doseAdjustments.join("; ")}`);
  }
  planLines.push(`  - Blood Pressure Goal: ${params.ascvd?.bpTarget ?? "< 130/80 mmHg"}`);
  planLines.push("  - Follow-up: Clinical re-evaluation and repeat diagnostic panel scheduled in 8-12 weeks.");

  const plan = planLines.join("\n");

  const fullText = `=== CLINICAL DECISION SUPPORT SOAP SUMMARY ===
Date: ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}

SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}

ASSESSMENT:
${assessment}

PLAN:
${plan}
==============================================`;

  return {
    subjective,
    objective,
    assessment,
    plan,
    fullText,
  };
}

/**
 * Master Clinical Decision Support Evaluation Engine
 */
export function runClinicalDecisionSupport(params: {
  patient: {
    fullName: string | null;
    age: number | null;
    gender: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
  };
  vitals: {
    systolicBp: number | null;
    diastolicBp: number | null;
    heartRate: number | null;
    glucose: number | null;
    bmi: number | null;
  };
  panel: LabPanelRow | null;
  trends?: BiomarkerTrendMap;
  prescriptions: PrescriptionRow[];
}): ClinicalDecisionSupportResult {
  const age = params.patient.age || 45;
  const gender = params.patient.gender || "unknown";

  const totalCholesterol = params.panel?.total_cholesterol ?? params.panel?.biomarkers?.total_cholesterol ?? null;
  const hdl = params.panel?.hdl ?? params.panel?.biomarkers?.hdl ?? null;
  const fastingGlucose = params.vitals.glucose ?? params.panel?.fasting_glucose ?? params.panel?.biomarkers?.fasting_glucose ?? null;
  const hba1c = params.panel?.hemoglobin_a1c ?? params.panel?.biomarkers?.hemoglobin_a1c ?? null;
  const creatinine = params.panel?.creatinine ?? params.panel?.biomarkers?.creatinine ?? null;
  const ast = params.panel?.biomarkers?.sgot ?? null;
  const alt = params.panel?.biomarkers?.sgpt ?? null;
  const bilirubin = params.panel?.biomarkers?.total_bilirubin ?? null;
  const albumin = params.panel?.biomarkers?.albumin ?? null;
  const hemoglobin = params.panel?.hemoglobin ?? params.panel?.biomarkers?.hemoglobin ?? null;
  const platelets = params.panel?.platelets ?? params.panel?.biomarkers?.platelets ?? null;
  const wbc = params.panel?.wbc ?? params.panel?.biomarkers?.wbc ?? null;

  // 1. ASCVD Risk
  const ascvd = calculateASCVDRisk({
    age,
    gender,
    systolicBp: params.vitals.systolicBp || 120,
    totalCholesterol,
    hdl,
    hasDiabetes: (hba1c != null && hba1c >= 6.5) || (fastingGlucose != null && fastingGlucose >= 126),
    onBpMedication: params.prescriptions.some((r) => r.status === "active" && (r.details.toLowerCase().includes("pril") || r.details.toLowerCase().includes("sartan") || r.details.toLowerCase().includes("lol"))),
  });

  // 2. KDIGO CKD Stage
  const ckd = evaluateKDIGOCkd({
    creatinine,
    age,
    gender,
  });

  // 3. Metabolic & ADA Staging
  const metabolic = evaluateMetabolicStatus({
    fastingGlucose,
    hba1c,
  });

  // 4. Hepatic Profile
  const hepatic = evaluateHepaticProfile({
    ast,
    alt,
    bilirubin,
    albumin,
  });

  // 5. Hematology Profile
  const hematology = evaluateHematologyProfile({
    hemoglobin,
    gender,
    platelets,
    wbc,
  });

  // 6. Pharmacotherapy Safety & GDMT Scanner
  const { alerts: drugAlerts, gdmtGaps } = scanPharmacotherapySafety({
    prescriptions: params.prescriptions,
    panel: params.panel,
    systolicBp: params.vitals.systolicBp,
    diastolicBp: params.vitals.diastolicBp,
    heartRate: params.vitals.heartRate,
    glucose: params.vitals.glucose,
    age,
    gender,
  });

  // 7. Actionable Diagnostic Orders
  const actionableOrders = generateActionableOrders({
    ascvd,
    ckd,
    metabolic,
    hepatic,
    hematology,
    systolicBp: params.vitals.systolicBp,
    diastolicBp: params.vitals.diastolicBp,
  });

  // 8. SOAP Clinical Note Summary
  const soapSummary = generateSOAPClinicalSummary({
    patientName: params.patient.fullName || "Patient",
    age,
    gender,
    vitals: params.vitals,
    ascvd,
    ckd,
    metabolic,
    hepatic,
    hematology,
    drugAlerts,
    gdmtGaps,
    actionableOrders,
  });

  return {
    ascvd,
    ckd,
    metabolic,
    hepatic,
    hematology,
    drugAlerts,
    gdmtGaps,
    actionableOrders,
    soapSummary,
  };
}
