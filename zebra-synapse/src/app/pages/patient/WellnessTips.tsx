import { ShieldCheck, Sparkles, HelpCircle, CheckCircle2, Heart, Moon, Dumbbell, Activity, ShieldAlert, Check, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getWellnessTips, type WellnessTip } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useActiveReport } from "../../../hooks/useActiveReport";

type TipCategoryFilter = "all" | "high_priority" | "glycemic_cardiac" | "inflammation" | "organ_vitality";

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

  const [activeFilter, setActiveFilter] = useState<TipCategoryFilter>("all");

  const tips = useMemo(
    () => (activePanel ? getWellnessTips(activePanel, biomarkerTrends) : []),
    [activePanel, biomarkerTrends],
  );

  const filteredTips = useMemo(() => {
    if (activeFilter === "all") return tips;
    if (activeFilter === "high_priority") {
      return tips.filter((t) => t.impactLevel === "High Priority");
    }
    if (activeFilter === "glycemic_cardiac") {
      return tips.filter(
        (t) =>
          t.category === "Glycemic Health" ||
          t.category === "Cardiovascular & Lipids",
      );
    }
    if (activeFilter === "inflammation") {
      return tips.filter(
        (t) =>
          t.category === "Immune & Inflammation" ||
          t.category === "Lifestyle & Recovery",
      );
    }
    if (activeFilter === "organ_vitality") {
      return tips.filter(
        (t) =>
          t.category === "Liver & Metabolism" ||
          t.category === "Renal & Hydration" ||
          t.category === "Thyroid & Energy" ||
          t.category === "Blood & Vitality" ||
          t.category === "Digestive & Gut Health" ||
          t.category === "Electrolytes & Bones",
      );
    }
    return tips;
  }, [tips, activeFilter]);

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
        description="Actionable lifestyle and recovery tips grounded in your lab findings"
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. COMPACT EXECUTIVE HEADER */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Wellness & Recovery Tips
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider font-['Manrope']">
                Report-Grounded Guidance
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              {isAllReports
                ? `Personalized recovery, movement, and habit suggestions synthesizing all ${panels.length} uploaded lab reports.`
                : `Personalized recovery, movement, and habit suggestions generated from report dated ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-['Manrope']">
          <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-semibold shadow-2xs font-['Manrope']">
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
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                  Personalized Recommendations ({filteredTips.length})
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isAllReports ? "Multi-Report Synthesis" : "Active Report"}
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
                {[
                  { id: "all", label: `All (${tips.length})` },
                  { id: "high_priority", label: "High Priority" },
                  { id: "glycemic_cardiac", label: "Glycemic & Lipids" },
                  { id: "inflammation", label: "Immune & Recovery" },
                  { id: "organ_vitality", label: "Organ Health" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id as TipCategoryFilter)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shrink-0 font-['Manrope'] ${
                      activeFilter === f.id
                        ? "bg-[#0099ff] text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {filteredTips.length === 0 ? (
                <div className="rounded-[22px] bg-white border border-slate-100 p-8 text-center space-y-2">
                  <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No tips matching selected filter</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Switch to "All" to view all personalized wellness recommendations generated for this report.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#0099ff] font-semibold text-xs border border-sky-200 cursor-pointer mt-2"
                  >
                    Show All Tips
                  </button>
                </div>
              ) : (
                filteredTips.map((tip, index) => {
                  const isHighImpact = tip.impactLevel === "High Priority";
                  const isModerateImpact = tip.impactLevel === "Moderate Priority";

                  return (
                    <article
                      key={tip.title}
                      className={`rounded-[22px] border bg-white p-4 sm:p-5 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all space-y-3 ${
                        isHighImpact
                          ? "border-amber-200/90 hover:border-amber-400 shadow-amber-500/5"
                          : isModerateImpact
                          ? "border-sky-200/90 hover:border-sky-400"
                          : "border-slate-100 hover:border-emerald-300"
                      }`}
                    >
                      {/* Top Badges & Category */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-[#0099ff] font-bold text-xs">
                            {index + 1}
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                            {tip.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {tip.category && (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-semibold">
                              {tip.category}
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isHighImpact
                                ? "border border-amber-300 bg-amber-50 text-amber-900"
                                : isModerateImpact
                                ? "border border-sky-300 bg-sky-50 text-[#0284c7]"
                                : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {tip.impactLevel || "Recommendation"}
                          </Badge>
                        </div>
                      </div>

                      {/* Triggered By Tag (Report Grounding) */}
                      {tip.triggeredBy && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-700">
                          <Activity className="w-3.5 h-3.5 text-[#0099ff] shrink-0" />
                          <span className="truncate font-semibold">{tip.triggeredBy}</span>
                        </div>
                      )}

                      {/* Detailed Explanation */}
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {tip.detail}
                      </p>

                      {/* Action Steps Checklist */}
                      {tip.actionSteps && tip.actionSteps.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-['Manrope'] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Concrete Action Steps
                          </p>
                          <ul className="space-y-1.5">
                            {tip.actionSteps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold mt-0.5">
                                  ✓
                                </span>
                                <span className="leading-snug">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Implementation Strategy</p>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Focus on 1-2 high-priority habit adjustments first. Re-evaluate your biomarker trend line when uploading your next follow-up panel.
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
