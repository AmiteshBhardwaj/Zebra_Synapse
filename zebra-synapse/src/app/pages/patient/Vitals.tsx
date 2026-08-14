import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  Watch,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { getSupabase } from "../../../lib/supabase";
import { formatBloodPressure, formatDisplayDate } from "../../../lib/careRelationships";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import { getOverallStatus } from "../../../lib/labInsights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";

type PatientVitalsRow = {
  last_visit: string | null;
  primary_condition: string | null;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  glucose: number | null;
  health_status: "normal" | "elevated" | "risk";
  risk_flags: string[] | null;
  created_at: string;
};

type VitalsStatus = PatientVitalsRow["health_status"];

type VitalsSummary = {
  source: "care" | "lab";
  bloodPressure: string | null;
  heartRate: number | null;
  glucose: number | null;
  a1c: number | null;
  riskFlags: string[];
  lastUpdated: string;
  condition: string;
  status: VitalsStatus;
  statusLabel: string;
};

function statusBadgeClass(status: VitalsStatus) {
  if (status === "normal") return "border border-green-500/20 bg-green-500/20 text-green-400";
  if (status === "elevated") return "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400";
  return "border border-red-500/20 bg-red-500/20 text-red-400";
}

function statusLabel(status: VitalsStatus) {
  if (status === "normal") return "Normal";
  if (status === "elevated") return "Elevated";
  return "Risk";
}

export default function Vitals() {
  const { user, profile } = useAuth();
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading } = usePatientLabPanels();
  const [vitalsRow, setVitalsRow] = useState<PatientVitalsRow | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadVitals = useCallback(async () => {
    const sb = getSupabase();
    const patientId = user?.id;

    if (!sb || !patientId) {
      setVitalsRow(null);
      setVitalsLoading(false);
      return;
    }

    setVitalsLoading(true);
    setLoadError(null);

    const { data, error } = await sb
      .from("care_relationships")
      .select(
        "last_visit, primary_condition, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, glucose, health_status, risk_flags, created_at",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setVitalsRow(null);
      setVitalsLoading(false);
      return;
    }

    setVitalsRow((data as PatientVitalsRow | null) ?? null);
    setVitalsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadVitals();
  }, [loadVitals]);

  const { activePanel } = useActiveReport(panels);
  const labStatus = activePanel ? getOverallStatus(activePanel) : null;

  const summary = useMemo<VitalsSummary | null>(() => {
    if (vitalsRow) {
      return {
        source: "care" as const,
        bloodPressure: formatBloodPressure(
          vitalsRow.blood_pressure_systolic,
          vitalsRow.blood_pressure_diastolic,
        ),
        heartRate: vitalsRow.heart_rate,
        glucose: vitalsRow.glucose,
        a1c: null as number | null,
        riskFlags: Array.isArray(vitalsRow.risk_flags) ? vitalsRow.risk_flags : [],
        lastUpdated: formatDisplayDate(vitalsRow.last_visit ?? vitalsRow.created_at),
        condition: vitalsRow.primary_condition?.trim() || "Linked doctor record",
        status: vitalsRow.health_status,
        statusLabel: statusLabel(vitalsRow.health_status),
      };
    }

    if (activePanel) {
      return {
        source: "lab" as const,
        bloodPressure: null as string | null,
        heartRate: null as number | null,
        glucose: (activePanel.fasting_glucose ?? activePanel.biomarkers?.fasting_glucose) ?? null,
        a1c: (activePanel.hemoglobin_a1c ?? activePanel.biomarkers?.hemoglobin_a1c) ?? null,
        riskFlags: [] as string[],
        lastUpdated: formatLabDate(activePanel.recorded_at),
        condition: "Active selected lab panel",
        status: (labStatus?.tone === "normal" ? "normal" : "elevated") as VitalsStatus,
        statusLabel: labStatus?.label ?? "Lab-derived",
      };
    }

    return null;
  }, [vitalsRow, activePanel, labStatus]);

  const hasAnyVitals = Boolean(
    summary &&
      (
        summary.heartRate != null ||
        summary.bloodPressure != null ||
        summary.glucose != null ||
        summary.a1c != null
      ),
  );

  if (loading || vitalsLoading || panelsLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Vitals"
        description="Wearable and lab-linked vitals after you upload reports"
      />
    );
  }

  return (
    <PatientPortalPage>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <Activity className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Vitals</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                Body Signals
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              Track heart rate, blood pressure, glucose, and metabolic status in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {summary?.statusLabel ?? "Active Tracking"}
          </span>
        </div>
      </div>

      {loadError ? (
        <section className={`${portalPanelClass} border-red-500/20 bg-red-500/[0.08] p-6`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/12">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Could not load vitals</h2>
              <p className="mt-2 text-sm leading-7 text-red-100/85">{loadError}</p>
            </div>
          </div>
        </section>
      ) : null}

      {hasAnyVitals && summary ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-[#ff9c61]" />
                  <p className="text-sm text-white/50">Heart Rate</p>
                </div>
                <p className="text-3xl font-semibold text-white">
                  {summary.heartRate != null ? `${summary.heartRate}` : "—"}
                </p>
                <p className="mt-1 text-sm text-white/60">bpm</p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#3B82F6]" />
                  <p className="text-sm text-white/50">Blood Pressure</p>
                </div>
                <p className="text-3xl font-semibold text-white">{summary.bloodPressure ?? "—"}</p>
                <p className="mt-1 text-sm text-white/60">
                  {summary.bloodPressure ? "mmHg" : "No linked reading"}
                </p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#6C5BD4]" />
                  <p className="text-sm text-white/50">Glucose</p>
                </div>
                <p className="text-3xl font-semibold text-white">
                  {summary.glucose != null ? `${summary.glucose}` : "—"}
                </p>
                <p className="mt-1 text-sm text-white/60">mg/dL</p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#FFC857]" />
                  <p className="text-sm text-white/50">
                    {summary.source === "lab" ? "Lab Status" : "Clinical Status"}
                  </p>
                </div>
                <Badge className={statusBadgeClass(summary.status)}>
                  {summary.statusLabel}
                </Badge>
                <p className="mt-3 text-sm text-white/60">Updated {summary.lastUpdated}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#ff9c61]" />
                  <p className="text-sm text-white/50">Hemoglobin A1c</p>
                </div>
                <p className="text-3xl font-semibold text-white">
                  {summary.a1c != null ? `${summary.a1c}` : "—"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {summary.a1c != null ? "%" : "Available after structured lab extraction"}
                </p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#93c5fd]" />
                  <p className="text-sm text-white/50">Data Source</p>
                </div>
                <p className="text-xl font-semibold text-white">
                  {summary.source === "care" ? "Linked care record" : "Latest lab panel"}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {summary.source === "care"
                    ? "These readings came from your linked doctor record."
                    : "These values were derived from your latest uploaded structured lab report."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-white">
                  {summary.source === "care" ? "Latest linked vitals" : "Latest lab-derived metrics"}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {summary.source === "care"
                    ? "Current readings available from your linked care record."
                    : "Structured markers from your latest uploaded lab panel."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Primary Condition</p>
                  <p className="mt-2 text-sm font-medium text-white">{summary.condition}</p>
                </div>
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Last Updated</p>
                  <p className="mt-2 text-sm font-medium text-white">{summary.lastUpdated}</p>
                </div>
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Source</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {summary.source === "care" ? "Care team record" : "Lab panel extraction"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-white">
                  {summary.source === "care" ? "Risk flags" : "Lab interpretation"}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {summary.source === "care"
                    ? "Highlights associated with your latest linked vitals."
                    : "Context around the latest structured lab snapshot."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary.source === "care" && summary.riskFlags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {summary.riskFlags.map((flag) => (
                      <Badge
                        key={flag}
                        variant="outline"
                        className="border-white/10 bg-white/[0.04] px-3 py-1 text-white/80"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                ) : summary.source === "lab" && activePanel ? (
                  <div className={`${portalInsetClass} p-4`}>
                    <p className="text-sm leading-7 text-white/70">
                      {labStatus?.summary ??
                        "Structured lab values are available, but no additional interpretation has been generated yet."}
                    </p>
                  </div>
                ) : (
                  <div className={`${portalInsetClass} flex items-center gap-3 p-4`}>
                    <Clock3 className="h-4 w-4 text-[#ff9c61]" />
                    <p className="text-sm text-white/70">
                      No risk flags were recorded with your latest vitals snapshot.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configured Body Metrics & Dietary Guardrails (from Settings) */}
          {(profile?.height_cm || profile?.weight_kg || profile?.dietary_preference) && (
            <Card className={`${portalPanelClass} mt-6`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="h-4.5 w-4.5 text-cyan-400" />
                    <CardTitle className="text-base text-white">Body Metrics & Configured Health Profile</CardTitle>
                  </div>
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-mono">
                    From Settings
                  </Badge>
                </div>
                <CardDescription className="text-xs text-[#92a8c7]">
                  Baseline measurements and dietary parameters configured in your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Height</p>
                  <p className="mt-1.5 text-lg font-semibold text-white">
                    {profile.height_cm ? `${profile.height_cm} cm` : "Not set"}
                  </p>
                  {profile.height_cm && (
                    <p className="text-xs text-white/50">
                      {Math.floor(profile.height_cm / 2.54 / 12)} ft {Math.round((profile.height_cm / 2.54) % 12)} in
                    </p>
                  )}
                </div>

                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Weight</p>
                  <p className="mt-1.5 text-lg font-semibold text-white">
                    {profile.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
                  </p>
                  {profile.weight_kg && (
                    <p className="text-xs text-white/50">
                      {Math.round(profile.weight_kg * 2.20462)} lbs
                    </p>
                  )}
                </div>

                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">BMI</p>
                  <p className="mt-1.5 text-lg font-semibold text-cyan-300">
                    {profile.height_cm && profile.weight_kg
                      ? `${(profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)} kg/m²`
                      : "—"}
                  </p>
                  {profile.height_cm && profile.weight_kg && (
                    <p className="text-xs text-white/50">
                      {(() => {
                        const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
                        if (bmi < 18.5) return "Underweight";
                        if (bmi < 25) return "Normal weight";
                        if (bmi < 30) return "Overweight";
                        return "Obese";
                      })()}
                    </p>
                  )}
                </div>

                <div className={`${portalInsetClass} p-4`}>
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Active Diet</p>
                  <p className="mt-1.5 text-lg font-semibold text-emerald-400 capitalize">
                    {profile.dietary_preference || "Omnivore"}
                  </p>
                  <p className="text-xs text-white/50">
                    {profile.food_allergies?.length
                      ? `${profile.food_allergies.length} allergies`
                      : "No allergies recorded"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className={portalPanelClass}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Activity className="h-5 w-5 text-[#ff9c61]" />
              </div>
              <CardTitle className="text-white">No vitals to show yet</CardTitle>
              <CardDescription className="text-white/60">
                Your account has uploads, but no linked vitals have been recorded yet from a care
                relationship or device integration.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">What unlocks this section</CardTitle>
              <CardDescription className="text-white/60">
                This view turns on when your care record includes heart rate, blood pressure, glucose,
                or future wearable data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Heart and activity streams",
                  value: "Heart rate and future device-linked activity summaries appear here.",
                  icon: HeartPulse,
                  tone: "text-[#ff9c61]",
                },
                {
                  label: "Device integrations",
                  value: "Wearable links can populate this area without mixing in fabricated numbers.",
                  icon: Watch,
                  tone: "text-[#b4abff]",
                },
                {
                  label: "Clinical reliability",
                  value: "Every value shown here stays tied to your own uploads and monitoring sources.",
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
      )}
    </PatientPortalPage>
  );
}
