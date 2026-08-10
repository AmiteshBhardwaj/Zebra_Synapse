import { Sparkles } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function WellnessTips() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const tips = latestPanel ? getWellnessTips(latestPanel) : [];

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

  if (!hasPanels || !latestPanel) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Lifestyle Guidance"
          title="Wellness Tips"
          description="Surface recovery, sleep, movement, and everyday habit guidance inside the same premium dark environment used across the rest of the patient portal."
          icon={Sparkles}
          meta={[
            { label: "Tip categories", value: "Awaiting biomarkers" },
            { label: "Signals", value: "Labs and vitals" },
            { label: "Tone", value: "Personalized only" },
          ]}
        />
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
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
            {tips.length} Custom Tips
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Personalized tips</CardTitle>
            <CardDescription className="text-white/60">
              These suggestions stay tied to the markers currently most worth watching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tips.map((tip, index) => (
              <div key={tip.title} className={`${portalInsetClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{tip.title}</p>
                    <p className="mt-2 text-sm text-white/70">{tip.detail}</p>
                  </div>
                  <Badge className="border border-white/10 bg-white/[0.08] text-white">
                    Tip {index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">How to use these tips</CardTitle>
            <CardDescription className="text-white/60">
              Lifestyle coaching complements clinical care, it does not replace it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Current source</p>
              <p className="mt-2 text-sm text-white/75">
                Your latest structured panel from {formatLabDate(latestPanel.recorded_at)}.
              </p>
            </div>
            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Best practice</p>
              <p className="mt-2 text-sm text-white/75">
                Apply one or two suggestions at a time and compare how your next panel trends.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientPortalPage>
  );
}
