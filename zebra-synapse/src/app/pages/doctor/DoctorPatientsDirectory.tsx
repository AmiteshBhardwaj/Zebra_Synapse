import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  UserPlus,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Activity,
  SlidersHorizontal,
  Video,
  FileText,
  CheckCircle2,
  Sparkles,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "risk" | "elevated" | "normal">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "risk">("recent");
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
  const highRiskCount = patients.filter((p) => p.vitals.status === "risk").length;
  const elevatedCount = patients.filter((p) => p.vitals.status === "elevated").length;
  const normalCount = patients.filter((p) => p.vitals.status === "normal").length;

  // Filtering & Sorting
  const filteredPatients = useMemo(() => {
    return patients
      .filter((p) => {
        // Search filter
        const matchSearch =
          search.trim() === "" ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.condition.toLowerCase().includes(search.toLowerCase()) ||
          p.patientId.toLowerCase().includes(search.toLowerCase());

        // Status filter
        const matchStatus = statusFilter === "all" || p.vitals.status === statusFilter;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "risk") {
          const rank = { risk: 3, elevated: 2, normal: 1 };
          return rank[b.vitals.status] - rank[a.vitals.status];
        }
        // Recent
        return 0;
      });
  }, [patients, search, statusFilter, sortBy]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6FC] p-4 md:p-7 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
              Patients Directory
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0099ff]/10 text-[#0088ee] border border-[#0099ff]/20">
              {totalCount} Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            View assigned patient roster, manage clinical profiles, and access medical records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LinkPatientDialog onLinked={() => void load()} />
        </div>
      </div>

      {/* Roster Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0088ee] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Patients</p>
            <p className="text-xl font-bold text-slate-900 font-['Manrope']">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Risk</p>
            <p className="text-xl font-bold text-rose-600 font-['Manrope']">{highRiskCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Elevated Focus</p>
            <p className="text-xl font-bold text-amber-600 font-['Manrope']">{elevatedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stable Status</p>
            <p className="text-xl font-bold text-emerald-600 font-['Manrope']">{normalCount}</p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Controls Toolbar */}
      <div className="bg-white rounded-3xl p-4 md:p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name or condition..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0099ff]/30 focus:border-[#0099ff] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none]">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("risk")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "risk"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            High Risk ({highRiskCount})
          </button>
          <button
            onClick={() => setStatusFilter("elevated")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "elevated"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Elevated ({elevatedCount})
          </button>
          <button
            onClick={() => setStatusFilter("normal")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "normal"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Stable ({normalCount})
          </button>
        </div>

        {/* Sort & View Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "name" | "risk")}
              className="bg-transparent font-medium focus:outline-none cursor-pointer text-slate-900"
            >
              <option value="recent">Sort by Recent</option>
              <option value="name">Sort by Name (A-Z)</option>
              <option value="risk">Sort by Risk Level</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-400 hover:text-slate-700"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-slate-200 rounded-full w-full mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-3xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p>Could not load patient roster: {error}</p>
          </div>
          <button
            onClick={() => void load()}
            className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Patients Display (Grid / List) */}
      {!loading && !error && (
        <>
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-['Manrope']">No Patients Found</h3>
              <p className="text-sm text-slate-500">
                {search.trim()
                  ? `No patient records matching "${search}".`
                  : "You currently have no linked patients assigned."}
              </p>
              {search.trim() ? (
                <button
                  onClick={() => setSearch("")}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all mt-2"
                >
                  Clear Search
                </button>
              ) : (
                <LinkPatientDialog onLinked={() => void load()} />
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW (Matching exact user photo structure + contact options) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPatients.map((patient) => {
                const initial = patient.name.charAt(0).toUpperCase() || "P";
                const isRisk = patient.vitals.status === "risk";
                const isElevated = patient.vitals.status === "elevated";
                const phone = "+1 (555) 349-8201";
                const email = `${patient.name.toLowerCase().replace(/\s+/g, ".")}@synapse.med`;

                return (
                  <div
                    key={patient.patientId}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-[#0099ff]/40 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header Row: Avatar, Name, Condition, Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar Circle with Photo Gradient */}
                          <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#0099ff]/20 to-[#0077ff]/30 border-2 border-white shadow-sm flex items-center justify-center font-bold text-[#0088ee] text-lg shrink-0 font-['Manrope']">
                            {initial}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight font-['Manrope'] group-hover:text-[#0099ff] transition-colors">
                              {patient.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {patient.condition || "Primary Care Patient"}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide shrink-0 ${
                            isRisk
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isElevated
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isRisk ? "High Risk" : isElevated ? "Elevated" : "Normal"}
                        </span>
                      </div>

                      {/* Contact Info Buttons Bar */}
                      <div className="mt-3.5 flex items-center gap-2">
                        <a
                          href={`tel:${phone}`}
                          title={`Call ${patient.name}`}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-[#0099ff]/10 border border-slate-200 text-slate-600 hover:text-[#0088ee] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Phone className="w-3 h-3 text-[#0099ff]" />
                          <span className="truncate">Call</span>
                        </a>
                        <a
                          href={`mailto:${email}`}
                          title={`Email ${patient.name}`}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span className="truncate">Email</span>
                        </a>
                        <button
                          onClick={() => navigate("/doctor/teleconsult")}
                          title={`Start Consult with ${patient.name}`}
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Video className="w-3 h-3 text-emerald-600" />
                        </button>
                      </div>

                      {/* Additional Details Line */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Last visit: {patient.lastVisitLabel || "Recent"}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                          ID: {patient.patientId.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Full-Width Vibrant Blue Pill Button (Matching Photo) */}
                    <div className="mt-4 pt-1">
                      <button
                        onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
                        className="w-full py-2.5 px-4 rounded-full bg-[#0099ff] hover:bg-[#0088ee] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-[#0099ff]/25 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                      >
                        <span>View Patient Details</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredPatients.map((patient) => {
                const initial = patient.name.charAt(0).toUpperCase() || "P";
                const isRisk = patient.vitals.status === "risk";
                const isElevated = patient.vitals.status === "elevated";

                return (
                  <div
                    key={patient.patientId}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-xs flex items-center justify-center font-bold text-slate-800 text-base shrink-0 font-['Manrope']">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base font-['Manrope']">
                            {patient.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRisk
                                ? "bg-rose-50 text-rose-700"
                                : isElevated
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isRisk ? "High Risk" : isElevated ? "Elevated" : "Normal"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {patient.condition || "Primary Care Patient"} • Last visit: {patient.lastVisitLabel || "Recent"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => navigate(`/doctor/teleconsult`)}
                        className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Start Teleconsult"
                      >
                        <Video className="w-3.5 h-3.5 text-[#0099ff]" />
                        <span>Consult</span>
                      </button>
                      <button
                        onClick={() => navigate(`/doctor/patient/${patient.patientId}`)}
                        className="px-5 py-2 rounded-full bg-[#0099ff] hover:bg-[#0088ee] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#0099ff]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
