import { Info, ShieldAlert, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { usePatientMedicalRecordCorpus } from "../../../hooks/usePatientMedicalRecordCorpus";
import { analyzeDiseaseRiskProfile } from "../../../lib/diseaseRiskModel";
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
  const { records, loading: corpusLoading } = usePatientMedicalRecordCorpus(uploads);

  const profile = useMemo(
    () => analyzeDiseaseRiskProfile({ panels, uploads, recordTexts: records }),
    [panels, uploads, records],
  );

  if (loading || panelsLoading || corpusLoading) {
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
      <PatientPageHero
        eyebrow="Predictive Intelligence"
        title="Disease Prediction"
        description="Rare-disease and risk-pattern assessments grounded in your structured panels and readable document text."
        icon={TrendingUp}
        meta={[
          { label: "Risk models", value: profile.assessments.length },
          { label: "Highest risk", value: profile.highestRisk?.disease ?? "None" },
          { label: "Latest panel", value: panels[0] ? formatLabDate(panels[0].recorded_at) : "Awaiting panel" },
          { label: "Text corpus", value: `${profile.textDocumentCount} docs` },
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
              These scores rank pattern overlap in your records. They do not diagnose disease and
              should be reviewed with your clinician.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {profile.assessments.map((assessment) => (
            <Card key={assessment.id} className={portalPanelClass}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">{assessment.disease}</CardTitle>
                    <CardDescription className="text-white/60">{assessment.subtitle}</CardDescription>
                  </div>
                  <Badge className="border border-white/10 bg-white/[0.08] text-white">
                    {assessment.level} {assessment.riskScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/75">{assessment.summary}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Lab</p>
                    <p className="mt-2 text-lg font-semibold text-white">{assessment.branchScores.lab}</p>
                  </div>
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Text</p>
                    <p className="mt-2 text-lg font-semibold text-white">{assessment.branchScores.text}</p>
                  </div>
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Trend</p>
                    <p className="mt-2 text-lg font-semibold text-white">{assessment.branchScores.trend}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Evidence</p>
                  {assessment.evidence.map((item) => (
                    <div key={item} className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Family overview</CardTitle>
              <CardDescription className="text-white/60">
                Highest-risk groupings across the current record set
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.families.map((family) => (
                <div key={family.family} className={`${portalInsetClass} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{family.family}</p>
                      <p className="mt-1 text-sm text-white/60">{family.highlightedDisease}</p>
                    </div>
                    <Badge className="border border-white/10 bg-white/[0.08] text-white">
                      {family.highestLevel}
                    </Badge>
                  </div>
                </div>
              ))}
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
              {profile.highestRisk?.missingSignals.map((item) => (
                <div key={item} className={`${portalInsetClass} p-3 text-sm text-white/75`}>
                  {item}
                </div>
              )) ?? <p className="text-sm text-white/60">No major gaps detected.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </PatientPortalPage>
  );
}
