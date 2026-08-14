import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Heart,
  Search,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  mapRowToListItem,
  type CareRelationshipListRow,
  type DoctorPatientListItem,
} from "../../../lib/careRelationships";
import { getSupabase } from "../../../lib/supabase";
import LinkPatientDialog from "./LinkPatientDialog";
import { Input } from "../../components/ui/input";
import {
  EmptyStateCard,
  MetricCard,
  PatientPageHero,
  PatientPortalPage,
  SectionHeading,
  StatusPill,
  portalInputClass,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";

export default function PatientsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
  const [pendingReviewMap, setPendingReviewMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await sb
      .from("care_relationships")
      .select(CARE_RELATIONSHIPS_LIST_SELECT)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (qErr) {
      setError(qErr.message);
      setPatients([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as CareRelationshipListRow[];
    setPatients(rows.map(mapRowToListItem));

    // Load pending AI inquiries for this doctor
    try {
      const { data: queryData } = await sb
        .from("lab_report_queries")
        .select("patient_id")
        .eq("status", "pending_review");

      if (queryData) {
        const counts: Record<string, number> = {};
        for (const item of queryData) {
          counts[item.patient_id] = (counts[item.patient_id] || 0) + 1;
        }
        setPendingReviewMap(counts);
      }
    } catch {
      // Non-blocking if table or queries are empty
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) =>
      [patient.name, patient.condition, patient.vitals.status, patient.riskFlags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [patients, search]);

  const summary = useMemo(() => {
    let normal = 0;
    let elevated = 0;
    let risk = 0;
    for (const patient of filtered) {
      if (patient.vitals.status === "normal") normal += 1;
      else if (patient.vitals.status === "elevated") elevated += 1;
      else risk += 1;
    }
    return { normal, elevated, risk };
  }, [filtered]);

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Patient Roster"
        title="Scan the roster before risk becomes noise."
        description="Search linked patients, skim current status, and open structured detail pages from one calmer clinical review surface."
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-4 h-10 shadow-sm hover:opacity-95 transition-all cursor-pointer"
              onClick={() => navigate("/doctor/teleconsult")}
            >
              <Video className="w-4 h-4 mr-2" />
              Live Teleconsultations
            </button>
            <LinkPatientDialog onLinked={() => void load()} />
          </div>
        }
        meta={[
          { label: "Linked patients", value: patients.length },
          { label: "Normal", value: summary.normal },
          { label: "Elevated", value: summary.elevated },
          { label: "At risk", value: summary.risk },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Stable"
          value={summary.normal}
          detail="Patients currently marked as normal."
          icon={Activity}
          tone="green"
        />
        <MetricCard
          label="Elevated"
          value={summary.elevated}
          detail="Patients showing elevated signals worth closer follow-up."
          icon={TrendingUp}
          tone="orange"
        />
        <MetricCard
          label="At risk"
          value={summary.risk}
          detail="Patients with the highest need for proactive attention."
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      <section className={`${portalPanelClass} p-5 sm:p-6`}>
        <SectionHeading
          eyebrow="Search"
          title="Find patients by name, condition, or signal"
          description="Keep the roster narrow when you are looking for a specific case, diagnosis, or risk tag."
        />
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search patients by name, condition, or status..."
            className={`pl-11 ${portalInputClass}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-xs text-slate-400">Loading patients...</p> : null}

      {!loading && !error && patients.length === 0 ? (
        <EmptyStateCard
          icon={Users}
          title="No patients linked yet"
          description="Use Link patient and paste the patient's profile ID from their Account settings page to start building your roster."
          action={<LinkPatientDialog onLinked={() => void load()} />}
        />
      ) : null}

      {!loading && patients.length > 0 && filtered.length === 0 ? (
        <div className={`${portalPanelClass} p-6 text-xs text-slate-400`}>No patients match your current search.</div>
      ) : null}

      <section className="space-y-4">
        {filtered.map((patient) => (
          <button
            key={patient.patientId}
            type="button"
            className={`${portalPanelClass} w-full p-5 text-left hover:-translate-y-0.5 transition-all shadow-sm`}
            onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                  {initials(patient.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="truncate text-lg font-bold text-slate-900 font-['Manrope']">{patient.name}</h3>
                    <StatusPill status={patient.vitals.status} />
                    {(pendingReviewMap[patient.patientId] || 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Bot className="h-3.5 w-3.5 text-amber-600" />
                        {pendingReviewMap[patient.patientId]} AI Review{pendingReviewMap[patient.patientId] > 1 ? "s" : ""} Pending
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {patient.condition} · Last visit {patient.lastVisitLabel}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className={`${portalInsetClass} p-3`}>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Heart className="h-3.5 w-3.5 text-rose-500" strokeWidth={2} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Heart Rate</span>
                      </div>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {patient.vitals.heartRate != null ? `${patient.vitals.heartRate} bpm` : "—"}
                      </p>
                    </div>
                    <div className={`${portalInsetClass} p-3`}>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Activity className="h-3.5 w-3.5 text-lime-600" strokeWidth={2} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Blood Pressure</span>
                      </div>
                      <p className="mt-1 text-base font-bold text-slate-900">{patient.vitals.bloodPressure ?? "—"}</p>
                    </div>
                    <div className={`${portalInsetClass} p-3`}>
                      <div className="flex items-center gap-2 text-slate-400">
                        <TrendingUp className="h-3.5 w-3.5 text-sky-600" strokeWidth={2} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Glucose</span>
                      </div>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {patient.vitals.glucose != null ? `${patient.vitals.glucose} mg/dL` : "—"}
                      </p>
                    </div>
                  </div>

                  {patient.riskFlags.length > 0 ? (
                    <div className={`${portalInsetClass} mt-3.5 flex flex-wrap items-start gap-2 p-3`}>
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Risk flags</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {patient.riskFlags.map((flag) => (
                            <span
                              key={flag}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                Open detail
                <ArrowUpRight className="h-3.5 w-3.5 text-lime-600" />
              </div>
            </div>
          </button>
        ))}
      </section>
    </PatientPortalPage>
  );
}
