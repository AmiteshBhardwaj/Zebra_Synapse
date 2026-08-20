import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FlaskConical, Info, ShieldCheck, Search } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { formatDisplayDate } from "../../../lib/careRelationships";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import { getTrialMatches } from "../../../lib/labInsights";
import { getSupabase } from "../../../lib/supabase";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import { StatusPill } from "../../components/patient/PortalTheme";
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
    bullets.push(`HbA1c ${panel.hemoglobin_a1c}% met glucose-match threshold.`);
  } else if (panel.fasting_glucose != null && panel.fasting_glucose >= 100) {
    bullets.push(`Glucose ${panel.fasting_glucose} mg/dL met metabolic threshold.`);
  }

  if (panel.ldl != null && panel.ldl >= 100) {
    bullets.push(`LDL ${panel.ldl} mg/dL supported cardiometabolic match.`);
  }

  if (panel.triglycerides != null && panel.triglycerides >= 150) {
    bullets.push(`Triglycerides ${panel.triglycerides} mg/dL supported lipid category.`);
  }

  if (panel.creatinine != null && panel.creatinine > 1.3) {
    bullets.push(`Creatinine ${panel.creatinine} mg/dL supported renal category.`);
  }

  if (panel.hemoglobin != null && panel.hemoglobin < 12) {
    bullets.push(`Hemoglobin ${panel.hemoglobin} g/dL supported hematology category.`);
  }

  if (bullets.length === 0) {
    bullets.push("Broad prevention search based on general wellness indicators.");
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
      <div className="h-full flex items-center justify-center p-6 bg-[#f6f8f5]">
        <p className="text-sm text-[#A1A1AA]">Matching clinical research studies...</p>
      </div>
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
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. COMPACT EXECUTIVE HEADER */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Clinical Trials
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider font-['Manrope']">
                Research Matching
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              Patient-facing ClinicalTrials.gov references matched to your active clinical signals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-['Manrope']">
          <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-semibold shadow-2xs font-['Manrope']">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {activePanel ? `${matches.length} Matched Categories` : "Awaiting Biomarkers"}
          </span>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN DASHBOARD */}
      {!activePanel ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-[22px] bg-white border border-slate-100 p-5 shadow-sm">
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">No trial matches yet</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                You have lab files on file, but no active structured biomarkers are available yet to drive clinical trial matching.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="rounded-[22px] bg-white border border-slate-100 p-5 shadow-sm">
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[#0099ff]" />
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">What unlocks this section</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                This view becomes active once structured biomarkers are available from your latest uploads or care records.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
          {/* LEFT COLUMN: MATCHED TRIALS LIST (SCROLLABLE CONTAINER) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                Suggested Trial References ({matches.length})
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Curated ClinicalTrials.gov Signal</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {matches.map((match) => (
                <article
                  key={match.title}
                  className="rounded-[22px] border border-slate-100 bg-white p-4 sm:p-4.5 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-200 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 font-['Manrope']">
                          {match.title}
                        </h3>
                        <Badge className="border border-sky-200 bg-sky-50 text-[10px] font-bold text-[#0284c7]">
                          {match.studies.length > 0 ? `${match.studies.length} pinned` : "Search only"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                        {match.summary}
                      </p>
                    </div>
                  </div>

                  {/* Pinned Studies */}
                  {match.studies.length > 0 && (
                    <div className="space-y-2">
                      {match.studies.map((study) => (
                        <div
                          key={study.nctId}
                          className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-xs space-y-1 hover:bg-white hover:border-sky-200 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={study.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-slate-900 hover:text-[#0099ff] inline-flex items-center gap-1 leading-snug"
                            >
                              <span>{study.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                            </a>
                            <StatusPill status={study.status} className="text-[9px] px-2 py-0.2 shrink-0" />
                          </div>
                          <p className="text-[10px] uppercase font-mono text-slate-400">{study.nctId}</p>
                          <p className="text-[11px] text-slate-600 leading-snug">{study.fitNote}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <Button
                      asChild
                      variant="outline"
                      className="h-8 px-3 rounded-xl border-slate-200 bg-white hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-xs font-semibold text-slate-700 gap-1 cursor-pointer transition-all"
                    >
                      <a href={match.searchUrl} target="_blank" rel="noopener noreferrer">
                        <span>Browse Search on ClinicalTrials.gov</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: SIGNAL CONTEXT & SEARCH HELPER */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {/* Selection Context Card */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm font-['Manrope'] border-b border-slate-100 pb-2.5">
                <Info className="h-4 w-4 text-[#0099ff]" />
                <span>Patient Signal Context</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signal Source</p>
                  <p className="mt-0.5 font-bold text-slate-900">{sourceLabel}</p>
                  <p className="text-[11px] text-slate-500">Recorded: {sourceDate || "Latest Active Panel"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signal Evidence</p>
                  {signalBullets.map((bullet) => (
                    <p key={bullet} className="text-[11px] text-slate-700 leading-snug">
                      • {bullet}
                    </p>
                  ))}
                </div>

                {careFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {careFlags.map((flag) => (
                      <Badge
                        key={flag}
                        variant="outline"
                        className="border-slate-200 bg-white px-2 py-0.2 text-[10px] font-bold text-slate-700"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Research Disclaimer Card */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2.5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs sm:text-sm font-['Manrope'] border-b border-slate-100 pb-2">
                  <ShieldCheck className="h-4 w-4 text-[#0099ff]" />
                  <span>Clinical Research Notice</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                  These links are research references only. Always review eligibility, protocol risks, and relevance with your physician before seeking trial enrollment.
                </p>
              </div>

              <Button
                asChild
                className="w-full h-9.5 rounded-xl bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white font-bold text-xs shadow-[0_3px_10px_rgba(0,153,255,0.25)] hover:shadow-[0_4px_14px_rgba(0,153,255,0.35)] cursor-pointer mt-3 transition-all active:scale-[0.98]"
              >
                <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer">
                  <span>Open ClinicalTrials.gov Portal</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
