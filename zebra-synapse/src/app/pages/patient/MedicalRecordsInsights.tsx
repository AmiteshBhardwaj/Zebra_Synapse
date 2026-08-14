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
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_20px_50px_rgba(255,122,51,0.22)]">
            <FileText className="h-9 w-9 text-[#ff9b61]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            {availableReports.length > 0 ? "Please choose a medical report" : "No medical reports uploaded yet"}
          </h1>

          <p className="max-w-md text-sm text-[#92a8c7] leading-relaxed mb-8">
            {availableReports.length > 0
              ? "Select a medical report from your records below to view extracted biomarker panels, trend movement, and record history."
              : "You do not have any uploaded medical reports. Upload a lab report on the Home page to view extracted biomarker panels and trend movement."}
          </p>

          {availableReports.length > 0 ? (
            <div className="w-full max-w-sm sm:max-w-md">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-[#ff9b61]/40 bg-[#0d1829]/95 px-5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:border-[#ff9b61] focus:ring-2 focus:ring-[#ff7a33]/50 transition-all cursor-pointer">
                  <SelectValue placeholder="Select a medical report..." />
                </SelectTrigger>
                <SelectContent className="border-white/14 bg-[#0a1323] text-white shadow-2xl rounded-2xl p-1.5">
                  <SelectItem value="none" className="py-3 text-white/40 cursor-pointer">
                    -- Select a Medical Report --
                  </SelectItem>
                  {availableReports.map((report) => (
                    <SelectItem
                      key={report.id}
                      value={report.id}
                      className="py-3 px-3 text-white font-medium hover:bg-white/10 cursor-pointer rounded-xl"
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff9c61]/15 border border-[#ff9c61]/30">
                <FileText className="h-4.5 w-4.5 text-[#ff9c61]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/45">Active Medical Record</p>
                <p className="text-xs font-semibold text-white">
                  {availableReports.find((r) => r.id === selectedReportId)?.name ?? "Selected Record"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto min-w-[240px]">
                <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/14 bg-[#0d1829]/90 text-xs font-medium text-white shadow-sm hover:border-[#ff9b61] transition-all cursor-pointer">
                    <SelectValue placeholder="Change medical report..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/14 bg-[#0a1323] text-white shadow-2xl rounded-xl p-1">
                    <SelectItem value="none" className="py-2 text-white/40 cursor-pointer">
                      -- Clear Selection --
                    </SelectItem>
                    {availableReports.map((report) => (
                      <SelectItem key={report.id} value={report.id} className="py-2 text-white text-xs cursor-pointer">
                        📄 {report.name} ({report.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReportId !== "none" && (
                <Button
                  onClick={() => navigate(`/patient/ai-chat?reportId=${selectedReportId}`)}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-semibold text-xs gap-2 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all shrink-0"
                >
                  <Bot className="h-4 w-4" />
                  Ask AI About Report
                </Button>
              )}
            </div>
          </div>



          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Uploaded lab reports</CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                These files are stored for your account and feed the downstream record views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                {uploads.map((test) => (
                  <div key={test.id} className="group relative rounded-[1.2rem] border border-white/8 bg-[#111111]/80 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FF8C42] shadow-[0_12px_28px_rgba(255,106,0,0.25)]">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{test.original_filename}</p>
                        <p className="mt-1 text-sm text-[#A1A1AA]">
                          Uploaded {formatUploadedAt(test.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        title="Delete report"
                        onClick={() => setDeleteTargetId(test.id)}
                        className="shrink-0 inline-flex items-center justify-center rounded-lg p-2 text-rose-400/70 transition-all hover:bg-rose-500/20 hover:text-rose-400"
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
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] py-16 px-6 text-center">
              {selectedUpload && isPendingUploadStatus(selectedUpload.analysis_status) ? (() => {
                const progress = getUploadProgressMeta(selectedUpload.analysis_status);
                return (
                  <>
                    {/* Percentage badge */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                      {analyzingManual ? (
                        <Loader2 className="h-7 w-7 text-cyan-300 animate-spin" />
                      ) : (
                        <span className="text-xl font-bold text-cyan-300 tabular-nums">{progress.percent}%</span>
                      )}
                    </div>

                    {/* Title + stage label */}
                    <p className="text-base font-semibold text-white">
                      {analyzingManual ? "Extracting biomarker values…" : "Analysing your report…"}
                    </p>
                    <p className="text-xs font-medium tracking-wide text-cyan-400/80 uppercase">
                      {analyzingManual ? "Client AI Extraction Active" : progress.stageLabel}
                    </p>

                    {/* Progress bar */}
                    <div className="w-full max-w-md">
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] border border-white/[0.06]">
                        {/* Filled track */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.45)]"
                          style={{
                            width: `${analyzingManual ? 85 : progress.percent}%`,
                            transition: "width 700ms cubic-bezier(0.4,0,0.2,1)",
                          }}
                        >
                          {/* Shimmer sweep */}
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                              backgroundSize: "200% 100%",
                              animation: "shimmerSweep 2s ease-in-out infinite",
                            }}
                          />
                          {/* Leading-edge glow dot */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)] animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Summary text */}
                    <p className="max-w-sm text-sm text-[#92a8c7] mt-1">
                      {analyzingManual
                        ? "Parsing lab document lines and matching against clinical biomarker catalog..."
                        : progress.summary}
                    </p>

                    {/* Action trigger button */}
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                        disabled={analyzingManual}
                        className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
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

                    {/* Inline keyframes for shimmer */}
                    <style>{`
                      @keyframes shimmerSweep {
                        0%   { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                      }
                    `}</style>
                  </>
                );
              })()
              : selectedUpload?.analysis_status === "failed" ? (
                <>
                  <AlertCircle className="h-10 w-10 text-rose-400" />
                  <p className="text-base font-semibold text-white">Extraction failed or incomplete</p>
                  <p className="max-w-sm text-sm text-[#92a8c7]">
                    {selectedUpload.last_error ||
                      "We couldn't automatically extract biomarker data from this report. You can retry analysis or re-upload a cleaner PDF."}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                      disabled={analyzingManual}
                      className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
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
                      className="h-10 px-4 rounded-xl border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Report
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 text-[#92a8c7]" />
                  <p className="text-base font-semibold text-white">No biomarker data found</p>
                  <p className="max-w-sm text-sm text-[#92a8c7]">
                    No structured lab panel was linked to this report yet.
                  </p>
                  {selectedUpload && (
                    <Button
                      onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                      disabled={analyzingManual}
                      className="mt-2 h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
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
                  <CardTitle className="text-white">Structured biomarker values</CardTitle>
                  <CardDescription className="text-[#A1A1AA]">
                    Full breakdown of lab values extracted for {activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={portalTableWrapClass}>
                    <Table className={portalTableClass}>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className={portalTableHeadClass}>Biomarker</TableHead>
                          <TableHead className={portalTableHeadClass}>Value</TableHead>
                          <TableHead className={portalTableHeadClass}>Reference Range</TableHead>
                          <TableHead className={portalTableHeadClass}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric, idx) => (
                          <TableRow key={metric.key} className={portalTableRowClass(idx)}>
                            <TableCell className={`${portalTableCellClass} font-medium text-white`}>
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
        <AlertDialogContent className="border-rose-500/25 bg-[#0d131f] text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete lab report?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#92a8c7]">
              This will permanently remove the file, all extracted biomarker panels, and any chat history linked to this report.
              <span className="mt-2 block font-semibold text-rose-300">
                {uploads.find((u) => u.id === deleteTargetId)?.original_filename ?? ""}
              </span>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PatientPortalPage>
  );
}
