import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Clock3, FileText, FolderKanban, Microscope } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { usePatientLabReportExtractions } from "../../../hooks/usePatientLabReportExtractions";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  buildPublishedPanelSummary,
  coerceBiomarkerMap,
  coerceFieldConfidenceMap,
  coerceFieldSourcesMap,
  getUploadStatusMeta,
  sortBiomarkerKeys,
} from "../../../lib/labReportAnalysis";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getMetricAssessments } from "../../../lib/labInsights";
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
  const { hasLabReports, loading, uploads, refetch: refetchUploads } = usePatientLabReports();
  const {
    panels,
    loading: panelsLoading,
    hasPanels,
    refetch: refetchPanels,
  } = usePatientLabPanels();
  const {
    extractions,
    loading: extractionsLoading,
    publishReviewedExtraction,
    refetch: refetchExtractions,
  } = usePatientLabReportExtractions();

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const latestMetrics = useMemo(
    () => (latestPanel ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing") : []),
    [latestPanel],
  );
  const uploadsById = useMemo(() => new Map(uploads.map((upload) => [upload.id, upload])), [uploads]);
  const extractionsByUploadId = useMemo(
    () => new Map(extractions.map((extraction) => [extraction.upload_id, extraction])),
    [extractions],
  );
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

  if (loading || panelsLoading || extractionsLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Medical Records"
        description="View uploaded reports, extraction status, and published biomarker panels."
      />
    );
  }

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
      <PatientPageHero
        eyebrow="Clinical Archive"
        title="Medical Records"
        description="Track upload status, review low-confidence extractions, and publish only the biomarker panels you trust."
        icon={FileText}
        meta={[
          { label: "Uploaded Files", value: uploads.length },
          { label: "Published Panels", value: panels.length },
          { label: "Review Queue", value: pendingExtractions.length },
        ]}
      />

      {latestPanel ? (
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Published report summary</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Latest live panel for {formatLabDate(latestPanel.recorded_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${portalInsetClass} p-5`}>
              <p className="text-sm leading-7 text-[#D4D4D8]">
                {buildPublishedPanelSummary(latestPanel.biomarkers ?? {})}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Flagged markers</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {latestMetrics.filter((metric) => metric.status === "high" || metric.status === "low").length}
                </p>
              </div>
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Published biomarkers</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {Object.keys(latestPanel.biomarkers ?? {}).length}
                </p>
              </div>
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Source trace</p>
                <p className="mt-2 text-sm leading-6 text-white">
                  {latestPanel.source_extraction_id ? "Published from reviewed or auto-published extraction." : "Legacy panel without extraction provenance."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-[1.5rem] border border-[#FFC857]/15 bg-[#FFC857]/8 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFC857]/15 bg-[#FFC857]/12">
              <AlertCircle className="h-5 w-5 text-[#ffe09d]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">No published panel yet</h2>
              <p className="mt-2 text-sm leading-7 text-[#f1d8a2]">
                The pipeline has not published a structured panel yet. If a report lands in the review queue,
                confirm its values below and publish it.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedExtraction ? (
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Extraction review queue</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              Low-confidence fields stay here until you confirm them. Nothing in this queue drives the portal until you publish it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {pendingExtractions.map((extraction) => {
                const upload = uploadsById.get(extraction.upload_id);
                const active = extraction.id === selectedExtraction.id;
                return (
                  <button
                    key={extraction.id}
                    type="button"
                    onClick={() => setSelectedReviewId(extraction.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-[#FF6A00]/40 bg-[#FF6A00]/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20"
                    }`}
                  >
                    {upload?.original_filename ?? "Pending extraction"}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Review source</p>
                  <p className="mt-2 font-medium text-white">
                    {uploadsById.get(selectedExtraction.upload_id)?.original_filename ?? "Unknown upload"}
                  </p>
                  <p className="mt-1 text-sm text-[#A1A1AA]">
                    Uploaded {formatUploadedAt(uploadsById.get(selectedExtraction.upload_id)?.created_at ?? "")}
                  </p>
                </div>

                <div className="grid gap-3">
                  {sortBiomarkerKeys(Object.keys(coerceBiomarkerMap(selectedExtraction.biomarkers_json))).map((key) => {
                    const definition = getBiomarkerDefinition(key);
                    const fieldConfidence = coerceFieldConfidenceMap(selectedExtraction.field_confidence_json)[key];
                    const fieldSource = coerceFieldSourcesMap(selectedExtraction.field_sources_json)[key];

                    return (
                      <div key={key} className={`${portalInsetClass} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{definition?.label ?? key}</p>
                            <p className="mt-1 text-xs text-white/45">
                              Confidence {fieldConfidence != null ? `${Math.round(fieldConfidence * 100)}%` : "n/a"}
                              {fieldSource?.page ? ` · page ${fieldSource.page}` : ""}
                            </p>
                          </div>
                          <Input
                            value={reviewValues[key] ?? ""}
                            onChange={(event) =>
                              setReviewValues((current) => ({ ...current, [key]: event.target.value }))
                            }
                            className="w-28 border-white/10 bg-black/20 text-right text-white"
                            inputMode="decimal"
                          />
                        </div>
                        {fieldSource?.snippet ? (
                          <p className="mt-3 text-sm leading-6 text-[#D4D4D8]">“{fieldSource.snippet}”</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Recorded date</p>
                  <Input
                    type="date"
                    value={reviewDate}
                    onChange={(event) => setReviewDate(event.target.value)}
                    className="mt-3 border-white/10 bg-black/20 text-white"
                  />
                </div>

                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Warnings</p>
                  <div className="mt-3 space-y-2">
                    {(selectedExtraction.warnings_json ?? []).length ? (
                      (selectedExtraction.warnings_json ?? []).map((warning, index) => (
                        <p key={`${warning}-${index}`} className="text-sm leading-6 text-[#f1d8a2]">
                          {warning}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-white/65">No explicit extraction warnings were recorded.</p>
                    )}
                  </div>
                </div>

                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Review notes</p>
                  <Textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    className="mt-3 min-h-32 border-white/10 bg-black/20 text-white"
                    placeholder="Document what you changed, verified, or left as-is."
                  />
                </div>

                <Button
                  className="w-full rounded-2xl bg-gradient-to-r from-[#fb7b34] to-[#ef5f2c] text-white hover:from-[#ff8b49] hover:to-[#f36a35]"
                  disabled={publishing}
                  onClick={() => void handlePublishReview()}
                >
                  {publishing ? "Publishing..." : "Publish reviewed panel"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className={portalPanelClass}>
        <CardHeader>
          <CardTitle className="text-white">Uploaded lab reports</CardTitle>
          <CardDescription className="text-[#A1A1AA]">
            These files are stored for your account. Only uploads with status Ready drive the downstream record views.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {uploads.map((upload) => {
              const status = getUploadStatusMeta(upload.analysis_status);
              const extraction = extractionsByUploadId.get(upload.id);
              return (
                <div
                  key={upload.id}
                  className="rounded-[1.25rem] border border-white/8 bg-[#111111]/80 p-4 shadow-[0_18px_36px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5BD4] to-[#3B82F6] shadow-[0_12px_28px_rgba(59,130,246,0.22)]">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-white">{upload.original_filename}</p>
                        <Badge className={toneClass(status.tone)}>{status.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[#A1A1AA]">Uploaded {formatUploadedAt(upload.created_at)}</p>
                      {upload.last_error ? (
                        <p className="mt-2 text-sm leading-6 text-[#f1b48a]">{upload.last_error}</p>
                      ) : null}
                      {extraction?.updated_at ? (
                        <p className="mt-2 text-xs text-white/45">
                          Last extraction update {formatUploadedAt(extraction.updated_at)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={`${portalPanelClass} h-full`}>
          <CardHeader>
            <CardTitle className="text-white">
              {latestPanel ? "Latest biomarker panel" : "Biomarker publication flow"}
            </CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              {latestPanel
                ? `Published values recorded for ${formatLabDate(latestPanel.recorded_at)}`
                : "Upload -> extract -> review if needed -> publish -> portal insights"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-[#D4D4D8]">
              The portal never reads draft extraction data. Only published `lab_panels` drive Disease Prediction,
              Nutrition, Wellness, Vitals, Clinical Trials, and Medical Records Insights.
            </p>
          </CardContent>
        </Card>

        <div className={`${portalPanelClass} p-6`}>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Archive Signals</p>
            <h2 className="text-xl font-semibold text-white">Record pipeline status</h2>
            <p className="text-sm leading-7 text-[#A1A1AA]">
              This workspace shows exactly where each upload sits before it becomes live structured data.
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              {
                icon: FolderKanban,
                label: "File storage",
                value: `${uploads.length} uploaded file${uploads.length === 1 ? "" : "s"} currently stored in your account.`,
              },
              {
                icon: Microscope,
                label: "Extraction review",
                value: pendingExtractions.length
                  ? `${pendingExtractions.length} extraction${pendingExtractions.length === 1 ? "" : "s"} waiting for patient review.`
                  : "No extraction is waiting for review right now.",
              },
              {
                icon: Clock3,
                label: "Published history",
                value: hasPanels
                  ? `${panels.length} published panel${panels.length === 1 ? "" : "s"} available for downstream analysis.`
                  : "No published panel is available yet.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className={`${portalInsetClass} p-4`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#ff9c61]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PatientPortalPage>
  );
}
