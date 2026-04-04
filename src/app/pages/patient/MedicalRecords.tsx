import { AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getMetricAssessments, getMetricValueLabel } from "../../../lib/labInsights";

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function MedicalRecords() {
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const metrics = latestPanel ? getMetricAssessments(latestPanel) : [];

  if (loading || panelsLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Medical Records"
        description="View lab tests and biomarker trends from your uploads"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
        <p className="text-gray-600 mt-1">Uploaded reports and the structured markers derived from them</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Uploaded lab reports</CardTitle>
          <CardDescription>These are the files stored for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPanels || !latestPanel ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-900">No structured values recorded yet</AlertTitle>
              <AlertDescription className="text-amber-800">
                Your files are uploaded, but Medical Records needs the actual biomarkers from the
                report. Enter those values on Health Overview first.
              </AlertDescription>
            </Alert>
          ) : (
          <div className="space-y-4">
            {uploads.map((test) => (
              <div
                key={test.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">{test.original_filename}</p>
                  <p className="text-sm text-gray-500">Uploaded {formatUploadedAt(test.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{latestPanel ? "Latest biomarker panel" : "Biomarker trends"}</CardTitle>
          <CardDescription>
            {latestPanel
              ? `Structured values recorded for ${formatLabDate(latestPanel.recorded_at)}`
              : "Go to Health Overview and enter values from one uploaded report to generate records."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            When your reports are parsed into structured results, hemoglobin, lipids, glucose, and
            other trends will show here. There is no demo data—only your real extractions will
            appear.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
