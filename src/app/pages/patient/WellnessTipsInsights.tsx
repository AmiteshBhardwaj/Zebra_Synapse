import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  CategoryBarChart,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { getLatestLabPanel, getMetricAssessments, getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function WellnessTipsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const tips = latestPanel ? getWellnessTips(latestPanel) : [];
  const metrics = latestPanel
    ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing")
    : [];
  const tipBars = tips.map((tip, index) => ({
    key: tip.title.toLowerCase().replace(/\s+/g, "-"),
    label: tip.title,
    value: Math.max(3 - index, 1),
    fill: ["#0f766e", "#2563eb", "#d97706", "#d9485f"][index % 4],
    detail: tip.detail,
  }));

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
        title="Wellness Tips"
        description="Tips grounded in your lab results and vitals"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wellness Tips</h1>
        <p className="mt-1 text-gray-600">Personalized recommendations from your recorded lab data</p>
      </div>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No personalized tips yet</CardTitle>
            <CardDescription>
              Personalized tips appear after you enter the values from one uploaded report.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Tip Count",
                value: tips.length,
                detail: "Personalized tip cards generated from the latest panel.",
                tone: "teal",
              },
              {
                label: "Flagged Biomarkers",
                value: metrics.filter((metric) => metric.status === "high" || metric.status === "low").length,
                detail: "Signals most likely to shape your daily wellness guidance.",
                tone: "rose",
              },
              {
                label: "Borderline Signals",
                value: metrics.filter((metric) => metric.status === "borderline").length,
                detail: "Signals that are stable enough to work on with habit changes.",
                tone: "amber",
              },
              {
                label: "Recorded Panels",
                value: panels.length,
                detail: "Panel history that can refine future wellness recommendations.",
                tone: "blue",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricStatusDonut
              metrics={metrics}
              title="Wellness driver mix"
              description="Your wellness tips now sit on top of a visual biomarker status breakdown."
            />
            <CategoryBarChart
              items={tipBars}
              title="Tip priority map"
              description="Higher bars represent the tips pulled forward first from your latest marker pattern."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {tips.map((tip) => (
              <Card key={tip.title}>
                <CardHeader>
                  <CardTitle>{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{tip.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
