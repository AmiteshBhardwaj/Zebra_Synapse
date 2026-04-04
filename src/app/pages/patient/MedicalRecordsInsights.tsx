import { AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
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
  const metrics = latestPanel
    ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing")
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
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Panel Date",
                value: formatLabDate(latestPanel.recorded_at),
                detail: "The latest structured report currently driving your records.",
                tone: "blue",
              },
              {
                label: "Extracted Biomarkers",
                value: metrics.length,
                detail: "Markers available for visual review and downstream analysis.",
                tone: "teal",
              },
              {
                label: "Abnormal Markers",
                value: metrics.filter((metric) => metric.status === "high" || metric.status === "low").length,
                detail: "Markers currently outside the configured range.",
                tone: "rose",
              },
              {
                label: "Report History",
                value: panels.length,
                detail: "Panels available for time-based comparison.",
                tone: "amber",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricStatusDonut
              metrics={metrics}
              title="Panel composition"
              description="A visual split of how your current report distributes across normal and flagged markers."
            />
            <MetricPriorityBars
              metrics={metrics}
              title="Top flagged biomarkers"
              description="The most relevant biomarkers are ranked visually before the full table."
              limit={12}
            />
          </div>

          <MetricSparklineGrid
            panels={panels}
            metricKeys={metrics.slice(0, 6).map((metric) => metric.key)}
            title="Panel trend snapshots"
            description="Each mini-chart tracks how a key marker moved across recent recorded panels."
          />

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
                      {Object.keys(panel.biomarkers ?? {}).length} biomarkers extracted from this panel
                    </p>
                    {panel.notes ? <p className="mt-2 text-sm text-muted-foreground">{panel.notes}</p> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
