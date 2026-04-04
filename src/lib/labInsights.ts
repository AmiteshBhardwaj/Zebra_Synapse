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
};

export type DiseasePrediction = {
  title: string;
  level: "low" | "moderate" | "high";
  rationale: string;
  nextStep: string;
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
};

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
  return [
    buildMetric(
      "hemoglobin_a1c",
      "Hemoglobin A1c",
      panel.hemoglobin_a1c,
      "%",
      "< 5.7",
      (v) => (v >= 6.5 ? "high" : v >= 5.7 ? "borderline" : "normal"),
      {
        normal: "In the usual range for long-term glucose control.",
        borderline: "Borderline high and consistent with prediabetes risk.",
        high: "High enough to suggest diabetes-range glucose exposure.",
        low: "Low.",
      },
    ),
    buildMetric(
      "fasting_glucose",
      "Fasting Glucose",
      panel.fasting_glucose,
      "mg/dL",
      "70-99",
      (v) => (v >= 126 ? "high" : v >= 100 ? "borderline" : v < 70 ? "low" : "normal"),
      {
        normal: "Within the usual fasting range.",
        borderline: "Above the usual fasting range.",
        high: "High enough to warrant follow-up for glucose control.",
        low: "Lower than the usual fasting range.",
      },
    ),
    buildMetric(
      "ldl",
      "LDL Cholesterol",
      panel.ldl,
      "mg/dL",
      "< 100",
      (v) => (v >= 160 ? "high" : v >= 100 ? "borderline" : "normal"),
      {
        normal: "Within the usual LDL target range.",
        borderline: "Above ideal and worth improving with diet or treatment.",
        high: "High enough to raise cardiovascular concern.",
        low: "Low.",
      },
    ),
    buildMetric(
      "hdl",
      "HDL Cholesterol",
      panel.hdl,
      "mg/dL",
      ">= 40",
      (v) => (v < 40 ? "low" : "normal"),
      {
        normal: "In a supportive range for heart health.",
        borderline: "Borderline.",
        high: "High.",
        low: "Lower than ideal for cardiometabolic protection.",
      },
    ),
    buildMetric(
      "triglycerides",
      "Triglycerides",
      panel.triglycerides,
      "mg/dL",
      "< 150",
      (v) => (v >= 200 ? "high" : v >= 150 ? "borderline" : "normal"),
      {
        normal: "Within the usual fasting target range.",
        borderline: "Mildly elevated and often responsive to sugar and alcohol reduction.",
        high: "High enough to warrant focused follow-up.",
        low: "Low.",
      },
    ),
    buildMetric(
      "hemoglobin",
      "Hemoglobin",
      panel.hemoglobin,
      "g/dL",
      "12-17",
      (v) => (v < 12 ? "low" : v > 17 ? "high" : "normal"),
      {
        normal: "Within the usual range.",
        borderline: "Borderline.",
        high: "Above the usual range.",
        low: "Below the usual range and may fit anemia.",
      },
    ),
    buildMetric(
      "creatinine",
      "Creatinine",
      panel.creatinine,
      "mg/dL",
      "0.6-1.3",
      (v) => (v > 1.3 ? "high" : v < 0.6 ? "low" : "normal"),
      {
        normal: "In the usual range for kidney function screening.",
        borderline: "Borderline.",
        high: "Higher than usual and worth reviewing with your clinician.",
        low: "Lower than usual but often less concerning on its own.",
      },
    ),
    buildMetric(
      "wbc",
      "White Blood Cells",
      panel.wbc,
      "x10^3/uL",
      "4-11",
      (v) => (v > 11 ? "high" : v < 4 ? "low" : "normal"),
      {
        normal: "Within the usual range.",
        borderline: "Borderline.",
        high: "Higher than usual and may reflect inflammation or infection.",
        low: "Lower than usual and may need review in context.",
      },
    ),
    buildMetric(
      "platelets",
      "Platelets",
      panel.platelets,
      "x10^3/uL",
      "150-450",
      (v) => (v > 450 ? "high" : v < 150 ? "low" : "normal"),
      {
        normal: "Within the usual range.",
        borderline: "Borderline.",
        high: "Higher than usual and worth interpreting with the rest of the CBC.",
        low: "Lower than usual and worth clinical review.",
      },
    ),
  ];
}

export function getOverallStatus(panel: LabPanelRow): {
  label: string;
  tone: "normal" | "attention";
  summary: string;
} {
  const metrics = getMetricAssessments(panel);
  const severe = metrics.filter((m) => m.status === "high" || m.status === "low");
  const mild = metrics.filter((m) => m.status === "borderline");
  if (severe.length > 0) {
    return {
      label: "Needs attention",
      tone: "attention",
      summary: `${severe.length} marker(s) are outside the usual range.`,
    };
  }
  if (mild.length > 0) {
    return {
      label: "Borderline findings",
      tone: "attention",
      summary: `${mild.length} marker(s) are borderline and worth tracking.`,
    };
  }
  return {
    label: "Stable",
    tone: "normal",
    summary: "Recorded markers are within the usual reference ranges.",
  };
}

export function getDiseasePredictions(panel: LabPanelRow): DiseasePrediction[] {
  const list: DiseasePrediction[] = [];

  if (
    (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 6.5) ||
    (panel.fasting_glucose != null && panel.fasting_glucose >= 126)
  ) {
    list.push({
      title: "Diabetes-range glucose pattern",
      level: "high",
      rationale: "A1c or fasting glucose is in a range often associated with diabetes.",
      nextStep: "Review the report with your clinician for confirmation and treatment planning.",
    });
  } else if (
    (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 5.7) ||
    (panel.fasting_glucose != null && panel.fasting_glucose >= 100)
  ) {
    list.push({
      title: "Prediabetes risk",
      level: "moderate",
      rationale: "Glucose markers are above ideal but below common diabetes thresholds.",
      nextStep: "Focus on weight, activity, sleep, and lower-refined-carbohydrate meals.",
    });
  }

  if (
    (panel.ldl != null && panel.ldl >= 160) ||
    (panel.triglycerides != null && panel.triglycerides >= 200) ||
    (panel.hdl != null && panel.hdl < 40)
  ) {
    list.push({
      title: "Cardiometabolic risk",
      level: "high",
      rationale: "Cholesterol markers suggest elevated cardiovascular risk.",
      nextStep: "Discuss lipid management, exercise targets, and medication need with your clinician.",
    });
  } else if (
    (panel.ldl != null && panel.ldl >= 100) ||
    (panel.triglycerides != null && panel.triglycerides >= 150)
  ) {
    list.push({
      title: "Emerging lipid imbalance",
      level: "moderate",
      rationale: "Some lipid markers are above ideal and worth tracking.",
      nextStep: "Reduce saturated fat, improve fiber intake, and recheck labs on schedule.",
    });
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
    list.push({
      title: "Possible anemia pattern",
      level: "moderate",
      rationale: "Hemoglobin is below the usual range.",
      nextStep: "Review iron studies, symptoms, and possible causes with your clinician.",
    });
  }

  if (panel.creatinine != null && panel.creatinine > 1.3) {
    list.push({
      title: "Kidney function follow-up",
      level: "moderate",
      rationale: "Creatinine is above the usual range.",
      nextStep: "Review hydration, medications, blood pressure, and kidney follow-up labs.",
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

export function getNutritionPlans(panel: LabPanelRow): NutritionPlan[] {
  const plans: NutritionPlan[] = [];

  if (
    (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 5.7) ||
    (panel.fasting_glucose != null && panel.fasting_glucose >= 100)
  ) {
    plans.push({
      headline: "Glucose control",
      focus: "Lower glycemic load and steadier post-meal blood sugar.",
      actions: [
        "Center meals on lean protein, vegetables, beans, and high-fiber carbs.",
        "Reduce sugary drinks, juices, desserts, and large refined-carb portions.",
        "Aim for a 10 to 15 minute walk after meals when possible.",
      ],
    });
  }

  if (
    (panel.ldl != null && panel.ldl >= 100) ||
    (panel.triglycerides != null && panel.triglycerides >= 150) ||
    (panel.hdl != null && panel.hdl < 40)
  ) {
    plans.push({
      headline: "Lipid improvement",
      focus: "Improve LDL, HDL, and triglyceride balance.",
      actions: [
        "Increase soluble fiber from oats, beans, lentils, fruit, and vegetables.",
        "Replace fried foods and processed snacks with nuts, seeds, olive oil, and fish.",
        "Limit alcohol and added sugar if triglycerides are elevated.",
      ],
    });
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
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

export function getWellnessTips(panel: LabPanelRow): WellnessTip[] {
  const tips: WellnessTip[] = [];
  const metrics = getMetricAssessments(panel);
  const worst = [...metrics]
    .filter((m) => m.status !== "missing")
    .sort((a, b) => statusRank(b.status) - statusRank(a.status))
    .slice(0, 3);

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
    }
  }

  if (tips.length === 0) {
    tips.push({
      title: "Keep your baseline healthy",
      detail: "The current recorded markers look stable, so focus on consistency with food, movement, and sleep.",
    });
  }

  return tips;
}

export function getTrialMatches(panel: LabPanelRow): TrialMatch[] {
  const trials: TrialMatch[] = [];

  if (
    (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 5.7) ||
    (panel.fasting_glucose != null && panel.fasting_glucose >= 100)
  ) {
    trials.push({
      title: "Prediabetes and diabetes prevention studies",
      summary: "Your glucose markers may align with screening terms used in metabolic prevention trials.",
      query: "prediabetes OR type 2 diabetes prevention",
    });
  }

  if (
    (panel.ldl != null && panel.ldl >= 100) ||
    (panel.triglycerides != null && panel.triglycerides >= 150)
  ) {
    trials.push({
      title: "Cholesterol and cardiometabolic studies",
      summary: "Lipid markers may fit search terms around dyslipidemia or cardiovascular prevention.",
      query: "dyslipidemia OR hyperlipidemia prevention",
    });
  }

  if (panel.creatinine != null && panel.creatinine > 1.3) {
    trials.push({
      title: "Kidney monitoring studies",
      summary: "Renal follow-up trials often screen for reduced kidney reserve or chronic kidney disease risk.",
      query: "chronic kidney disease early monitoring",
    });
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
    trials.push({
      title: "Anemia and iron deficiency studies",
      summary: "Low hemoglobin can map to anemia-related screening categories.",
      query: "anemia OR iron deficiency",
    });
  }

  if (trials.length === 0) {
    trials.push({
      title: "General preventive health studies",
      summary: "No strong lab-driven category was detected, so use broader prevention search terms.",
      query: "preventive health adults",
    });
  }

  return trials;
}

export function getMetricsForDashboard(panel: LabPanelRow) {
  return getMetricAssessments(panel)
    .filter((m) => m.status !== "missing")
    .sort((a, b) => statusRank(b.status) - statusRank(a.status));
}

export function getMetricValueLabel(metric: MetricAssessment): string {
  return formatValue(metric.value, metric.unit);
}
