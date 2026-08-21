import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AlertCircle, Bot, CheckCircle2, Edit3, FileText, KeyRound, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { getGeminiApiKey, hasGeminiApiKey, setGeminiApiKey, testGeminiApiKey, type GeminiKeyTestResult } from "../../../lib/geminiKey";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
import { BIOMARKER_DEFINITIONS, getBiomarkerDefinition } from "../../../lib/biomarkerCatalog";
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

const COMMON_EDIT_KEYS = [
  "fasting_glucose",
  "hemoglobin_a1c",
  "total_cholesterol",
  "ldl",
  "hdl",
  "triglycerides",
  "hemoglobin",
  "wbc",
  "platelets",
  "creatinine",
  "rbc_count",
  "mcv",
  "mch",
  "mchc",
  "rdw_cv",
  "tsh",
  "sgpt",
  "sgot",
  "urea",
  "uric_acid",
  "calcium",
  "vitamin_d_25_oh",
  "vitamin_b12",
];

export default function MedicalRecordsInsights() {
  const navigate = useNavigate();
  const {
    uploads,
    refetch: refetchUploads,
    deleteLabReport,
    analyzeUploadedLabReport,
    updateLabReportPanel,
  } = usePatientLabReports();
  const { panels, refetch: refetchPanels } = usePatientLabPanels();
  const { selectedReportId, setSelectedReportId, activePanel } = useActiveReport(panels);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [analyzingManual, setAnalyzingManual] = useState(false);

  // Manual biomarker edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBiomarkers, setEditBiomarkers] = useState<Record<string, string>>({});
  const [editDate, setEditDate] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [customKeyToAdd, setCustomKeyToAdd] = useState("");

  // Gemini API Key modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<GeminiKeyTestResult | null>(null);

  const handleTestKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(apiKeyInput);
      setTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveApiKey = () => {
    const cleaned = apiKeyInput.trim();
    setGeminiApiKey(cleaned);
    toast.success(cleaned ? "Gemini API Key saved!" : "Gemini API Key removed.");
    setIsApiKeyModalOpen(false);
    setTestResult(null);

    // If an upload is currently selected and in failed status, automatically trigger AI analysis
    if (cleaned && selectedUpload?.id && selectedUpload.analysis_status === "failed") {
      void handleTriggerAnalysis(selectedUpload.id);
    }
  };

  const openEditModal = () => {
    const initial: Record<string, string> = {};
    COMMON_EDIT_KEYS.forEach((k) => {
      initial[k] = activePanel?.biomarkers?.[k] != null ? String(activePanel.biomarkers[k]) : "";
    });
    if (activePanel?.biomarkers) {
      Object.entries(activePanel.biomarkers).forEach(([k, v]) => {
        if (v != null) initial[k] = String(v);
      });
    }
    setEditBiomarkers(initial);
    setEditDate(activePanel?.recorded_at ? activePanel.recorded_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsEditModalOpen(true);
  };

  const handleSaveManualBiomarkers = async () => {
    if (!selectedUpload?.id && !activePanel?.upload_id) {
      toast.error("No active report selected to save values.");
      return;
    }
    const targetUploadId = selectedUpload?.id || activePanel?.upload_id;
    if (!targetUploadId) return;

    setSavingManual(true);
    try {
      const parsed: Record<string, number> = {};
      Object.entries(editBiomarkers).forEach(([k, v]) => {
        const trimmed = v.trim();
        if (trimmed) {
          const num = Number(trimmed);
          if (Number.isFinite(num) && num > 0) {
            parsed[k] = num;
          }
        }
      });

      if (Object.keys(parsed).length === 0) {
        toast.error("Please enter at least one valid numerical biomarker value.");
        return;
      }

      await updateLabReportPanel(targetUploadId, parsed, editDate || undefined);
      await Promise.all([refetchPanels(), refetchUploads()]);
      toast.success("Biomarker panel saved successfully!");
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save biomarker panel.");
    } finally {
      setSavingManual(false);
    }
  };

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
                <div className="flex items-center gap-2">
                  <Button
                    onClick={openEditModal}
                    variant="outline"
                    className="h-9 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    Edit Biomarkers
                  </Button>
                  <Button
                    onClick={() => navigate(`/patient/ai-chat?reportId=${selectedReportId}`)}
                    className="h-9 px-4 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Bot className="h-4 w-4" />
                    Ask AI About Report
                  </Button>
                </div>
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
                        ? "Parsing document (PDF/scanned/handwritten) via Gemini Multimodal Vision & clinical catalog..."
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
                  <p className="text-base font-bold text-slate-900">Extraction incomplete</p>
                  <p className="max-w-md text-xs text-slate-500 leading-relaxed">
                    {selectedUpload.last_error ||
                      "Could not automatically extract biomarkers. You can retry AI Vision extraction or enter your lab values manually."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                      disabled={analyzingManual}
                      className="h-10 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      {analyzingManual ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running AI Vision...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Retry AI Extraction
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setApiKeyInput(getGeminiApiKey());
                        setIsApiKeyModalOpen(true);
                      }}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4 text-amber-700" />
                      Configure Gemini API Key
                    </Button>
                    <Button
                      onClick={openEditModal}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4 text-slate-600" />
                      Enter Values Manually
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteTargetId(selectedUpload.id)}
                      className="h-10 px-4 rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs gap-1.5 cursor-pointer"
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
                  <div className="flex items-center gap-3 mt-2">
                    {selectedUpload && (
                      <Button
                        onClick={() => void handleTriggerAnalysis(selectedUpload.id)}
                        disabled={analyzingManual}
                        className="h-10 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        Run AI Analysis Now
                      </Button>
                    )}
                    <Button
                      onClick={openEditModal}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4 text-slate-600" />
                      Enter Values Manually
                    </Button>
                  </div>
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
                  description="High-level proportion of optimal, borderline, and out-of-range markers."
                />
              </div>

              <MetricSparklineGrid
                panels={panels}
                title="Historical trend sparklines"
                description="Movement across all structured reports currently available in your record history."
                limit={6}
              />

              <Card className={portalPanelClass}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 text-base font-bold">Comprehensive Biomarker Table</CardTitle>
                      <CardDescription className="text-slate-500 text-xs">
                        All structured values extracted or recorded for this report.
                      </CardDescription>
                    </div>
                    <Button
                      onClick={openEditModal}
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl border-slate-200 text-slate-700 text-xs gap-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                      Edit Values
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className={portalTableWrapClass}>
                    <Table className={portalTableClass}>
                      <TableHeader className={portalTableHeadClass}>
                        <TableRow className="border-b border-slate-100">
                          <TableHead className="text-slate-700 font-bold text-xs py-3 px-4">Biomarker</TableHead>
                          <TableHead className="text-slate-700 font-bold text-xs py-3 px-4">Observed Value</TableHead>
                          <TableHead className="text-slate-700 font-bold text-xs py-3 px-4">Standard Reference</TableHead>
                          <TableHead className="text-slate-700 font-bold text-xs py-3 px-4 text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric, index) => (
                          <TableRow key={metric.key} className={portalTableRowClass(index)}>
                            <TableCell className={`${portalTableCellClass} font-semibold text-slate-900`}>
                              {metric.label}
                            </TableCell>
                            <TableCell className={`${portalTableCellClass} tabular-nums text-slate-800 font-medium`}>
                              {getMetricValueLabel(metric)}
                            </TableCell>
                            <TableCell className={`${portalTableCellClass} text-slate-400 text-xs`}>
                              {metric.range || "Standard clinical range"}
                            </TableCell>
                            <TableCell className={`${portalTableCellClass} text-right`}>
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

      {/* Manual Biomarker Editor Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-slate-100 bg-white text-slate-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-lime-600" />
              Review & Edit Biomarker Values
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Verify the extracted numbers against your original report or fill in missing readings manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Report Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-slate-50/70 text-xs text-slate-800"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px] text-slate-400">
                Primary Biomarker Values
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {COMMON_EDIT_KEYS.map((key) => {
                  const def = getBiomarkerDefinition(key);
                  const label = def?.label || key.replace(/_/g, " ");
                  const unit = def?.units?.[0] || "";
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">{label}</Label>
                        {unit && <span className="text-[10px] text-slate-400 font-medium">({unit})</span>}
                      </div>
                      <Input
                        type="number"
                        step="any"
                        placeholder={`e.g. ${def?.reference || "value"}`}
                        value={editBiomarkers[key] ?? ""}
                        onChange={(e) =>
                          setEditBiomarkers((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="h-9 rounded-xl border-slate-200 bg-slate-50/70 text-xs text-slate-800 tabular-nums focus:bg-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom / additional biomarkers added */}
            {Object.keys(editBiomarkers).filter((k) => !COMMON_EDIT_KEYS.includes(k)).length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px] text-slate-400">
                  Additional Biomarkers
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Object.keys(editBiomarkers)
                    .filter((k) => !COMMON_EDIT_KEYS.includes(k))
                    .map((key) => {
                      const def = getBiomarkerDefinition(key);
                      const label = def?.label || key.replace(/_/g, " ");
                      const unit = def?.units?.[0] || "";
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-700">{label}</Label>
                            {unit && <span className="text-[10px] text-slate-400 font-medium">({unit})</span>}
                          </div>
                          <Input
                            type="number"
                            step="any"
                            value={editBiomarkers[key] ?? ""}
                            onChange={(e) =>
                              setEditBiomarkers((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="h-9 rounded-xl border-slate-200 bg-slate-50/70 text-xs text-slate-800 tabular-nums"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Add extra biomarker from catalog */}
            <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
              <Select value={customKeyToAdd} onValueChange={(val) => {
                if (val && !editBiomarkers[val]) {
                  setEditBiomarkers((prev) => ({ ...prev, [val]: "" }));
                  setCustomKeyToAdd("");
                }
              }}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs text-slate-700 flex-1">
                  <SelectValue placeholder="+ Add another biomarker test..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-slate-100 bg-white text-slate-800 shadow-xl rounded-xl">
                  {BIOMARKER_DEFINITIONS.filter((d) => editBiomarkers[d.key] === undefined).map((d) => (
                    <SelectItem key={d.key} value={d.key} className="text-xs py-2">
                      {d.label} ({d.units[0] || "value"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-slate-700 text-xs"
              disabled={savingManual}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveManualBiomarkers()}
              disabled={savingManual}
              className="h-9 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              {savingManual ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Panel...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Biomarkers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gemini API Key Configuration Dialog */}
      <Dialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
        <DialogContent className="max-w-md border-slate-100 bg-white text-slate-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Configure Gemini AI API Key
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs leading-relaxed">
              Google Gemini Vision enables AI recognition for scanned PDFs, smartphone photos, and handwritten medical records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Google AI Studio / Gemini API Key</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTestKey}
                  disabled={testingKey || !apiKeyInput.trim()}
                  className="h-6 px-2 text-[11px] font-semibold text-lime-700 hover:bg-lime-50 rounded-lg cursor-pointer"
                >
                  {testingKey ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Test Key & Models
                    </>
                  )}
                </Button>
              </div>
              <Input
                type="password"
                placeholder="AIzaSy... or API key"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
              />
              <p className="text-[11px] text-slate-400">
                Your key is stored in your browser session (<code className="text-slate-600">localStorage</code>) and tested against Google Generative Language APIs.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                  testResult.ok
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold text-xs">{testResult.message}</p>
                  {testResult.availableModels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {testResult.availableModels.map((m) => (
                        <span
                          key={m}
                          className="px-1.5 py-0.5 rounded-md bg-white/80 border border-emerald-200 text-[10px] font-mono text-emerald-800"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  {!testResult.ok && (
                    <p className="text-[11px] text-amber-700/90 pt-0.5">
                      Don't worry: If Gemini AI is unavailable, our built-in local OCR engine will automatically extract all report biomarkers!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsApiKeyModalOpen(false)}
              className="h-9 rounded-xl border-slate-200 text-slate-700 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveApiKey}
              className="h-9 px-5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              Save & Run OCR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
