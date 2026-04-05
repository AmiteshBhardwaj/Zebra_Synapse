import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Info, TrendingUp } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function DiseasePrediction() {
  const { hasLabReports, loading } = usePatientLabReports();

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
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
        <p className="text-gray-600 mt-1">AI-powered risk assessment from your real data</p>
      </div>

      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Not a diagnosis</AlertTitle>
        <AlertDescription className="text-blue-800">
          Any future risk scores here will be computed from structured values extracted from your
          uploads and your clinician&apos;s record—not from demo data.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <TrendingUp className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>No risk models to display yet</CardTitle>
          <CardDescription>
            You have lab files uploaded, but biomarkers have not been parsed into a format the
            models can use. Risk cards will appear here after extraction runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This avoids showing sample diabetes or cardiovascular scores that are not tied to your
            actual results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
