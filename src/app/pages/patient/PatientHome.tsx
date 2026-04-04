import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Upload,
  CheckCircle,
  Activity,
  AlertCircle,
} from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import {
  getMetricAssessments,
  getLatestLabPanel,
  getMetricsForDashboard,
  getMetricValueLabel,
  getOverallStatus,
} from "../../../lib/labInsights";

export default function PatientHome() {
  const { hasLabReports, loading, uploads, uploadLabReport } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels, refetch: refetchPanels } =
    usePatientLabPanels();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const overall = latestPanel ? getOverallStatus(latestPanel) : null;
  const allMetrics = useMemo(
    () =>
      latestPanel
        ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing")
        : [],
    [latestPanel],
  );
  const topMetrics = latestPanel ? getMetricsForDashboard(latestPanel, 20) : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    try {
      const result = await uploadLabReport(selectedFile);
      await refetchPanels();
      toast.success(
        result.extracted
          ? result.message ?? "Lab report uploaded and biomarkers extracted."
          : "Lab report uploaded.",
      );
      if (!result.extracted && result.message) {
        toast(result.message);
      }
      setSelectedFile(null);
      const input = document.getElementById("lab-upload") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Health Overview</h1>
        <p className="text-gray-600 mt-1">
          {hasPanels
            ? "Your latest structured lab results are now driving the analysis across the portal."
            : hasLabReports
              ? "Your report files are saved. If extraction missed anything, add values from the report below."
              : "Upload a lab report to unlock medical records, vitals summaries, and personalized insights."}
        </p>
      </div>

      {latestPanel ? (
        <div className="mb-8 space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Tracked Biomarkers",
                value: Object.keys(latestPanel.biomarkers ?? {}).length,
                detail: "Live markers extracted from your latest uploaded report.",
                tone: "teal",
              },
              {
                label: "Outside Range",
                value: allMetrics.filter((metric) => metric.status === "high" || metric.status === "low").length,
                detail: "Markers that need the fastest follow-up.",
                tone: "rose",
              },
              {
                label: "Borderline",
                value: allMetrics.filter((metric) => metric.status === "borderline").length,
                detail: "Markers worth tracking before they drift further.",
                tone: "amber",
              },
              {
                label: "Uploaded Reports",
                value: uploads.length,
                detail: "Files currently powering your patient portal.",
                tone: "blue",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricStatusDonut
              metrics={allMetrics}
              title="Biomarker status mix"
              description="A quick read on how the latest panel is distributed across normal, borderline, and outside-range markers."
            />
            <MetricPriorityBars
              metrics={allMetrics}
              title="Highest-priority markers"
              description="The dashboard now ranks markers visually so the most urgent signals stay at the top."
              limit={10}
            />
          </div>

          <MetricSparklineGrid
            panels={panels}
            metricKeys={topMetrics.slice(0, 6).map((metric) => metric.key)}
            title="Recent marker movement"
            description="Small trend cards make repeat panels easier to compare at a glance."
          />
        </div>
      ) : null}

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload lab test results</CardTitle>
            <CardDescription>
              PDF or image files are stored securely. Supported PDF reports are extracted
              automatically; use manual entry only when extraction misses values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="lab-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
              />
              <label htmlFor="lab-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : "Click to choose a file"}
                </p>
                <p className="text-xs text-gray-500">PDF, PNG, or JPG up to 10MB</p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                <span>Ready to upload and extract biomarkers from the report.</span>
              </div>
            )}
            <Button
              className="w-full mt-4"
              disabled={!selectedFile || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Uploading…" : "Upload lab report"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your reports…</p>
      ) : panelsLoading ? (
        <p className="text-sm text-muted-foreground">Loading your lab analysis...</p>
      ) : hasLabReports ? (
        <div className="space-y-6">
          {latestPanel ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest lab analysis</CardTitle>
                <CardDescription>
                  Based on the values recorded for {formatLabDate(latestPanel.recorded_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert
                  className={
                    overall?.tone === "attention"
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950"
                  }
                >
                  {overall?.tone === "attention" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{overall?.label}</AlertTitle>
                  <AlertDescription>{overall?.summary}</AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {topMetrics.map((metric) => (
                    <div key={metric.key} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{metric.label}</p>
                      </div>
                      <p className="text-2xl font-semibold">{getMetricValueLabel(metric)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Range: {metric.range}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{metric.summary}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analysis pending values</CardTitle>
                <CardDescription>Uploads alone do not create biomarkers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your files are stored correctly, but this app needs the key report values entered
                  once before it can generate records, disease prediction, nutrition guidance, and
                  wellness insights.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
