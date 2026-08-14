import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import {
  getMetricAssessments,
  getMetricValueLabel,
  type MetricAssessment,
} from "../../../lib/labInsights";

const STATUS_META = {
  high: { label: "High", color: "#f43f5e", surface: "border-rose-200 bg-rose-50 text-rose-700" },
  low: { label: "Low", color: "#0ea5e9", surface: "border-sky-200 bg-sky-50 text-sky-700" },
  borderline: { label: "Borderline", color: "#f59e0b", surface: "border-amber-200 bg-amber-50 text-amber-700" },
  normal: { label: "Normal", color: "#84cc16", surface: "border-lime-200 bg-lime-50 text-lime-800" },
  missing: { label: "Missing", color: "#94a3b8", surface: "border-slate-200 bg-slate-100 text-slate-700" },
} as const;

type StatTone = "teal" | "amber" | "rose" | "blue" | "slate" | "orange" | "violet";

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  teal: "border-lime-100 bg-lime-50/40 text-slate-800",
  amber: "border-amber-100 bg-amber-50/40 text-slate-800",
  rose: "border-rose-100 bg-rose-50/40 text-slate-800",
  blue: "border-sky-100 bg-sky-50/40 text-slate-800",
  slate: "border-slate-100 bg-slate-50/60 text-slate-800",
  orange: "border-orange-100 bg-orange-50/40 text-slate-800",
  violet: "border-purple-100 bg-purple-50/40 text-slate-800",
};

function severityScore(metric: MetricAssessment): number {
  switch (metric.status) {
    case "high":
    case "low":
      return 100;
    case "borderline":
      return 70;
    case "normal":
      return 35;
    default:
      return 0;
  }
}

function shortLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 22)}...` : label;
}

function getPanelCardClassName() {
  return "rounded-[24px] border border-slate-100 bg-white text-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)]";
}

export function getMetricStatusCounts(metrics: MetricAssessment[]) {
  return [
    { key: "high", label: STATUS_META.high.label, value: metrics.filter((metric) => metric.status === "high").length, fill: STATUS_META.high.color },
    { key: "low", label: STATUS_META.low.label, value: metrics.filter((metric) => metric.status === "low").length, fill: STATUS_META.low.color },
    { key: "borderline", label: STATUS_META.borderline.label, value: metrics.filter((metric) => metric.status === "borderline").length, fill: STATUS_META.borderline.color },
    { key: "normal", label: STATUS_META.normal.label, value: metrics.filter((metric) => metric.status === "normal").length, fill: STATUS_META.normal.color },
  ].filter((item) => item.value > 0);
}

export function OverviewStatCards({
  stats,
}: {
  stats: Array<{ label: string; value: string | number; detail: string; tone?: StatTone }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={cn(
            "overflow-hidden rounded-[24px] border shadow-[0_4px_20px_rgba(0,0,0,0.02)]",
            STAT_TONE_CLASSES[stat.tone ?? "slate"],
          )}
        >
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="text-3xl font-bold leading-none text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MetricStatusDonut({
  metrics,
  title,
  description,
}: {
  metrics: MetricAssessment[];
  title: string;
  description: string;
}) {
  const data = getMetricStatusCounts(metrics);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const config = data.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = { label: item.label, color: item.fill };
    return acc;
  }, {});

  return (
    <Card className={getPanelCardClassName()}>
      <CardHeader>
        <CardTitle className="text-slate-900 text-lg font-bold">{title}</CardTitle>
        <CardDescription className="text-slate-500 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <ChartContainer config={config} className="mx-auto h-[260px] w-full max-w-[380px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={64} outerRadius={100} paddingAngle={4}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
          </PieChart>
        </ChartContainer>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Biomarkers</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
            <p className="mt-1 text-xs text-slate-500">Visualized breakdown from active lab panel.</p>
          </div>
          {data.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-800 font-semibold text-xs">
                {item.value}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricPriorityBars({
  metrics,
  title,
  description,
  limit = 8,
}: {
  metrics: MetricAssessment[];
  title: string;
  description: string;
  limit?: number;
}) {
  const data = [...metrics]
    .filter((metric) => metric.status !== "missing")
    .sort((a, b) => severityScore(b) - severityScore(a))
    .slice(0, limit)
    .map((metric) => ({
      key: metric.key,
      label: shortLabel(metric.label),
      fullLabel: metric.label,
      score: severityScore(metric),
      value: getMetricValueLabel(metric),
      status: metric.status,
      fill: STATUS_META[metric.status].color,
    }));

  const config = data.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = { label: item.fullLabel, color: item.fill };
    return acc;
  }, {});

  return (
    <Card className={getPanelCardClassName()}>
      <CardHeader>
        <CardTitle className="text-slate-900 text-lg font-bold">{title}</CardTitle>
        <CardDescription className="text-slate-500 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={config} className="h-[300px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis type="category" dataKey="label" width={110} tickLine={false} axisLine={false} className="text-xs text-slate-600" />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(_, __, item) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-slate-500 text-xs">{item.payload.fullLabel}</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">{item.payload.value}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="score" radius={8}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="flex flex-wrap gap-1.5">
          {data.map((item) => (
            <Badge
              key={item.key}
              variant="outline"
              className={cn("text-xs font-medium", STATUS_META[item.status].surface)}
            >
              {item.fullLabel}: {item.value}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricSparklineGrid({
  panels,
  metricKeys,
  title,
  description,
}: {
  panels: LabPanelRow[];
  metricKeys: string[];
  title: string;
  description: string;
}) {
  const orderedPanels = [...panels]
    .sort((a, b) => new Date(`${a.recorded_at}T00:00:00`).getTime() - new Date(`${b.recorded_at}T00:00:00`).getTime())
    .slice(-8);

  const latestMetrics = orderedPanels.length > 0 ? getMetricAssessments(orderedPanels[orderedPanels.length - 1]) : [];
  const latestMetricMap = new Map(latestMetrics.map((metric) => [metric.key, metric]));

  const cards = metricKeys
    .map((key) => {
      const latestMetric = latestMetricMap.get(key);
      if (!latestMetric || latestMetric.status === "missing") return null;
      const series = orderedPanels
        .map((panel) => {
          const metric = getMetricAssessments(panel).find((item) => item.key === key);
          return metric && metric.status !== "missing"
            ? {
                date: formatLabDate(panel.recorded_at),
                rawDate: panel.recorded_at,
                value: metric.value ?? 0,
              }
            : null;
        })
        .filter((item): item is { date: string; rawDate: string; value: number } => Boolean(item));

      if (series.length === 0) return null;

      return {
        key,
        latestMetric,
        fill: STATUS_META[latestMetric.status].color,
        series,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <Card className={getPanelCardClassName()}>
      <CardHeader>
        <CardTitle className="text-slate-900 text-lg font-bold">{title}</CardTitle>
        <CardDescription className="text-slate-500 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const config: ChartConfig = {
              value: { label: card.latestMetric.label, color: card.fill },
            };

            return (
              <div key={card.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.latestMetric.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{getMetricValueLabel(card.latestMetric)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-semibold", STATUS_META[card.latestMetric.status].surface)}
                  >
                    {STATUS_META[card.latestMetric.status].label}
                  </Badge>
                </div>
                <ChartContainer config={config} className="h-[110px] w-full">
                  <AreaChart data={card.series} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`fill-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={card.fill} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={card.fill} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Area type="monotone" dataKey="value" stroke={card.fill} fill={`url(#fill-${card.key})`} strokeWidth={2.2} />
                  </AreaChart>
                </ChartContainer>
                <p className="mt-2.5 text-[11px] text-slate-400">
                  Tracked across {card.series.length} record{card.series.length === 1 ? "" : "s"}.
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBarChart({
  items,
  title,
  description,
  valueLabel,
}: {
  items: Array<{ key: string; label: string; value: number; fill?: string; detail?: string }>;
  title: string;
  description: string;
  valueLabel?: string;
}) {
  const config = items.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = { label: item.label, color: item.fill ?? "#84cc16" };
    return acc;
  }, {});

  return (
    <Card className={getPanelCardClassName()}>
      <CardHeader>
        <CardTitle className="text-slate-900 text-lg font-bold">{title}</CardTitle>
        <CardDescription className="text-slate-500 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={items} margin={{ left: 0, right: 10, top: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={64} className="text-xs text-slate-600" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs text-slate-600" />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _, item) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-slate-500 text-xs">{item.payload.label}</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {value}
                        {valueLabel ? ` ${valueLabel}` : ""}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="value" radius={8}>
              {items.map((item) => (
                <Cell key={item.key} fill={item.fill ?? "#84cc16"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill ?? "#84cc16" }} />
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                </div>
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-800 text-xs font-semibold">
                  {item.value}
                </Badge>
              </div>
              {item.detail ? <p className="mt-1.5 text-xs text-slate-500">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
