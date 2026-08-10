import { Apple, Leaf, ShieldCheck, Utensils } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getNutritionPlans } from "../../../lib/labInsights";

export default function Nutrition() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const plans = latestPanel ? getNutritionPlans(latestPanel) : [];

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

  if (!hasPanels || !latestPanel) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Nutrition Intelligence"
          title="Nutrition Plan"
          description="View food guidance, meal priorities, and macro suggestions in a dark planning workspace that stays tied to your real clinical markers."
          icon={Apple}
          meta={[
            { label: "Meal plans", value: "Awaiting biomarkers" },
            { label: "Macro guidance", value: "Not generated" },
            { label: "Personalization", value: "Lab-driven only" },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className={portalPanelClass}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Apple className="h-5 w-5 text-[#ff9c61]" />
              </div>
              <CardTitle className="text-white">No nutrition plan yet</CardTitle>
              <CardDescription className="text-white/60">
                You have lab files on file, but no structured lab values are available to drive calories,
                macros, or meal suggestions. Those will appear here after your reports are processed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">What unlocks this section</CardTitle>
              <CardDescription className="text-white/60">
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
                  <div key={item.label} className={`${portalInsetClass} p-4`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-white/75">{item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
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
            {plans.length} Custom Meal Plans
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {plans.map((plan) => (
            <Card key={plan.headline} className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-white">{plan.headline}</CardTitle>
                <CardDescription className="text-white/60">{plan.focus}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.actions.map((action) => (
                  <div key={action} className={`${portalInsetClass} p-4`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Utensils className="h-4 w-4 text-[#ff9c61]" />
                      </span>
                      <p className="text-sm leading-7 text-white/80">{action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Plan context</CardTitle>
              <CardDescription className="text-white/60">
                These recommendations are based on your latest structured lab panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Panel Date</p>
                <p className="mt-2 text-sm font-medium text-white">{formatLabDate(latestPanel.recorded_at)}</p>
              </div>
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Structured Source</p>
                <p className="mt-2 text-sm font-medium text-white">Latest uploaded lab panel</p>
              </div>
              <div className={`${portalInsetClass} p-4`}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Focus</p>
                <p className="mt-2 text-sm font-medium text-white">
                  Nutrition actions adapt to glucose, lipid, and hemoglobin trends when available.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Plan tags</CardTitle>
              <CardDescription className="text-white/60">
                Quick view of the main areas covered by your current nutrition plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {plans.map((plan) => (
                <Badge
                  key={plan.headline}
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] px-3 py-1 text-white/80"
                >
                  {plan.headline}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PatientPortalPage>
  );
}
