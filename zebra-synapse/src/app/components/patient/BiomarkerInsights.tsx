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
  high: "border-[#FF6A00]/45 bg-[#FF6A00]/20 text-orange-100",
  low: "border-[#6C5BD4]/45 bg-[#6C5BD4]/18 text-purple-100",
  borderline: "border-amber-400/45 bg-amber-500/15 text-amber-100",
  normal: "border-emerald-400/45 bg-emerald-500/15 text-emerald-100",
};

const STATUS_LABEL: Record<InsightStatus, string> = {
  high: "High",
  low: "Low",
  borderline: "Needs Monitoring",
  normal: "Normal",
};

const SECTION_STYLES: Record<SectionTone, { ring: string; chip: string; title: string }> = {
  critical: {
    ring: "border-[#FF6A00]/35 bg-[#FF6A00]/10",
    chip: "bg-[#FF6A00]/20 text-[#ffd5bb]",
    title: "text-[#ffb078]",
  },
  monitor: {
    ring: "border-amber-400/35 bg-amber-500/10",
    chip: "bg-amber-500/20 text-amber-100",
    title: "text-amber-200",
  },
  good: {
    ring: "border-emerald-400/30 bg-emerald-500/10",
    chip: "bg-emerald-500/18 text-emerald-100",
    title: "text-emerald-200",
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
    <div className="space-y-1.5">
      <div className="relative h-2.5 overflow-hidden rounded-full border border-white/15 bg-white/10">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-[#6C5BD4]/35" />
        <div className="absolute inset-y-0 left-1/3 w-1/3 bg-emerald-500/30" />
        <div className="absolute inset-y-0 left-2/3 w-1/3 bg-[#FF6A00]/35" />
        <div
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_16px_rgba(255,106,0,0.45)]",
            metric.status === "high"
              ? "bg-[#FF6A00]"
              : metric.status === "low"
                ? "bg-[#6C5BD4]"
                : metric.status === "borderline"
                  ? "bg-amber-400"
                  : "bg-emerald-500",
          )}
          style={{ left: `calc(${pointer}% - 6px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
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
        "h-full rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_18px_36px_rgba(108,91,212,0.18)]",
        isFocused ? "ring-2 ring-[#FF6A00]/80 shadow-[0_0_32px_rgba(255,106,0,0.25)]" : "",
      )}
      onMouseEnter={() => onHoverMetric?.(metric.key)}
      onMouseLeave={() => onHoverMetric?.(null)}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/50">Biomarker</p>
            <h4 className="text-base font-semibold text-white">{metric.label}</h4>
          </div>
          <Badge variant="outline" className={cn("border", STATUS_BADGE[status])}>
            {STATUS_LABEL[status]}
          </Badge>
        </div>

        <div>
          <p className="text-xl font-semibold text-white">{getMetricValueLabel(metric)}</p>
          <p className="text-xs text-white/50">Reference: {metric.range}</p>
        </div>

        <RangeBar metric={metric} />

        <div className="space-y-2">
          <p className="text-sm text-white/75">{explainMetric(metric)}</p>
          <ul className="space-y-1 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6A00]" />
              <span>{suggestAction(metric)}</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6C5BD4]" />
              <span>Track this marker in your next panel to confirm direction of change.</span>
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
    <Accordion type="single" collapsible defaultValue={defaultOpen ? value : undefined} className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className={cn("px-5 py-4 hover:no-underline", style.ring)}>
          <div className="flex items-center gap-3">
            <p className={cn("text-base font-semibold", style.title)}>{title}</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style.chip)}>{metrics.length}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5">
          {metrics.length === 0 ? (
            <p className="text-sm text-white/55">No biomarkers in this section.</p>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.category} className="space-y-3">
                  <h5 className="text-sm font-semibold text-white/80">{group.category}</h5>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(130deg,#211f2d_0%,#242424_55%,#2f241e_100%)] shadow-[0_18px_44px_rgba(0,0,0,0.36)]">
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-[#b8afff]">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em]">Health Summary</p>
            </div>
            <h3 className="text-2xl font-semibold text-white">{statusTitle}</h3>
            <p className="text-sm text-white/75 sm:text-base">{summary}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[380px]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Total Issues</p>
              <p className="mt-2 text-2xl font-semibold text-white">{issues}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Critical Markers</p>
              <div className="mt-2 space-y-1.5 text-sm text-white/80">
                {topCritical.length > 0 ? (
                  topCritical.map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <CircleAlert className="h-3.5 w-3.5 text-[#FF6A00]" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
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
    <div className="space-y-6">
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
