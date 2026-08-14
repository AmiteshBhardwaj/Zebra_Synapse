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
import {
  PatientPortalPage,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
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
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
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
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <TrendingUp className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Disease Prediction</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                Predictive Intelligence
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              {isAllReports
                ? `Rule-based risk assessments synthesizing all ${panels.length} uploaded lab reports.`
                : `Rule-based risk assessments grounded in report from ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {hasPanels && activePanel ? `${predictions.length} Risk Models Active` : "Awaiting Biomarkers"}
          </span>
        </div>
      </div>

      {/* Scope Selector Control */}
      {hasPanels && (
        <div className="mb-6 max-w-4xl">
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

      {!hasPanels || !activePanel ? (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4.5 w-4.5 text-[#ff9c61]" />
                <CardTitle className="text-base text-white">Awaiting Structured Biomarkers</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                We are waiting for structured panel extraction from your lab files. Risk prediction analysis will activate once structured values are available.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-400" />
                <CardTitle className="text-base text-white">Model context</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Coverage and limitations for the current rule-based snapshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold text-white">Awaiting interpretation</p>
                <p className="mt-1 text-xs sm:text-sm text-[#92a8c7]">
                  Upload and process structured lab reports to unlock deterministic risk summaries.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} border-amber-500/20 bg-amber-500/[0.04] p-2`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-white">Decision support only</p>
                  <p className="mt-0.5 text-xs text-[#b4c9e8] leading-relaxed">
                    These rule-based scores highlight biomarker patterns across your uploaded medical records. They do not diagnose disease and should always be reviewed with your clinician.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {predictions.map((prediction) => {
            const isHigh = prediction.level === "high";
            const isMod = prediction.level === "moderate";
            const levelBadgeClass = isHigh
              ? "border-rose-500/30 bg-rose-500/15 text-rose-300"
              : isMod
                ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";

            return (
              <Card key={prediction.title} className={`${portalPanelClass} p-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className={`h-4.5 w-4.5 ${isHigh ? "text-rose-400" : isMod ? "text-amber-400" : "text-emerald-400"}`} />
                      <CardTitle className="text-base text-white">{prediction.title}</CardTitle>
                    </div>
                    <Badge className={`border text-xs capitalize shrink-0 px-2.5 py-0.5 ${levelBadgeClass}`}>
                      {prediction.level} Risk
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#92a8c7]">
                    {isAllReports
                      ? `Evaluated across all ${multiPanelMeta.totalReports} uploaded lab reports with trajectory tracking`
                      : `Interpreted from structured panel dated ${formatLabDate(activePanel.recorded_at)}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                    <p className="text-xs sm:text-sm text-[#E5E7EB] leading-relaxed">{prediction.rationale}</p>
                  </div>

                  {/* Triggered Biomarker Evidence Grid */}
                  {prediction.triggeredBiomarkers && prediction.triggeredBiomarkers.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2.5">
                        Triggered Biomarker Evidence
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {prediction.triggeredBiomarkers.map((bm) => (
                          <div
                            key={bm.key}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-200">{bm.label}</span>
                              {bm.trend && (bm.trend.readingsCount ?? 0) > 1 && (
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 ${
                                    bm.trend.direction === "worsening"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : bm.trend.direction === "improving"
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                                  }`}
                                  title={
                                    bm.trend.previousValue != null
                                      ? `Prior: ${bm.trend.previousValue} ${bm.unit}`
                                      : undefined
                                  }
                                >
                                  {bm.trend.direction === "worsening" && "📈"}
                                  {bm.trend.direction === "improving" && "📉"}
                                  {bm.trend.direction === "stable" && "➡️"}
                                  {bm.trend.deltaText}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">
                                {bm.value} {bm.unit}
                              </span>
                              {bm.reference && (
                                <span className="text-[10px] text-slate-400">
                                  (Ref: {bm.reference})
                                </span>
                              )}
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                                  bm.status === "high"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : bm.status === "low"
                                      ? "bg-sky-500/20 text-sky-300"
                                      : "bg-amber-500/20 text-amber-300"
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

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Recommended next step</p>
                    <p className="mt-1 text-xs sm:text-sm font-medium text-white">{prediction.nextStep}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-400" />
                <CardTitle className="text-base text-white">Model context</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Coverage and synthesis scope for the current analysis pass
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold text-white">{overall?.label ?? "Awaiting interpretation"}</p>
                <p className="mt-1 text-xs sm:text-sm text-[#92a8c7]">
                  {overall?.summary ?? "Upload and process a structured panel to unlock deterministic risk summaries."}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Analysis Scope</p>
                <p className="mt-1 text-xs sm:text-sm text-white">
                  {isAllReports
                    ? `Comprehensive: ${multiPanelMeta.totalReports} uploaded lab reports (${multiPanelMeta.dateRange.spanText})`
                    : `Single Report: ${formatLabDate(activePanel.recorded_at)}`}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Biomarker Coverage</p>
                <p className="mt-1 text-xs sm:text-sm text-white">
                  {multiPanelMeta.uniqueBiomarkersCount} distinct biomarkers synthesized across all uploaded files
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-[#b4abff]" />
                <CardTitle className="text-base text-white">Longitudinal Confidence</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                How multi-report historical tracking impacts precision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4 text-xs sm:text-sm text-[#92a8c7]">
                {multiPanelMeta.totalReports > 1
                  ? `Synthesizing across ${multiPanelMeta.totalReports} uploaded lab reports provides increased diagnostic confidence and allows early detection of worsening or improving trajectories.`
                  : "Upload additional lab reports over time to unlock automated trajectory detection and longitudinal trend confidence."}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4 text-xs sm:text-sm text-[#92a8c7]">
                Clinical review is still required before turning any pattern into a formal diagnosis or changing prescription regimens.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
