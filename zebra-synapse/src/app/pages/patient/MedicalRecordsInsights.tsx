import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AlertCircle, Bot, FileText, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getUploadProgressMeta, isPendingUploadStatus } from "../../../lib/labReportAnalysis";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { formatLabDate } from "../../../lib/labPanels";
import { getMetricAssessments, getMetricValueLabel } from "../../../lib/labInsights";
import {
  PatientPageHero,
  PatientPortalPage,
  StatusPill,
  portalInsetClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
  portalTableCellClass,
  portalTableClass,
  portalTableHeadClass,
  portalTableRowClass,
  portalTableWrapClass,
} from "../../components/patient/PortalTheme";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

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
  const navigate = useNavigate();
  const { uploads, refetch: refetchUploads, deleteLabReport, analyzeUploadedLabReport } = usePatientLabReports();
  const { panels, refetch: refetchPanels } = usePatientLabPanels();
  const { selectedReportId, setSelectedReportId, activePanel } = useActiveReport(panels);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [analyzingManual, setAnalyzingManual] = useState(false);

  // Poll both uploads and panels while any report is still being processed
  const hasPendingUploads = uploads.some((u) => isPendingUploadStatus(u.analysis_status));
  useEffect(() => {
    if (!hasPendingUploads) return;
    const id = window.setInterval(() => {
      void refetchUploads();
      void refetchPanels();
    }, 4000);
    return () => window.clearInterval(id);
  }, [hasPendingUploads, refetchUploads, refetchPanels]);

  // The upload row matching the currently selected report (if any)
  const selectedUpload = useMemo(
    () => uploads.find((u) => u.id === selectedReportId) ?? null,
    [uploads, selectedReportId],
  );

  const handleTriggerAnalysis = async (uploadId: string) => {
    setAnalyzingManual(true);
    try {
      await analyzeUploadedLabReport(uploadId);
      await refetchPanels();
      await refetchUploads();
      toast.success("Analysis complete! Structured biomarker panel extracted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis extraction failed.");
    } finally {
      setAnalyzingManual(false);
    }
  };

  // Auto-trigger client-side analysis if selected upload is stuck in pending
  useEffect(() => {
    if (
      selectedUpload &&
      isPendingUploadStatus(selectedUpload.analysis_status) &&
      !activePanel &&
      !analyzingManual
    ) {
      const timer = window.setTimeout(() => {
        void handleTriggerAnalysis(selectedUpload.id);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [selectedUpload?.id, selectedUpload?.analysis_status, activePanel]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteLabReport(deleteTargetId);
      await refetchUploads();
      if (selectedReportId === deleteTargetId) setSelectedReportId("none");
      toast.success("Lab report deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lab report.");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  // Available reports dropdown options
  const availableReports = useMemo(() => {
    const list: Array<{ id: string; name: string; date: string }> = [];
    uploads.forEach((u) => {
      list.push({
        id: u.id,
        name: u.original_filename,
        date: new Date(u.created_at).toLocaleDateString(),
      });
    });
    if (uploads.length === 0) {
      panels.forEach((p) => {
        list.push({
          id: p.id,
          name: `Structured Lab Panel`,
          date: formatLabDate(p.recorded_at),
        });
      });
    }
    return list;
  }, [uploads, panels]);

  const metrics = activePanel
    ? getMetricAssessments(activePanel).filter((metric) => metric.status !== "missing")
    : [];

  return (
    <PatientPortalPage>
      {/* 1. INITIAL EMPTY STATE SCREEN UNTIL A MEDICAL REPORT IS SELECTED */}
      {selectedReportId === "none" || !availableReports.some((r) => r.id === selectedReportId) ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4 py-12">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-lime-500/15 text-lime-600 shadow-sm">
            <FileText className="h-9 w-9 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 font-['Manrope']">
            {availableReports.length > 0 ? "Please choose a medical report" : "No medical reports uploaded yet"}
          </h1>

          <p className="max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
            {availableReports.length > 0
              ? "Select a medical report from your records below to view extracted biomarker panels, trend movement, and record history."
              : "You do not have any uploaded medical reports. Upload a lab report on the Home page to view extracted biomarker panels and trend movement."}
          </p>

          {availableReports.length > 0 ? (
            <div className="w-full max-w-sm sm:max-w-md">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-white px-4 text-xs sm:text-sm font-medium text-slate-800 shadow-sm hover:border-lime-400 focus:ring-2 focus:ring-lime-500/20 transition-all cursor-pointer">
                  <SelectValue placeholder="Select a medical report..." />
                </SelectTrigger>
                <SelectContent className="border-slate-100 bg-white text-slate-800 shadow-xl rounded-2xl p-1.5">
                  <SelectItem value="none" className="py-2.5 text-slate-400 cursor-pointer text-xs sm:text-sm">
                    -- Select a Medical Report --
                  </SelectItem>
                  {availableReports.map((report) => (
                    <SelectItem
                      key={report.id}
                      value={report.id}
                      className="py-2.5 px-3 text-slate-800 font-medium focus:bg-lime-50 focus:text-lime-900 cursor-pointer rounded-xl text-xs sm:text-sm"
                    >
                      📄 {report.name} ({report.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : (
        /* 2. FULL MEDICAL RECORDS WORKSPACE WHEN A REPORT IS SELECTED */
        <>
          {/* Top Report Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Active Medical Record</p>
                <p className="text-xs font-bold text-slate-900">
                  {availableReports.find((r) => r.id === selectedReportId)?.name ?? "Selected Record"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto min-w-[240px]">
                <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                  <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-800 hover:border-lime-400 transition-all cursor-pointer">
                    <SelectValue placeholder="Change medical report..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-100 bg-white text-slate-800 shadow-xl rounded-xl p-1">
                    <SelectItem value="none" className="py-2 text-slate-400 cursor-pointer text-xs">
                      -- Clear Selection --
                    </SelectItem>
                    {availableReports.map((report) => (
                      <SelectItem key={report.id} value={report.id} className="py-2 text-slate-800 text-xs cursor-pointer focus:bg-lime-50 focus:text-lime-900 rounded-lg">
                        📄 {report.name} ({report.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReportId !== "none" && (
                <Button
                  onClick={() => navigate(`/patient/ai-chat?reportId=${selectedReportId}`)}
                  className="h-9 px-4 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all shrink-0"
                >
                  <Bot className="h-4 w-4" />
                  Ask AI About Report
                </Button>
              )}
            </div>
          </div>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-slate-900 text-base font-bold">Uploaded lab reports</CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                These files are stored for your account and feed the downstream record views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-2">
                {uploads.map((test) => (
                  <div key={test.id} className="group relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 transition-all">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-xs sm:text-sm text-slate-900">{test.original_filename}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Uploaded {formatUploadedAt(test.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Delete report"
                        onClick={() => setDeleteTargetId(test.id)}
                        className="shrink-0 inline-flex items-center justify-center rounded-lg p-2 text-rose-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {activePanel ? (
            <OverviewStatCards
              stats={[
                {
                  label: "Panel Date",
                  value: formatLabDate(activePanel.recorded_at),
                  detail: "Date associated with this recorded laboratory panel.",
                  tone: "teal",
                },
                {
                  label: "Extracted Biomarkers",
                  value: Object.keys(activePanel.biomarkers ?? {}).length,
                  detail: "Total number of structured markers in this panel.",
                  tone: "amber",
                },
                {
                  label: "Abnormal Markers",
                  value: metrics.filter((m) => m.status === "high" || m.status === "low").length,
                  detail: "Markers flagged outside the standard reference range.",
                  tone: "rose",
                },
                {
                  label: "Report History",
                  value: uploads.length,
                  detail: "Total lab report files attached to this patient record.",
                  tone: "blue",
                },
              ]}
            />
          ) : (
            /* No panel data yet — show a contextual status instead of a blank page */
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white py-14 px-6 text-center shadow-sm">
              {selectedUpload && isPendingUploadStatus(selectedUpload.analysis_status) ? (() => {
                const progress = getUploadProgressMeta(selectedUpload.analysis_status);
                return (
                  <>
                    {/* Percentage badge */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-lime-200 bg-lime-50 shadow-sm">
                      {analyzingManual ? (
                        <Loader2 className="h-6 w-6 text-lime-600 animate-spin" />
                      ) : (
                        <span className="text-lg font-bold text-lime-700 tabular-nums">{progress.percent}%</span>
                      )}
                    </div>

                    {/* Title + stage label */}
                    <p className="text-base font-bold text-slate-900">
                      {analyzingManual ? "Extracting biomarker values…" : "Analysing your report…"}
                    </p>
                    <p className="text-xs font-semibold tracking-wider text-lime-700 uppercase">
                      {analyzingManual ? "Client AI Extraction Active" : progress.stageLabel}
                    </p>

                    {/* Progress bar */}
                    <div className="w-full max-w-md">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                        {/* Filled track */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-lime-500"
                          style={{
                            width: `${analyzingManual ? 85 : progress.percent}%`,
                            transition: "width 700ms cubic-bezier(0.4,0,0.2,1)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Summary text */}
                    <p className="max-w-sm text-xs text-slate-500 mt-1">
                      {analyzingManual
                        ? "Parsing lab document lines and matching against clinical biomarker catalog..."
                        : progress.summary}
                    </p>

                    {/* Action trigger button */}
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                        disabled={analyzingManual}
                        className="h-10 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        {analyzingManual ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting Values...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Extract Biomarkers Now
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                );
              })()
              : selectedUpload?.analysis_status === "failed" ? (
                <>
                  <AlertCircle className="h-10 w-10 text-rose-500" />
                  <p className="text-base font-bold text-slate-900">Extraction failed or incomplete</p>
                  <p className="max-w-sm text-xs text-slate-500">
                    {selectedUpload.last_error ||
                      "We couldn't automatically extract biomarker data from this report. You can retry analysis or re-upload a cleaner PDF."}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                      disabled={analyzingManual}
                      className="h-10 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      {analyzingManual ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Retrying Extraction...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Retry AI Extraction
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteTargetId(selectedUpload.id)}
                      className="h-10 px-4 rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Report
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 text-slate-400" />
                  <p className="text-base font-bold text-slate-900">No biomarker data found</p>
                  <p className="max-w-sm text-xs text-slate-500">
                    No structured lab panel was linked to this report yet.
                  </p>
                  {selectedUpload && (
                    <Button
                      onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                      disabled={analyzingManual}
                      className="mt-2 h-10 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      Run Analysis Now
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {metrics.length > 0 ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <MetricPriorityBars
                  metrics={metrics}
                  title="Biomarker priorities"
                  description="Markers from this panel sorted by deviation severity so urgent readings stay clear."
                  limit={8}
                />
                <MetricStatusDonut
                  metrics={metrics}
                  title="Panel status distribution"
                  description="High-level breakdown of normal, borderline, and outside-range markers."
                />
              </div>

              <MetricSparklineGrid
                panels={panels}
                metricKeys={metrics.slice(0, 6).map((m) => m.key)}
                title="Historical marker movement"
                description="Compare how values shifted across historical lab panels."
              />

              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle className="text-slate-900 text-base font-bold">Structured biomarker values</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">
                    Full breakdown of lab values extracted for {activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={portalTableWrapClass}>
                    <Table className={portalTableClass}>
                      <TableHeader>
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className={portalTableHeadClass}>Biomarker</TableHead>
                          <TableHead className={portalTableHeadClass}>Value</TableHead>
                          <TableHead className={portalTableHeadClass}>Reference Range</TableHead>
                          <TableHead className={portalTableHeadClass}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric, idx) => (
                          <TableRow key={metric.key} className={portalTableRowClass(idx)}>
                            <TableCell className={`${portalTableCellClass} font-semibold text-slate-900`}>
                              {metric.label}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              {getMetricValueLabel(metric)}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              {metric.range}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              <StatusPill status={metric.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent className="border-slate-100 bg-white text-slate-800 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold">Delete lab report?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              This will permanently remove the file, all extracted biomarker panels, and any chat history linked to this report.
              <span className="mt-2 block font-semibold text-rose-600">
                {uploads.find((u) => u.id === deleteTargetId)?.original_filename ?? ""}
              </span>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 rounded-xl text-xs font-semibold"
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PatientPortalPage>
  );
}
