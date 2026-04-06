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
import { getSupabase } from "../../../lib/supabase";
import { formatBloodPressure, formatDisplayDate } from "../../../lib/careRelationships";
import { formatLabDate, type LabPanelRow } from "../../../lib/labPanels";
import { getLatestLabPanel, getOverallStatus } from "../../../lib/labInsights";
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

function statusBadgeClass(status: PatientVitalsRow["health_status"]) {
  if (status === "normal") return "border border-green-500/20 bg-green-500/20 text-green-400";
  if (status === "elevated") return "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400";
  return "border border-red-500/20 bg-red-500/20 text-red-400";
}

function statusLabel(status: PatientVitalsRow["health_status"]) {
  if (status === "normal") return "Normal";
  if (status === "elevated") return "Elevated";
  return "Risk";
}

export default function Vitals() {
  const { user } = useAuth();
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

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const labStatus = latestPanel ? getOverallStatus(latestPanel) : null;

  const summary = useMemo(() => {
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

    if (latestPanel) {
      return {
        source: "lab" as const,
        bloodPressure: null as string | null,
        heartRate: null as number | null,
        glucose: latestPanel.fasting_glucose,
        a1c: latestPanel.hemoglobin_a1c,
        riskFlags: [] as string[],
        lastUpdated: formatLabDate(latestPanel.recorded_at),
        condition: "Latest uploaded lab panel",
        status: labStatus?.tone === "normal" ? "normal" : "elevated",
        statusLabel: labStatus?.label ?? "Lab-derived",
      };
    }

    return null;
  }, [vitalsRow, latestPanel, labStatus]);

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
      <PatientPageHero
        eyebrow="Body Signals"
        title="Vitals"
        description="Track heart rate, blood pressure, and glucose in the same premium dark workspace as the rest of your portal."
        icon={Activity}
        meta={[
          { label: "Heart Rate", value: summary?.heartRate != null ? `${summary.heartRate} bpm` : "—" },
          { label: "Blood Pressure", value: summary?.bloodPressure ?? "—" },
          { label: "Glucose", value: summary?.glucose != null ? `${summary.glucose} mg/dL` : "—" },
          { label: "Status", value: summary?.statusLabel ?? "Awaiting data" },
        ]}
      />

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
                ) : summary.source === "lab" && latestPanel ? (
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
