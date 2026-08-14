import { ShieldCheck, Sparkles, HelpCircle, CheckCircle2 } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useActiveReport } from "../../../hooks/useActiveReport";

export default function WellnessTips() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const { activePanel } = useActiveReport(panels);
  const tips = activePanel ? getWellnessTips(activePanel) : [];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <Sparkles className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Wellness Tips</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                Lifestyle Guidance
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              Personalized recovery, movement, and habit suggestions generated from your latest structured panel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {hasPanels && activePanel ? `${tips.length} Custom Tips` : "Awaiting Biomarkers"}
          </span>
        </div>
      </div>

      {!hasPanels || !activePanel ? (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-[#ff9c61]" />
                <CardTitle className="text-base text-white">No wellness tips yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Your account has uploads, but no structured lab values are available yet to drive personalized recovery,
                sleep, movement, and habit suggestions. Those will appear here after your reports are processed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4.5 w-4.5 text-sky-400" />
                <CardTitle className="text-base text-white">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                This view turns on when structured biomarkers are available from your latest lab panels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Recovery & Sleep",
                  value: "Customized sleep hygiene and post-exertion recovery recommendations based on inflammation and stress markers.",
                  icon: Sparkles,
                  tone: "text-[#ff9c61]",
                },
                {
                  label: "Daily Movement",
                  value: "Activity targets optimized around glucose control, heart health, and metabolic status.",
                  icon: Sparkles,
                  tone: "text-[#b4abff]",
                },
                {
                  label: "Nutritional Habits",
                  value: "Micronutrient-aware adjustments that tie back to your documented biological gaps.",
                  icon: ShieldCheck,
                  tone: "text-[#93c5fd]",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{item.label}</p>
                        <p className="mt-1 text-xs sm:text-sm text-[#92a8c7] leading-relaxed">{item.value}</p>
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
                <Sparkles className="h-4.5 w-4.5 text-[#ff9c61]" />
                <CardTitle className="text-base text-white">Personalized tips</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                These suggestions stay tied to the markers currently most worth watching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip, index) => (
                <div key={tip.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-white">{tip.title}</p>
                      <p className="mt-1 text-xs sm:text-sm text-[#92a8c7] leading-relaxed">{tip.detail}</p>
                    </div>
                    <Badge className="border border-white/10 bg-white/[0.08] text-xs text-white shrink-0">
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
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                <CardTitle className="text-base text-white">How to use these tips</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Lifestyle coaching complements clinical care, it does not replace it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Current source</p>
                <p className="mt-1 text-xs sm:text-sm text-[#92a8c7]">
                  Your active structured panel from {activePanel ? formatLabDate(activePanel.recorded_at) : "selected report"}.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Best practice</p>
                <p className="mt-1 text-xs sm:text-sm text-[#92a8c7]">
                  Apply one or two suggestions at a time and compare how your next panel trends.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
