import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  SlidersHorizontal,
  Video,
  Grid,
  List,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import {
  CARE_RELATIONSHIPS_FALLBACK_SELECT,
  CARE_RELATIONSHIPS_LIST_SELECT,
  mapRowToListItem,
  type CareRelationshipListRow,
  type DoctorPatientListItem,
} from "../../../lib/careRelationships";
import { getSupabase } from "../../../lib/supabase";
import LinkPatientDialog from "./LinkPatientDialog";

export default function DoctorPatientsDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let { data, error: qErr } = await sb
      .from("care_relationships")
      .select(CARE_RELATIONSHIPS_LIST_SELECT)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    // Fallback if height_cm / weight_kg columns are absent
    if (qErr && (qErr.message.includes("height_cm") || qErr.message.includes("does not exist"))) {
      const fallback = await sb
        .from("care_relationships")
        .select(CARE_RELATIONSHIPS_FALLBACK_SELECT)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (!fallback.error) {
        data = fallback.data;
        qErr = null;
      }
    }

    if (qErr) {
      setError(qErr.message);
      setPatients([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as CareRelationshipListRow[];
    const mapped = rows.map(mapRowToListItem);
    setPatients(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Statistics calculation
  const totalCount = patients.length;

  // Sorting
  const filteredPatients = useMemo(() => {
    const list = [...patients];
    if (sortBy === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [patients, sortBy]);

  return (
    <div className="w-full space-y-3 md:space-y-3.5 pb-2">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
              Patients Directory
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0099ff]/10 text-[#0088ee] border border-[#0099ff]/20">
              {totalCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            View assigned patient roster, manage clinical profiles, and access medical records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LinkPatientDialog onLinked={() => void load()} />
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="bg-white rounded-2xl p-2.5 md:p-3 shadow-sm border border-slate-200/80 flex items-center gap-2.5">
        {/* Sort & View Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "name")}
              className="bg-transparent font-medium focus:outline-none cursor-pointer text-slate-900 text-xs"
            >
              <option value="recent">Sort by Recent</option>
              <option value="name">Sort by Name (A-Z)</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-slate-200 rounded-full w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p>Could not load patient roster: {error}</p>
          </div>
          <button
            onClick={() => void load()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Patients Display (Grid / List) */}
      {!loading && !error && (
        <>
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-sm max-w-sm mx-auto space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-['Manrope']">No Patients Found</h3>
              <p className="text-xs text-slate-500">
                You currently have no linked patients assigned.
              </p>
              <LinkPatientDialog onLinked={() => void load()} />
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3.5">
              {filteredPatients.map((patient) => {
                const initial = patient.name.charAt(0).toUpperCase() || "P";
                const phone = "+1 (555) 349-8201";
                const email = `${patient.name.toLowerCase().replace(/\s+/g, ".")}@synapse.med`;

                return (
                  <div
                    key={patient.patientId}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-[#0099ff]/40 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header Row: Avatar, Name, Condition, Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar Circle */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0099ff]/20 to-[#0077ff]/30 border-2 border-white shadow-xs flex items-center justify-center font-bold text-[#0088ee] text-sm shrink-0 font-['Manrope']">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm leading-snug font-['Manrope'] truncate group-hover:text-[#0099ff] transition-colors">
                              {patient.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {patient.condition || "Primary Care Patient"}
                            </p>
                          </div>
                        </div>

                        {/* Active Status Badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          Active
                        </span>
                      </div>

                      {/* Contact Info Buttons Bar */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <a
                          href={`tel:${phone}`}
                          title={`Call ${patient.name}`}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-[#0099ff]/10 border border-slate-200 text-slate-600 hover:text-[#0088ee] text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Phone className="w-2.5 h-2.5 text-[#0099ff]" />
                          <span className="truncate">Call</span>
                        </a>
                        <a
                          href={`mailto:${email}`}
                          title={`Email ${patient.name}`}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Mail className="w-2.5 h-2.5 text-slate-500" />
                          <span className="truncate">Email</span>
                        </a>
                        <button
                          onClick={() => navigate("/doctor/teleconsult")}
                          title={`Start Consult with ${patient.name}`}
                          className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Video className="w-2.5 h-2.5 text-emerald-600" />
                        </button>
                      </div>

                      {/* Additional Details Line */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Last visit: {patient.lastVisitLabel || "Recent"}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          ID: {patient.patientId.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Full-Width Vibrant Blue Pill Button */}
                    <div className="mt-3 pt-0.5">
                      <button
                        onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
                        className="w-full py-2 px-3 rounded-full bg-[#0099ff] hover:bg-[#0088ee] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-[#0099ff]/25 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                      >
                        <span>View Patient Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredPatients.map((patient) => {
                const initial = patient.name.charAt(0).toUpperCase() || "P";

                return (
                  <div
                    key={patient.patientId}
                    className="p-3 md:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-xs flex items-center justify-center font-bold text-slate-800 text-xs shrink-0 font-['Manrope']">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm font-['Manrope']">
                            {patient.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {patient.condition || "Primary Care Patient"} • Last visit: {patient.lastVisitLabel || "Recent"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/doctor/teleconsult`)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Start Teleconsult"
                      >
                        <Video className="w-3 h-3 text-[#0099ff]" />
                        <span>Consult</span>
                      </button>
                      <button
                        onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
                        className="px-4 py-1.5 rounded-full bg-[#0099ff] hover:bg-[#0088ee] text-white text-xs font-semibold flex items-center gap-1 shadow-sm shadow-[#0099ff]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
