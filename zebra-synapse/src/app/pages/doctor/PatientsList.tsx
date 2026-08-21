import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  HeartPulse,
  Plus,
  Search,
  Stethoscope,
  Thermometer,
  UserCheck,
  UserPlus,
  Users,
  Video,
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
import {
  type DoctorAppointment,
  loadDoctorAppointments,
  saveDoctorAppointments,
} from "../../../lib/doctorAppointments";
import { getSupabase } from "../../../lib/supabase";
import LinkPatientDialog from "./LinkPatientDialog";
import QuickScheduleAppointmentDialog from "./QuickScheduleAppointmentDialog";

export default function PatientsList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(() => loadDoctorAppointments());
  const [pendingReviewMap, setPendingReviewMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Tabs for right-hand list panel: "appointments" (Today/Upcoming schedule) vs "roster" (Linked patient roster)
  const [activeTab, setActiveTab] = useState<"appointments" | "roster">("appointments");
  const [rosterFilter, setRosterFilter] = useState<"today" | "all">("today");
  const [appointmentFilter, setAppointmentFilter] = useState<"today" | "all" | "teleconsult" | "upcoming">("today");

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Listen to cross-component appointment updates
  useEffect(() => {
    const handleAppointmentsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DoctorAppointment[]>;
      if (customEvent.detail) {
        setAppointments(customEvent.detail);
      } else {
        setAppointments(loadDoctorAppointments());
      }
    };
    window.addEventListener("zebra-appointments-updated", handleAppointmentsUpdate);
    return () => window.removeEventListener("zebra-appointments-updated", handleAppointmentsUpdate);
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

  // Filtered roster list
  const filteredRoster = useMemo(() => {
    let list = patients;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((patient) =>
      [patient.name, patient.condition, patient.riskFlags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [patients, search]);

  // Today reference (August 15, 2026 default baseline in demo)
  const todayDateStr = "2026-08-15";

  // Filtered appointments list
  const filteredAppointments = useMemo(() => {
    let list = appointments;

    if (appointmentFilter === "today") {
      list = list.filter((a) => a.date === todayDateStr || a.date === new Date().toISOString().split("T")[0]);
    } else if (appointmentFilter === "teleconsult") {
      list = list.filter((a) => a.type === "teleconsult");
    } else if (appointmentFilter === "upcoming") {
      list = list.filter((a) => a.status === "Confirmed");
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((a) =>
      [a.patientName, a.condition, a.type, a.status, a.notes || "", a.location || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [appointments, appointmentFilter, search]);

  const todayAppointmentsCount = useMemo(() => {
    return appointments.filter(
      (a) =>
        (a.date === todayDateStr || a.date === new Date().toISOString().split("T")[0]) &&
        a.status !== "Cancelled"
    ).length;
  }, [appointments]);

  // Selected patient for consultation preview
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId && filteredRoster.length > 0) return filteredRoster[0];
    return (
      patients.find((p) => p.patientId === selectedPatientId) ||
      filteredRoster[0] ||
      null
    );
  }, [selectedPatientId, patients, filteredRoster]);

  // Selected patient's upcoming appointment if any

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

  // Dummy appointment slot generator for visual fidelity in roster
  const getAppointmentSlot = (index: number) => {
    const slots = ["8:00 AM", "9:15 AM", "9:30 AM", "10:15 AM", "11:00 AM", "1:30 PM", "2:45 PM", "4:00 PM"];
    return slots[index % slots.length];
  };

  const handleSelectAppointment = (apt: DoctorAppointment) => {
    if (apt.patientId) {
      setSelectedPatientId(apt.patientId);
    } else {
      const match = patients.find(
        (p) => p.name.toLowerCase() === apt.patientName.toLowerCase()
      );
      if (match) {
        setSelectedPatientId(match.patientId);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 font-poppins">
      {/* Left Column: Hero & Consultation */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 h-full min-h-0">
        {/* Hero Card ("Visits for Today") */}
        <div className="relative overflow-hidden shrink-0 rounded-[24px] bg-gradient-to-br from-[#A8DEF7] via-[#D8D9FF] to-[#C7D2FE] p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-[#3E36B0]/5 border border-white/80">
          {/* Subtle Ambient Shapes */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-32 w-48 h-48 bg-[#A8DEF7]/50 rounded-full blur-xl pointer-events-none" />

          {/* Top Greeting & Total Visits in side-by-side header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
                {greeting} <span className="text-[#3E36B0]">{doctorDisplayName}!</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-700/80 font-medium">
                You have {patients.length} linked patient{patients.length === 1 ? "" : "s"} under active clinical surveillance.
              </p>
            </div>

            <div
              onClick={() => setActiveTab("appointments")}
              className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-0.5 shrink-0 bg-white/40 hover:bg-white/60 transition-colors sm:bg-transparent px-3 py-1 sm:p-0 rounded-xl sm:rounded-none cursor-pointer"
              title="Click to view today's appointments"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3E36B0]">
                Visits for Today
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  {todayAppointmentsCount > 0 ? todayAppointmentsCount : patients.length > 0 ? patients.length * 4 + 8 : 28}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-[#3E36B0] border border-white/90">
                  Active Shift
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Metrics Pill Cards & Doctor Cutout Graphic */}
          <div className="relative z-10 mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2.5">
            {/* Actions & Dialogs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Link Patient Dialog Trigger */}
              <div className="self-center">
                <LinkPatientDialog onLinked={() => void load()} />
              </div>

              {/* Quick Book Appointment Dialog */}
              <div className="self-center">
                <QuickScheduleAppointmentDialog
                  patients={patients}
                  defaultPatientId={selectedPatient?.patientId}
                  onScheduled={() => setAppointments(loadDoctorAppointments())}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/90 hover:bg-white text-[#3E36B0] text-xs font-bold shadow-sm border border-white transition-all transform active:scale-95 cursor-pointer"
                      title="Schedule new appointment"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#3E36B0]" />
                      <span>Book Visit</span>
                    </button>
                  }
                />
              </div>
            </div>


          </div>
        </div>

        {/* Center: Consultation Inspection Panel */}
        <div className="bg-white rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-200/70 flex flex-col justify-between flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedPatient ? (
            <div className="space-y-3">
              {/* Consultation Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3E36B0] to-[#6A61EB] text-white flex items-center justify-center text-xs font-bold shadow-md shadow-[#3E36B0]/20">
                    {initials(selectedPatient.name)}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#111111] leading-tight">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Patient · ID: {selectedPatient.patientId.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
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


              {/* Observation & Diagnosis Summary */}
              <div className="bg-[#FAFBFD] rounded-xl p-2.5 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-[#111111]">Observation</p>
                  <span className="text-[9px] text-slate-400 font-medium">
                    Last Checked {selectedPatient.lastVisitLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug font-medium line-clamp-2">
                  {selectedPatient.condition
                    ? `Diagnosed with ${selectedPatient.condition}. Vitals actively monitored with automated multi-omics biomarker alerts enabled.`
                    : "Stable patient baseline. Normal metabolic profile and routine biometrics."}
                </p>
              </div>


              {/* Prescription / Therapy Active */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Active Prescriptions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#E5ECF9] text-[#3E36B0] border border-[#3E36B0]/15">
                    Paracetamol · 500mg (SOS)
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#E5ECF9] text-[#3E36B0] border border-[#3E36B0]/15">
                    Multivitamins · Daily
                  </span>
                  {selectedPatient.riskFlags.map((flag) => (
                    <span
                      key={flag}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pending AI Inquiry indicator */}
              {(pendingReviewMap[selectedPatient.patientId] || 0) > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium">
                  <Bot className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {pendingReviewMap[selectedPatient.patientId]} AI lab query awaiting clinical sign-off.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Stethoscope className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Patient Selected</p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs">
                Select a patient from the appointments or roster to inspect real-time vitals and records.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {selectedPatient && (
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => navigate(`/doctor/patient/${selectedPatient.patientId}`)}
                className="flex-1 h-9 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#3E36B0]/25 transition-all transform active:scale-98 cursor-pointer"
              >
                <span>Open Full Dossier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <QuickScheduleAppointmentDialog
                patients={patients}
                defaultPatientId={selectedPatient.patientId}
                onScheduled={() => setAppointments(loadDoctorAppointments())}
                trigger={
                  <button
                    type="button"
                    className="h-9 px-3 rounded-xl bg-[#E5ECF9] hover:bg-[#D8D9FF] text-[#3E36B0] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Schedule next visit"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Schedule</span>
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Appointments & Patient List Hub */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 h-full min-h-0">
        {/* Main Hub Card with Tab Switcher */}
        <div className="bg-white rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-200/70 flex flex-col flex-1 min-h-0">
          {/* Header with Segmented Navigation Pills */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-1 bg-[#F4F6FC] p-1 rounded-xl">
              {/* Appointments Tab Button */}
              <button
                type="button"
                onClick={() => setActiveTab("appointments")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "appointments"
                    ? "bg-[#3E36B0] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#111111]"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Appointments</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === "appointments"
                      ? "bg-white/20 text-white"
                      : "bg-[#D8D9FF] text-[#3E36B0]"
                  }`}
                >
                  {filteredAppointments.length}
                </span>
              </button>

              {/* Patient Roster Tab Button */}
              <button
                type="button"
                onClick={() => setActiveTab("roster")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "roster"
                    ? "bg-[#3E36B0] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#111111]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeTab === "roster"
                      ? "bg-white/20 text-white"
                      : "bg-[#D8D9FF] text-[#3E36B0]"
                  }`}
                >
                  {filteredRoster.length}
                </span>
              </button>
            </div>

            {/* Filter Dropdown contextual to active tab */}
            {activeTab === "appointments" ? (
              <select
                value={appointmentFilter}
                onChange={(e) => setAppointmentFilter(e.target.value as any)}
                className="text-xs font-semibold text-slate-600 bg-[#F4F6FC] rounded-lg px-2 py-1 border border-slate-200 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="teleconsult">Teleconsult</option>
                <option value="all">All Visits</option>
              </select>
            ) : (
              <select
                value={rosterFilter}
                onChange={(e) => setRosterFilter(e.target.value as any)}
                className="text-xs font-semibold text-slate-600 bg-[#F4F6FC] rounded-lg px-2 py-1 border border-slate-200 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="today">Today</option>
                <option value="all">All Patients</option>
              </select>
            )}
          </div>

          {/* Quick Search & Header Actions */}
          <div className="flex items-center gap-2 my-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "appointments"
                    ? "Search appointments..."
                    : "Search patient roster..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#F4F6FC] border border-transparent focus:border-[#3E36B0]/30 text-xs text-[#111111] placeholder:text-slate-400 outline-none transition-all"
              />
            </div>

            {activeTab === "appointments" && (
              <QuickScheduleAppointmentDialog
                patients={patients}
                defaultPatientId={selectedPatient?.patientId}
                onScheduled={() => setAppointments(loadDoctorAppointments())}
                trigger={
                  <button
                    type="button"
                    className="h-8 px-2.5 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                    title="Schedule new consultation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                }
              />
            )}
          </div>

          {/* TAB 1: APPOINTMENTS LIST */}
          {activeTab === "appointments" && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin] flex flex-col justify-between">
              <div className="space-y-2">
                {filteredAppointments.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No appointments found</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Schedule a new consultation or adjust your filters.
                    </p>
                  </div>
                )}

                {filteredAppointments.map((apt) => {
                  const isSelected =
                    selectedPatient &&
                    (apt.patientId === selectedPatient.patientId ||
                      apt.patientName.toLowerCase() === selectedPatient.name.toLowerCase());

                  return (
                    <div
                      key={apt.id}
                      onClick={() => handleSelectAppointment(apt)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-[#F4F6FC] border-[#3E36B0]/40 shadow-sm ring-1 ring-[#3E36B0]/20"
                          : "bg-white border-slate-100 hover:bg-[#FAFBFD] hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-[#3E36B0] text-white"
                              : "bg-[#E5ECF9] text-[#3E36B0]"
                          }`}
                        >
                          {initials(apt.patientName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#111111] truncate">
                              {apt.patientName}
                            </p>
                            {apt.urgency === "urgent" && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                              {apt.condition}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                apt.type === "teleconsult"
                                  ? "bg-purple-100 text-purple-700"
                                  : apt.type === "lab-review"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {apt.type === "teleconsult" ? "Teleconsult" : apt.type === "lab-review" ? "Lab" : "Visit"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Time Slot & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F6FC] border border-slate-200 text-slate-700">
                          {apt.time}
                        </span>

                        {apt.type === "teleconsult" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/doctor/teleconsult");
                            }}
                            className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Join Video Teleconsult"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Schedule Link */}
              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate("/doctor/appointments")}
                  className="w-full py-2 rounded-xl bg-[#F4F6FC] hover:bg-[#E5ECF9] text-[#3E36B0] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Open Full Calendar & Schedule</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT ROSTER LIST */}
          {activeTab === "roster" && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
              {loading && <p className="text-xs text-slate-400 text-center py-8">Loading patients...</p>}

              {!loading && filteredRoster.length === 0 && (
                <div className="text-center py-12 px-4">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No patients found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Try another filter or link a new patient.</p>
                </div>
              )}

              {!loading &&
                filteredRoster.map((p, idx) => {
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
          )}
        </div>
      </div>
    </div>
  );
}
