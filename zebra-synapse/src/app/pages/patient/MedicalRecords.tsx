import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
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
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { usePatientLabReportExtractions } from "../../../hooks/usePatientLabReportExtractions";
import { useActiveReport } from "../../../hooks/useActiveReport";
import {
  buildPublishedPanelSummary,
  coerceBiomarkerMap,
  coerceFieldConfidenceMap,
  coerceFieldSourcesMap,
  getUploadStatusMeta,
  sortBiomarkerKeys,
} from "../../../lib/labReportAnalysis";
import { formatLabDate } from "../../../lib/labPanels";
import { getMetricAssessments } from "../../../lib/labInsights";
import { getBiomarkerDefinition } from "../../../lib/biomarkerCatalog";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";

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

function toneClass(status: ReturnType<typeof getUploadStatusMeta>["tone"]) {
  switch (status) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "warning":
      return "border-[#FFC857]/20 bg-[#FFC857]/10 text-[#ffe3a3]";
    case "danger":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "info":
      return "border-[#3B82F6]/20 bg-[#3B82F6]/10 text-[#c7ddff]";
    default:
      return "border-white/10 bg-white/[0.06] text-white/75";
  }
}

export default function MedicalRecords() {
  const { uploads, refetch: refetchUploads, deleteLabReport } = usePatientLabReports();
  const { panels, refetch: refetchPanels } = usePatientLabPanels();
  const { extractions, publishReviewedExtraction, refetch: refetchExtractions } = usePatientLabReportExtractions();
  const { selectedReportId, setSelectedReportId, activePanel } = useActiveReport(panels);

  // Available reports dropdown options
  const availableReports = useMemo(() => {
    const list: Array<{ id: string; name: string; date: string }> = [];
    if (uploads.length > 0) {
      uploads.forEach((u) => {
        list.push({
          id: u.id,
          name: u.original_filename,
          date: new Date(u.created_at).toLocaleDateString(),
        });
      });
    } else if (panels.length > 0) {
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

  const latestMetrics = useMemo(
    () => (activePanel ? getMetricAssessments(activePanel).filter((metric) => metric.status !== "missing") : []),
    [activePanel],
  );
  const uploadsById = useMemo(() => new Map(uploads.map((upload) => [upload.id, upload])), [uploads]);
  const pendingExtractions = useMemo(
    () =>
      extractions.filter((extraction) => {
        const upload = uploadsById.get(extraction.upload_id);
        return extraction.review_state === "review_required" || upload?.analysis_status === "review_required";
      }),
    [extractions, uploadsById],
  );
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const selectedExtraction = useMemo(
    () => pendingExtractions.find((extraction) => extraction.id === selectedReviewId) ?? pendingExtractions[0] ?? null,
    [pendingExtractions, selectedReviewId],
  );
  const [reviewDate, setReviewDate] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewValues, setReviewValues] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteLabReport(deleteTargetId);
      await Promise.all([refetchUploads(), refetchPanels(), refetchExtractions()]);
      // If the deleted report was the active selection, reset to none
      if (selectedReportId === deleteTargetId) setSelectedReportId("none");
      toast.success("Lab report deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lab report.");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  useEffect(() => {
    if (!selectedExtraction) {
      setReviewDate("");
      setReviewNotes("");
      setReviewValues({});
      return;
    }

    const biomarkers = coerceBiomarkerMap(selectedExtraction.biomarkers_json);
    setReviewDate(selectedExtraction.extracted_recorded_at ?? new Date().toISOString().slice(0, 10));
    setReviewNotes(selectedExtraction.review_notes ?? "");
    setReviewValues(
      Object.fromEntries(
        Object.entries(biomarkers).map(([key, value]) => [key, String(value)]),
      ),
    );
  }, [selectedExtraction]);

  const handlePublishReview = async () => {
    if (!selectedExtraction) return;
    const upload = uploadsById.get(selectedExtraction.upload_id);
    if (!upload) {
      toast.error("The source upload could not be found for this extraction.");
      return;
    }

    const biomarkers = Object.fromEntries(
      Object.entries(reviewValues)
        .map(([key, value]) => [key, Number(value.trim())] as const)
        .filter((entry) => Number.isFinite(entry[1])),
    );

    if (!Object.keys(biomarkers).length) {
      toast.error("Enter at least one biomarker value before publishing.");
      return;
    }

    setPublishing(true);
    try {
      await publishReviewedExtraction({
        extractionId: selectedExtraction.id,
        uploadId: selectedExtraction.upload_id,
        recordedAt: reviewDate,
        biomarkers,
        reviewNotes,
      });
      await Promise.all([refetchUploads(), refetchPanels(), refetchExtractions()]);
      toast.success("Reviewed extraction published to your live lab panels.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish the reviewed extraction.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <PatientPortalPage>
      {/* 1. EMPTY STATE UNTIL A MEDICAL REPORT IS SELECTED */}
      {selectedReportId === "none" || !availableReports.some((r) => r.id === selectedReportId) ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4 py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 shadow-[0_20px_50px_rgba(6,182,212,0.2)]">
            <FileText className="h-9 w-9 text-cyan-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            {availableReports.length > 0 ? "Please choose a medical report" : "No medical reports uploaded yet"}
          </h1>

          <p className="max-w-md text-sm text-slate-400 leading-relaxed mb-8">
            {availableReports.length > 0
              ? "Select a medical report from your records below to view extraction details, low-confidence fields, and published biomarker panels."
              : "You do not have any uploaded medical records. Upload a lab report on the Home page to view extraction details and published biomarker panels."}
          </p>

          {availableReports.length > 0 ? (
            <div className="w-full max-w-sm sm:max-w-md">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-cyan-500/40 bg-slate-900/90 px-5 text-sm font-medium text-white shadow-2xl hover:border-cyan-400 focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer">
                  <SelectValue placeholder="Select a medical report..." />
                </SelectTrigger>
                <SelectContent className="border-blue-900/50 bg-[#0a0f1d] text-white shadow-2xl rounded-2xl p-1.5 backdrop-blur-xl">
                  <SelectItem value="none" className="py-3 text-slate-500 cursor-pointer">
                    -- Select a Medical Report --
                  </SelectItem>
                  {availableReports.map((report) => (
                    <SelectItem
                      key={report.id}
                      value={report.id}
                      className="py-3 px-3 text-white font-medium hover:bg-slate-800/80 cursor-pointer rounded-xl"
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
          {/* Top Report Selection Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-blue-900/40 bg-slate-900/70 p-4 backdrop-blur-xl mb-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                <FileText className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Active Medical Record</p>
                <p className="text-xs font-semibold text-white">
                  {availableReports.find((r) => r.id === selectedReportId)?.name ?? "Selected Record"}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto min-w-[260px]">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-10 w-full rounded-xl border-blue-900/50 bg-slate-950/80 text-xs font-medium text-white shadow-sm hover:border-cyan-400 transition-all cursor-pointer">
                  <SelectValue placeholder="Change medical report..." />
                </SelectTrigger>
                <SelectContent className="border-blue-900/50 bg-[#0a0f1d] text-white shadow-2xl rounded-xl p-1 backdrop-blur-xl">
                  <SelectItem value="none" className="py-2 text-slate-500 cursor-pointer">
                    -- Clear Selection --
                  </SelectItem>
                  {availableReports.map((report) => (
                    <SelectItem key={report.id} value={report.id} className="py-2 text-white text-xs cursor-pointer hover:bg-slate-800/80">
                      📄 {report.name} ({report.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>



          {activePanel ? (
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-white">Published report summary</CardTitle>
                <CardDescription className="text-[#A1A1AA]">
                  Latest live panel for {formatLabDate(activePanel.recorded_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`${portalInsetClass} p-5`}>
                  <p className="text-sm leading-7 text-[#D4D4D8]">
                    {buildPublishedPanelSummary(activePanel.biomarkers ?? {})}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {latestMetrics.slice(0, 3).map((metric) => (
                    <div key={metric.key} className={`${portalInsetClass} p-4`}>
                      <p className="text-xs text-[#A1A1AA]">{metric.label}</p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {metric.value} {metric.unit}
                      </p>
                      <p className="mt-1 text-xs text-[#A1A1AA]">Range: {metric.range}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {pendingExtractions.length > 0 ? (
            <Card className="border-amber-500/20 bg-amber-500/5 text-white backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-amber-200">Review required for extracted report</CardTitle>
                    <CardDescription className="text-amber-100/70">
                      Select an extraction needing review, inspect the detected values, and publish to update your panels.
                    </CardDescription>
                  </div>
                  <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-200">
                    {pendingExtractions.length} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pendingExtractions.map((extraction) => {
                    const upload = uploadsById.get(extraction.upload_id);
                    const isSelected = selectedExtraction?.id === extraction.id;
                    return (
                      <button
                        key={extraction.id}
                        type="button"
                        onClick={() => setSelectedReviewId(extraction.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? "border-amber-400 bg-amber-400/15 text-white"
                            : "border-white/10 bg-white/5 text-[#A1A1AA] hover:bg-white/10"
                        }`}
                      >
                        <p className="text-xs font-semibold text-white">
                          {upload?.original_filename ?? "Lab Report"}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-200/80">
                          {extraction.warnings_json?.length ?? 0} warning(s)
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectedExtraction ? (
                  <div className="space-y-5 rounded-2xl border border-white/10 bg-[#09090b]/80 p-5 backdrop-blur-xl">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-[#A1A1AA]">Recorded Date</label>
                        <Input
                          type="date"
                          value={reviewDate}
                          onChange={(e) => setReviewDate(e.target.value)}
                          className="mt-1.5 border-white/10 bg-white/5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#A1A1AA]">Reviewer Notes</label>
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes about manual edits or provider context..."
                          className="mt-1.5 min-h-[42px] border-white/10 bg-white/5 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                        Extracted Biomarkers
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {sortBiomarkerKeys(Object.keys(reviewValues)).map((key) => {
                          const def = getBiomarkerDefinition(key);
                          const confidences = coerceFieldConfidenceMap(selectedExtraction.field_confidence_json);
                          const sources = coerceFieldSourcesMap(selectedExtraction.field_sources_json);
                          const conf = confidences[key] ?? 1.0;
                          const isLowConf = conf < 0.85;

                          return (
                            <div
                              key={key}
                              className={`rounded-xl border p-3.5 transition-all ${
                                isLowConf
                                  ? "border-amber-500/30 bg-amber-500/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-white">
                                  {def?.label ?? key}
                                </span>
                                {isLowConf ? (
                                  <Badge className="border-amber-500/30 bg-amber-500/20 text-[10px] text-amber-200">
                                    Low Confidence ({Math.round(conf * 100)}%)
                                  </Badge>
                                ) : null}
                              </div>
                              <Input
                                value={reviewValues[key] ?? ""}
                                onChange={(e) =>
                                  setReviewValues({ ...reviewValues, [key]: e.target.value })
                                }
                                className="mt-2 border-white/10 bg-white/5 text-sm font-semibold text-white"
                              />
                              {sources[key]?.snippet || sources[key]?.originalValue ? (
                                <p className="mt-1 text-[10px] text-[#A1A1AA]">
                                  Source text: &quot;{sources[key]?.snippet ?? sources[key]?.originalValue}&quot;
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      disabled={publishing}
                      onClick={() => void handlePublishReview()}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600"
                    >
                      {publishing ? "Publishing..." : "Confirm & Publish Panel"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Uploaded Files Table */}
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Uploaded Files Archive</CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                All reports submitted to the extraction pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#D4D4D8]">
                  <thead className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    <tr>
                      <th className="pb-3 px-2">Filename</th>
                      <th className="pb-3 px-2">Date Added</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {uploads.map((upload) => {
                      const meta = getUploadStatusMeta(upload.analysis_status);
                      return (
                        <tr key={upload.id} className="hover:bg-white/5 transition-colors group">
                          <td className="py-3 px-2 font-medium text-white">{upload.original_filename}</td>
                          <td className="py-3 px-2 text-[#A1A1AA]">{formatUploadedAt(upload.created_at)}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass(meta.tone)}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              title="Delete report"
                              onClick={() => setDeleteTargetId(upload.id)}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-rose-400/60 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/15 hover:text-rose-400 focus:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent className="border-rose-500/25 bg-[#0d131f] text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete lab report?
            </AlertDialogTitle>
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
