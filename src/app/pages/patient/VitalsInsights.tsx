import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getLatestLabPanel, getMetricsForDashboard, getMetricValueLabel } from "../../../lib/labInsights";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function VitalsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const metricCards = latestPanel ? getMetricsForDashboard(latestPanel, 20) : [];

  if (loading || panelsLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Vitals"
        description="Wearable and lab-linked vitals after you upload reports"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vitals</h1>
        <p className="mt-1 text-gray-600">Cardio-metabolic signals from your latest structured lab panel</p>
      </div>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No structured markers yet</CardTitle>
            <CardDescription>
              Your files are saved, but Vitals needs the report values before it can show trends.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Visible Signals",
                value: metricCards.length,
                detail: "Markers currently surfaced in the vitals dashboard.",
                tone: "teal",
              },
              {
                label: "High Priority",
                value: metricCards.filter((metric) => metric.status === "high" || metric.status === "low").length,
                detail: "Signals that stand out on the latest panel.",
                tone: "rose",
              },
              {
                label: "Borderline",
                value: metricCards.filter((metric) => metric.status === "borderline").length,
                detail: "Signals to keep under closer watch.",
                tone: "amber",
              },
              {
                label: "Recent Panels",
                value: panels.length,
                detail: "Historical panels available for movement charts.",
                tone: "blue",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricStatusDonut
              metrics={metricCards}
              title="Vitals signal mix"
              description="This view emphasizes the strongest current cardio-metabolic signals from the latest panel."
            />
            <MetricPriorityBars
              metrics={metricCards}
              title="Most important signals"
              description="Visual ranking makes it easier to spot which readings deserve attention first."
              limit={10}
            />
          </div>

          <MetricSparklineGrid
            panels={panels}
            metricKeys={metricCards.slice(0, 6).map((metric) => metric.key)}
            title="Signal trend cards"
            description="Each sparkline compresses recent movement into a quick dashboard card."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => (
              <Card key={metric.key}>
                <CardHeader>
                  <CardTitle className="text-base">{metric.label}</CardTitle>
                  <CardDescription>Reference: {metric.range}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{getMetricValueLabel(metric)}</p>
                  <p className="mt-2 capitalize text-sm text-muted-foreground">{metric.status}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{metric.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How this page works</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This page reads the latest structured panel from your uploaded report. It does not
                invent blood pressure, wearable, or heart-rate data that is not in your record.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
