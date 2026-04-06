import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  mapRowToListItem,
  type CareRelationshipListRow,
  type DoctorPatientListItem,
} from "../../../lib/careRelationships";
import { getSupabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Heart, TrendingUp, Activity, AlertTriangle, Search } from "lucide-react";
import LinkPatientDialog from "./LinkPatientDialog";
import { portalInputClass, portalPanelClass } from "../../components/patient/PortalTheme";

export default function PatientsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
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

    const rows = ((data ?? []) as unknown) as CareRelationshipListRow[];
    setPatients(rows.map(mapRowToListItem));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const blob = [
        p.name,
        p.condition,
        p.vitals.status,
        p.riskFlags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [patients, search]);

  const summary = useMemo(() => {
    let normal = 0;
    let elevated = 0;
    let risk = 0;
    for (const p of filtered) {
      if (p.vitals.status === "normal") normal += 1;
      else if (p.vitals.status === "elevated") elevated += 1;
      else risk += 1;
    }
    return { normal, elevated, risk };
  }, [filtered]);

  const getStatusConfig = (status: string) => {
    if (status === "normal") {
      return {
        badge: "border border-green-500/20 bg-green-500/20 text-green-400",
        icon: <Activity className="w-5 h-5 text-green-400" />,
        label: "Normal",
        cardBorder: "border-green-500/20",
      };
    }
    if (status === "elevated") {
      return {
        badge: "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400",
        icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
        label: "Elevated",
        cardBorder: "border-yellow-500/20",
      };
    }
    return {
      badge: "border border-red-500/20 bg-red-500/20 text-red-400",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      label: "Risk",
      cardBorder: "border-red-500/20",
    };
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-full bg-transparent p-8 text-white">
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl text-white">My Patients</h1>
          <p className="mt-1 text-white/60">
            Monitor your patients&apos; health status in real-time
          </p>
        </div>
        <LinkPatientDialog onLinked={() => void load()} />
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            placeholder="Search patients by name, condition, or status..."
            className={`pl-10 ${portalInputClass}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-[#ff9c9c]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/60">Loading patients…</p>
      ) : null}

      {!loading && !error && patients.length === 0 ? (
        <Card className={`${portalPanelClass} border-dashed`}>
          <CardContent className="space-y-2 p-8 text-center text-sm text-white/60">
            <p>No patients are linked to your account yet.</p>
            <p>
              Use <span className="font-medium text-white">Link patient</span>{" "}
              and paste the patient&apos;s profile ID from their{" "}
              <span className="font-medium text-white">Account settings</span>{" "}
              page. You can also insert rows via the Supabase SQL editor if you
              prefer.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        {!loading &&
          filtered.map((patient) => {
            const statusConfig = getStatusConfig(patient.vitals.status);
            return (
              <Card
                key={patient.patientId}
                className={`${portalPanelClass} ${statusConfig.cardBorder} cursor-pointer bg-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition hover:scale-[1.01] hover:border-white/[0.16] hover:shadow-[0_12px_38px_rgba(0,0,0,0.46)]`}
                onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
                        <span className="text-base font-medium">{initials(patient.name)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg text-white">{patient.name}</h3>
                          <Badge className={statusConfig.badge}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="mb-3 text-sm text-white/60">
                          {patient.condition} • Last visit:{" "}
                          {patient.lastVisitLabel}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Heart
                              className="w-4 h-4 text-white/40"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-white/40">
                                Heart Rate
                              </p>
                              <p className="text-sm text-white">
                                {patient.vitals.heartRate != null
                                  ? `${patient.vitals.heartRate} bpm`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity
                              className="w-4 h-4 text-white/40"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-white/40">
                                Blood Pressure
                              </p>
                              <p className="text-sm text-white">
                                {patient.vitals.bloodPressure ?? "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp
                              className="w-4 h-4 text-white/40"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-white/40">
                                Glucose
                              </p>
                              <p className="text-sm text-white">
                                {patient.vitals.glucose != null
                                  ? `${patient.vitals.glucose} mg/dL`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {patient.riskFlags.length > 0 && (
                          <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                            <AlertTriangle
                              className="mt-0.5 w-4 h-4 flex-shrink-0 text-[#ff9c61]"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="mb-1 text-xs font-medium text-white">
                                Risk Flags
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {patient.riskFlags.map((flag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="border-white/10 bg-white/[0.04] text-xs text-white/80"
                                  >
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center ml-4">
                      {statusConfig.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {!loading && patients.length > 0 && filtered.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">
          No patients match your search.
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${portalPanelClass} bg-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/12">
                <Activity className="w-5 h-5 text-green-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-white/60">Normal Status</p>
                <p className="text-2xl text-white">{summary.normal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${portalPanelClass} bg-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/12">
                <TrendingUp className="w-5 h-5 text-yellow-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-white/60">Elevated</p>
                <p className="text-2xl text-white">{summary.elevated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${portalPanelClass} bg-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/12">
                <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-white/60">At Risk</p>
                <p className="text-2xl text-white">{summary.risk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
