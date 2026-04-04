import { Info, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getDiseasePredictions, getLatestLabPanel } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function DiseasePredictionInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const predictions = latestPanel ? getDiseasePredictions(latestPanel) : [];

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
      )}
    </div>
  );
}
