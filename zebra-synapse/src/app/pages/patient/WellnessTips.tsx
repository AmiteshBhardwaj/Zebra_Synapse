import { ShieldCheck, Sparkles, HelpCircle, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import {
  PatientPortalPage,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
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
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
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
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Wellness Tips</h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider">
                Lifestyle Guidance
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              {isAllReports
                ? `Personalized recovery, movement, and habit suggestions synthesizing all ${panels.length} uploaded lab reports.`
                : `Personalized recovery, movement, and habit suggestions generated from report dated ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-slate-700 font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {hasPanels && activePanel ? `${tips.length} Custom Tips` : "Awaiting Biomarkers"}
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
                <Sparkles className="h-4.5 w-4.5 text-lime-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">No wellness tips yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Your account has uploads, but no structured lab values are available yet to drive personalized recovery,
                sleep, movement, and habit suggestions. Those will appear here after your reports are processed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4.5 w-4.5 text-sky-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                This view turns on when structured biomarkers are available from your lab panels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Recovery & Sleep",
                  value: "Customized sleep hygiene and post-exertion recovery recommendations based on inflammation and stress markers.",
                  icon: Sparkles,
                  tone: "text-amber-600",
                },
                {
                  label: "Daily Movement",
                  value: "Activity targets optimized around glucose control, heart health, and metabolic status.",
                  icon: Sparkles,
                  tone: "text-lime-600",
                },
                {
                  label: "Nutritional Habits",
                  value: "Micronutrient-aware adjustments that tie back to your documented biological gaps.",
                  icon: ShieldCheck,
                  tone: "text-sky-600",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                        <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-lime-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">Personalized Tips</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                {isAllReports
                  ? `These suggestions dynamically adapt to multi-report shifts across all ${multiPanelMeta.totalReports} uploaded lab reports.`
                  : "These suggestions stay tied to the markers currently most worth watching."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip, index) => (
                <div key={tip.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">{tip.title}</p>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{tip.detail}</p>
                    </div>
                    <Badge className="border border-lime-200 bg-lime-50 text-xs font-bold text-lime-800 shrink-0">
                      Tip {index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">How to Use These Tips</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Lifestyle coaching complements clinical care, it does not replace it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Source</p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                  {isAllReports
                    ? `Comprehensive Synthesis across ${multiPanelMeta.totalReports} uploaded lab reports (${multiPanelMeta.dateRange.spanText}) covering ${multiPanelMeta.uniqueBiomarkersCount} biomarkers.`
                    : `Your active structured panel from ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected report"}.`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Best Practice</p>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Apply one or two suggestions at a time and compare how your next panel trends across your uploaded medical history.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
