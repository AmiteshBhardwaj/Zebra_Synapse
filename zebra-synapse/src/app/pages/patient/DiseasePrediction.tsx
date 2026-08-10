import { Info, ShieldAlert, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  getDiseasePredictions,
  getLatestLabPanel,
  getOverallStatus,
} from "../../../lib/labInsights";
import { formatLabDate } from "../../../lib/labPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function DiseasePrediction() {
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const predictions = useMemo(
    () => (latestPanel ? getDiseasePredictions(latestPanel) : []),
    [latestPanel],
  );
  const overall = useMemo(
    () => (latestPanel ? getOverallStatus(latestPanel) : null),
    [latestPanel],
  );
  const highestPrediction = predictions[0] ?? null;

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

  if (!hasPanels) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Predictive Intelligence"
          title="Disease Prediction"
          description="Review future risk assessments in a dark analytical workspace designed to keep predictive insights readable, focused, and grounded in verified data."
          icon={TrendingUp}
          meta={[
            { label: "Risk models", value: "Awaiting structured panel" },
            { label: "Source data", value: "Uploaded reports ready" },
            { label: "Clinical posture", value: "Decision support only" },
          ]}
        />

        <section className={`${portalPanelClass} border-[#3B82F6]/15 bg-[#3B82F6]/[0.08] p-6`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/12">
              <Info className="h-5 w-5 text-[#93c5fd]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Not a diagnosis</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#c7ddff]">
                Risk scoring activates when your uploads are parsed into structured biomarkers.
              </p>
            </div>
          </div>
        </section>
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
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
              Rule-based clinical risk assessments grounded in your latest structured lab panels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {predictions.length} Risk Models Active
          </span>
        </div>
      </div>

      <section className={`${portalPanelClass} border-[#3B82F6]/15 bg-[#3B82F6]/[0.08] p-6`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/12">
            <ShieldAlert className="h-5 w-5 text-[#93c5fd]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Decision support only</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#c7ddff]">
              These rule-based scores highlight biomarker patterns. They do not diagnose disease and
              should always be reviewed with your clinician.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {predictions.map((prediction) => (
            <Card key={prediction.title} className={portalPanelClass}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">{prediction.title}</CardTitle>
                    <CardDescription className="text-white/60">
                      Interpreted from the latest structured biomarker panel
                    </CardDescription>
                  </div>
                  <Badge className="border border-white/10 bg-white/[0.08] text-white">
                    {prediction.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/75">{prediction.rationale}</p>
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Recommended next step</p>
                  <p className="mt-2 text-sm text-white">{prediction.nextStep}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Model context</CardTitle>
              <CardDescription className="text-white/60">
                Coverage and limitations for the current rule-based snapshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`${portalInsetClass} p-4`}>
                <p className="font-medium text-white">{overall?.label ?? "Awaiting interpretation"}</p>
                <p className="mt-1 text-sm text-white/60">
                  {overall?.summary ?? "Upload and process a structured panel to unlock deterministic risk summaries."}
                </p>
              </div>
              <div className={`${portalInsetClass} p-4`}>
                <p className="font-medium text-white">Latest structured panel</p>
                <p className="mt-1 text-sm text-white/60">
                  {latestPanel ? formatLabDate(latestPanel.recorded_at) : "Awaiting panel"}
                </p>
              </div>
          </CardContent>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Missing signals</CardTitle>
              <CardDescription className="text-white/60">
                Data that would improve confidence on the next pass
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                Trend data across multiple structured panels would strengthen confidence.
              </div>
              <div className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                Clinical review is still required before turning any pattern into a diagnosis or treatment plan.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PatientPortalPage>
  );
}
