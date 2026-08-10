import { useMemo, useState } from "react";
import { cn } from "../ui/utils";
import { type MetricAssessment, getMetricValueLabel } from "../../../lib/labInsights";

const REGION_MAP = {
  head: ["Vitamin B12", "TSH", "Thyroxine (T4)", "Free T3", "Vitamin Folate"],
  chest: [
    "Homocysteine",
    "Cholesterol",
    "Total Cholesterol",
    "LDL Cholesterol",
    "HDL Cholesterol",
    "Triglycerides",
    "hs-CRP",
    "Troponin",
  ],
  abdomen: [
    "Hemoglobin A1c",
    "Fasting Glucose",
    "Glucose",
    "ALT",
    "AST",
    "Bilirubin",
    "Alkaline Phosphatase",
    "Albumin",
  ],
  kidneys: ["Urea", "Blood Urea Nitrogen", "Creatinine", "eGFR", "Sodium", "Potassium", "Uric Acid"],
  immune: [
    "IgE",
    "Lymphocytes",
    "WBC",
    "White Blood Cells",
    "Neutrophils",
    "Monocytes",
    "Eosinophils",
    "Basophils",
  ],
  bones: ["Vitamin D", "25(OH) Vitamin D", "Calcium", "Phosphorus"],
} as const;

type RegionId = keyof typeof REGION_MAP;

type RegionShape = {
  id: RegionId;
  label: string;
  renderHitArea: (active: boolean, hasAbnormal: boolean) => React.ReactNode;
};

const BIOMARKER_LABEL_ALIASES: Record<string, string[]> = {
  Cholesterol: ["Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides"],
  Lymphocytes: ["Lymphocytes", "Absolute Lymphocyte Count", "WBC"],
  "Vitamin D": ["25(OH) Vitamin D"],
  "Fasting Glucose": ["Glucose", "Blood Sugar"],
};

// ANATOMICALLY ACCURATE SVG REGION HIGHLIGHTS OVER THE BODY SILHOUETTE (ViewBox 0 0 300 340)
// Body Silhouette Anchors:
// Head: cx=150, cy=48, r=26
// Upper Torso/Chest: cx=150, cy=96, width=56, y=74-120
// Lower Torso/Abdomen: cx=150, cy=136, width=56, y=120-156
// Kidneys: cx=134 & 166, cy=136
// Arms: x=90-112 and 188-210
// Legs: x=126-146 and 154-174, y=156-278
const REGION_SHAPES: RegionShape[] = [
  {
    id: "head",
    label: "Head & Neurological",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          <circle
            cx="150"
            cy="48"
            r="22"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2.5 : hasAbnormal ? 2 : 0}
            className="transition-all duration-300"
          />
          {active || hasAbnormal ? (
            <circle
              cx="150"
              cy="48"
              r="26"
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="4 2"
              className="animate-spin-slow opacity-60"
            />
          ) : null}
        </g>
      );
    },
  },
  {
    id: "chest",
    label: "Chest & Cardiovascular",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          <ellipse
            cx="150"
            cy="96"
            rx="20"
            ry="16"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2.5 : hasAbnormal ? 2 : 0}
            className="transition-all duration-300"
          />
          {active || hasAbnormal ? (
            <ellipse
              cx="150"
              cy="96"
              rx="24"
              ry="20"
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="4 2"
              className="opacity-60"
            />
          ) : null}
        </g>
      );
    },
  },
  {
    id: "abdomen",
    label: "Abdomen & Metabolic",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          <ellipse
            cx="150"
            cy="136"
            rx="21"
            ry="15"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2.5 : hasAbnormal ? 2 : 0}
            className="transition-all duration-300"
          />
          {active || hasAbnormal ? (
            <ellipse
              cx="150"
              cy="136"
              rx="25"
              ry="18"
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="4 2"
              className="opacity-60"
            />
          ) : null}
        </g>
      );
    },
  },
  {
    id: "kidneys",
    label: "Kidneys & Renal",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          {/* Left Kidney */}
          <ellipse
            cx="134"
            cy="136"
            rx="8"
            ry="12"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2.5 : hasAbnormal ? 2 : 0}
            className="transition-all duration-300"
          />
          {/* Right Kidney */}
          <ellipse
            cx="166"
            cy="136"
            rx="8"
            ry="12"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2.5 : hasAbnormal ? 2 : 0}
            className="transition-all duration-300"
          />
        </g>
      );
    },
  },
  {
    id: "immune",
    label: "Immune System & Lymphatics",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          {/* Neck Lymph Node Hub */}
          <circle
            cx="150"
            cy="72"
            r="7"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
          {/* Left Axilla Hub */}
          <circle
            cx="116"
            cy="92"
            r="7"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
          {/* Right Axilla Hub */}
          <circle
            cx="184"
            cy="92"
            r="7"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
        </g>
      );
    },
  },
  {
    id: "bones",
    label: "Bones & Skeletal System",
    renderHitArea: (active, hasAbnormal) => {
      const strokeColor = active ? "#ff4d4d" : hasAbnormal ? "#FFC857" : "transparent";
      const fillColor = active
        ? "rgba(255, 77, 77, 0.22)"
        : hasAbnormal
          ? "rgba(255, 200, 87, 0.15)"
          : "transparent";
      return (
        <g pointerEvents="all">
          {/* Spine Segment */}
          <rect
            x="147"
            y="78"
            width="6"
            height="72"
            rx="3"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
          {/* Left Knee Joint */}
          <circle
            cx="136"
            cy="216"
            r="9"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
          {/* Right Knee Joint */}
          <circle
            cx="164"
            cy="216"
            r="9"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 0}
          />
        </g>
      );
    },
  },
];

function getSeverityColor(hasCritical: boolean) {
  return hasCritical
    ? "border-[#FF4D4D]/80 bg-[#FF4D4D]/22 shadow-[0_0_32px_rgba(255,77,77,0.45)]"
    : "border-[#FFC857]/80 bg-[#FFC857]/20 shadow-[0_0_24px_rgba(255,200,87,0.36)]";
}

function statusText(status: MetricAssessment["status"]) {
  if (status === "high") return "High";
  if (status === "low") return "Low";
  if (status === "borderline") return "Needs Monitoring";
  return "Normal";
}

function getStrictRegionLabels(regionId: RegionId): string[] {
  const labels = REGION_MAP[regionId];
  if (!labels) return [];

  return [...new Set(labels.flatMap((label) => [label, ...(BIOMARKER_LABEL_ALIASES[label] ?? [])]))];
}

export function BodyInsightPanel({
  metrics,
  focusedMetricKeys,
  onFocusMetricKeys,
}: {
  metrics: MetricAssessment[];
  focusedMetricKeys: string[];
  onFocusMetricKeys: (keys: string[]) => void;
}) {
  const [activeRegion, setActiveRegion] = useState<RegionId | null>(null);

  const regionMetricMap = useMemo(() => {
    const map = new Map<
      RegionId,
      { abnormal: MetricAssessment[]; all: MetricAssessment[]; metricKeys: string[] }
    >();

    (Object.keys(REGION_MAP) as RegionId[]).forEach((regionId) => {
      const strictLabels = getStrictRegionLabels(regionId);
      const all =
        strictLabels.length === 0
          ? []
          : metrics.filter((metric) => strictLabels.includes(metric.label) && metric.status !== "missing");
      const abnormal = all.filter(
        (metric) => metric.status === "high" || metric.status === "low" || metric.status === "borderline",
      );
      const metricKeys = [...new Set(all.map((metric) => metric.key))];

      map.set(regionId, { abnormal, all, metricKeys });
    });

    return map;
  }, [metrics]);

  const hasAbnormal = [...regionMetricMap.values()].some((items) => items.abnormal.length > 0);
  const activeRegionCount = [...regionMetricMap.values()].filter((items) => items.abnormal.length > 0).length;
  const activeRegionMetrics = activeRegion ? regionMetricMap.get(activeRegion) ?? null : null;
  const activeRegionShape = activeRegion
    ? REGION_SHAPES.find((region) => region.id === activeRegion) ?? null
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Body Insight Panel</h3>
        {!hasAbnormal ? <span className="text-xs font-medium text-emerald-300">Within normal range</span> : null}
      </div>

      <div className="relative mx-auto h-[340px] w-[300px] max-w-full">
        <svg viewBox="0 0 300 340" className="h-full w-full">
          <defs>
            <linearGradient id="bodyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
            </linearGradient>
          </defs>

          {/* SVG Human Body Silhouette */}
          <g opacity="0.65">
            {/* Head */}
            <circle cx="150" cy="48" r="26" fill="url(#bodyGlow)" />
            {/* Torso */}
            <rect x="122" y="74" width="56" height="86" rx="24" fill="url(#bodyGlow)" />
            {/* Left Arm */}
            <rect x="90" y="84" width="22" height="100" rx="11" fill="url(#bodyGlow)" />
            {/* Right Arm */}
            <rect x="188" y="84" width="22" height="100" rx="11" fill="url(#bodyGlow)" />
            {/* Left Leg */}
            <rect x="126" y="156" width="20" height="122" rx="10" fill="url(#bodyGlow)" />
            {/* Right Leg */}
            <rect x="154" y="156" width="20" height="122" rx="10" fill="url(#bodyGlow)" />
          </g>

          {/* Anatomically Accurate Hotspots & Rings */}
          {REGION_SHAPES.map((region) => {
            const regionMetrics = regionMetricMap.get(region.id) ?? { abnormal: [], all: [], metricKeys: [] };
            const isActive = activeRegion === region.id;
            const isFocused = focusedMetricKeys.some((key) => regionMetrics.metricKeys.includes(key));

            return (
              <g
                key={region.id}
                id={region.id}
                className={cn("cursor-pointer transition-all duration-200", isFocused ? "scale-[1.03]" : "")}
                onMouseEnter={() => {
                  setActiveRegion(region.id);
                  onFocusMetricKeys(regionMetrics.metricKeys);
                }}
                onMouseLeave={() => {
                  setActiveRegion(null);
                  onFocusMetricKeys([]);
                }}
                onClick={() => {
                  if (regionMetrics.metricKeys.length === 0) return;

                  const nodes = regionMetrics.metricKeys
                    .map((key) => document.getElementById(`biomarker-card-${key}`))
                    .filter((node): node is HTMLElement => Boolean(node));
                  if (nodes.length === 0) return;

                  nodes[0].scrollIntoView({ behavior: "smooth", block: "center" });
                  nodes.forEach((node) => node.classList.add("ring-2", "ring-[#FF6A00]"));
                  setTimeout(() => {
                    nodes.forEach((node) => node.classList.remove("ring-2", "ring-[#FF6A00]"));
                  }, 1100);
                }}
              >
                {region.renderHitArea(isActive, regionMetrics.abnormal.length > 0)}
              </g>
            );
          })}
        </svg>

        {activeRegion && activeRegionShape && activeRegionMetrics ? (
          <div className="absolute left-1/2 top-2 z-20 w-[260px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#1f1f20]/95 p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">{activeRegionShape.label}</p>
              {activeRegionMetrics.abnormal.length > 0 ? (
                activeRegionMetrics.abnormal.map((metric) => (
                  <div
                    key={metric.key}
                    className={cn(
                      "rounded-lg border p-2",
                      getSeverityColor(metric.status === "high"),
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{metric.label}</p>
                    <p className="text-xs text-white/65">
                      {getMetricValueLabel(metric)} · {statusText(metric.status)}
                    </p>
                    <p className="text-xs text-white/55">{metric.summary}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  All biomarkers normal for this region
                </div>
              )}
            </div>
          </div>
        ) : null}

        {!hasAbnormal ? (
          <div className="absolute bottom-3 left-1/2 w-[250px] -translate-x-1/2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-200">
            Your body indicators are within normal range
          </div>
        ) : null}

        {hasAbnormal && activeRegionCount > 1 ? (
          <div className="absolute bottom-3 left-1/2 w-[250px] -translate-x-1/2 rounded-lg border border-[#FF6A00]/35 bg-[#FF6A00]/10 px-3 py-2 text-center text-xs text-[#ffd0b4]">
            Multiple areas require attention
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF4D4D]" />
          Critical
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFC857]" />
          Needs Attention
        </span>
      </div>
    </div>
  );
}
