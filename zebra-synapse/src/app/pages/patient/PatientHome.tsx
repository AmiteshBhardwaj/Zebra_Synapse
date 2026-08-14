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
import { useActiveReport } from "../../../hooks/useActiveReport";
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

  const { selectedReportId, setSelectedReportId, activePanel } = useActiveReport(panels);

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
    }
    return list;
  }, [uploads, panels]);

  const allMetrics = useMemo(
    () => (activePanel ? getMetricAssessments(activePanel).filter((metric) => metric.status !== "missing") : []),
    [activePanel],
  );
  const topMetrics = activePanel ? getMetricsForDashboard(activePanel, 20) : [];

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
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-500/25 bg-[#0d131f] p-7 sm:p-9 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-3xl">
            {/* Perfectly Aligned Eyebrow Badge Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/80 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Patient Workspace
              </span>
              <span className="h-1 w-1 rounded-full bg-cyan-400/50" />
              <span className="text-xs font-mono text-cyan-200/80 tracking-wide">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Main Greeting Headline */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-['Manrope'] leading-tight">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                {profile?.full_name ?? "Patient"}
              </span>
            </h1>

            {/* Refined Descriptive Copy */}
            <p className="max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Welcome to your personal health intelligence vault. Upload a new lab report or review existing diagnostic panels below to analyze biomarker trends, body system stability, and clinical recommendations.
            </p>
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
            : "border-slate-800 bg-[#090d16] hover:border-[#ff9b61]/40"
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
      {selectedReportId === "none" || !availableReports.some((r) => r.id === selectedReportId) ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-12 rounded-[32px] border border-cyan-500/20 bg-[#0d131f] mt-6 shadow-2xl">
          <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-[24px] bg-[#1a1310] border border-[#ff8a3d]/35 shadow-[0_10px_30px_rgba(255,122,51,0.15)]">
            <FileText className="h-8 w-8 text-[#ff9b61]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 font-['Manrope']">
            {availableReports.length > 0 ? "Please choose a medical report" : "No medical reports uploaded yet"}
          </h2>

          <p className="max-w-md text-xs sm:text-sm text-[#92a8c7] leading-relaxed mb-6">
            {availableReports.length > 0
              ? "Select a medical report from your records below to inspect body system signals, biomarker boards, and clinical trends."
              : "Upload a lab report above to inspect biomarker boards, body system signals, and clinical trends."}
          </p>

          {availableReports.length > 0 ? (
            <div className="w-full max-w-sm sm:max-w-md">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-[#ff9b61]/40 bg-[#090d16] px-4 text-xs sm:text-sm font-medium text-white shadow-lg hover:border-[#ff9b61] focus:ring-2 focus:ring-[#ff7a33]/50 transition-all cursor-pointer">
                  <SelectValue placeholder="Select a medical report..." />
                </SelectTrigger>
                <SelectContent className="border-cyan-500/20 bg-[#0d131f] text-white shadow-2xl rounded-2xl p-1.5">
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
          ) : null}
        </div>
      ) : (
        /* UNLOCKED CLINICAL SIGNALS & BIOMARKERS DASHBOARD WHEN A REPORT IS SELECTED */
        <div className="mt-6 space-y-6">
          {/* Top Active Report Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-[#0d131f] p-4 shadow-md">
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
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-800 bg-[#090d16] text-xs font-medium text-white shadow-sm hover:border-[#ff9b61] transition-all cursor-pointer">
                  <SelectValue placeholder="Change medical report..." />
                </SelectTrigger>
                <SelectContent className="border-cyan-500/20 bg-[#0d131f] text-white shadow-2xl rounded-xl p-1">
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
                  value: Object.keys(activePanel?.biomarkers ?? {}).length,
                  detail: "Live markers extracted from your active selected report.",
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
