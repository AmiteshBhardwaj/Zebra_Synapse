import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getLatestLabPanel, getMetricAssessments, getMetricValueLabel } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function VitalsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const metricCards = latestPanel
    ? getMetricAssessments(latestPanel).filter((metric) =>
        ["fasting_glucose", "ldl", "hdl", "triglycerides"].includes(metric.key),
      )
    : [];

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
