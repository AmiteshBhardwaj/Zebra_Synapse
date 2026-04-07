import { AlertTriangle, Info, ShieldAlert, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { useAiRiskInsight } from "../../../hooks/useAiRiskInsight";
import { usePatientCareSnapshot } from "../../../hooks/usePatientCareSnapshot";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { usePatientMedicalRecordCorpus } from "../../../hooks/usePatientMedicalRecordCorpus";
import { buildFallbackLabPanelFromCareSnapshot } from "../../../lib/aiRiskInsights";
import { getDiseasePredictions, getLatestLabPanel } from "../../../lib/labInsights";
import { formatLabDate } from "../../../lib/labPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
  StatusPill,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function DiseasePrediction() {
  const { user } = useAuth();
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const { snapshot, loading: careLoading } = usePatientCareSnapshot();
  const { records, loading: corpusLoading } = usePatientMedicalRecordCorpus(uploads);
  const fallbackPanel = useMemo(
    () => (user?.id ? buildFallbackLabPanelFromCareSnapshot(user.id, snapshot) : null),
    [snapshot, user?.id],
  );
  const activePanels = hasPanels ? panels : fallbackPanel ? [fallbackPanel] : [];
  const latestPanel = getLatestLabPanel(activePanels);
  const deterministicPredictions = latestPanel ? getDiseasePredictions(latestPanel) : [];
  const {
    insight,
    loading: insightLoading,
    refreshing,
    isStale,
  } = useAiRiskInsight({
    patientId: user?.id,
    panels,
    uploads,
    recordTexts: records,
    careSnapshot: snapshot,
    enabled: hasLabReports || Boolean(snapshot),
  });

  if (loading || panelsLoading || careLoading || corpusLoading || insightLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports && !snapshot) {
    return (
      <LabReportsRequiredPlaceholder
        title="Disease Prediction"
        description="Risk assessments based on your lab-derived data"
      />
    );
  }

  if (!latestPanel && !snapshot) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Predictive Intelligence"
          title="Disease Prediction"
          description="Review future risk assessments in a dark analytical workspace designed to keep predictive insights readable, focused, and grounded in verified data."
          icon={TrendingUp}
          meta={[
            { label: "Risk models", value: "Awaiting patient signal" },
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
                AI risk scoring activates when your uploads are parsed into structured biomarkers or a linked-care snapshot is available.
              </p>
            </div>
          </div>
        </section>
      </PatientPortalPage>
    );
  }

  const topRisk = insight?.risks[0];

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Predictive Intelligence"
        title="Disease Prediction"
        description="AI-generated rare-disease risk summaries grounded in your structured panels and available report text, with deterministic clinical guardrails kept alongside them."
        icon={TrendingUp}
        meta={[
          { label: "AI risks", value: insight?.risks.length ?? deterministicPredictions.length },
          { label: "Highest risk", value: topRisk?.title ?? deterministicPredictions[0]?.title ?? "None" },
          { label: "Signal source", value: insight?.source.replaceAll("_", " ") ?? (hasPanels ? "structured lab panel" : "linked care snapshot") },
          { label: "Latest panel", value: latestPanel ? formatLabDate(latestPanel.recorded_at) : "Linked care only" },
        ]}
      />

      <section className={`${portalPanelClass} border-[#3B82F6]/15 bg-[#3B82F6]/[0.08] p-6`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/12">
            <ShieldAlert className="h-5 w-5 text-[#93c5fd]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Decision support only</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#c7ddff]">
              {insight?.disclaimer ??
                "These scores rank pattern overlap in your records. They do not diagnose disease and should be reviewed with your clinician."}
            </p>
            {refreshing ? (
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#c7ddff]/70">
                Refreshing AI insight snapshot
              </p>
            ) : isStale ? (
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#ffcfaa]">
                Snapshot may be outdated and is waiting for regeneration
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {insight ? (
            insight.risks.map((risk) => (
              <Card key={risk.conditionKey} className={portalPanelClass}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">{risk.title}</CardTitle>
                      <CardDescription className="text-white/60">{risk.summary}</CardDescription>
                    </div>
                    <Badge className="border border-white/10 bg-white/[0.08] text-white">
                      {risk.band} risk
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`${portalInsetClass} p-4`}>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Risk level</p>
                      <div className="mt-2">
                        <StatusPill status={risk.band} />
                      </div>
                    </div>
                    <div className={`${portalInsetClass} p-4`}>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Suggested next step</p>
                      <p className="mt-2 text-sm text-[#ffb788]">{risk.recommendedNextStep}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">What influenced this result</p>
                    {risk.drivers.length > 0 ? (
                      risk.drivers.slice(0, 2).map((driver) => (
                        <div key={driver} className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                          {driver}
                        </div>
                      ))
                    ) : (
                      <div className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                        No specific driver text is available for this risk yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-white">AI insight unavailable</CardTitle>
                <CardDescription className="text-white/60">
                  Falling back to rule-based risk patterns from the latest patient signal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {deterministicPredictions.map((prediction) => (
                  <div key={prediction.title} className={`${portalInsetClass} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{prediction.title}</p>
                      <StatusPill status={prediction.level} />
                    </div>
                    <p className="mt-2 text-sm text-white/60">{prediction.rationale}</p>
                    <p className="mt-3 text-sm text-[#ffb788]">{prediction.nextStep}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Model context</CardTitle>
              <CardDescription className="text-white/60">
                Coverage and limitations for the current AI-generated snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insight ? (
                <>
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Snapshot status</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <StatusPill status={insight.status === "unavailable" ? "moderate" : insight.risks[0]?.band ?? "low"} />
                      <p className="text-sm font-medium text-white capitalize">{insight.status}</p>
                    </div>
                  </div>
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Input coverage</p>
                    <p className="mt-2 text-sm text-white/75">{insight.inputCoverage.summary}</p>
                    <p className="mt-3 text-sm text-white/60">
                      {insight.inputCoverage.panelCount} panel(s), {insight.inputCoverage.textDocumentCount} extracted document(s), {insight.inputCoverage.longitudinalSpanDays} longitudinal day(s)
                    </p>
                    {insight.inputCoverage.usedLinkedCareFallback ? (
                      <p className="mt-2 text-xs text-white/45">Linked-care fallback filled missing structured inputs.</p>
                    ) : null}
                  </div>
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Generated</p>
                    <p className="mt-2 text-sm text-white/75">{new Date(insight.generatedAt).toLocaleString()}</p>
                    <p className="mt-2 text-xs text-white/45">Model {insight.modelVersion}</p>
                  </div>
                </>
              ) : (
                <div className={`${portalInsetClass} flex items-start gap-3 p-4`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-[#ffb07a]" />
                  <p className="text-sm text-white/70">
                    The persisted AI result is not available yet, so the page is using deterministic lab rules instead.
                  </p>
                </div>
              )}
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
              {(insight?.inputCoverage.missingSignals ?? []).length > 0 ? (
                insight!.inputCoverage.missingSignals.map((item) => (
                  <div key={item} className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60">No major gaps detected.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PatientPortalPage>
  );
}
