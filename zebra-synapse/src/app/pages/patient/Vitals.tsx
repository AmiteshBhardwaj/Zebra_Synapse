import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  Clock,
  Clock3,
  FlaskConical,
  Ruler,
  Scale,
  ShieldCheck,
  TrendingUp,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { getSupabase } from "../../../lib/supabase";
import {
  calculateBmi,
  formatBloodPressure,
  formatDisplayDate,
  formatHeight,
  formatWeight,
  getBmiCategory,
} from "../../../lib/careRelationships";
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
  if (status === "normal") return "border border-lime-200 bg-lime-50 text-lime-800 font-bold";
  if (status === "elevated") return "border border-amber-200 bg-amber-50 text-amber-800 font-bold";
  return "border border-rose-200 bg-rose-50 text-rose-800 font-bold";
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
        <p className="text-sm text-slate-400">Loading...</p>
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

  const navigate = useNavigate();
  const patientHeight = profile?.height_cm ?? null;
  const patientWeight = profile?.weight_kg ?? null;
  const patientAge = profile?.age ?? null;
  const patientGender = profile?.gender ?? null;
  const patientBloodType = profile?.blood_type ?? null;
  const patientBmi = calculateBmi(patientHeight, patientWeight);
  const patientBmiCategory = getBmiCategory(patientBmi);

  return (
    <PatientPortalPage>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Vitals & Body Metrics</h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider">
                Real Profile
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              Track height, weight, BMI, and clinical biomarkers synced across your medical profile.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-slate-700 font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {summary?.statusLabel ?? "Profile Synced"}
          </span>
        </div>
      </div>

      {loadError ? (
        <section className={`${portalPanelClass} border-rose-200 bg-rose-50/50 p-6 shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300 bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Could not load vitals</h2>
              <p className="mt-1 text-sm text-rose-800">{loadError}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* 1. Demographics & Anthropometrics 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Ruler className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-slate-400 font-medium">Height</p>
            </div>
            <p className="text-xl font-bold text-slate-900 truncate" title={formatHeight(patientHeight)}>
              {patientHeight ? `${patientHeight} cm` : "—"}
            </p>
            {patientHeight && (
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {formatHeight(patientHeight).split("(")[1]?.replace(")", "") || ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-slate-400 font-medium">Weight</p>
            </div>
            <p className="text-xl font-bold text-slate-900 truncate" title={formatWeight(patientWeight)}>
              {patientWeight ? `${patientWeight} kg` : "—"}
            </p>
            {patientWeight && (
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {formatWeight(patientWeight).split("(")[1]?.replace(")", "") || ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-lime-600" />
                <p className="text-xs text-slate-400 font-medium">BMI</p>
              </div>
              {patientBmi != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${patientBmiCategory.badgeClass}`}>
                  {patientBmiCategory.label}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-slate-900">
              {patientBmi != null ? patientBmi : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-slate-400 font-medium">Age</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {patientAge ? `${patientAge} yrs` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <p className="text-xs text-slate-400 font-medium">Gender</p>
            </div>
            <p className="text-xl font-bold text-slate-900 capitalize">
              {patientGender || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FlaskConical className="w-4 h-4 text-rose-600" />
              <p className="text-xs text-slate-400 font-medium">Blood Type</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {patientBloodType || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Lab Biomarkers / Clinical Section */}
      {hasAnyVitals && summary ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-lime-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fasting Glucose</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 font-['Manrope']">
                  {summary.glucose != null ? `${summary.glucose}` : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {summary.glucose != null ? "mg/dL (From Verified Labs)" : "No lab reading on file"}
                </p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-lime-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hemoglobin A1c</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 font-['Manrope']">
                  {summary.a1c != null ? `${summary.a1c}` : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {summary.a1c != null ? "% (From Verified Labs)" : "Available after structured lab extraction"}
                </p>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {summary.source === "lab" ? "Lab Status" : "Clinical Status"}
                  </p>
                </div>
                <Badge className={statusBadgeClass(summary.status)}>
                  {summary.statusLabel}
                </Badge>
                <p className="mt-3 text-xs text-slate-500 font-medium">Updated {summary.lastUpdated}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] mt-6">
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">
                  {summary.source === "care" ? "Latest Linked Vitals" : "Latest Lab-Derived Metrics"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {summary.source === "care"
                    ? "Current readings available from your linked care record."
                    : "Structured markers from your latest uploaded lab panel."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Primary Condition</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{summary.condition}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Last Updated</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{summary.lastUpdated}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Source</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {summary.source === "care" ? "Care team record" : "Lab panel extraction"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">
                  {summary.source === "care" ? "Risk Flags" : "Lab Interpretation"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
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
                        className="border-slate-200 bg-slate-100 px-3 py-1 text-slate-700 font-semibold"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                ) : summary.source === "lab" && activePanel ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {labStatus?.summary ??
                        "Structured lab values are available, but no additional interpretation has been generated yet."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center gap-3 p-4">
                    <Clock3 className="h-4 w-4 text-lime-600" />
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
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
                    <Activity className="h-4.5 w-4.5 text-lime-600" />
                    <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">Body Metrics & Configured Health Profile</CardTitle>
                  </div>
                  <Badge className="border border-lime-200 bg-lime-50 text-lime-800 text-xs font-bold">
                    From Settings
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Baseline measurements and dietary parameters configured in your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Height</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 font-['Manrope']">
                    {profile.height_cm ? `${profile.height_cm} cm` : "Not set"}
                  </p>
                  {profile.height_cm && (
                    <p className="text-xs text-slate-500">
                      {Math.floor(profile.height_cm / 2.54 / 12)} ft {Math.round((profile.height_cm / 2.54) % 12)} in
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Weight</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 font-['Manrope']">
                    {profile.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
                  </p>
                  {profile.weight_kg && (
                    <p className="text-xs text-slate-500">
                      {Math.round(profile.weight_kg * 2.20462)} lbs
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">BMI</p>
                  <p className="mt-1 text-lg font-bold text-lime-700 font-['Manrope']">
                    {profile.height_cm && profile.weight_kg
                      ? `${(profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)} kg/m²`
                      : "—"}
                  </p>
                  {profile.height_cm && profile.weight_kg && (
                    <p className="text-xs text-slate-500">
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

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Active Diet</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 capitalize font-['Manrope']">
                    {profile.dietary_preference || "Omnivore"}
                  </p>
                  <p className="text-xs text-slate-500">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">No vitals to show yet</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Your account has uploads, but no linked vitals have been recorded yet from a care
                relationship or device integration.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 font-['Manrope']">What unlocks this section</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                This view turns on when your care record includes heart rate, blood pressure, glucose,
                or future wearable data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Heart and Activity Streams",
                  value: "Heart rate and future device-linked activity summaries appear here.",
                  icon: HeartPulse,
                  tone: "text-rose-500",
                },
                {
                  label: "Device Integrations",
                  value: "Wearable links can populate this area without mixing in fabricated numbers.",
                  icon: Watch,
                  tone: "text-lime-600",
                },
                {
                  label: "Clinical Reliability",
                  value: "Every value shown here stays tied to your own uploads and monitoring sources.",
                  icon: ShieldCheck,
                  tone: "text-sky-600",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{item.value}</p>
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
