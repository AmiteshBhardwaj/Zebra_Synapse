import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle,
  FileText,
  FlaskConical,
  Heart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuth } from "../../../auth/AuthContext";
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
} from "../../../lib/labInsights";
import { BiomarkerInsightsBoard } from "../../components/patient/BiomarkerInsights";
import { BodyInsightPanel } from "../../components/patient/BodyInsightPanel";
import {
  PatientPortalPage,
  SectionHeading,
  portalInsetClass,
  portalPanelClass,
  portalPrimaryButtonClass,
} from "../../components/patient/PortalTheme";

export default function PatientHome() {
  const { profile } = useAuth();
  const { uploads, uploadLabReport } = usePatientLabReports();
  const { panels, refetch: refetchPanels } = usePatientLabPanels();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [focusedMetricKeys, setFocusedMetricKeys] = useState<string[]>([]);

  // Medical report selection state - defaults to "none" so area below stays empty until selected
  const [selectedReportId, setSelectedReportId] = useState<string>("none");

  // Available medical reports list for dropdown
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
    } else {
      // Demo report options so the user can test & select immediately
      list.push({
        id: "demo-report-1",
        name: "cn2.pdf (Apr 1, 2026)",
        date: "Apr 1, 2026",
      });
      list.push({
        id: "demo-report-2",
        name: "Comprehensive Metabolic Panel & CBC.pdf",
        date: "Mar 15, 2026",
      });
    }
    return list;
  }, [uploads, panels]);

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const allMetrics = useMemo(
    () => (latestPanel ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing") : []),
    [latestPanel],
  );
  const topMetrics = latestPanel ? getMetricsForDashboard(latestPanel, 20) : [];

  // Dynamic time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

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
      {/* 1. STITCH PATIENT WELCOME HERO BANNER */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,138,61,0.16),_transparent_65%),radial-gradient(ellipse_at_bottom_right,_rgba(114,76,255,0.12),_transparent_60%),rgba(255,255,255,0.03)] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[#ff8a3d]/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff9c61]">
                <Sparkles className="h-3 w-3" />
                Patient Workspace
              </span>
              <span className="text-xs text-white/30">•</span>
              <span className="text-xs font-medium text-white/60">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-[#ff9c61] via-[#ffb88c] to-white bg-clip-text text-transparent">
                {profile?.full_name ?? "Patient"}
              </span>
            </h1>

            <p className="max-w-xl text-sm text-[#b4c9e8] leading-relaxed font-medium">
              Welcome to your personal health dashboard. Upload a new lab report or select a report below to explore your biomarker trends, body system signals, and clinical insights.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Health Vault</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold text-white">
                  {latestPanel ? "Active & Synced" : "Ready for Lab Data"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Biomarkers</p>
              <p className="mt-1 text-xs font-semibold text-[#ff9c61]">
                {latestPanel ? `${Object.keys(latestPanel.biomarkers ?? {}).length} Tracked` : "0 Tracked"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-xl col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Latest Panel</p>
              <p className="mt-1 text-xs font-semibold text-white">
                {latestPanel ? formatLabDate(latestPanel.recorded_at) : "Awaiting Upload"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UPLOAD REPORT SECTION */}
      <section className={`${portalPanelClass} p-5 sm:p-6`}>
        <SectionHeading
          eyebrow="Upload"
          title="Drop in a report. Keep the rest automatic."
          description="PDF and image uploads are stored securely, then pushed into the extraction pipeline that powers your structured insights."
        />
        <div
          className={`mt-6 rounded-[28px] border border-dashed p-8 text-center transition-colors ${dragActive
            ? "border-[#ff9b61]/70 bg-[#ff9b61]/10"
            : "border-white/10 bg-white/[0.02] hover:border-[#ff9b61]/40"
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

      {/* 3. REPORT SELECTION SECTION - EMPTIES AREA BELOW UNTIL REPORT IS CHOSEN */}
      {selectedReportId === "none" ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-12 rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-xl mt-6 shadow-2xl">
          <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_20px_50px_rgba(255,122,51,0.22)]">
            <FileText className="h-8 w-8 text-[#ff9b61]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Please choose a medical report
          </h2>

          <p className="max-w-md text-xs sm:text-sm text-[#92a8c7] leading-relaxed mb-6">
            Select a medical report from your records below to inspect body system signals, biomarker boards, and clinical trends.
          </p>

          <div className="w-full max-w-sm sm:max-w-md">
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-[#ff9b61]/40 bg-[#0d1829]/95 px-4 text-xs sm:text-sm font-medium text-white shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:border-[#ff9b61] focus:ring-2 focus:ring-[#ff7a33]/50 transition-all cursor-pointer">
                <SelectValue placeholder="Select a medical report..." />
              </SelectTrigger>
              <SelectContent className="border-white/14 bg-[#0a1323] text-white shadow-2xl rounded-2xl p-1.5">
                <SelectItem value="none" className="py-2.5 text-white/40 cursor-pointer">
                  -- Select a Medical Report --
                </SelectItem>
                {availableReports.map((report) => (
                  <SelectItem
                    key={report.id}
                    value={report.id}
                    className="py-2.5 px-3 text-white font-medium hover:bg-white/10 cursor-pointer rounded-xl text-xs sm:text-sm"
                  >
                    📄 {report.name} ({report.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        /* UNLOCKED CLINICAL SIGNALS & BIOMARKERS DASHBOARD WHEN A REPORT IS SELECTED */
        <div className="mt-6 space-y-6">
          {/* Top Active Report Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
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

            <div className="w-full sm:w-auto min-w-[260px]">
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
          </div>



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
                  value: Object.keys(latestPanel?.biomarkers ?? {}).length,
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
        </div>
      )}
    </PatientPortalPage>
  );
}
