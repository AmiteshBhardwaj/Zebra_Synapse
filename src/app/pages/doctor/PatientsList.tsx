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

    const rows = (data ?? []) as CareRelationshipListRow[];
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
        badge: "bg-green-100 text-green-800",
        icon: <Activity className="w-5 h-5 text-green-600" />,
        label: "Normal",
        cardBorder: "border-green-200",
      };
    }
    if (status === "elevated") {
      return {
        badge: "bg-yellow-100 text-yellow-800",
        icon: <TrendingUp className="w-5 h-5 text-yellow-600" />,
        label: "Elevated",
        cardBorder: "border-yellow-200",
      };
    }
    return {
      badge: "bg-red-100 text-red-800",
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      label: "Risk",
      cardBorder: "border-red-200",
    };
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl text-foreground">My Patients</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your patients&apos; health status in real-time
          </p>
        </div>
        <LinkPatientDialog onLinked={() => void load()} />
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search patients by name, condition, or status..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading patients…</p>
      ) : null}

      {!loading && !error && patients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground text-sm space-y-2">
            <p>No patients are linked to your account yet.</p>
            <p>
              Use <span className="font-medium text-foreground">Link patient</span>{" "}
              and paste the patient&apos;s profile ID from their{" "}
              <span className="font-medium text-foreground">Account settings</span>{" "}
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
                className="hover:border-foreground/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-muted flex items-center justify-center text-foreground">
                        <span className="text-base">{initials(patient.name)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg">{patient.name}</h3>
                          <Badge className={statusConfig.badge}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {patient.condition} • Last visit:{" "}
                          {patient.lastVisitLabel}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Heart
                              className="w-4 h-4 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Heart Rate
                              </p>
                              <p className="text-sm">
                                {patient.vitals.heartRate != null
                                  ? `${patient.vitals.heartRate} bpm`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity
                              className="w-4 h-4 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Blood Pressure
                              </p>
                              <p className="text-sm">
                                {patient.vitals.bloodPressure ?? "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp
                              className="w-4 h-4 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Glucose
                              </p>
                              <p className="text-sm">
                                {patient.vitals.glucose != null
                                  ? `${patient.vitals.glucose} mg/dL`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {patient.riskFlags.length > 0 && (
                          <div className="flex items-start gap-2 bg-muted border border-border p-3">
                            <AlertTriangle
                              className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0"
                              strokeWidth={1.5}
                            />
                            <div>
                              <p className="text-xs font-medium mb-1">
                                Risk Flags
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {patient.riskFlags.map((flag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
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
        <p className="text-sm text-muted-foreground mt-4">
          No patients match your search.
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <Activity className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Normal Status</p>
                <p className="text-2xl">{summary.normal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Elevated</p>
                <p className="text-2xl">{summary.elevated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl">{summary.risk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
