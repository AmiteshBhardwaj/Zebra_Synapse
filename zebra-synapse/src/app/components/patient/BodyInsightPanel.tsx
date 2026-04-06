import { useMemo, useState } from "react";
import { cn } from "../ui/utils";
import { type MetricAssessment, getMetricValueLabel } from "../../../lib/labInsights";

const REGION_MAP = {
  head: ["Vitamin B12"],
  chest: ["Homocysteine", "Cholesterol"],
  abdomen: ["Hemoglobin A1c", "Fasting Glucose"],
  kidneys: ["Urea", "Blood Urea Nitrogen"],
  immune: ["IgE", "Lymphocytes"],
  bones: ["Vitamin D"],
} as const;

type RegionId = keyof typeof REGION_MAP;

type RegionShape = {
  id: RegionId;
  label: string;
  renderHitArea: (active: boolean, hasAbnormal: boolean) => React.ReactNode;
};

const BIOMARKER_LABEL_ALIASES: Record<string, string[]> = {
  Cholesterol: ["Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides"],
  Lymphocytes: ["Lymphocytes", "Absolute Lymphocyte Count"],
  "Vitamin D": ["25(OH) Vitamin D"],
};

const REGION_SHAPES: RegionShape[] = [
  {
    id: "head",
    label: "Head",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <circle
          cx="150"
          cy="48"
          r="28"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <circle cx="150" cy="48" r="34" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
      </>
    ),
  },
  {
    id: "chest",
    label: "Chest",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <rect
          x="118"
          y="104"
          width="64"
          height="74"
          rx="28"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect x="112" y="98" width="76" height="86" rx="32" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
      </>
    ),
  },
  {
    id: "abdomen",
    label: "Abdomen",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <rect
          x="120"
          y="178"
          width="60"
          height="58"
          rx="24"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect x="114" y="172" width="72" height="70" rx="28" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
      </>
    ),
  },
  {
    id: "kidneys",
    label: "Kidneys",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <ellipse
          cx="132"
          cy="248"
          rx="16"
          ry="24"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <ellipse
          cx="168"
          cy="248"
          rx="16"
          ry="24"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <ellipse cx="132" cy="248" rx="22" ry="30" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
        <ellipse cx="168" cy="248" rx="22" ry="30" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
      </>
    ),
  },
  {
    id: "immune",
    label: "Immune System",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <circle
          cx="150"
          cy="92"
          r="12"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <circle
          cx="110"
          cy="128"
          r="12"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <circle
          cx="190"
          cy="128"
          r="12"
          fill={active ? "rgba(255, 77, 77, 0.12)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <circle cx="150" cy="92" r="18" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
        <circle cx="110" cy="128" r="18" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
        <circle cx="190" cy="128" r="18" fill="transparent" stroke="transparent" strokeWidth="18" pointerEvents="all" />
      </>
    ),
  },
  {
    id: "bones",
    label: "Bones",
    renderHitArea: (active, hasAbnormal) => (
      <>
        <circle
          cx="150"
          cy="48"
          r="16"
          fill={active ? "rgba(255, 77, 77, 0.08)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect
          x="130"
          y="130"
          width="40"
          height="26"
          rx="12"
          fill={active ? "rgba(255, 77, 77, 0.08)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect
          x="130"
          y="206"
          width="40"
          height="26"
          rx="12"
          fill={active ? "rgba(255, 77, 77, 0.08)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect
          x="128"
          y="272"
          width="18"
          height="46"
          rx="9"
          fill={active ? "rgba(255, 77, 77, 0.08)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
        <rect
          x="154"
          y="272"
          width="18"
          height="46"
          rx="9"
          fill={active ? "rgba(255, 77, 77, 0.08)" : "transparent"}
          stroke={active ? "#ff4d4d" : hasAbnormal ? "rgba(255,200,87,0.7)" : "transparent"}
          strokeWidth={active ? 2 : hasAbnormal ? 1.5 : 1}
          pointerEvents="all"
        />
      </>
    ),
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
      const all = strictLabels.length === 0
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
        {!hasAbnormal ? <span className="text-xs text-emerald-300">Within normal range</span> : null}
      </div>

      <div className="relative mx-auto h-[340px] w-[300px] max-w-full">
        <svg viewBox="0 0 300 340" className="h-full w-full">
          <defs>
            <linearGradient id="bodyGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
            </linearGradient>
          </defs>

          <g opacity="0.75">
            <circle cx="150" cy="48" r="26" fill="url(#bodyGlow)" />
            <rect x="122" y="74" width="56" height="86" rx="24" fill="url(#bodyGlow)" />
            <rect x="90" y="84" width="22" height="100" rx="11" fill="url(#bodyGlow)" />
            <rect x="188" y="84" width="22" height="100" rx="11" fill="url(#bodyGlow)" />
            <rect x="126" y="156" width="20" height="122" rx="10" fill="url(#bodyGlow)" />
            <rect x="154" y="156" width="20" height="122" rx="10" fill="url(#bodyGlow)" />
          </g>

          {REGION_SHAPES.map((region) => {
            const regionMetrics = regionMetricMap.get(region.id) ?? { abnormal: [], all: [], metricKeys: [] };
            const isActive = activeRegion === region.id;
            const isFocused = focusedMetricKeys.some((key) => regionMetrics.metricKeys.includes(key));

            return (
              <g
                key={region.id}
                id={region.id}
                className={cn("cursor-pointer transition-all duration-200", isFocused ? "scale-[1.01]" : "")}
                onMouseEnter={() => {
                  setActiveRegion(region.id);
                  onFocusMetricKeys(regionMetrics.metricKeys);
                  console.log("Hovered region:", region.id);
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
