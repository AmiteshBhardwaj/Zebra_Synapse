import { Apple, Leaf, ShieldCheck, Utensils, Info, Tag } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatLabDate } from "../../../lib/labPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { getNutritionPlans } from "../../../lib/labInsights";

export default function Nutrition() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const { activePanel } = useActiveReport(panels);
  const plans = activePanel ? getNutritionPlans(activePanel) : [];

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
        title="Nutrition Plan"
        description="Meal plans and macros based on your lab data"
      />
    );
  }

  return (
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <Apple className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Nutrition Plan</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                Nutrition Intelligence
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              Personalized dietary guidance, macro recommendations, and meal plans driven by your lab results.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {hasPanels && activePanel ? `${plans.length} Custom Meal Plans` : "Awaiting Biomarkers"}
          </span>
        </div>
      </div>

      {!hasPanels || !activePanel ? (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Apple className="h-4.5 w-4.5 text-[#ff9c61]" />
                <CardTitle className="text-base text-white">No nutrition plan yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                You have lab files on file, but no structured lab values are available to drive calories,
                macros, or meal suggestions. Those will appear here after your reports are processed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-400" />
                <CardTitle className="text-base text-white">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                This view becomes active once structured biomarkers are available from your latest uploads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Meal planning",
                  value: "Balanced meal structure and macro targets will populate when your biomarker profile is available.",
                  icon: Utensils,
                  tone: "text-[#ff9c61]",
                },
                {
                  label: "Food quality",
                  value: "Recommendations can emphasize fiber, protein, hydration, and recovery without reverting to generic sample plans.",
                  icon: Leaf,
                  tone: "text-[#b4abff]",
                },
                {
                  label: "Clinical grounding",
                  value: "Nothing shown here is treated as medical advice unless it is tied back to your own extracted results.",
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
          {plans.map((plan) => (
            <Card key={plan.headline} className={`${portalPanelClass} p-2`}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Apple className="h-4.5 w-4.5 text-emerald-400" />
                  <CardTitle className="text-base text-white">{plan.headline}</CardTitle>
                </div>
                <CardDescription className="text-xs text-[#92a8c7]">{plan.focus}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.actions.map((action) => (
                  <div key={action} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Utensils className="h-4 w-4 text-[#ff9c61]" />
                      </span>
                      <p className="text-xs sm:text-sm text-[#E5E7EB] leading-relaxed">{action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-400" />
                <CardTitle className="text-base text-white">Plan context</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                These recommendations are based on your latest structured lab panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Panel Date</p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-white">{activePanel ? formatLabDate(activePanel.recorded_at) : "N/A"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Structured Source</p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-white">Latest uploaded lab panel</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Focus</p>
                <p className="mt-1 text-xs sm:text-sm text-[#92a8c7]">
                  Nutrition actions adapt to glucose, lipid, and hemoglobin trends when available.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Tag className="h-4.5 w-4.5 text-[#b4abff]" />
                <CardTitle className="text-base text-white">Plan tags</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Quick view of the main areas covered by your current nutrition plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {plans.map((plan) => (
                <Badge
                  key={plan.headline}
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80"
                >
                  {plan.headline}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
