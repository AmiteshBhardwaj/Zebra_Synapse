import { ExternalLink, FlaskConical } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getTrialMatches } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function ClinicalTrials() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const matches = latestPanel ? getTrialMatches(latestPanel) : [];

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
        title="Clinical Trials"
        description="Trial matching based on conditions inferred from your labs"
      />
    );
  }

  if (!hasPanels || !latestPanel) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Research Matching"
          title="Clinical Trials"
          description="Explore future study matches in a focused dark workspace that keeps eligibility signals readable and separate from generic public listings."
          icon={FlaskConical}
          meta={[
            { label: "Matched studies", value: 0 },
            { label: "Eligibility engine", value: "Waiting for structured panel" },
            { label: "Search scope", value: "Patient-specific only" },
          ]}
        />
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Research Matching"
        title="Clinical Trials"
        description="Condition-linked study search prompts derived from your latest structured panel."
        icon={FlaskConical}
        meta={[
          { label: "Matched studies", value: matches.length },
          { label: "Latest panel", value: formatLabDate(latestPanel.recorded_at) },
          { label: "Search scope", value: "Patient-specific only" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Suggested trial searches</CardTitle>
            <CardDescription className="text-white/60">
              These are targeted research queries, not direct enrollment recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.map((match) => (
              <div key={match.title} className={`${portalInsetClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{match.title}</p>
                    <p className="mt-2 text-sm text-white/70">{match.summary}</p>
                  </div>
                  <Badge className="border border-white/10 bg-white/[0.08] text-white">Query</Badge>
                </div>
                <p className="mt-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-sm text-[#ffb07a]">
                  {match.query}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Next step</CardTitle>
            <CardDescription className="text-white/60">
              Validate research fit with your care team before acting on any listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${portalInsetClass} p-4`}>
              <p className="text-sm text-white/75">
                Use these searches on{" "}
                <a
                  href="https://clinicaltrials.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#ffb07a] transition-colors hover:text-white"
                >
                  ClinicalTrials.gov
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>{" "}
                and review inclusion criteria with your clinician.
              </p>
            </div>
            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Why these matches</p>
              <p className="mt-2 text-sm text-white/75">
                Matches are inferred from glucose, lipid, kidney, anemia, and related markers from your latest panel.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientPortalPage>
  );
}
