import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Calendar,
  Clock,
  Plus,
  Search,
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

export type DoctorAppointment = {
  id: string;
  patientId?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  condition: string;
  date: string; // YYYY-MM-DD
  time: string;
  durationMinutes: number;
  type: "in-person" | "teleconsult" | "follow-up" | "lab-review";
  status: "Confirmed" | "Completed" | "Cancelled" | "In-Progress";
  location?: string;
  notes?: string;
  vitalsSummary?: string;
  urgency?: "normal" | "priority" | "urgent";
};

export const TIME_SLOTS = [
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

const INITIAL_APPOINTMENTS: DoctorAppointment[] = [
  {
    id: "apt-101",
    patientName: "Eleanor Vance",
    patientAge: 34,
    patientGender: "Female",
    condition: "Ehlers-Danlos Syndrome (EDS)",
    date: "2026-08-15",
    time: "09:00 AM",
    durationMinutes: 30,
    type: "in-person",
    status: "Confirmed",
    location: "Synapse Clinical Suite 402",
    notes: "Joint hypermobility follow-up and physical therapy progress review.",
    vitalsSummary: "BP: 118/76 · HR: 72 bpm",
    urgency: "normal",
  },
  {
    id: "apt-102",
    patientName: "Marcus Sterling",
    patientAge: 48,
    patientGender: "Male",
    condition: "Fabry Disease (GLA Gene)",
    date: "2026-08-15",
    time: "10:30 AM",
    durationMinutes: 45,
    type: "teleconsult",
    status: "Confirmed",
    location: "Virtual Consult Room #1",
    notes: "Enzyme replacement therapy (ERT) response evaluation and renal panel review.",
    vitalsSummary: "BP: 132/85 · HR: 78 bpm",
    urgency: "priority",
  },
  {
    id: "apt-103",
    patientName: "Sophia Martinez",
    patientAge: 29,
    patientGender: "Female",
    condition: "Marfan Syndrome Surveillance",
    date: "2026-08-15",
    time: "02:00 PM",
    durationMinutes: 30,
    type: "in-person",
    status: "Confirmed",
    location: "Synapse Clinical Suite 402",
    notes: "Annual aortic root echocardiogram telemetry correlation.",
    vitalsSummary: "BP: 110/70 · HR: 68 bpm",
    urgency: "normal",
  },
  {
    id: "apt-104",
    patientName: "David Zhao",
    patientAge: 52,
    patientGender: "Male",
    condition: "Gaucher Disease Type 1",
    date: "2026-08-16",
    time: "11:00 AM",
    durationMinutes: 30,
    type: "teleconsult",
    status: "Confirmed",
    location: "Virtual Consult Room #2",
    notes: "Platelet count monitoring and bone density scan discussion.",
    vitalsSummary: "BP: 124/80 · HR: 74 bpm",
    urgency: "normal",
  },
  {
    id: "apt-105",
    patientName: "Liam O'Connor",
    patientAge: 41,
    patientGender: "Male",
    condition: "Familial Hypercholesterolemia",
    date: "2026-08-17",
    time: "03:30 PM",
    durationMinutes: 30,
    type: "lab-review",
    status: "Confirmed",
    location: "Synapse Clinical Suite 402",
    notes: "PCSK9 inhibitor titration and lipid multi-omics panel evaluation.",
    vitalsSummary: "BP: 138/88 · HR: 82 bpm",
    urgency: "priority",
  },
  {
    id: "apt-106",
    patientName: "Aaliyah Khan",
    patientAge: 26,
    patientGender: "Female",
    condition: "Wilson Disease",
    date: "2026-08-12",
    time: "09:30 AM",
    durationMinutes: 30,
    type: "in-person",
    status: "Completed",
    location: "Synapse Clinical Suite 402",
    notes: "24-hour urinary copper excretion stable on zinc acetate therapy.",
    vitalsSummary: "BP: 115/75 · HR: 70 bpm",
    urgency: "normal",
  },
  {
    id: "apt-107",
    patientName: "Jameson Blake",
    patientAge: 61,
    patientGender: "Male",
    condition: "Huntington's Disease Early Phenotyping",
    date: "2026-08-10",
    time: "01:30 PM",
    durationMinutes: 45,
    type: "teleconsult",
    status: "Completed",
    location: "Virtual Consult Room #1",
    notes: "UHDRS motor assessment and speech therapy referral issued.",
    vitalsSummary: "BP: 128/82 · HR: 76 bpm",
    urgency: "normal",
  },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("2026-08-15");
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

    // Type filter
    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.condition.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          a.status.toLowerCase().includes(q)
      );
    }

    // Sort by date then time
    return list.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });
  }, [appointments, tabFilter, typeFilter, searchQuery]);

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
    <div className="space-y-6 pb-12 font-poppins text-[#111111]">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-[26px] bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] p-6 md:p-8 text-white shadow-xl shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-48 h-48 bg-[#A8DEF7]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <Calendar className="w-3.5 h-3.5" />
              Clinical Schedule & Encounters
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Appointment Center
          </h1>
          <p className="mt-1.5 text-xs md:text-sm text-white/80 leading-relaxed font-medium">
            Manage your daily patient consultation queue, organize in-person visits, and launch high-definition multi-omics teleconsultations.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setNewDate("2026-08-15");
              setScheduleModalOpen(true);
            }}
            className="h-11 px-5 rounded-2xl bg-white hover:bg-white/95 text-[#3E36B0] font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <div
          onClick={() => setTabFilter("today")}
          className={`p-4 md:p-5 rounded-[22px] bg-white border cursor-pointer transition-all ${
            tabFilter === "today"
              ? "border-[#3E36B0] shadow-md ring-2 ring-[#3E36B0]/10"
              : "border-slate-200/70 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Today's Visits</span>
            <div className="w-9 h-9 rounded-xl bg-[#D8D9FF] text-[#3E36B0] flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-[#111111]">
              {stats.todayCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Active Shift
            </span>
          </div>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setTabFilter("upcoming")}
          className={`p-4 md:p-5 rounded-[22px] bg-white border cursor-pointer transition-all ${
            tabFilter === "upcoming"
              ? "border-[#3E36B0] shadow-md ring-2 ring-[#3E36B0]/10"
              : "border-slate-200/70 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Upcoming Total</span>
            <div className="w-9 h-9 rounded-xl bg-[#A8DEF7]/40 text-[#0284c7] flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-[#111111]">
              {stats.upcomingCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Scheduled</span>
          </div>
        </div>

        {/* Teleconsultations */}
        <div
          onClick={() => setTabFilter("teleconsult")}
          className={`p-4 md:p-5 rounded-[22px] bg-white border cursor-pointer transition-all ${
            tabFilter === "teleconsult"
              ? "border-[#3E36B0] shadow-md ring-2 ring-[#3E36B0]/10"
              : "border-slate-200/70 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Teleconsults</span>
            <div className="w-9 h-9 rounded-xl bg-[#F62088]/10 text-[#F62088] flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-[#111111]">
              {stats.teleconsultCount}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Live Ready
            </span>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setTabFilter("completed")}
          className={`p-4 md:p-5 rounded-[22px] bg-white border cursor-pointer transition-all ${
            tabFilter === "completed"
              ? "border-[#3E36B0] shadow-md ring-2 ring-[#3E36B0]/10"
              : "border-slate-200/70 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Completed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-[#111111]">
              {stats.completedCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Encounters</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Controls Bar + Appointments List */}
      <div className="bg-white rounded-[26px] p-5 md:p-6 shadow-sm border border-slate-200/70 space-y-5">
        {/* Top Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
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
                onClick={() => setTabFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  tabFilter === tab.id
                    ? "bg-[#3E36B0] text-white shadow-sm"
                    : "bg-[#F4F6FC] text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Type Filter */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, disease..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F4F6FC] border border-transparent focus:border-[#3E36B0]/30 text-xs text-[#111111] placeholder:text-slate-400 outline-none transition-all"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#F4F6FC] border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="all">All Types</option>
              <option value="in-person">In-Person</option>
              <option value="teleconsult">Teleconsult</option>
              <option value="lab-review">Lab Review</option>
              <option value="follow-up">Follow-Up</option>
            </select>
          </div>
        </div>

        {/* Appointments List Render */}
        {filteredAppointments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F4F6FC] text-slate-400 flex items-center justify-center mx-auto">
              <CalendarX className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">No appointments found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No appointments matching current filters. Click "New Appointment" to schedule an encounter.
            </p>
            <button
              onClick={() => {
                setTabFilter("all");
                setSearchQuery("");
                setTypeFilter("all");
              }}
              className="mt-2 text-xs font-bold text-[#3E36B0] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {filteredAppointments.map((apt) => {
              const isToday = apt.date === "2026-08-15";
              const isPast = apt.status === "Completed" || apt.status === "Cancelled";

              return (
                <div
                  key={apt.id}
                  className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    apt.status === "Completed"
                      ? "bg-slate-50/70 border-slate-100 opacity-85"
                      : apt.status === "Cancelled"
                      ? "bg-rose-50/30 border-rose-100 opacity-75"
                      : isToday
                      ? "bg-white border-[#3E36B0]/30 shadow-sm ring-1 ring-[#3E36B0]/10 hover:border-[#3E36B0]"
                      : "bg-white border-slate-200/70 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  {/* Left: Patient Info & Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                        apt.type === "teleconsult"
                          ? "bg-purple-100 text-[#3E36B0]"
                          : "bg-[#E5ECF9] text-[#3E36B0]"
                      }`}
                    >
                      {getInitials(apt.patientName)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm md:text-base font-extrabold text-[#111111] leading-tight">
                          {apt.patientName}
                        </h3>
                        {apt.patientAge && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({apt.patientAge}y {apt.patientGender ? `· ${apt.patientGender[0]}` : ""})
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            apt.type === "teleconsult"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-sky-50 text-[#0284c7] border border-sky-200"
                          }`}
                        >
                          {apt.type === "teleconsult" ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <MapPin className="w-3 h-3" />
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

                      <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate">
                        {apt.condition}
                      </p>

                      {apt.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          Note: {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Center: Date & Time Schedule Box */}
                  <div className="flex items-center gap-4 bg-[#F4F6FC] px-3.5 py-2 rounded-xl border border-slate-200/60 shrink-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#3E36B0]" />
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                        <p className="text-xs font-bold text-[#111111]">{apt.date}</p>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#3E36B0]" />
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Slot</p>
                        <p className="text-xs font-bold text-[#111111]">{apt.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
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
                        className="h-9 px-3.5 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="Start Teleconsult Video Call"
                      >
                        <Video className="w-3.5 h-3.5 text-[#A8DEF7]" />
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
                          className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Complete Encounter"
                        >
                          <Check className="w-3.5 h-3.5" />
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
                          className="h-9 px-3 rounded-xl bg-[#F4F6FC] hover:bg-[#E5ECF9] text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
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
                          className="h-9 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
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
                        className="h-9 px-3 rounded-xl bg-[#F4F6FC] hover:bg-[#E5ECF9] text-[#3E36B0] border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="View Patient Dossier"
                      >
                        <User className="w-3.5 h-3.5" />
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
