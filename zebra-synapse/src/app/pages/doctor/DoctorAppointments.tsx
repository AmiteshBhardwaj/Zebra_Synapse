import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Stethoscope,
  MapPin,
  Sparkles,
  Phone,
  User,
  Check,
  MoreVertical,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  mapRowToListItem,
  type CareRelationshipListRow,
  type DoctorPatientListItem,
} from "../../../lib/careRelationships";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import {
  type DoctorAppointment,
  TIME_SLOTS,
  INITIAL_APPOINTMENTS,
  loadDoctorAppointments,
  saveDoctorAppointments,
} from "../../../lib/doctorAppointments";

export { type DoctorAppointment, TIME_SLOTS, INITIAL_APPOINTMENTS };


export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // State
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(() => {
    const saved = localStorage.getItem("zebra_doc_appointments");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_APPOINTMENTS;
      }
    }
    return INITIAL_APPOINTMENTS;
  });

  const [patients, setPatients] = useState<DoctorPatientListItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Filters & Views
  const [tabFilter, setTabFilter] = useState<"all" | "today" | "upcoming" | "completed" | "teleconsult">("today");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date(2026, 7, 15)); // August 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(15);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);

  // New Appointment Form
  const [newPatientSelection, setNewPatientSelection] = useState<string>("");
  const [customPatientName, setCustomPatientName] = useState<string>("");
  const [newDate, setNewDate] = useState<string>("2026-08-15");
  const [newTime, setNewTime] = useState<string>("10:00 AM");
  const [newType, setNewType] = useState<"in-person" | "teleconsult" | "follow-up" | "lab-review">("in-person");
  const [newCondition, setNewCondition] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [newUrgency, setNewUrgency] = useState<"normal" | "priority" | "urgent">("normal");

  // Reschedule Form
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");

  // Cancel Form
  const [cancelReason, setCancelReason] = useState<string>("");

  // Complete Form
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Dynamic calendar days with appointment indicator dots
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, isCurrentMonth: false, dateStr: "" });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hasAppointments = appointments.some(
        (a) => a.date === dateStr && a.status !== "Cancelled"
      );
      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        hasDot: hasAppointments,
      });
    }
    return days;
  }, [currentMonthDate, appointments]);


  const handleSelectCalendarDay = (day: number) => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (selectedDay === day && selectedCalendarDate === dateStr) {
      setSelectedDay(null);
      setSelectedCalendarDate(null);
    } else {
      setSelectedDay(day);
      setSelectedCalendarDate(dateStr);
    }
  };

  const handleTabClick = (tabId: "all" | "today" | "upcoming" | "completed" | "teleconsult") => {
    setTabFilter(tabId);
    setSelectedCalendarDate(null);
    if (tabId === "today") {
      setSelectedDay(15);
    } else {
      setSelectedDay(null);
    }
  };

  // Persist appointments in localStorage
  useEffect(() => {
    localStorage.setItem("zebra_doc_appointments", JSON.stringify(appointments));
  }, [appointments]);

  // Load real patients from Supabase
  const loadPatients = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setLoadingPatients(false);
      return;
    }

    try {
      const { data, error } = await sb
        .from("care_relationships")
        .select(CARE_RELATIONSHIPS_LIST_SELECT)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped = (data as unknown as CareRelationshipListRow[]).map(mapRowToListItem);
        setPatients(mapped);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPatients(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  // Handle URL query parameters (e.g. ?schedule=true or ?patient=ID)
  useEffect(() => {
    const querySchedule = searchParams.get("schedule");
    const queryPatient = searchParams.get("patient");
    if (querySchedule === "true") {
      setScheduleModalOpen(true);
    }
    if (queryPatient) {
      setNewPatientSelection(queryPatient);
      setScheduleModalOpen(true);
    }
  }, [searchParams]);

  // Stats Calculations
  const stats = useMemo(() => {
    const todayStr = "2026-08-15";
    const todayCount = appointments.filter((a) => a.date === todayStr && a.status !== "Cancelled").length;
    const upcomingCount = appointments.filter((a) => a.date >= todayStr && a.status === "Confirmed").length;
    const teleconsultCount = appointments.filter((a) => a.type === "teleconsult" && a.status === "Confirmed").length;
    const completedCount = appointments.filter((a) => a.status === "Completed").length;

    return { todayCount, upcomingCount, teleconsultCount, completedCount };
  }, [appointments]);

  // Filtered Appointments List
  const filteredAppointments = useMemo(() => {
    let list = [...appointments];
    const todayStr = "2026-08-15";

    // Calendar day filter if selected
    if (selectedCalendarDate) {
      list = list.filter((a) => a.date === selectedCalendarDate);
    } else {
      // Tab filtering
      if (tabFilter === "today") {
        list = list.filter((a) => a.date === todayStr);
      } else if (tabFilter === "upcoming") {
        list = list.filter((a) => a.date >= todayStr && a.status === "Confirmed");
      } else if (tabFilter === "completed") {
        list = list.filter((a) => a.status === "Completed");
      } else if (tabFilter === "teleconsult") {
        list = list.filter((a) => a.type === "teleconsult");
      }
    }

    // Type filter
    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    // Sort by date then time
    return list.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });
  }, [appointments, selectedCalendarDate, tabFilter, typeFilter]);

  // Schedule Appointment Handler
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    let pName = customPatientName.trim();
    let pCondition = newCondition.trim();
    let pId: string | undefined = undefined;

    if (newPatientSelection && newPatientSelection !== "custom") {
      const matched = patients.find((p) => p.patientId === newPatientSelection);
      if (matched) {
        pName = matched.name;
        pCondition = matched.condition || "Clinical Routine Consultation";
        pId = matched.patientId;
      }
    }

    if (!pName) {
      toast.error("Please provide or select a patient.");
      return;
    }

    const newApt: DoctorAppointment = {
      id: `apt-${Date.now()}`,
      patientId: pId,
      patientName: pName,
      condition: pCondition || "Rare Phenotype Surveillance",
      date: newDate,
      time: newTime,
      durationMinutes: 30,
      type: newType,
      status: "Confirmed",
      location: newType === "teleconsult" ? "Virtual Consult Room #1" : "Synapse Clinical Suite 402",
      notes: newNotes,
      urgency: newUrgency,
      vitalsSummary: "Telemetry Connected",
    };

    setAppointments((prev) => [newApt, ...prev]);
    toast.success(`Appointment booked with ${pName} on ${newDate} at ${newTime}!`);
    setScheduleModalOpen(false);

    // Reset Form
    setNewPatientSelection("");
    setCustomPatientName("");
    setNewNotes("");
    setNewCondition("");
  };

  // Reschedule Handler
  const handleConfirmReschedule = () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === selectedAppointment.id
          ? {
              ...a,
              date: rescheduleDate,
              time: rescheduleTime,
              status: "Confirmed",
            }
          : a
      )
    );

    toast.success(`Appointment with ${selectedAppointment.patientName} moved to ${rescheduleDate} at ${rescheduleTime}.`);
    setRescheduleModalOpen(false);
    setSelectedAppointment(null);
  };

  // Cancel Handler
  const handleConfirmCancel = () => {
    if (!selectedAppointment) return;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === selectedAppointment.id
          ? {
              ...a,
              status: "Cancelled",
              notes: cancelReason ? `Cancelled: ${cancelReason}` : "Cancelled by physician.",
            }
          : a
      )
    );

    toast.info(`Appointment with ${selectedAppointment.patientName} has been cancelled.`);
    setCancelModalOpen(false);
    setSelectedAppointment(null);
    setCancelReason("");
  };

  // Complete Appointment Handler
  const handleConfirmComplete = () => {
    if (!selectedAppointment) return;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === selectedAppointment.id
          ? {
              ...a,
              status: "Completed",
              notes: clinicalNotes ? `${a.notes || ""}\nVisit Notes: ${clinicalNotes}` : a.notes,
            }
          : a
      )
    );

    toast.success(`Consultation with ${selectedAppointment.patientName} marked as Completed.`);
    setCompleteModalOpen(false);
    setSelectedAppointment(null);
    setClinicalNotes("");
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "PT";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-3.5 pb-2 font-poppins text-[#111111]">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] px-5 py-3 text-white shadow-md shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-36 h-36 bg-[#A8DEF7]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <Calendar className="w-3 h-3" />
              Clinical Schedule & Encounters
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Appointment Center
          </h1>
          <p className="mt-0.5 text-xs text-white/80 leading-snug font-medium line-clamp-1">
            Manage your daily patient consultation queue, organize in-person visits, and launch high-definition multi-omics teleconsultations.
          </p>
        </div>

        {/* Right side inside Appointment Center banner: Tabs */}
        <div className="relative z-10 flex items-center">
          {/* Navigation Filter Tabs */}
          <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-inner overflow-x-auto [scrollbar-width:none]">
            {[
              { id: "today", label: "Today's Schedule" },
              { id: "upcoming", label: "Upcoming" },
              { id: "teleconsult", label: "Teleconsults" },
              { id: "completed", label: "Completed" },
              { id: "all", label: "All Records" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  tabFilter === tab.id && !selectedCalendarDate
                    ? "bg-white text-[#3E36B0] shadow-sm font-extrabold"
                    : "text-white/85 hover:text-white hover:bg-white/15"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* 2-Column Section: Appointments List + Calendar Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Filter and Search Bar + Appointments List */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
          {/* Active date filter chip banner (if selectedCalendarDate is active) */}
          {selectedCalendarDate && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#D8D9FF]/40 border border-[#3E36B0]/20 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#3E36B0]" />
                <span className="font-bold text-[#111111]">
                  Filtered by Date:{" "}
                  {new Date(selectedCalendarDate + "T00:00:00").toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  ({filteredAppointments.length} appointment{filteredAppointments.length === 1 ? "" : "s"})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCalendarDate(null);
                  setSelectedDay(null);
                }}
                className="text-xs font-bold text-[#3E36B0] hover:underline cursor-pointer"
              >
                Clear Date Filter
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/70 flex flex-col">
            {/* Top Bar: Queue status & Type Filter */}
            <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {selectedCalendarDate
                    ? "Selected Date Encounters"
                    : tabFilter === "today"
                    ? "Today's Schedule Queue"
                    : tabFilter === "upcoming"
                    ? "Upcoming Visits"
                    : tabFilter === "teleconsult"
                    ? "Teleconsultations"
                    : tabFilter === "completed"
                    ? "Completed Visits"
                    : "All Patient Records"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E5ECF9] text-[#3E36B0] text-[11px] font-bold">
                  {filteredAppointments.length}
                </span>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#F4F6FC] border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 shrink-0"
                >
                  <option value="all">All Types</option>
                  <option value="in-person">In-Person</option>
                  <option value="teleconsult">Teleconsult</option>
                  <option value="lab-review">Lab Review</option>
                  <option value="follow-up">Follow-Up</option>
                </select>
              </div>
            </div>

            {/* Appointments List Render (with smooth constrained internal scroll) */}
            <div className="pt-3 max-h-[calc(100vh-325px)] min-h-[180px] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {filteredAppointments.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-[#F4F6FC] text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarX className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No appointments found</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    No appointments matching current filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCalendarDate(null);
                      setSelectedDay(null);
                      setTabFilter("all");
                      setTypeFilter("all");
                    }}
                    className="mt-1 text-xs font-bold text-[#3E36B0] hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {filteredAppointments.map((apt) => {
                    const isToday = apt.date === "2026-08-15";

                    return (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          apt.status === "Completed"
                            ? "bg-slate-50/70 border-slate-100 opacity-85"
                            : apt.status === "Cancelled"
                            ? "bg-rose-50/30 border-rose-100 opacity-75"
                            : isToday
                            ? "bg-white border-[#3E36B0]/30 shadow-xs ring-1 ring-[#3E36B0]/10 hover:border-[#3E36B0]"
                            : "bg-white border-slate-200/70 hover:border-slate-300 shadow-xs"
                        }`}
                      >
                        {/* Left: Patient Info & Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
                              apt.type === "teleconsult"
                                ? "bg-purple-100 text-[#3E36B0]"
                                : "bg-[#E5ECF9] text-[#3E36B0]"
                            }`}
                          >
                            {getInitials(apt.patientName)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs md:text-sm font-extrabold text-[#111111] leading-tight">
                                {apt.patientName}
                              </h3>
                              {apt.patientAge && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  ({apt.patientAge}y {apt.patientGender ? `· ${apt.patientGender[0]}` : ""})
                                </span>
                              )}

                              {/* Status badge */}
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  apt.status === "Confirmed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : apt.status === "Completed"
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : apt.status === "Cancelled"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {apt.status}
                              </span>

                              {/* Type badge */}
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  apt.type === "teleconsult"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-sky-50 text-[#0284c7] border border-sky-200"
                                }`}
                              >
                                {apt.type === "teleconsult" ? (
                                  <Video className="w-2.5 h-2.5" />
                                ) : (
                                  <MapPin className="w-2.5 h-2.5" />
                                )}
                                {apt.type === "teleconsult"
                                  ? "Teleconsult"
                                  : apt.type === "lab-review"
                                  ? "Lab Review"
                                  : apt.type === "follow-up"
                                  ? "Follow-Up"
                                  : "In-Person"}
                              </span>
                            </div>

                            <p className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                              {apt.condition}
                            </p>

                            {apt.notes && (
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                Note: {apt.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Center: Date & Time Schedule Box */}
                        <div className="flex items-center gap-3 bg-[#F4F6FC] px-2.5 py-1.5 rounded-lg border border-slate-200/60 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#3E36B0]" />
                            <div className="text-left">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                              <p className="text-[11px] font-bold text-[#111111]">{apt.date}</p>
                            </div>
                          </div>

                          <div className="h-5 w-px bg-slate-200" />

                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#3E36B0]" />
                            <div className="text-left">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Slot</p>
                              <p className="text-[11px] font-bold text-[#111111]">{apt.time}</p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                          {apt.type === "teleconsult" && apt.status === "Confirmed" && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/doctor/teleconsult?id=${apt.id}&patient=${encodeURIComponent(
                                    apt.patientName
                                  )}&patientId=${apt.patientId || ""}`
                                )
                              }
                              className="h-8 px-3 rounded-lg bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Start Teleconsult Video Call"
                            >
                              <Video className="w-3 h-3 text-[#A8DEF7]" />
                              <span>Start Call</span>
                            </button>
                          )}

                          {apt.status === "Confirmed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setCompleteModalOpen(true);
                                }}
                                className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Complete Encounter"
                              >
                                <Check className="w-3 h-3" />
                                <span className="hidden md:inline">Complete</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setRescheduleDate(apt.date);
                                  setRescheduleTime(apt.time);
                                  setRescheduleModalOpen(true);
                                }}
                                className="h-8 px-2.5 rounded-lg bg-[#F4F6FC] hover:bg-[#E5ECF9] text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                                title="Reschedule"
                              >
                                Reschedule
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setCancelModalOpen(true);
                                }}
                                className="h-8 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          )}

                          {apt.patientId && (
                            <button
                              type="button"
                              onClick={() => navigate(`/doctor/patient/${apt.patientId}`)}
                              className="h-8 px-2.5 rounded-lg bg-[#F4F6FC] hover:bg-[#E5ECF9] text-[#3E36B0] border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="View Patient Dossier"
                            >
                              <User className="w-3 h-3" />
                              <span className="hidden sm:inline">Dossier</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Calendar Widget */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/70">
            {/* Calendar Header */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#3E36B0]" />
                  Calendar
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 bg-[#F4F6FC] px-2 py-0.5 rounded-md">
                    {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                  </span>
                  <div className="flex items-center gap-0.5 text-slate-400">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMonthDate(
                          new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
                        )
                      }
                      className="p-1 hover:text-[#3E36B0] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMonthDate(
                          new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
                        )
                      }
                      className="p-1 hover:text-[#3E36B0] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 mb-1">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                {calendarDays.map((item, idx) => {
                  if (!item.isCurrentMonth || item.day === null) {
                    return <div key={`empty-${idx}`} className="h-6 w-6" />;
                  }
                  const isSelected = item.day === selectedDay;
                  return (
                    <button
                      key={`day-${item.day}`}
                      type="button"
                      onClick={() => handleSelectCalendarDay(item.day!)}
                      className={`h-6 w-6 mx-auto rounded-full flex flex-col items-center justify-center text-[11px] font-medium transition-all relative cursor-pointer ${
                        isSelected
                          ? "bg-[#3E36B0] text-white font-bold shadow-xs shadow-[#3E36B0]/30"
                          : "text-slate-700 hover:bg-[#F4F6FC]"
                      }`}
                    >
                      <span>{item.day}</span>
                      {item.hasDot && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-[#F62088] absolute bottom-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCHEDULE NEW APPOINTMENT MODAL */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-[560px] p-6 sm:p-7 rounded-[28px] bg-white border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#D8D9FF] text-[#3E36B0] flex items-center justify-center">
                <Calendar className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 font-['Manrope']">
                  Schedule New Encounter
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Book a clinical appointment or virtual teleconsult with a patient.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateAppointment} className="space-y-4 pt-3">
            {/* Patient Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#3E36B0]" />
                Select Patient
              </Label>

              <Select
                value={newPatientSelection}
                onValueChange={(val) => {
                  setNewPatientSelection(val);
                  if (val !== "custom") {
                    const p = patients.find((pat) => pat.patientId === val);
                    if (p) {
                      setNewCondition(p.condition || "");
                    }
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-semibold">
                  <SelectValue placeholder="Choose a linked patient or enter custom..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-slate-100 shadow-xl max-h-60">
                  <SelectItem value="custom" className="text-xs font-bold text-[#3E36B0]">
                    + Enter New Patient Name
                  </SelectItem>
                  {patients.map((pat) => (
                    <SelectItem key={pat.patientId} value={pat.patientId} className="text-xs font-medium">
                      {pat.name} {pat.condition ? `(${pat.condition})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(!newPatientSelection || newPatientSelection === "custom") && (
                <Input
                  type="text"
                  placeholder="Patient Full Name..."
                  value={customPatientName}
                  onChange={(e) => setCustomPatientName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium mt-1.5"
                  required={!newPatientSelection || newPatientSelection === "custom"}
                />
              )}
            </div>

            {/* Condition / Primary Concern */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#3E36B0]" />
                Clinical Condition / Purpose
              </Label>
              <Input
                type="text"
                placeholder="e.g. Marfan Syndrome Echocardiogram, Routine Vitals..."
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium"
              />
            </div>

            {/* Encounter Mode (In-Person vs Teleconsult) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Encounter Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "in-person", label: "In-Person", icon: MapPin },
                  { id: "teleconsult", label: "Teleconsult", icon: Video },
                  { id: "lab-review", label: "Lab Review", icon: Activity },
                  { id: "follow-up", label: "Follow-Up", icon: Clock },
                ].map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewType(type.id as any)}
                      className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        newType === type.id
                          ? "bg-[#3E36B0] text-white border-[#3E36B0] shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#3E36B0]" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#3E36B0]" />
                  Time Slot
                </Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border-slate-100 shadow-xl max-h-48">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot} className="text-xs font-medium">
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clinical Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Pre-Consultation Notes</Label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add clinical instructions, prep advice, or triage priority..."
                className="w-full h-20 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#3E36B0] outline-none resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleModalOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold px-5 shadow-sm"
              >
                Confirm Appointment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE MODAL */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-6 rounded-[28px] bg-white border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 font-['Manrope']">
              Reschedule Encounter
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Moving appointment for{" "}
              <strong className="text-slate-900">{selectedAppointment?.patientName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">New Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">New Time Slot</Label>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-slate-100 shadow-xl max-h-48">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot} className="text-xs font-medium">
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setRescheduleModalOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReschedule}
                className="h-10 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold px-5"
              >
                Save New Time
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[440px] p-6 rounded-[28px] bg-white border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-2 pb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 font-['Manrope']">
              Cancel Appointment?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to cancel the encounter with{" "}
              <strong>{selectedAppointment?.patientName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Cancellation Reason (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Patient requested postponement, emergency triage..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Keep Appointment
              </Button>
              <Button
                onClick={handleConfirmCancel}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5"
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COMPLETE ENCOUNTER MODAL */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-[28px] bg-white border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 font-['Manrope']">
                  Complete Clinical Encounter
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Wrap up visit with <strong>{selectedAppointment?.patientName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Post-Consultation Summary & Notes</Label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Prescription recommendations, lab orders placed, follow-up timeline..."
                className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#3E36B0] outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setCompleteModalOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmComplete}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 shadow-sm"
              >
                Mark Completed & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
