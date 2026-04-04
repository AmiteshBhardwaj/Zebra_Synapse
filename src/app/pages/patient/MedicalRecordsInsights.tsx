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

export default function MedicalRecordsInsights() {
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const metrics = latestPanel ? getMetricAssessments(latestPanel) : [];

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
        title="Medical Records"
        description="View lab tests and biomarker trends from your uploads"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
        <p className="mt-1 text-gray-600">Uploaded reports and the structured markers derived from them</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Uploaded lab reports</CardTitle>
          <CardDescription>These are the files stored for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uploads.map((test) => (
              <div key={test.id} className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <FileText className="h-5 w-5 text-indigo-600" />
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

      {!hasPanels || !latestPanel ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">No structured values recorded yet</AlertTitle>
          <AlertDescription className="text-amber-800">
            Your files are uploaded, but Medical Records needs the actual biomarkers from the
            report. Go to Health Overview and enter the values for one of the uploaded reports.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Latest biomarker panel</CardTitle>
            <CardDescription>
              Structured values recorded for {formatLabDate(latestPanel.recorded_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marker</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Interpretation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.key}>
                    <TableCell>{metric.label}</TableCell>
                    <TableCell>{getMetricValueLabel(metric)}</TableCell>
                    <TableCell>{metric.range}</TableCell>
                    <TableCell className="capitalize">{metric.status}</TableCell>
                    <TableCell className="whitespace-normal">{metric.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Panel history</h2>
              {panels.map((panel) => (
                <div key={panel.id} className="rounded-lg border p-4">
                  <p className="font-medium">{formatLabDate(panel.recorded_at)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A1c: {panel.hemoglobin_a1c ?? "-"} | Fasting glucose: {panel.fasting_glucose ?? "-"} |
                    LDL: {panel.ldl ?? "-"} | Triglycerides: {panel.triglycerides ?? "-"}
                  </p>
                  {panel.notes ? <p className="mt-2 text-sm text-muted-foreground">{panel.notes}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
