import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FlaskConical, Info, ShieldCheck, Search } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { formatDisplayDate } from "../../../lib/careRelationships";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import { getLatestLabPanel, getTrialMatches } from "../../../lib/labInsights";
import { getSupabase } from "../../../lib/supabase";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
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
      setCareLoading(false);
      return;
    }

    try {
      const { data, error } = await sb
        .from("patient_care_relationship_details")
        .select("last_visit, primary_condition, glucose, risk_flags, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCareRow(data as PatientTrialCareRow);
      }
    } catch {
      // Ignored
    } finally {
      setCareLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCareRow();
  }, [loadCareRow]);

  const { activePanel: selectedPanel } = useActiveReport(panels);

  const activePanel = useMemo(() => {
    if (selectedPanel) return selectedPanel;
    if (careRow && user?.id) {
      return buildMinimalPanelFromCareRow(user.id, careRow);
    }
    return null;
  }, [selectedPanel, careRow, user]);

  const matches = useMemo(() => (activePanel ? getTrialMatches(activePanel) : []), [activePanel]);

  const sourceLabel = selectedPanel ? "Active lab panel" : careRow ? "Linked care record" : "No active signals";
  const sourceDate = selectedPanel
    ? formatLabDate(selectedPanel.recorded_at)
    : careRow
    ? formatDisplayDate(careRow.last_visit ?? careRow.created_at)
    : "";

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

  return (
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Clinical Trials</h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider">
                Research Matching
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              Patient-facing ClinicalTrials.gov references matched to your clinical signals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-slate-700 font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {activePanel ? `${matches.length} Matched Studies` : "Awaiting Biomarkers"}
          </span>
        </div>
      </div>

      {!activePanel ? (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <FlaskConical className="h-4.5 w-4.5 text-lime-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">No trial matches yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                You have lab files on file, but no active structured biomarkers are available yet to drive clinical trial matching. Those will appear here after your reports are processed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                This view becomes active once structured biomarkers are available from your latest uploads or care records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Clinical Matching</p>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  The clinical trial engine uses specific biomarker patterns to suggest relevant trials.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <FlaskConical className="h-4.5 w-4.5 text-lime-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">Suggested Trial References</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                These are curated research references based on your current signal, not enrollment recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {matches.map((match) => (
                <div key={match.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">{match.title}</p>
                      <Badge className="border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">
                        {match.studies.length > 0 ? `${match.studies.length} pinned` : "Search only"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{match.summary}</p>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Search terms: {match.query}
                    </p>
                  </div>

                  {match.studies.length > 0 ? (
                    <div className="space-y-2.5">
                      {match.studies.map((study) => (
                        <div key={study.nctId} className="rounded-xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <a
                                href={study.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 transition-colors hover:text-lime-700 font-['Manrope']"
                              >
                                {study.title}
                                <ExternalLink className="h-3.5 w-3.5 text-lime-600" />
                              </a>
                              <p className="mt-0.5 text-[10px] uppercase font-mono text-slate-400">
                                {study.nctId}
                              </p>
                            </div>
                            <StatusPill status={study.status} />
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{study.fitNote}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3.5 text-xs text-slate-500">
                      No specific study record is pinned for this broader category. Use the search link to browse current listings on ClinicalTrials.gov.
                    </div>
                  )}

                  <Button asChild variant="outline" className={`w-full ${portalSecondaryButtonClass} h-10 text-xs rounded-2xl shadow-sm`}>
                    <a href={match.searchUrl} target="_blank" rel="noopener noreferrer">
                      Search ClinicalTrials.gov
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5 text-lime-600" />
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Info className="h-4.5 w-4.5 text-sky-600" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">Selection Context</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Why these links were chosen and how to interpret them safely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Why these links</p>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Each category uses a fixed set of official ClinicalTrials.gov study pages that line up with common screening patterns for glucose, lipid, kidney, or anemia-related signals.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Patient-specific signal</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900">{sourceLabel}</p>
                <p className="text-xs text-slate-400">Latest signal recorded {sourceDate}</p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedPanel
                    ? "Direct links were chosen from your active structured lab panel."
                    : "No structured lab panel was available, so the page used your linked-care glucose snapshot as a minimal fallback."}
                </p>
                <div className="space-y-1 pt-1">
                  {signalBullets.map((bullet) => (
                    <p key={bullet} className="text-xs text-slate-700 leading-relaxed font-medium">
                      • {bullet}
                    </p>
                  ))}
                </div>
                {careFlags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {careFlags.map((flag) => (
                      <Badge
                        key={flag}
                        variant="outline"
                        className="border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 shadow-sm"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Clinical reminder</p>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  These links are research references only. Review eligibility, risks, and relevance with your clinician before treating any study as a real option.
                </p>
                <Button asChild className={`mt-3 w-full ${portalPrimaryButtonClass} h-10 text-xs rounded-2xl shadow-sm`}>
                  <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer">
                    Open ClinicalTrials.gov
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
