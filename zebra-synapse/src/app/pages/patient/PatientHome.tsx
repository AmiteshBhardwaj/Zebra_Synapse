import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  Clock3,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getUploadProgressMeta, getUploadStatusMeta } from "../../../lib/labReportAnalysis";
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
import { BiomarkerInsightsBoard } from "../../components/patient/BiomarkerInsights";
import { BodyInsightPanel } from "../../components/patient/BodyInsightPanel";
import {
  EmptyStateCard,
  MetricCard,
  PatientPageHero,
  PatientPortalPage,
  SectionHeading,
  StatusPill,
  portalInsetClass,
  portalPanelClass,
  portalPrimaryButtonClass,
} from "../../components/patient/PortalTheme";

export default function PatientHome() {
  const { hasLabReports, loading, uploads, uploadLabReport } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels, refetch: refetchPanels } = usePatientLabPanels();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [focusedMetricKeys, setFocusedMetricKeys] = useState<string[]>([]);

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const overall = latestPanel ? getOverallStatus(latestPanel) : null;
  const allMetrics = useMemo(
    () => (latestPanel ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing") : []),
    [latestPanel],
  );
  const topMetrics = latestPanel ? getMetricsForDashboard(latestPanel, 20) : [];
  const recentUploads = uploads.slice(0, 4);
  const reviewRequiredCount = uploads.filter((upload) => upload.analysis_status === "review_required").length;
  const readyCount = uploads.filter((upload) => upload.analysis_status === "ready").length;
  const processingCount = uploads.filter(
    (upload) =>
      upload.analysis_status === "queued" ||
      upload.analysis_status === "processing" ||
      upload.analysis_status === "uploaded",
  ).length;
  const latestUpload = recentUploads[0] ?? null;
  const readinessProgress = latestUpload ? getUploadProgressMeta(latestUpload.analysis_status) : null;

  const heroDescription = hasPanels
    ? "Your latest structured panel is now powering trend charts, summaries, and follow-up views across the portal."
    : reviewRequiredCount > 0
    ? "One or more report extractions need review before they can drive the rest of the workspace."
    : hasLabReports
    ? "Files are stored. The extraction pipeline is preparing structured values for the rest of the portal."
    : "Upload a lab report to unlock the structured insight views across your patient workspace.";

  const readinessMessage = hasPanels
    ? "Insights are live across the portal."
    : reviewRequiredCount > 0
    ? "Open Medical Records to review low-confidence extraction fields."
    : processingCount > 0
    ? "Analysis is running in the background."
    : "Upload one report to unlock deeper insights.";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const input = document.getElementById("lab-upload") as HTMLInputElement | null;
    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
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
          : result.message ?? "Lab report uploaded.",
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
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Today&apos;s Status"
        title="Your clinical picture, made easier to read."
        description={heroDescription}
        icon={Activity}
        meta={[
          {
            label: "Portal status",
            value: hasPanels ? "Analysis active" : hasLabReports ? "Files stored" : "Awaiting upload",
          },
          {
            label: "Latest panel",
            value: latestPanel ? formatLabDate(latestPanel.recorded_at) : "No panel yet",
          },
          {
            label: "Reports",
            value: `${uploads.length} file${uploads.length === 1 ? "" : "s"}`,
          },
          {
            label: "Review queue",
            value: reviewRequiredCount > 0 ? `${reviewRequiredCount} require review` : "Clear",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tracked biomarkers"
          value={latestPanel ? Object.keys(latestPanel.biomarkers ?? {}).length : 0}
          detail="Structured values currently available from your latest lab panel."
          icon={FlaskConical}
          tone="orange"
        />
        <MetricCard
          label="Outside range"
          value={allMetrics.filter((metric) => metric.status === "high" || metric.status === "low").length}
          detail="Markers that likely need the fastest follow-up."
          icon={AlertCircle}
          tone="rose"
        />
        <MetricCard
          label="Published panels"
          value={readyCount}
          detail="Panels already extracted and ready for the rest of the portal."
          icon={CheckCircle}
          tone="green"
        />
        <MetricCard
          label="Pipeline stage"
          value={readinessProgress ? `${readinessProgress.percent}%` : "Idle"}
          detail="Readiness of the most recent upload in the extraction flow."
          icon={Clock3}
          tone="blue"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`${portalPanelClass} p-5 sm:p-6`}>
          <SectionHeading
            eyebrow="Upload"
            title="Drop in a report. Keep the rest automatic."
            description="PDF and image uploads are stored securely, then pushed into the extraction pipeline that powers your structured insights."
          />
          <div
            className={`mt-6 rounded-[28px] border border-dashed p-8 text-center transition-colors ${
              dragActive
                ? "border-[#ff9b61]/70 bg-[#ff9b61]/10"
                : "border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] hover:border-[#ff9b61]/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="lab-upload"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
            />
            <label htmlFor="lab-upload" className="cursor-pointer">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#ff7a33,#ff9b61)] shadow-[0_18px_36px_rgba(255,122,51,0.24)]">
                <Upload className="h-7 w-7 text-white" />
              </div>
              <p className="mb-2 text-sm font-medium text-white">
                {selectedFile ? selectedFile.name : "Drag and drop a lab report or click to choose a file"}
              </p>
              <p className="text-xs text-[#92a8c7]">PDF, PNG, or JPG up to 10MB</p>
            </label>
          </div>
          {selectedFile ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#cfe9ff]">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Ready to upload and queue server-side analysis.</span>
            </div>
          ) : null}
          <Button
            className={`mt-5 h-12 w-full rounded-2xl ${portalPrimaryButtonClass}`}
            disabled={!selectedFile || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Uploading..." : "Upload lab report"}
          </Button>
        </section>

        <section className={`${portalPanelClass} p-5 sm:p-6`}>
          <SectionHeading
            eyebrow="Flow"
            title="What the portal is doing now"
            description="Recent uploads and current readiness, surfaced without making you inspect each workflow step manually."
          />
          <div className="mt-6 space-y-4">
            {recentUploads.length > 0 ? (
              recentUploads.map((upload) => {
                const progress = getUploadProgressMeta(upload.analysis_status);
                return (
                  <div key={upload.id} className={`${portalInsetClass} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{upload.original_filename}</p>
                        <p className="mt-1 text-xs text-[#92a8c7]">
                          Added {new Date(upload.created_at).toLocaleDateString()}
                        </p>
                        {upload.last_error ? (
                          <p className="mt-1 text-xs text-[#ffd0a8]">{upload.last_error}</p>
                        ) : null}
                      </div>
                      <StatusPill status={getUploadStatusMeta(upload.analysis_status).label} />
                    </div>
                    <div className="mt-3">
                      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/40">
                        <span>{progress.stageLabel}</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <Progress
                        value={progress.percent}
                        className="h-2.5 bg-white/8 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#ff7a33] [&_[data-slot=progress-indicator]]:via-[#ffb17e] [&_[data-slot=progress-indicator]]:to-[#60d4ff]"
                      />
                      <p className="mt-2 text-xs text-[#92a8c7]">{progress.summary}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyStateCard
                icon={Upload}
                title="No reports uploaded yet"
                description="Your first uploaded report will appear here as soon as it is stored and sent to the extraction flow."
              />
            )}

            <div className="rounded-[28px] border border-[#60d4ff]/16 bg-[linear-gradient(135deg,rgba(96,212,255,0.1),rgba(255,255,255,0.02))] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9be8ff]">Care readiness</p>
              {readinessProgress ? (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/40">
                    <span>{readinessProgress.stageLabel}</span>
                    <span>{readinessProgress.percent}%</span>
                  </div>
                  <Progress
                    value={readinessProgress.percent}
                    className="h-2.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#ff7a33] [&_[data-slot=progress-indicator]]:to-[#60d4ff]"
                  />
                </div>
              ) : null}
              <p className="mt-3 text-lg font-medium text-white">{readinessMessage}</p>
            </div>
          </div>
        </section>
      </div>

      <section className={`${portalPanelClass} p-5 sm:p-6`}>
        <SectionHeading
          eyebrow="Latest analysis"
          title={latestPanel ? "Most recent panel summary" : "Latest analysis status"}
          description={
            latestPanel
              ? `Based on the values recorded for ${formatLabDate(latestPanel.recorded_at)}.`
              : "The workspace is waiting for structured values before deeper summaries can light up."
          }
        />

        <div className="mt-6 space-y-5">
          {loading ? <p className="text-sm text-[#92a8c7]">Loading your reports...</p> : null}
          {!loading && panelsLoading ? <p className="text-sm text-[#92a8c7]">Loading your lab analysis...</p> : null}

          {!loading && !panelsLoading && latestPanel ? (
            <>
              <Alert
                className={
                  overall?.tone === "attention"
                    ? "border-amber-500/25 bg-amber-500/10 text-amber-50"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-50"
                }
              >
                {overall?.tone === "attention" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                <AlertTitle>{overall?.label}</AlertTitle>
                <AlertDescription>{overall?.summary}</AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {topMetrics.slice(0, 4).map((metric) => (
                  <div key={metric.key} className={`${portalInsetClass} p-4`}>
                    <div className="mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#ffb17e]" />
                      <p className="text-sm font-medium text-white">{metric.label}</p>
                    </div>
                    <p className="text-2xl font-semibold text-white">{getMetricValueLabel(metric)}</p>
                    <p className="mt-1 text-xs text-[#92a8c7]">Range: {metric.range}</p>
                    <p className="mt-2 text-sm text-[#c8d8ec]">{metric.summary}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {!loading && !panelsLoading && !latestPanel && hasLabReports ? (
            <div className={`${portalInsetClass} p-5 text-sm leading-7 text-[#92a8c7]`}>
              Your files are stored correctly. The server-side pipeline has not published a panel yet,
              so the portal is waiting for either automatic extraction or your review of a low-confidence report.
            </div>
          ) : null}

          {!loading && !panelsLoading && !hasLabReports ? (
            <EmptyStateCard
              icon={FlaskConical}
              title="No structured panel yet"
              description="Upload one report to start generating the structured biomarker summary, status mix, and trend charts that power the portal."
            />
          ) : null}
        </div>
      </section>

      {latestPanel ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className={`${portalPanelClass} p-5 sm:p-6`}>
              <SectionHeading
                eyebrow="Signals"
                title="Body systems and marker focus"
                description="A top-level clinical read to help you understand where attention is clustering."
              />
              <div className="mt-6">
                <BodyInsightPanel
                  metrics={allMetrics}
                  focusedMetricKeys={focusedMetricKeys}
                  onFocusMetricKeys={setFocusedMetricKeys}
                />
              </div>
            </div>

            <div className={`${portalPanelClass} p-5 sm:p-6`}>
              <SectionHeading
                eyebrow="Actions"
                title="Why the portal says this matters"
                description="A compact set of current signals around storage, extraction, and next movement."
              />
              <div className="mt-6 space-y-3">
                {[
                  {
                    icon: ShieldCheck,
                    label: "Secure storage",
                    value: hasLabReports ? "Reports saved" : "Waiting for first upload",
                  },
                  {
                    icon: FlaskConical,
                    label: "Extraction",
                    value:
                      reviewRequiredCount > 0
                        ? `${reviewRequiredCount} report${reviewRequiredCount === 1 ? "" : "s"} need review`
                        : readyCount > 0
                        ? `${readyCount} published panel${readyCount === 1 ? "" : "s"}`
                        : processingCount > 0
                        ? "Server-side analysis running"
                        : "No extracted panel yet",
                  },
                  {
                    icon: ArrowUpRight,
                    label: "Recent files",
                    value: `${uploads.length} file${uploads.length === 1 ? "" : "s"} in portal`,
                  },
                  {
                    icon: Sparkles,
                    label: "AI support",
                    value: hasPanels ? "Insights active" : "Waiting for structured values",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`${portalInsetClass} flex items-center justify-between gap-3 p-4`}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
                          <Icon className="h-4 w-4 text-[#8fe7ff]" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-[#92a8c7]">{item.value}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-white/28" />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className={`${portalPanelClass} p-5 sm:p-6`}>
              <SectionHeading
                eyebrow="Deep dive"
                title="Biomarker board"
                description="Scan the highest-signal markers, then hover or focus to connect each marker back to the body-system view."
              />
              <div className="mt-6">
                <BiomarkerInsightsBoard
                  metrics={allMetrics}
                  focusedMetricKeys={focusedMetricKeys}
                  onHoverMetric={(key) => setFocusedMetricKeys(key ? [key] : [])}
                />
              </div>
            </div>

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

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <MetricPriorityBars
                metrics={allMetrics}
                title="Highest-priority markers"
                description="Urgent markers stay at the top so the next conversation is easier to prepare for."
                limit={10}
              />
              <MetricStatusDonut
                metrics={allMetrics}
                title="Biomarker status mix"
                description="A quick read on how the latest panel is distributed across normal, borderline, and outside-range markers."
              />
            </div>

            <MetricSparklineGrid
              panels={panels}
              metricKeys={topMetrics.slice(0, 6).map((metric) => metric.key)}
              title="Recent marker movement"
              description="Small trend cards make repeat panels easier to compare at a glance."
            />
          </section>
        </>
      ) : null}
    </PatientPortalPage>
  );
}
