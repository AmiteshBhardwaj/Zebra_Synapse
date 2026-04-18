import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FlaskConical } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { formatDisplayDate } from "../../../lib/careRelationships";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import { getLatestLabPanel, getTrialMatches } from "../../../lib/labInsights";
import { getSupabase } from "../../../lib/supabase";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
  StatusPill,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

type PatientTrialCareRow = {
  last_visit: string | null;
  primary_condition: string | null;
  glucose: number | null;
  risk_flags: string[] | null;
  created_at: string;
};

function buildMinimalPanelFromCareRow(patientId: string, row: PatientTrialCareRow): LabPanelRow | null {
  if (row.glucose == null) return null;

  const recordedAt = row.last_visit ? row.last_visit.slice(0, 10) : row.created_at.slice(0, 10);

  return {
    id: `care-${patientId}`,
    patient_id: patientId,
    upload_id: null,
    source_extraction_id: null,
    recorded_at: recordedAt,
    biomarkers: { fasting_glucose: row.glucose },
    hemoglobin_a1c: null,
    fasting_glucose: row.glucose,
    total_cholesterol: null,
    ldl: null,
    hdl: null,
    triglycerides: null,
    hemoglobin: null,
    wbc: null,
    platelets: null,
    creatinine: null,
    notes: row.primary_condition,
    created_at: row.created_at,
  };
}

function getSignalBullets(panel: LabPanelRow): string[] {
  const bullets: string[] = [];

  if (panel.hemoglobin_a1c != null && panel.hemoglobin_a1c >= 5.7) {
    bullets.push(`Hemoglobin A1c ${panel.hemoglobin_a1c}% met the glucose-match threshold.`);
  } else if (panel.fasting_glucose != null && panel.fasting_glucose >= 100) {
    bullets.push(`Glucose ${panel.fasting_glucose} mg/dL met the metabolic-match threshold.`);
  }

  if (panel.ldl != null && panel.ldl >= 100) {
    bullets.push(`LDL ${panel.ldl} mg/dL supported a cardiometabolic category.`);
  }

  if (panel.triglycerides != null && panel.triglycerides >= 150) {
    bullets.push(`Triglycerides ${panel.triglycerides} mg/dL reinforced a lipid-focused category.`);
  }

  if (panel.creatinine != null && panel.creatinine > 1.3) {
    bullets.push(`Creatinine ${panel.creatinine} mg/dL supported a kidney-monitoring category.`);
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
    bullets.push(`Hemoglobin ${panel.hemoglobin} g/dL supported an anemia-related category.`);
  }

  if (bullets.length === 0) {
    bullets.push("No strong lab-derived category was detected, so only a broad prevention search is shown.");
  }

  return bullets;
}

export default function ClinicalTrials() {
  const { user } = useAuth();
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading } = usePatientLabPanels();
  const [careRow, setCareRow] = useState<PatientTrialCareRow | null>(null);
  const [careLoading, setCareLoading] = useState(true);

  const loadCareRow = useCallback(async () => {
    const sb = getSupabase();
    const patientId = user?.id;

    if (!sb || !patientId) {
      setCareRow(null);
      setCareLoading(false);
      return;
    }

    setCareLoading(true);
    const { data, error } = await sb
      .from("care_relationships")
      .select("last_visit, primary_condition, glucose, risk_flags, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[clinical trials]", error.message);
      setCareRow(null);
      setCareLoading(false);
      return;
    }

    setCareRow((data as PatientTrialCareRow | null) ?? null);
    setCareLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadCareRow();
  }, [loadCareRow]);

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const fallbackPanel = useMemo(
    () => (user?.id && careRow ? buildMinimalPanelFromCareRow(user.id, careRow) : null),
    [careRow, user?.id],
  );
  const activePanel = latestPanel ?? fallbackPanel;
  const matches = activePanel ? getTrialMatches(activePanel) : [];
  const pinnedStudyCount = matches.reduce((count, match) => count + match.studies.length, 0);
  const sourceLabel = latestPanel
    ? "Structured lab panel"
    : fallbackPanel
      ? "Linked care snapshot"
      : "Awaiting data";
  const sourceDate = latestPanel
    ? formatLabDate(latestPanel.recorded_at)
    : careRow
      ? formatDisplayDate(careRow.last_visit ?? careRow.created_at)
      : "Awaiting data";
  const signalBullets = activePanel ? getSignalBullets(activePanel) : [];
  const careFlags = Array.isArray(careRow?.risk_flags) ? careRow.risk_flags.filter(Boolean) : [];

  if (loading || panelsLoading || careLoading) {
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

  if (!activePanel) {
    return (
      <PatientPortalPage>
        <PatientPageHero
          eyebrow="Research Matching"
          title="Clinical Trials"
          description="Explore future study matches in a focused dark workspace that keeps eligibility signals readable and separate from generic public listings."
          icon={FlaskConical}
          meta={[
            { label: "Matched studies", value: 0 },
            { label: "Pinned studies", value: 0 },
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
        description="Patient-facing ClinicalTrials.gov references chosen from your latest clinical signal. These links are informational and still require eligibility review with your clinician."
        icon={FlaskConical}
        meta={[
          { label: "Matched studies", value: matches.length },
          { label: "Pinned studies", value: pinnedStudyCount },
          { label: "Signal source", value: sourceLabel },
          { label: "Latest signal", value: sourceDate },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Suggested trial references</CardTitle>
            <CardDescription className="text-white/60">
              These are curated research references based on your current signal, not enrollment recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.map((match) => (
              <div key={match.title} className={`${portalInsetClass} space-y-4 p-4`}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{match.title}</p>
                    <Badge className="border border-white/10 bg-white/[0.08] text-white">
                      {match.studies.length > 0 ? `${match.studies.length} pinned` : "Search only"}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/70">{match.summary}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Search terms: {match.query}
                  </p>
                </div>

                {match.studies.length > 0 ? (
                  <div className="space-y-3">
                    {match.studies.map((study) => (
                      <div key={study.nctId} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <a
                              href={study.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-[#ffb07a] transition-colors hover:text-white"
                            >
                              {study.title}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/35">
                              {study.nctId}
                            </p>
                          </div>
                          <StatusPill status={study.status} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/75">{study.fitNote}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-4 text-sm text-white/65">
                    No specific study record is pinned for this broader category. Use the search link to browse current listings on ClinicalTrials.gov.
                  </div>
                )}

                <Button asChild variant="outline" className={`w-full ${portalSecondaryButtonClass}`}>
                  <a href={match.searchUrl} target="_blank" rel="noopener noreferrer">
                    Search ClinicalTrials.gov
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-white">Selection context</CardTitle>
            <CardDescription className="text-white/60">
              Why these links were chosen and how to interpret them safely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Why these links</p>
              <p className="mt-2 text-sm leading-7 text-white/75">
                Each category uses a fixed set of official ClinicalTrials.gov study pages that line up with common screening patterns for glucose, lipid, kidney, or anemia-related signals.
              </p>
            </div>

            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Patient-specific signal</p>
              <p className="mt-2 text-sm font-medium text-white">{sourceLabel}</p>
              <p className="mt-1 text-sm text-white/60">Latest signal recorded {sourceDate}</p>
              <p className="mt-3 text-sm text-white/70">
                {latestPanel
                  ? "Direct links were chosen from your latest structured lab panel."
                  : "No structured lab panel was available, so the page used your linked-care glucose snapshot as a minimal fallback."}
              </p>
              <div className="mt-3 space-y-2">
                {signalBullets.map((bullet) => (
                  <p key={bullet} className="text-sm leading-6 text-white/72">
                    {bullet}
                  </p>
                ))}
              </div>
              {careFlags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {careFlags.map((flag) => (
                    <Badge
                      key={flag}
                      variant="outline"
                      className="border-white/10 bg-white/[0.04] px-3 py-1 text-white/75"
                    >
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={`${portalInsetClass} p-4`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Clinical reminder</p>
              <p className="mt-2 text-sm text-white/75">
                These links are research references only. Review eligibility, risks, and relevance with your clinician before treating any study as a real option.
              </p>
              <Button asChild className={`mt-4 w-full ${portalPrimaryButtonClass}`}>
                <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer">
                  Open ClinicalTrials.gov
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientPortalPage>
  );
}
