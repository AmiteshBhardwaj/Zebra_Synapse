import { Info, ShieldAlert, TrendingUp, AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import {
  getDiseasePredictions,
  getOverallStatus,
} from "../../../lib/labInsights";
import { formatLabDate } from "../../../lib/labPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function DiseasePrediction() {
  const { hasLabReports, uploads, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const {
    activePanel,
    biomarkerTrends,
    multiPanelMeta,
    isAllReports,
    selectedReportId,
    setSelectedReportId,
  } = useActiveReport(panels);

  const predictions = useMemo(
    () => (activePanel ? getDiseasePredictions(activePanel, biomarkerTrends) : []),
    [activePanel, biomarkerTrends],
  );
  const overall = useMemo(
    () => (activePanel ? getOverallStatus(activePanel, multiPanelMeta) : null),
    [activePanel, multiPanelMeta],
  );

  if (loading || panelsLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#f6f8f5]">
        <p className="text-sm text-[#A1A1AA]">Loading predictive models...</p>
      </div>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Disease Prediction"
        description="Risk assessments based on your lab-derived data"
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. COMPACT HEADER */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Disease Prediction
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider font-['Manrope']">
                Predictive Intelligence
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              {isAllReports
                ? `Rule-based risk assessments synthesizing all ${panels.length} uploaded lab reports.`
                : `Rule-based risk assessments grounded in report from ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-['Manrope']">
          <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-semibold shadow-2xs font-['Manrope']">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {hasPanels && activePanel ? `${predictions.length} Risk Models Active` : "Awaiting Biomarkers"}
          </span>
        </div>
      </header>

      {/* Scope Selector Control if multiple panels exist */}
      {hasPanels && panels.length > 1 && (
        <div className="mb-3 shrink-0">
          <ReportScopeSelector
            panels={panels}
            uploads={uploads}
            selectedReportId={selectedReportId}
            onSelectReportId={setSelectedReportId}
            multiPanelMeta={multiPanelMeta}
            biomarkerTrends={biomarkerTrends}
          />
        </div>
      )}

      {/* 2. MAIN 2-COLUMN DASHBOARD */}
      {!hasPanels || !activePanel ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-[22px] bg-white border border-slate-100 p-5 shadow-sm">
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">
                  Awaiting Structured Biomarkers
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                We are waiting for structured panel extraction from your lab files. Risk prediction analysis will activate once structured values are available.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-[22px] bg-white border border-slate-100 p-5 shadow-sm">
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">Model Context</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Upload and process structured lab reports to unlock deterministic risk summaries.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
          {/* LEFT COLUMN: ACTIVE PREDICTIONS (SCROLLABLE LIST) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                Active Inferred Risk Signals ({predictions.length})
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {isAllReports ? "All Reports Synthesized" : "Single Report Focus"}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {predictions.map((prediction) => {
                const isHigh = prediction.level === "high";
                const isMod = prediction.level === "moderate";
                const levelBadgeClass = isHigh
                  ? "border-rose-200 bg-rose-50 text-rose-800 font-bold"
                  : isMod
                  ? "border-amber-200 bg-amber-50 text-amber-800 font-bold"
                  : "border-sky-200 bg-sky-50 text-[#0284c7] font-bold";

                return (
                  <article
                    key={prediction.title}
                    className="rounded-[22px] border border-slate-100 bg-white p-4 sm:p-4.5 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-200 hover:shadow-md transition-all space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isHigh
                              ? "bg-rose-50 text-rose-600"
                              : isMod
                              ? "bg-amber-50 text-amber-600"
                              : "bg-sky-50 text-[#0099ff]"
                          }`}
                        >
                          <TrendingUp className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 font-['Manrope'] truncate">
                            {prediction.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">
                            {isAllReports
                              ? `Evaluated across ${multiPanelMeta.totalReports} uploaded lab reports`
                              : `Interpreted from structured panel dated ${formatLabDate(activePanel.recorded_at)}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={`border text-[10px] capitalize shrink-0 px-2.5 py-0.5 rounded-full ${levelBadgeClass}`}>
                        {prediction.level} Risk
                      </Badge>
                    </div>

                    {/* Rationale */}
                    <div className="text-xs text-slate-600 leading-relaxed font-medium bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                      {prediction.rationale}
                    </div>

                    {/* Triggered Biomarkers Grid */}
                    {prediction.triggeredBiomarkers && prediction.triggeredBiomarkers.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Triggered Biomarker Evidence
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {prediction.triggeredBiomarkers.map((bm) => (
                            <div
                              key={bm.key}
                              className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-[#f8fafc] px-3 py-2.5 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-slate-900 truncate">{bm.label}</span>
                                {bm.trend && (bm.trend.readingsCount ?? 0) > 1 && (
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-semibold inline-flex items-center ${
                                      bm.trend.direction === "worsening"
                                        ? "bg-rose-50 text-rose-800"
                                        : bm.trend.direction === "improving"
                                        ? "bg-emerald-50 text-emerald-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {bm.trend.deltaText}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-slate-900 text-xs">
                                  {bm.value} <span className="text-[10px] text-slate-400 font-normal">{bm.unit}</span>
                                </span>
                                <span
                                  className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                    bm.status === "high"
                                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                                      : bm.status === "low"
                                      ? "bg-sky-50 text-[#0284c7] border border-sky-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {bm.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Next Step */}
                    <div className="flex items-center gap-2 text-xs bg-[#f8fafc] border border-slate-100 rounded-xl px-3 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                        Next Step:
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate">{prediction.nextStep}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: CONTEXT & CLINICAL SAFEGUARDS */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {/* Decision Support Amber Card */}
            <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-3.5 sm:p-4 text-xs space-y-1.5 shadow-2xs shrink-0">
              <div className="flex items-center gap-2 text-amber-950 font-bold">
                <ShieldAlert className="h-4 w-4 text-amber-800 shrink-0" />
                <span>Decision Support Only</span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                These rule-based scores highlight biomarker patterns across your uploaded records. They do not diagnose disease and should always be reviewed with your clinician.
              </p>
            </div>

            {/* Model Context Card */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm font-['Manrope'] border-b border-slate-100 pb-2.5">
                <Info className="h-4 w-4 text-[#0099ff]" />
                <span>Model Context & Synthesis</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Status</p>
                  <p className="mt-0.5 font-bold text-slate-900">{overall?.label ?? "Active Rule Synthesis"}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{overall?.summary}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Analysis Scope</p>
                  <p className="mt-0.5 font-bold text-slate-900 text-[11px]">
                    {isAllReports
                      ? `${multiPanelMeta.totalReports} reports (${multiPanelMeta.dateRange.spanText})`
                      : `Single Panel: ${formatLabDate(activePanel.recorded_at)}`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Biomarker Coverage</p>
                  <p className="mt-0.5 font-bold text-slate-900 text-[11px]">
                    {multiPanelMeta.uniqueBiomarkersCount} distinct biomarkers synthesized
                  </p>
                </div>
              </div>
            </div>

            {/* Longitudinal Confidence Card */}
            <div className="rounded-[22px] bg-[#f8fafc] border border-slate-100 p-3.5 text-xs text-slate-600 space-y-1.5 shadow-2xs shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Longitudinal Trajectory</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {multiPanelMeta.totalReports > 1
                  ? `Synthesizing across ${multiPanelMeta.totalReports} reports provides trend confidence and trajectory tracking.`
                  : "Upload additional lab reports over time to unlock automated trajectory detection."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
