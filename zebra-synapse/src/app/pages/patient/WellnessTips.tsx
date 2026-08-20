import { ShieldCheck, Sparkles, HelpCircle, CheckCircle2, Heart, Moon, Dumbbell } from "lucide-react";
import { useMemo } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useActiveReport } from "../../../hooks/useActiveReport";

export default function WellnessTips() {
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

  const tips = useMemo(
    () => (activePanel ? getWellnessTips(activePanel, biomarkerTrends) : []),
    [activePanel, biomarkerTrends],
  );

  if (loading || panelsLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#f6f8f5]">
        <p className="text-sm text-[#A1A1AA]">Loading wellness insights...</p>
      </div>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Wellness Tips"
        description="Tips grounded in your lab results and vitals"
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. COMPACT EXECUTIVE HEADER */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Wellness Tips
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                Lifestyle Guidance
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
              {isAllReports
                ? `Personalized recovery, movement, and habit suggestions synthesizing all ${panels.length} uploaded lab reports.`
                : `Personalized recovery, movement, and habit suggestions generated from report dated ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-semibold shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {hasPanels && activePanel ? `${tips.length} Custom Tips` : "Awaiting Biomarkers"}
          </span>
        </div>
      </header>

      {/* Scope Selector Control */}
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
                <Sparkles className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">No wellness tips yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Upload and process structured lab reports to unlock personalized recovery, sleep, movement, and nutrition habit suggestions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-[22px] bg-white border border-slate-100 p-5 shadow-sm">
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                This view turns on when structured biomarkers are available from your lab panels.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
          {/* LEFT COLUMN: PERSONALIZED TIPS (SCROLLABLE LIST) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                Personalized Recommendations ({tips.length})
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {isAllReports ? "Multi-Report Adaptive" : "Active Panel Context"}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {tips.map((tip, index) => (
                <article
                  key={tip.title}
                  className="rounded-[22px] border border-slate-100 bg-white p-4 sm:p-4.5 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-200 hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-[#0099ff] font-bold text-xs">
                        {index + 1}
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope'] truncate">
                        {tip.title}
                      </h3>
                    </div>
                    <Badge className="border border-sky-200 bg-sky-50 text-[10px] font-bold text-[#0284c7] shrink-0 px-2.5 py-0.5 rounded-full">
                      Tip {index + 1}
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-[#f8fafc] px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed font-medium">
                    {tip.detail}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: APPLICATION & PROTOCOL CONTEXT */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {/* How to Use These Tips Card */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm font-['Manrope'] border-b border-slate-100 pb-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#0099ff]" />
                <span>How to Apply These Tips</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Source</p>
                  <p className="mt-0.5 font-bold text-slate-900 text-[11px]">
                    {isAllReports
                      ? `${multiPanelMeta.totalReports} reports (${multiPanelMeta.uniqueBiomarkersCount} biomarkers)`
                      : `Active Panel: ${formatLabDate(activePanel.recorded_at)}`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Best Practice</p>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Apply 1-2 habit adjustments at a time and evaluate how your next panel trends over time.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Wellness Pillars Card */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2.5 flex-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm font-['Manrope'] border-b border-slate-100 pb-2">
                <Sparkles className="h-4 w-4 text-[#0099ff]" />
                <span>Lifestyle Coaching Pillars</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                  <Moon className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 text-[11px]">Recovery & Sleep</p>
                    <p className="text-[10px] text-slate-500">Circadian hygiene & stress reduction</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                  <Dumbbell className="h-4 w-4 text-[#0099ff] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 text-[11px]">Daily Movement</p>
                    <p className="text-[10px] text-slate-500">Post-meal walks & conditioning</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                  <Heart className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 text-[11px]">Cardiometabolic Care</p>
                    <p className="text-[10px] text-slate-500">Low sodium & glycemic balance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
