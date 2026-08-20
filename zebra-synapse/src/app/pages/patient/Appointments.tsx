import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  StatusPill,
  portalMutedPanelClass,
  portalPanelClass,
  portalSecondaryButtonClass,
  portalSelectContentClass,
  portalSelectItemClass,
  portalSelectTriggerClass,
} from "../../components/patient/PortalTheme";

export function getQuickDateISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export function getNextMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export const CLINIC_TIME_SLOTS: Array<{ label: string; value: string }> = [
  { label: "09:00 AM", value: "09:00 AM" },
  { label: "09:30 AM", value: "09:30 AM" },
  { label: "10:00 AM", value: "10:00 AM" },
  { label: "10:30 AM", value: "10:30 AM" },
  { label: "11:00 AM", value: "11:00 AM" },
  { label: "11:30 AM", value: "11:30 AM" },
  { label: "02:00 PM", value: "02:00 PM" },
  { label: "02:30 PM", value: "02:30 PM" },
  { label: "03:00 PM", value: "03:00 PM" },
  { label: "03:30 PM", value: "03:30 PM" },
  { label: "04:00 PM", value: "04:00 PM" },
  { label: "04:30 PM", value: "04:30 PM" },
];

export type Appointment = {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location?: string;
  status: string;
  notes?: string;
};

export type DoctorOption = {
  value: string;
  label: string;
  doctor: string;
  specialty: string;
  hospital?: string;
  experience?: string;
  rating?: string;
  avatar?: string;
  initials?: string;
};

export const doctorOptions: DoctorOption[] = [
  {
    value: "amelia-hart",
    label: "Dr. Amelia Hart - Internal Medicine & Primary Care",
    doctor: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
    hospital: "Synapse Health Center",
    experience: "12 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    initials: "AH",
  },
  {
    value: "benjamin-ortiz",
    label: "Dr. Benjamin Ortiz - Endocrinology & Metabolism",
    doctor: "Dr. Benjamin Ortiz",
    specialty: "Endocrinologist",
    hospital: "Endocrine & Metabolic Suite",
    experience: "14 yrs exp",
    rating: "4.8",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    initials: "BO",
  },
  {
    value: "chloe-menon",
    label: "Dr. Chloe Menon - Cardiology",
    doctor: "Dr. Chloe Menon",
    specialty: "Cardiologist",
    hospital: "Heart & Vascular Center",
    experience: "15 yrs exp",
    rating: "5.0",
    avatar: "https://images.unsplash.com/photo-1594824813589-3d02f2320b60?w=150&auto=format&fit=crop&q=80",
    initials: "CM",
  },
  {
    value: "daniel-kim",
    label: "Dr. Daniel Kim - Pulmonology & Respiratory Care",
    doctor: "Dr. Daniel Kim",
    specialty: "Pulmonologist",
    hospital: "Pulmonary Care Pavilion",
    experience: "11 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
    initials: "DK",
  },
  {
    value: "evelyn-brooks",
    label: "Dr. Evelyn Brooks - General Practice & Family Medicine",
    doctor: "Dr. Evelyn Brooks",
    specialty: "General Physician",
    hospital: "Main Clinic Care",
    experience: "10 yrs exp",
    rating: "4.8",
    avatar: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=150&auto=format&fit=crop&q=80",
    initials: "EB",
  },
  {
    value: "farah-siddiqui",
    label: "Dr. Farah Siddiqui - Gastroenterology & Hepatology",
    doctor: "Dr. Farah Siddiqui",
    specialty: "Gastroenterologist",
    hospital: "Digestive Health Institute",
    experience: "13 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&auto=format&fit=crop&q=80",
    initials: "FS",
  },
  {
    value: "gabriel-chen",
    label: "Dr. Gabriel Chen - Nephrology & Renal Care",
    doctor: "Dr. Gabriel Chen",
    specialty: "Nephrologist",
    hospital: "Renal Care Clinic",
    experience: "16 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
    initials: "GC",
  },
  {
    value: "hannah-patel",
    label: "Dr. Hannah Patel - Rheumatology & Immunology",
    doctor: "Dr. Hannah Patel",
    specialty: "Rheumatologist",
    hospital: "Joint & Immunology Center",
    experience: "9 yrs exp",
    rating: "4.8",
    avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80",
    initials: "HP",
  },
  {
    value: "isaac-romero",
    label: "Dr. Isaac Romero - Neurology & Neurosciences",
    doctor: "Dr. Isaac Romero",
    specialty: "Neurologist",
    hospital: "Neurosciences Pavilion",
    experience: "17 yrs exp",
    rating: "5.0",
    avatar: "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=150&auto=format&fit=crop&q=80",
    initials: "IR",
  },
  {
    value: "julia-nguyen",
    label: "Dr. Julia Nguyen - Hematology & Oncology",
    doctor: "Dr. Julia Nguyen",
    specialty: "Hematologist",
    hospital: "Comprehensive Oncology Care",
    experience: "14 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150&auto=format&fit=crop&q=80",
    initials: "JN",
  },
];

function formatDisplayDate(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatTimeLabel(value: string) {
  if (!value) return "";

  try {
    return new Date(`1970-01-01T${value}:00`).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

// Resilient Circular Doctor Avatar with fallback initials
function DoctorAvatarCircle({
  src,
  name,
  initials,
  className = "h-11 w-11",
}: {
  src?: string;
  name: string;
  initials?: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const derivedInitials =
    initials ||
    name
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "DR";

  return (
    <div
      className={`${className} rounded-full overflow-hidden shrink-0 bg-[#dbeafe] flex items-center justify-center text-[#1e40af] font-bold text-xs sm:text-sm ring-1 ring-black/5 shadow-inner`}
    >
      {!imageError && src ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <span className="tracking-tight">{derivedInitials}</span>
      )}
    </div>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [allDoctorsModalOpen, setAllDoctorsModalOpen] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-open schedule modal if doctor or schedule param is in URL
  useEffect(() => {
    const queryDoctor = searchParams.get("doctor");
    const querySchedule = searchParams.get("schedule");
    if (queryDoctor) {
      const matched = doctorOptions.find(
        (opt) =>
          opt.value.toLowerCase() === queryDoctor.toLowerCase() ||
          opt.doctor.toLowerCase().includes(queryDoctor.toLowerCase()) ||
          queryDoctor.toLowerCase().includes(opt.doctor.toLowerCase()),
      );
      if (matched) {
        setSelectedDoctor(matched.value);
        setScheduleOpen(true);
      }
    } else if (querySchedule === "true") {
      setScheduleOpen(true);
    }
  }, [searchParams]);

  // Tab state: "upcoming" or "past"
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([
    {
      id: 1,
      doctor: "Dr. Amelia Hart",
      specialty: "Internal Medicine & Primary Care",
      date: "2026-08-25",
      time: "10:00 AM",
      location: "Zebra Synapse Health Center, Suite 402",
      status: "Confirmed",
    },
    {
      id: 2,
      doctor: "Dr. Benjamin Ortiz",
      specialty: "Endocrinologist",
      date: "2026-09-02",
      time: "2:30 PM",
      location: "Endocrine & Metabolic Suite, Floor 3",
      status: "Confirmed",
    },
    {
      id: 3,
      doctor: "Dr. Chloe Menon",
      specialty: "Cardiologist",
      date: "2026-04-15",
      time: "10:00 AM",
      location: "Heart & Vascular Center, Suite 402",
      status: "Completed",
      notes: "Cardiology follow-up completed. ECG trace normal. Blood pressure controlled. Continue current medication.",
    },
    {
      id: 4,
      doctor: "Dr. Gabriel Chen",
      specialty: "Nephrologist",
      date: "2026-04-22",
      time: "2:30 PM",
      location: "Renal Care Clinic, Suite 104",
      status: "Completed",
      notes: "Renal panel follow-up assessment. eGFR stable. Adjusted fluid intake and dietary recommendations.",
    },
    {
      id: 5,
      doctor: "Dr. Evelyn Brooks",
      specialty: "General Physician",
      date: "2026-03-10",
      time: "11:15 AM",
      location: "Main Clinic, Room 105",
      status: "Completed",
      notes: "Annual checkup completed. Vital signs optimal. Recommended routine lipid panel recheck in 6 months.",
    },
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPastAppointment = (apt: Appointment) => {
    if (apt.status === "Completed" || apt.status === "Cancelled") return true;
    try {
      const aptDate = new Date(`${apt.date}T23:59:59`);
      return aptDate < today;
    } catch {
      return false;
    }
  };

  const upcomingAppointments = allAppointments.filter((apt) => !isPastAppointment(apt));
  const pastAppointments = allAppointments.filter((apt) => isPastAppointment(apt));

  const resetScheduleForm = () => {
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
  };

  const handleScheduleAppointment = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    const matchedOption = doctorOptions.find((option) => option.value === selectedDoctor);
    if (!matchedOption) return;

    setIsSavingSchedule(true);
    window.setTimeout(() => {
      const nextAppointment: Appointment = {
        id: Date.now(),
        doctor: matchedOption.doctor,
        specialty: matchedOption.specialty,
        date: selectedDate,
        time: formatTimeLabel(selectedTime),
        location: matchedOption.hospital ? `${matchedOption.hospital}, Suite 402` : "Medical Plaza, Suite 210",
        status: "Confirmed",
      };

      setAllAppointments((current) => [nextAppointment, ...current]);
      setIsSavingSchedule(false);
      setScheduleOpen(false);
      resetScheduleForm();
      setActiveTab("upcoming");
      toast.success(`Appointment confirmed with ${matchedOption.doctor}!`);
    }, 450);
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime("");
    setRescheduleOpen(true);
  };

  const handleConfirmReschedule = () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    setIsSavingReschedule(true);
    window.setTimeout(() => {
      setAllAppointments((current) =>
        current.map((appointment) =>
          appointment.id === selectedAppointment.id
            ? {
                ...appointment,
                date: rescheduleDate,
                time: formatTimeLabel(rescheduleTime),
              }
            : appointment,
        ),
      );
      setIsSavingReschedule(false);
      setRescheduleOpen(false);
      setSelectedAppointment(null);
      setRescheduleDate("");
      setRescheduleTime("");
      toast.success("Appointment rescheduled successfully!");
    }, 400);
  };

  const handleViewNotes = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNotesOpen(true);
  };

  const handleScheduleOpenChange = (open: boolean) => {
    setScheduleOpen(open);
    if (!open) {
      resetScheduleForm();
      setIsSavingSchedule(false);
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason("");
    setCancelOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!appointmentToCancel) return;

    setIsCancelling(true);
    window.setTimeout(() => {
      setAllAppointments((current) =>
        current.map((apt) =>
          apt.id === appointmentToCancel.id
            ? {
                ...apt,
                status: "Cancelled",
                notes: cancelReason
                  ? `Appointment cancelled by patient. Reason: ${cancelReason}`
                  : "Appointment cancelled by patient.",
              }
            : apt,
        ),
      );
      setIsCancelling(false);
      setCancelOpen(false);
      toast.success(`Appointment with ${appointmentToCancel.doctor} has been cancelled.`);
      setAppointmentToCancel(null);
    }, 400);
  };

  const handleCancelOpenChange = (open: boolean) => {
    setCancelOpen(open);
    if (!open) {
      setAppointmentToCancel(null);
      setCancelReason("");
      setIsCancelling(false);
    }
  };

  const handleRescheduleOpenChange = (open: boolean) => {
    setRescheduleOpen(open);
    if (!open) {
      setSelectedAppointment(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setIsSavingReschedule(false);
    }
  };

  const isScheduleReady = Boolean(selectedDoctor && selectedDate && selectedTime);
  const isRescheduleReady = Boolean(selectedAppointment && rescheduleDate && rescheduleTime);

  const filteredModalDoctors = doctorOptions.filter(
    (d) =>
      d.doctor.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      (d.hospital && d.hospital.toLowerCase().includes(doctorSearchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. TOP HEADER (COMPACT) */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Appointments
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider font-['Manrope']">
                Care Coordination
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              Manage upcoming visits and review completed medical appointments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setScheduleOpen(true)}
            className="h-8.5 px-3.5 rounded-xl bg-[#00a8ff] hover:bg-[#0095e6] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(0,168,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,168,255,0.35)] transition-all cursor-pointer font-['Manrope']"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Schedule Appointment</span>
          </Button>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN DASHBOARD GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        {/* LEFT COLUMN: VISITS (Upcoming / Past) */}
        <section className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0">
          {/* Tab Filter Row */}
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "upcoming"
                    ? "bg-[#00a8ff] text-white shadow-sm shadow-[#00a8ff]/25"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Upcoming Visits</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "upcoming" ? "bg-white/30 text-white" : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {upcomingAppointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("past")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "past"
                    ? "bg-[#00a8ff] text-white shadow-sm shadow-[#00a8ff]/25"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Past Visits</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "past" ? "bg-white/30 text-white" : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {pastAppointments.length}
                </span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
              {activeTab === "upcoming"
                ? `${upcomingAppointments.length} scheduled visit${upcomingAppointments.length === 1 ? "" : "s"}`
                : `${pastAppointments.length} completed visit${pastAppointments.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {/* Visits Cards Container with internal clean scrollbar */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {activeTab === "upcoming" && (
              <>
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => {
                    const matchedDoctor = doctorOptions.find(
                      (d) =>
                        d.doctor.toLowerCase() === appointment.doctor.toLowerCase() ||
                        appointment.doctor.toLowerCase().includes(d.doctor.toLowerCase())
                    );
                    return (
                      <article
                        key={appointment.id}
                        className="rounded-[22px] border border-slate-100 bg-white p-4 sm:p-4.5 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3"
                      >
                        {/* Top: Doctor Info & Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <DoctorAvatarCircle
                              src={matchedDoctor?.avatar}
                              name={appointment.doctor}
                              initials={matchedDoctor?.initials}
                              className="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight font-['Manrope'] truncate">
                                  {appointment.doctor}
                                </h3>
                              </div>
                              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                {appointment.specialty}
                              </p>
                            </div>
                          </div>
                          <StatusPill status={appointment.status} className="shrink-0 text-[10px] py-0.5 px-2.5" />
                        </div>

                        {/* Middle: Details Pill Row */}
                        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Calendar className="h-3.5 w-3.5 text-lime-600 shrink-0" />
                            <span>{formatDisplayDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Clock className="h-3.5 w-3.5 text-lime-600 shrink-0" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
                            <MapPin className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">{appointment.location || "Synapse Clinic"}</span>
                          </div>
                        </div>

                        {/* Bottom: Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <Button
                            type="button"
                            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_3px_10px_rgba(0,153,255,0.25)] hover:shadow-[0_4px_14px_rgba(0,153,255,0.35)] transition-all cursor-pointer active:scale-[0.98]"
                            onClick={() =>
                              navigate(
                                `/patient/teleconsult?id=apt-${appointment.id}&doctor=${encodeURIComponent(
                                  appointment.doctor
                                )}&specialty=${encodeURIComponent(appointment.specialty)}`
                              )
                            }
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Join Live Video Call</span>
                          </Button>
                          <Button
                            variant="outline"
                            className={`h-9 px-3 text-xs rounded-xl active:scale-[0.98] ${portalSecondaryButtonClass}`}
                            onClick={() => handleReschedule(appointment)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="outline"
                            className="border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl h-9 px-3 transition-all cursor-pointer shadow-none active:scale-[0.98]"
                            onClick={() => handleCancelClick(appointment)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5 text-rose-500" />
                            Cancel
                          </Button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/60 p-8 text-center text-xs text-slate-400">
                    <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No upcoming visits scheduled.</p>
                    <p className="mt-1 text-[11px] text-slate-400">Click &quot;Schedule Appointment&quot; to book your next visit.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "past" && (
              <>
                {pastAppointments.length > 0 ? (
                  pastAppointments.map((appointment) => {
                    const matchedDoctor = doctorOptions.find(
                      (d) =>
                        d.doctor.toLowerCase() === appointment.doctor.toLowerCase() ||
                        appointment.doctor.toLowerCase().includes(d.doctor.toLowerCase())
                    );
                    return (
                      <article
                        key={appointment.id}
                        className="rounded-[22px] border border-slate-100 bg-white p-4 text-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-all duration-200 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <DoctorAvatarCircle
                              src={matchedDoctor?.avatar}
                              name={appointment.doctor}
                              initials={matchedDoctor?.initials}
                              className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight font-['Manrope'] truncate">
                                {appointment.doctor}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{appointment.specialty}</p>
                            </div>
                          </div>
                          <StatusPill status={appointment.status} className="shrink-0 text-[10px] py-0.5 px-2.5" />
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-lime-600 shrink-0" />
                            <span>{formatDisplayDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-lime-600 shrink-0" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
                            <MapPin className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">{appointment.location || "Synapse Clinic"}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-0.5">
                          <Button
                            variant="outline"
                            className={`h-8.5 px-3 text-xs rounded-xl active:scale-[0.98] ${portalSecondaryButtonClass}`}
                            onClick={() => handleViewNotes(appointment)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1 text-[#0099ff]" />
                            View Notes
                          </Button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/60 p-8 text-center text-xs text-slate-400">
                    <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No past visits on record.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: CONSULTING DOCTORS & QUICK CARE ASSIST */}
        <section className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 gap-3">
          {/* Consulting Doctor Panel */}
          <div className="rounded-[24px] bg-white border border-slate-100 p-4 sm:p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col min-h-0 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 font-['Manrope'] tracking-tight">
                  Consulting Doctor
                </h2>
                <span className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-[#0284c7]">
                  Linked Team
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllDoctorsModalOpen(true)}
                className="text-xs font-bold text-[#0099ff] hover:text-sky-600 transition-colors cursor-pointer"
              >
                See all
              </button>
            </div>

            {/* Doctors List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {doctorOptions.slice(0, 3).map((doctor, idx) => (
                <div
                  key={doctor.value}
                  className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#f8fafd]/80 border border-slate-100 hover:border-sky-200 hover:bg-white transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DoctorAvatarCircle
                      src={doctor.value === "chloe-menon" ? undefined : doctor.avatar}
                      name={doctor.doctor}
                      initials={doctor.initials || "CM"}
                      className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {doctor.doctor}
                        </h4>
                        {idx === 0 && (
                          <span className="rounded-md bg-[#dcfce7] text-[#15803d] text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                        {idx === 0
                          ? "Hypertension"
                          : doctor.specialty.includes(" - ")
                          ? doctor.specialty.split(" - ")[0]
                          : doctor.specialty}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctor(doctor.value);
                      setScheduleOpen(true);
                    }}
                    className="shrink-0 h-8.5 px-3 rounded-full bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-semibold text-xs flex items-center gap-1 shadow-[0_3px_10px_rgba(0,168,255,0.2)] hover:shadow-[0_4px_14px_rgba(0,168,255,0.3)] transition-all duration-200 cursor-pointer"
                  >
                    <span>Book</span>
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Virtual Care Card */}
          <div className="rounded-[22px] bg-gradient-to-br from-sky-50 via-sky-50/60 to-blue-50/40 border border-sky-100 p-3.5 shrink-0 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#00a8ff] text-white flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Virtual Clinic & Telehealth</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Live HD consults with specialist doctors</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/patient/teleconsult")}
              className="h-8 px-3 rounded-xl bg-white hover:bg-sky-50 text-[#0099ff] border border-sky-200 font-bold text-xs shadow-none cursor-pointer"
            >
              Start Room
            </Button>
          </div>
        </section>
      </div>

      {/* 3. MODALS & DIALOGS */}

      {/* SCHEDULE MODAL */}
      <Dialog open={scheduleOpen} onOpenChange={handleScheduleOpenChange}>
        <DialogContent className="sm:max-w-[540px] p-5 sm:p-6 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0099ff] border border-sky-100 shadow-sm">
                <Calendar className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Schedule New Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-[#0284c7] uppercase tracking-wider">
                    Care Visit
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Choose a doctor and preferred date & time for your clinic visit.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* SELECT DOCTOR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="doctor" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>Select Doctor</span>
                </Label>
                {selectedDoctor && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Specialist Selected
                  </span>
                )}
              </div>

              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger id="doctor" className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 hover:bg-white text-slate-900 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all">
                  {selectedDoctor ? (
                    (() => {
                      const doc = doctorOptions.find((d) => d.value === selectedDoctor);
                      if (!doc) return <SelectValue placeholder="Choose a doctor" />;
                      return (
                        <div className="flex items-center gap-2 min-w-0 text-left">
                          <DoctorAvatarCircle
                            src={doc.value === "chloe-menon" ? undefined : doc.avatar}
                            name={doc.doctor}
                            initials={doc.initials}
                            className="h-6 w-6 text-[10px] shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 text-xs mr-2">{doc.doctor}</span>
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              ({doc.specialty.split(" - ")[0]})
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <SelectValue placeholder="Choose a doctor or specialist" />
                  )}
                </SelectTrigger>
                <SelectContent className="border-slate-100 bg-white text-slate-900 shadow-2xl rounded-2xl p-2 z-50 max-h-64">
                  {doctorOptions.map((doctor) => (
                    <SelectItem
                      key={doctor.value}
                      value={doctor.value}
                      className="rounded-xl py-2 px-3 text-slate-700 focus:bg-sky-50 focus:text-slate-900 cursor-pointer text-xs my-0.5"
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <DoctorAvatarCircle
                          src={doctor.value === "chloe-menon" ? undefined : doctor.avatar}
                          name={doctor.doctor}
                          initials={doctor.initials}
                          className="h-7 w-7 text-[10px] shrink-0"
                        />
                        <div className="flex flex-col min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{doctor.doctor}</span>
                            {doctor.rating && (
                              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                                ★ {doctor.rating}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 truncate">
                            {doctor.specialty.split(" - ")[0]} • {doctor.experience || "Specialist"}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DATE SELECTION */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="date" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>Date</span>
                </Label>
                {selectedDate && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatDisplayDate(selectedDate)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Today", value: getQuickDateISO(0) },
                  { label: "Tomorrow", value: getQuickDateISO(1) },
                  { label: "In 3 Days", value: getQuickDateISO(3) },
                  { label: "Next Mon", value: getNextMondayISO() },
                ].map((qd) => (
                  <button
                    key={qd.label}
                    type="button"
                    onClick={() => setSelectedDate(qd.value)}
                    className={`px-2.5 py-0.8 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedDate === qd.value
                        ? "bg-[#00a8ff] text-white shadow-sm font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="date"
                  type="date"
                  min={getQuickDateISO(0)}
                  className="h-10 pl-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>
            </div>

            {/* TIME SELECTION */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="time" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>Time & Slot</span>
                </Label>
                {selectedTime && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatTimeLabel(selectedTime)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {CLINIC_TIME_SLOTS.map((slot) => {
                  const isActive = selectedTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setSelectedTime(slot.value)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#00a8ff] text-white shadow-sm font-bold ring-2 ring-[#00a8ff]/30"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="time"
                  type="time"
                  className="h-10 pl-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </div>
            </div>

            {/* Visit Details Inset */}
            <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                <MapPin className="h-3.5 w-3.5 text-[#0099ff] shrink-0" />
                <span className="truncate">
                  {(() => {
                    const doc = doctorOptions.find((d) => d.value === selectedDoctor);
                    return doc?.hospital ? `${doc.hospital}, Suite 402` : "Zebra Synapse Health Center, Suite 402";
                  })()}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5">
                In-Person Visit
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className={`h-10 px-4 rounded-xl ${portalSecondaryButtonClass}`}
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleScheduleAppointment}
                disabled={!isScheduleReady || isSavingSchedule}
                className="flex-1 h-10 rounded-xl bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,168,255,0.28)] hover:shadow-[0_6px_22px_rgba(0,168,255,0.38)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingSchedule ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 stroke-[2.2]" />
                    <span>Confirm Appointment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALL DOCTORS BROWSE MODAL ("See all") */}
      <Dialog open={allDoctorsModalOpen} onOpenChange={setAllDoctorsModalOpen}>
        <DialogContent className="sm:max-w-[650px] p-5 sm:p-6 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0099ff] border border-sky-100">
                  <Stethoscope className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
                    All Consulting Specialists
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Connect with specialist doctors across the Zebra Synapse clinical network.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by specialist name or department..."
                value={doctorSearchQuery}
                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                className="h-9.5 pl-9 rounded-xl border-slate-200 text-xs bg-slate-50/60"
              />
            </div>
          </DialogHeader>

          {/* List of doctors */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-3 pr-1">
            {filteredModalDoctors.length > 0 ? (
              filteredModalDoctors.map((doc) => (
                <div
                  key={doc.value}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f8fafc] border border-slate-100 hover:border-sky-200 hover:bg-white transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DoctorAvatarCircle
                      src={doc.value === "chloe-menon" ? undefined : doc.avatar}
                      name={doc.doctor}
                      initials={doc.initials}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {doc.doctor}
                        </h4>
                        {doc.rating && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-md">
                            ★ {doc.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.specialty} • <span className="text-slate-400">{doc.experience || "Specialist"}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{doc.hospital || "Synapse Center"}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAllDoctorsModalOpen(false);
                      setSelectedDoctor(doc.value);
                      setScheduleOpen(true);
                    }}
                    className="shrink-0 h-8.5 px-3.5 rounded-xl bg-[#00a8ff] hover:bg-[#0095e6] text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Book</span>
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No specialists found matching your search.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE MODAL */}
      <Dialog open={rescheduleOpen} onOpenChange={handleRescheduleOpenChange}>
        <DialogContent className="sm:max-w-[520px] p-5 sm:p-6 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                <Clock className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Reschedule Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800 uppercase tracking-wider">
                    Adjustment
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Choose a new date and time for your visit with {selectedAppointment?.doctor ?? "your doctor"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Current Appointment Preview */}
            {selectedAppointment && (
              <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5 flex items-center gap-2.5">
                <DoctorAvatarCircle
                  name={selectedAppointment.doctor}
                  className="h-9 w-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{selectedAppointment.doctor}</h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    Currently: {formatDisplayDate(selectedAppointment.date)} at {selectedAppointment.time}
                  </p>
                </div>
              </div>
            )}

            {/* New Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reschedule-date" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>New Date</span>
                </Label>
                {rescheduleDate && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatDisplayDate(rescheduleDate)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Today", value: getQuickDateISO(0) },
                  { label: "Tomorrow", value: getQuickDateISO(1) },
                  { label: "In 3 Days", value: getQuickDateISO(3) },
                  { label: "Next Mon", value: getNextMondayISO() },
                ].map((qd) => (
                  <button
                    key={qd.label}
                    type="button"
                    onClick={() => setRescheduleDate(qd.value)}
                    className={`px-2.5 py-0.8 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      rescheduleDate === qd.value
                        ? "bg-[#00a8ff] text-white shadow-sm font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="reschedule-date"
                  type="date"
                  min={getQuickDateISO(0)}
                  className="h-10 pl-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                />
              </div>
            </div>

            {/* New Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reschedule-time" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>New Time</span>
                </Label>
                {rescheduleTime && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatTimeLabel(rescheduleTime)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {CLINIC_TIME_SLOTS.map((slot) => {
                  const isActive = rescheduleTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setRescheduleTime(slot.value)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#00a8ff] text-white shadow-sm font-bold ring-2 ring-[#00a8ff]/30"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="reschedule-time"
                  type="time"
                  className="h-10 pl-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs"
                  value={rescheduleTime}
                  onChange={(event) => setRescheduleTime(event.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className={`h-10 px-4 rounded-xl ${portalSecondaryButtonClass}`}
                onClick={() => setRescheduleOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={!isRescheduleReady || isSavingReschedule}
                className="flex-1 h-10 rounded-xl bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,168,255,0.28)] hover:shadow-[0_6px_22px_rgba(0,168,255,0.38)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingReschedule ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Updating Visit...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 stroke-[2.2]" />
                    <span>Confirm New Time</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOTES MODAL */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-[500px] p-5 sm:p-6 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0099ff] border border-sky-100 shadow-sm">
                <FileText className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Appointment Notes
                  </DialogTitle>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                    Completed Visit
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Visit summary and follow-up details from your completed appointment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-[#f8fafc]">
              <DoctorAvatarCircle
                name={selectedAppointment?.doctor || "Doctor"}
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Consulting Specialist</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{selectedAppointment?.doctor ?? "—"}</p>
                <p className="text-[11px] text-slate-500">{selectedAppointment?.specialty ?? "Clinical Consultation"}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#0099ff]" />
                  <span>Visit Date</span>
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">
                  {selectedAppointment ? formatDisplayDate(selectedAppointment.date) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-2.5">
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#0099ff]" />
                  <span>Time</span>
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{selectedAppointment?.time ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-1.5 flex items-center gap-1.5 text-slate-900">
                <FileText className="h-3.5 w-3.5 text-[#0099ff]" />
                <p className="text-xs font-bold">Clinical Notes & Recommendations</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {selectedAppointment?.notes ?? "Clinical notes will appear here after each completed visit."}
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <Button
                type="button"
                className="h-9 px-5 rounded-xl bg-[#00a8ff] hover:bg-[#0095e6] text-white font-bold text-xs shadow-sm cursor-pointer"
                onClick={() => setNotesOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL MODAL */}
      <Dialog open={cancelOpen} onOpenChange={handleCancelOpenChange}>
        <DialogContent className="sm:max-w-[480px] p-5 sm:p-6 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Cancel Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                    Cancellation
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to cancel your upcoming visit?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {appointmentToCancel && (
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-2.5 flex items-center gap-2.5">
                <DoctorAvatarCircle
                  name={appointmentToCancel.doctor}
                  className="h-9 w-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{appointmentToCancel.doctor}</h4>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {formatDisplayDate(appointmentToCancel.date)} at {appointmentToCancel.time}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Reason for cancellation (optional)
              </Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger id="cancel-reason" className={portalSelectTriggerClass}>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className={portalSelectContentClass}>
                  <SelectItem value="reschedule_needed" className={portalSelectItemClass}>Need to reschedule for later</SelectItem>
                  <SelectItem value="symptoms_resolved" className={portalSelectItemClass}>Symptoms resolved</SelectItem>
                  <SelectItem value="scheduling_conflict" className={portalSelectItemClass}>Scheduling conflict</SelectItem>
                  <SelectItem value="transportation" className={portalSelectItemClass}>Transportation issue</SelectItem>
                  <SelectItem value="other" className={portalSelectItemClass}>Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                className={`h-10 rounded-xl ${portalSecondaryButtonClass}`}
                onClick={() => setCancelOpen(false)}
                disabled={isCancelling}
              >
                Keep Appointment
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
