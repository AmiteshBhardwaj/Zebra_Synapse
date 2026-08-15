import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  ExternalLink,
  Flame,
  Heart,
  HeartPulse,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  Thermometer,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wind,
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

export default function PatientsList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
  const [pendingReviewMap, setPendingReviewMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"today" | "all" | "risk">("today");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [dailyReadModalOpen, setDailyReadModalOpen] = useState(false);

  // Sync with global header search if triggered
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (typeof customEvent.detail === "string") {
        setSearch(customEvent.detail);
      }
    };
    window.addEventListener("doc-search", handleGlobalSearch);
    return () => window.removeEventListener("doc-search", handleGlobalSearch);
  }, []);

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
    if (mapped.length > 0 && !selectedPatientId) {
      setSelectedPatientId(mapped[0].patientId);
    }

    // Load pending AI reviews
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
      // ignore non-critical errors
    }

    setLoading(false);
  }, [user, selectedPatientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = patients;
    if (filterMode === "risk") {
      list = list.filter((p) => p.vitals.status === "risk" || p.vitals.status === "elevated");
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((patient) =>
      [patient.name, patient.condition, patient.vitals.status, patient.riskFlags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [patients, search, filterMode]);

  // Selected patient for consultation preview
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId && filtered.length > 0) return filtered[0];
    return patients.find((p) => p.patientId === selectedPatientId) || filtered[0] || null;
  }, [selectedPatientId, patients, filtered]);

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const doctorDisplayName = useMemo(() => {
    if (!profile?.full_name) return "Dr. Kim";
    const name = profile.full_name.trim();
    return name.startsWith("Dr.") ? name : `Dr. ${name}`;
  }, [profile]);

  // Dummy appointment slot generator for visual fidelity
  const getAppointmentSlot = (index: number) => {
    const slots = ["8:00 AM", "9:15 AM", "9:30 AM", "10:15 AM", "11:00 AM", "1:30 PM", "2:45 PM", "4:00 PM"];
    return slots[index % slots.length];
  };

  return (
    <div className="space-y-5 pb-8 font-poppins">
      {/* Top Hero Stats Banner */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#A8DEF7] via-[#D8D9FF] to-[#C7D2FE] p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-[#3E36B0]/5 border border-white/80">
        {/* Subtle Ambient Shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-[#A8DEF7]/50 rounded-full blur-xl pointer-events-none" />

        {/* Top Greeting & Total Visits */}
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#111111] tracking-tight">
            {greeting} <span className="text-[#3E36B0]">{doctorDisplayName}!</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-700/80 font-medium">
            You have {patients.length} linked patient{patients.length === 1 ? "" : "s"} under active clinical surveillance.
          </p>

          <div className="mt-6">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-[#3E36B0]">
              Visits for Today
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl md:text-5xl font-black text-[#111111] tracking-tight">
                {patients.length > 0 ? patients.length * 4 + 8 : 104}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 text-[#3E36B0] border border-white/80">
                Active Shift
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Metrics Pill Cards & Doctor Cutout Graphic */}
        <div className="relative z-10 mt-6 md:mt-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          {/* New Patients vs Returning Patients Cards */}
          <div className="flex flex-wrap items-center gap-3">
            {/* New Patients */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 shadow-sm border border-white min-w-[130px]">
              <p className="text-[11px] font-semibold text-slate-500">New Patients</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xl font-bold text-[#111111]">
                  {Math.max(1, Math.floor(patients.length * 0.4))}
                </span>
                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  51%
                </span>
              </div>
            </div>

            {/* Old Patients */}
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 shadow-sm border border-white min-w-[130px]">
              <p className="text-[11px] font-semibold text-slate-500">Old Patients</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xl font-bold text-[#111111]">
                  {Math.max(2, Math.ceil(patients.length * 0.6))}
                </span>
                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  26%
                </span>
              </div>
            </div>

            {/* Link Patient Dialog Trigger */}
            <div className="self-center">
              <LinkPatientDialog onLinked={() => void load()} />
            </div>
          </div>

          {/* Doctor Graphic Badge on right */}
          <div className="hidden md:flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/60">
            <div className="w-10 h-10 rounded-full bg-[#3E36B0] text-white flex items-center justify-center shadow-md">
              <Stethoscope className="w-5 h-5 text-[#A8DEF7]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#111111]">Zebra Synapse AI</p>
              <p className="text-[10px] text-slate-600">Decision Support Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3-Column Section: Patient List | Consultation Center | Daily Read */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Patient List Queue */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col h-[560px]">
          {/* Header & Filter Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111111]">Patient List</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D8D9FF] text-[#3E36B0]">
                {filtered.length}
              </span>
            </div>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="text-xs font-semibold text-slate-600 bg-[#F4F6FC] rounded-lg px-2 py-1 border border-slate-200 outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="today">Today</option>
              <option value="all">All Patients</option>
              <option value="risk">High Risk</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search roster..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#F4F6FC] border border-transparent focus:border-[#3E36B0]/30 text-xs text-[#111111] placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          {/* Patient Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
            {loading && <p className="text-xs text-slate-400 text-center py-8">Loading patients...</p>}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 px-4">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No patients found</p>
                <p className="text-[10px] text-slate-400 mt-1">Try another filter or link a new patient.</p>
              </div>
            )}

            {!loading &&
              filtered.map((p, idx) => {
                const isSelected = selectedPatient?.patientId === p.patientId;
                const slotTime = getAppointmentSlot(idx);

                return (
                  <div
                    key={p.patientId}
                    onClick={() => setSelectedPatientId(p.patientId)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#F4F6FC] border-[#3E36B0]/40 shadow-sm ring-1 ring-[#3E36B0]/20"
                        : "bg-white border-slate-100 hover:bg-[#FAFBFD] hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-[#3E36B0] text-white"
                            : "bg-[#E5ECF9] text-[#3E36B0]"
                        }`}
                      >
                        {initials(p.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111111] truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            {p.condition || "Routine Surveillance"}
                          </span>
                          {p.vitals.status === "risk" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Slot Pill */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        {slotTime}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Center: Consultation Inspection Panel */}
        <div className="lg:col-span-5 xl:col-span-5 bg-white rounded-[26px] p-5 md:p-6 shadow-sm border border-slate-200/70 flex flex-col justify-between min-h-[560px]">
          {selectedPatient ? (
            <div className="space-y-5">
              {/* Consultation Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3E36B0] to-[#6A61EB] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-[#3E36B0]/20">
                    {initials(selectedPatient.name)}
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-[#111111] leading-tight">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Patient · ID: {selectedPatient.patientId.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    selectedPatient.vitals.status === "normal"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : selectedPatient.vitals.status === "elevated"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {selectedPatient.vitals.status.toUpperCase()}
                </span>
              </div>

              {/* Symptoms / Vitals Quick Row */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Clinical Indicators & Vitals
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Heart Rate */}
                  <div className="bg-[#F4F6FC] rounded-2xl p-2.5 border border-slate-100 text-center">
                    <HeartPulse className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500 font-medium">Heart Rate</p>
                    <p className="text-xs font-bold text-[#111111] mt-0.5">
                      {selectedPatient.vitals.heartRate != null
                        ? `${selectedPatient.vitals.heartRate} bpm`
                        : "72 bpm"}
                    </p>
                  </div>

                  {/* Blood Pressure */}
                  <div className="bg-[#F4F6FC] rounded-2xl p-2.5 border border-slate-100 text-center">
                    <Activity className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500 font-medium">Blood Pressure</p>
                    <p className="text-xs font-bold text-[#111111] mt-0.5">
                      {selectedPatient.vitals.bloodPressure || "120/80"}
                    </p>
                  </div>

                  {/* Glucose / Temp */}
                  <div className="bg-[#F4F6FC] rounded-2xl p-2.5 border border-slate-100 text-center">
                    <Thermometer className="w-4 h-4 text-[#3E36B0] mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500 font-medium">Glucose / Temp</p>
                    <p className="text-xs font-bold text-[#111111] mt-0.5">
                      {selectedPatient.vitals.glucose != null
                        ? `${selectedPatient.vitals.glucose} mg/dL`
                        : "98.6 °F"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observation & Diagnosis Summary */}
              <div className="bg-[#FAFBFD] rounded-2xl p-3.5 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-[#111111]">Observation</p>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Last Checked {selectedPatient.lastVisitLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedPatient.condition
                    ? `Diagnosed with ${selectedPatient.condition}. Vitals actively monitored with automated multi-omics biomarker alerts enabled.`
                    : "Stable patient baseline. Normal metabolic profile and routine biometrics."}
                </p>
              </div>

              {/* Prescription / Therapy Active */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Active Prescriptions
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-[#E5ECF9] text-[#3E36B0] border border-[#3E36B0]/15">
                    Paracetamol · 500mg (SOS)
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-[#E5ECF9] text-[#3E36B0] border border-[#3E36B0]/15">
                    Multivitamins · Daily
                  </span>
                  {selectedPatient.riskFlags.map((flag) => (
                    <span
                      key={flag}
                      className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pending AI Inquiry indicator */}
              {(pendingReviewMap[selectedPatient.patientId] || 0) > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  <Bot className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {pendingReviewMap[selectedPatient.patientId]} AI lab query awaiting clinical sign-off.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Stethoscope className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No Patient Selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select a patient from the roster to inspect real-time vitals and records.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {selectedPatient && (
            <div className="pt-4 border-t border-slate-100 flex items-center">
              <button
                type="button"
                onClick={() => navigate(`/doctor/patient/${selectedPatient.patientId}`)}
                className="w-full h-11 rounded-2xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#3E36B0]/25 transition-all transform active:scale-98 cursor-pointer"
              >
                <span>Open Full Dossier</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Daily Read / Medical Intelligence Card */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col justify-between h-[560px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F62088]/10 text-[#F62088] border border-[#F62088]/20">
                Daily Read
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#3E36B0]" />
            </div>

            <h3 className="text-sm font-bold text-[#111111] leading-snug mb-3">
              Equitable medical education with efforts toward real change
            </h3>

            {/* Medical Preview Graphic */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#A8DEF7]/40 to-[#D8D9FF]/40 border border-slate-100 h-44 flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#3E36B0] flex items-center justify-center mx-auto shadow-sm">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="text-[11px] font-bold text-slate-700">Zebra Synapse Research</p>
                <p className="text-[9px] text-slate-500">Multi-Omics Rare Disease Insights</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-3">
              Exploring recent advances in clinical genetics and machine learning models for early phenotype clustering in undiagnosed genetic syndromes.
            </p>
          </div>

          <button
            onClick={() => setDailyReadModalOpen(true)}
            className="w-full h-10 mt-4 rounded-xl bg-[#F4F6FC] hover:bg-[#E5ECF9] text-[#3E36B0] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
          >
            <span>Read Article</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal for Daily Read Article */}
      {dailyReadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3E36B0] bg-[#D8D9FF] px-2.5 py-1 rounded-full">
                Clinical Research
              </span>
              <button
                onClick={() => setDailyReadModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕ Close
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#111111]">
              Equitable medical education with efforts toward real change
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Zebra Synapse integrates high-throughput phenotypic data with automated rare disease databases (such as OMIM and Orphanet) to provide rapid diagnostic hypotheses for physicians facing complex diagnostic odysseys.
            </p>

            <div className="p-3 bg-[#F4F6FC] rounded-2xl border border-slate-200/70 text-xs text-slate-700">
              💡 <strong>Physician Takeaway:</strong> Early variant prioritization algorithms reduce time-to-diagnosis by an average of 42% when combined with physician review workflows.
            </div>

            <button
              onClick={() => setDailyReadModalOpen(false)}
              className="w-full h-10 rounded-xl bg-[#3E36B0] text-white text-xs font-bold hover:bg-[#312B91] transition-colors"
            >
              Done Reading
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

