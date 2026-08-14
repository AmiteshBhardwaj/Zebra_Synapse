import { Activity, ArrowRight, CircleAlert, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { cn } from "../ui/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { getBiomarkerDefinition } from "../../../lib/biomarkerCatalog";
import { getMetricValueLabel, type MetricAssessment } from "../../../lib/labInsights";

type InsightStatus = "high" | "low" | "borderline" | "normal";
type SectionTone = "critical" | "monitor" | "good";

const STATUS_BADGE: Record<InsightStatus, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  low: "border-sky-200 bg-sky-50 text-sky-700",
  borderline: "border-amber-200 bg-amber-50 text-amber-700",
  normal: "border-lime-200 bg-lime-50 text-lime-800",
};

const STATUS_LABEL: Record<InsightStatus, string> = {
  high: "High",
  low: "Low",
  borderline: "Needs Monitoring",
  normal: "Normal",
};

const SECTION_STYLES: Record<SectionTone, { ring: string; chip: string; title: string }> = {
  critical: {
    ring: "border-rose-100 bg-rose-50/40",
    chip: "bg-rose-100 text-rose-800",
    title: "text-rose-900",
  },
  monitor: {
    ring: "border-amber-100 bg-amber-50/40",
    chip: "bg-amber-100 text-amber-800",
    title: "text-amber-900",
  },
  good: {
    ring: "border-lime-100 bg-lime-50/40",
    chip: "bg-lime-100 text-lime-800",
    title: "text-lime-900",
  },
};

function getMetricCategory(metric: MetricAssessment): string {
  const key = metric.key;
  if (["hemoglobin", "wbc", "platelets", "rbc_count", "hematocrit", "mcv", "mch", "mchc"].includes(key)) {
    return "🩸 Blood Health";
  }
  if (["ldl", "hdl", "triglycerides", "total_cholesterol", "chol_hdl_ratio", "ldl_hdl_ratio", "homocysteine"].includes(key)) {
    return "❤️ Heart Health";
  }
  if (["hemoglobin_a1c", "fasting_glucose", "mean_blood_glucose", "creatinine", "tsh", "microalbumin_urine"].includes(key)) {
    return "🧠 Metabolic";
  }
  if (["vitamin_d_25_oh", "vitamin_b12", "iron", "tibc", "transferrin_saturation"].includes(key)) {
    return "🧬 Vitamins";
  }
  return "🧪 Other";
}

function explainMetric(metric: MetricAssessment): string {
  if (metric.status === "normal") return "Within expected range. Keep current habits and routine follow-up.";

  if (metric.key === "hemoglobin_a1c" || metric.key === "fasting_glucose") {
    return metric.status === "high"
      ? "Higher than normal. This can signal blood sugar imbalance and diabetes risk."
      : "Lower than expected. Review meal timing and medication context with your clinician.";
  }

  if (metric.key === "ldl" || metric.key === "triglycerides" || metric.key === "total_cholesterol") {
    return metric.status === "high"
      ? "Above target range. This may increase long-term cardiovascular risk."
      : "Below expected in this report. Confirm trend with repeat labs.";
  }

  if (metric.key === "vitamin_d_25_oh" || metric.key === "vitamin_b12") {
    return metric.status === "low"
      ? "Lower than optimal. This may contribute to fatigue or slower recovery."
      : "Higher than expected. Review supplement dose and recent intake.";
  }

  if (metric.status === "high") return "Higher than normal. This may indicate increased clinical risk if persistent.";
  if (metric.status === "low") return "Lower than normal. This may signal deficiency or reduced physiological reserve.";
  return "Near the boundary of normal range. Track trends and recheck on schedule.";
}

function suggestAction(metric: MetricAssessment): string {
  if (metric.status === "normal") return "Continue current routine and repeat labs as advised.";
  if (metric.key === "hemoglobin_a1c" || metric.key === "fasting_glucose") {
    return "Prioritize lower-glycemic meals, post-meal walks, and clinician follow-up.";
  }
  if (metric.key === "ldl" || metric.key === "triglycerides" || metric.key === "total_cholesterol") {
    return "Increase fiber, reduce processed fats, and discuss lipid targets with your doctor.";
  }
  if (metric.key === "vitamin_d_25_oh" || metric.key === "vitamin_b12") {
    return "Review nutrition and supplementation strategy with your care team.";
  }
  return "Recheck this marker in your next panel and discuss context-specific next steps.";
}

function parseRange(metric: MetricAssessment): { low?: number; high?: number } {
  const definition = getBiomarkerDefinition(metric.key);
  return {
    low: definition?.low,
    high: definition?.high,
  };
}

function computePosition(value: number, low?: number, high?: number): number {
  if (low == null && high == null) return 50;
  if (low != null && high != null) {
    const span = Math.max(high - low, 1);
    const min = low - span * 0.35;
    const max = high + span * 0.35;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }
  if (high != null) {
    const max = Math.max(high * 1.8, high + 1);
    return Math.max(0, Math.min(100, (value / max) * 100));
  }
  const min = Math.max(0, (low ?? 0) * 0.4);
  const max = Math.max((low ?? 0) * 1.8, (low ?? 0) + 1);
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function sortedMetrics(metrics: MetricAssessment[]): MetricAssessment[] {
  return [...metrics].sort((a, b) => {
    const aSev = a.status === "high" || a.status === "low" ? 3 : a.status === "borderline" ? 2 : 1;
    const bSev = b.status === "high" || b.status === "low" ? 3 : b.status === "borderline" ? 2 : 1;
    if (bSev !== aSev) return bSev - aSev;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}

function groupedByCategory(metrics: MetricAssessment[]): Array<{ category: string; items: MetricAssessment[] }> {
  const map = new Map<string, MetricAssessment[]>();
  metrics.forEach((metric) => {
    const category = getMetricCategory(metric);
    const existing = map.get(category) ?? [];
    existing.push(metric);
    map.set(category, existing);
  });

  return [...map.entries()].map(([category, items]) => ({
    category,
    items: sortedMetrics(items),
  }));
}

export function RangeBar({
  metric,
}: {
  metric: MetricAssessment;
}) {
  const { low, high } = parseRange(metric);
  const value = metric.value ?? 0;
  const pointer = computePosition(value, low, high);

  return (
    <div className="space-y-1">
      <div className="relative h-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-sky-200" />
        <div className="absolute inset-y-0 left-1/3 w-1/3 bg-lime-300" />
        <div className="absolute inset-y-0 left-2/3 w-1/3 bg-rose-200" />
        <div
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm",
            metric.status === "high"
              ? "bg-rose-500"
              : metric.status === "low"
                ? "bg-sky-500"
                : metric.status === "borderline"
                  ? "bg-amber-500"
                  : "bg-lime-600",
          )}
          style={{ left: `calc(${pointer}% - 6px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <span>Low</span>
        <span>Normal</span>
        <span>High</span>
      </div>
    </div>
  );
}

export function InsightCard({
  metric,
  isFocused = false,
  onHoverMetric,
}: {
  metric: MetricAssessment;
  isFocused?: boolean;
  onHoverMetric?: (key: string | null) => void;
}) {
  const status = metric.status as InsightStatus;

  return (
    <Card
      id={`biomarker-card-${metric.key}`}
      className={cn(
        "h-full rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md",
        isFocused ? "ring-2 ring-lime-500 shadow-md" : "",
      )}
      onMouseEnter={() => onHoverMetric?.(metric.key)}
      onMouseLeave={() => onHoverMetric?.(null)}
    >
      <CardContent className="flex h-full flex-col gap-3.5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-400">Biomarker</p>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">{metric.label}</h4>
          </div>
          <Badge variant="outline" className={cn("text-[11px] font-semibold", STATUS_BADGE[status])}>
            {STATUS_LABEL[status]}
          </Badge>
        </div>

        <div>
          <p className="text-xl font-bold text-slate-900">{getMetricValueLabel(metric)}</p>
          <p className="text-xs text-slate-400">Reference: {metric.range}</p>
        </div>

        <RangeBar metric={metric} />

        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-slate-600 leading-relaxed">{explainMetric(metric)}</p>
          <ul className="space-y-1 text-xs text-slate-500">
            <li className="flex items-start gap-1.5">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-600" />
              <span>{suggestAction(metric)}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
              <span>Track this marker in your next panel to confirm trend.</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionGroup({
  title,
  tone,
  metrics,
  value,
  defaultOpen = false,
  focusedMetricKeys = [],
  onHoverMetric,
}: {
  title: string;
  tone: SectionTone;
  metrics: MetricAssessment[];
  value: string;
  defaultOpen?: boolean;
  focusedMetricKeys?: string[];
  onHoverMetric?: (key: string | null) => void;
}) {
  const style = SECTION_STYLES[tone];
  const grouped = groupedByCategory(metrics);

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? value : undefined} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className={cn("px-5 py-4 hover:no-underline rounded-2xl", style.ring)}>
          <div className="flex items-center gap-3">
            <p className={cn("text-sm sm:text-base font-bold", style.title)}>{title}</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm", style.chip)}>{metrics.length}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-3">
          {metrics.length === 0 ? (
            <p className="text-xs text-slate-400">No biomarkers in this section.</p>
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <div key={group.category} className="space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.category}</h5>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((metric) => (
                      <InsightCard
                        key={metric.key}
                        metric={metric}
                        isFocused={focusedMetricKeys.includes(metric.key)}
                        onHoverMetric={onHoverMetric}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function HealthSummary({ metrics }: { metrics: MetricAssessment[] }) {
  const severe = sortedMetrics(metrics.filter((m) => m.status === "high" || m.status === "low"));
  const monitor = sortedMetrics(metrics.filter((m) => m.status === "borderline"));
  const issues = severe.length + monitor.length;
  const topCritical = [...severe, ...monitor].slice(0, 3);
  const statusTitle = severe.length > 0 ? "⚠️ Needs Attention" : "✅ Mostly Healthy";

  const summary =
    severe.length > 0
      ? `You have ${severe.length} critical biomarker issue${severe.length === 1 ? "" : "s"} and ${monitor.length} marker${monitor.length === 1 ? "" : "s"} needing monitoring. Prioritize follow-up on ${topCritical
          .slice(0, 2)
          .map((item) => item.label)
          .join(" and ")}.`
      : monitor.length > 0
        ? `Most biomarkers are stable. ${monitor.length} marker${monitor.length === 1 ? "" : "s"} are near the boundary and should be tracked over time.`
        : "All tracked biomarkers are currently in the normal range. Continue preventive habits and periodic checks.";

  return (
    <Card className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-1.5">
            <div className="flex items-center gap-2 text-lime-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Health Summary</p>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Manrope']">{statusTitle}</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{summary}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[380px]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Issues</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{issues}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Critical Markers</p>
              <div className="mt-1.5 space-y-1 text-xs text-slate-700 font-medium">
                {topCritical.length > 0 ? (
                  topCritical.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-rose-600">
                      <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <Activity className="h-3.5 w-3.5 shrink-0" />
                    <span>No critical markers</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BiomarkerInsightsBoard({
  metrics,
  focusedMetricKeys = [],
  onHoverMetric,
}: {
  metrics: MetricAssessment[];
  focusedMetricKeys?: string[];
  onHoverMetric?: (key: string | null) => void;
}) {
  const critical = sortedMetrics(metrics.filter((m) => m.status === "high" || m.status === "low"));
  const monitor = sortedMetrics(metrics.filter((m) => m.status === "borderline"));
  const normal = sortedMetrics(metrics.filter((m) => m.status === "normal"));

  return (
    <div className="space-y-5">
      <HealthSummary metrics={metrics} />

      <SectionGroup
        title="🔴 Critical Issues"
        tone="critical"
        value="critical"
        metrics={critical}
        defaultOpen
        focusedMetricKeys={focusedMetricKeys}
        onHoverMetric={onHoverMetric}
      />

      <SectionGroup
        title="🟡 Needs Monitoring"
        tone="monitor"
        value="monitor"
        metrics={monitor}
        focusedMetricKeys={focusedMetricKeys}
        onHoverMetric={onHoverMetric}
      />

      <SectionGroup
        title="🟢 Normal"
        tone="good"
        value="normal"
        metrics={normal}
        focusedMetricKeys={focusedMetricKeys}
        onHoverMetric={onHoverMetric}
      />
    </div>
  );
}
