import { Info, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  CategoryBarChart,
  MetricPriorityBars,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { getDiseasePredictions, getLatestLabPanel, getMetricsForDashboard } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function DiseasePredictionInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const predictions = latestPanel ? getDiseasePredictions(latestPanel) : [];
  const supportingMetrics = latestPanel ? getMetricsForDashboard(latestPanel, 12) : [];
  const predictionMix = [
    { key: "high", label: "High", value: predictions.filter((prediction) => prediction.level === "high").length, fill: "#d9485f", detail: "Patterns that should be discussed promptly." },
    { key: "moderate", label: "Moderate", value: predictions.filter((prediction) => prediction.level === "moderate").length, fill: "#d97706", detail: "Patterns worth structured follow-up." },
    { key: "low", label: "Low", value: predictions.filter((prediction) => prediction.level === "low").length, fill: "#0f766e", detail: "Patterns with lower immediate concern." },
  ].filter((item) => item.value > 0);

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
        title="Disease Prediction"
        description="Risk assessments based on your lab-derived data"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Disease Prediction</h1>
        <p className="mt-1 text-gray-600">Rule-based risk assessment from your recorded lab markers</p>
      </div>

      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Not a diagnosis</AlertTitle>
        <AlertDescription className="text-blue-800">
          These cards are simple rule-based interpretations of your reported lab values. They do
          not replace clinical review.
        </AlertDescription>
      </Alert>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No structured report values yet</CardTitle>
            <CardDescription>
              Uploads are present, but Disease Prediction needs the actual values from one report
              before it can generate risk cards.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Risk Cards",
                value: predictions.length,
                detail: "Rule-based patterns generated from your latest panel.",
                tone: "blue",
              },
              {
                label: "High Risk",
                value: predictions.filter((prediction) => prediction.level === "high").length,
                detail: "Patterns with the strongest immediate signal.",
                tone: "rose",
              },
              {
                label: "Moderate Risk",
                value: predictions.filter((prediction) => prediction.level === "moderate").length,
                detail: "Patterns that should still be tracked closely.",
                tone: "amber",
              },
              {
                label: "Supporting Markers",
                value: supportingMetrics.length,
                detail: "Biomarkers currently informing these rule-based cards.",
                tone: "teal",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <CategoryBarChart
              items={predictionMix}
              title="Risk mix"
              description="This chart groups the generated cards by rule-based risk level."
            />
            <MetricPriorityBars
              metrics={supportingMetrics}
              title="Markers influencing risk cards"
              description="The prediction view is now anchored to the biomarker signals behind the cards."
              limit={8}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {predictions.map((prediction) => (
              <Card key={prediction.title}>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <CardTitle>{prediction.title}</CardTitle>
                  <CardDescription className="capitalize">
                    Rule-based risk level: {prediction.level}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{prediction.rationale}</p>
                  <p className="text-sm font-medium">{prediction.nextStep}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
