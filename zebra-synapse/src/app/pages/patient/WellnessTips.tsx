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
      <PatientPageHero
        eyebrow="Lifestyle Guidance"
        title="Wellness Tips"
        description="Personalized recovery, movement, and symptom-aware suggestions generated from your latest structured panel."
        icon={Sparkles}
        meta={[
          { label: "Tip count", value: tips.length },
          { label: "Latest panel", value: formatLabDate(latestPanel.recorded_at) },
          { label: "Tone", value: "Personalized only" },
        ]}
      />

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
