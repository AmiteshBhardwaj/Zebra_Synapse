import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Plus,
  Stethoscope,
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
  PatientPortalPage,
  StatusPill,
  portalDialogClass,
  portalInputClass,
  portalMutedPanelClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
  portalSelectContentClass,
  portalSelectItemClass,
  portalSelectTriggerClass,
} from "../../components/patient/PortalTheme";

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
  className = "h-12 w-12",
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
      className={`${className} rounded-full overflow-hidden shrink-0 bg-[#dbeafe] flex items-center justify-center text-[#1e40af] font-bold text-sm sm:text-base ring-1 ring-black/5 shadow-inner`}
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

// Consulting Doctor Card Block matching exact design
function DoctorCardBlock({
  doctor,
  isPrimary,
  onBook,
}: {
  doctor: DoctorOption;
  isPrimary?: boolean;
  onBook: (doctorValue: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-[22px] bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-sky-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3.5">
        <DoctorAvatarCircle
          src={doctor.value === "chloe-menon" ? undefined : doctor.avatar}
          name={doctor.doctor}
          initials={doctor.initials || "CM"}
          className="h-12 w-12 sm:h-13 sm:w-13"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {doctor.doctor}
            </h4>
            {isPrimary && (
              <span className="rounded-md bg-[#dcfce7] text-[#15803d] text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs sm:text-[13px] font-medium text-slate-400 truncate mt-0.5">
            {isPrimary
              ? "Hypertension"
              : doctor.specialty.includes(" - ")
              ? doctor.specialty.split(" - ")[0]
              : doctor.specialty}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBook(doctor.value)}
        className="w-full h-10 sm:h-11 rounded-full bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(0,168,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,168,255,0.35)] transition-all duration-200 cursor-pointer"
      >
        <span>Book Consultation</span>
        <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
      </button>
    </div>
  );
}

export default function Appointments() {
  const [searchParams] = useSearchParams();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
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
        location: "Medical Plaza, Suite 210",
        status: "Confirmed",
      };

      setAllAppointments((current) => [nextAppointment, ...current]);
      setIsSavingSchedule(false);
      setScheduleOpen(false);
      resetScheduleForm();
      setActiveTab("upcoming");
    }, 500);
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
    }, 450);
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

  return (
    <PatientPortalPage>
      <Dialog open={scheduleOpen} onOpenChange={handleScheduleOpenChange}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Appointments</h1>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                  Care Coordination
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                Manage upcoming visits and review completed medical appointments.
              </p>
            </div>
          </div>

          <DialogTrigger asChild>
            <Button className="h-11 px-5 rounded-2xl shadow-sm bg-[#00a8ff] hover:bg-[#0095e6] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(0,168,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,168,255,0.35)] transition-all cursor-pointer">
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Schedule Appointment</span>
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="sm:max-w-[560px] p-6 sm:p-7 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0099ff] border border-sky-100 shadow-sm">
                <Calendar className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Schedule New Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                    Care Visit
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Choose a doctor and preferred date & time for your clinic visit.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* 1. SELECT DOCTOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doctor" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-[#0099ff]" />
                  <span>Select Doctor</span>
                </Label>
                {selectedDoctor && (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Specialist Selected
                  </span>
                )}
              </div>

              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger id="doctor" className="h-13 rounded-2xl border-slate-200 bg-slate-50/60 hover:bg-white text-slate-900 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all">
                  {selectedDoctor ? (
                    (() => {
                      const doc = doctorOptions.find((d) => d.value === selectedDoctor);
                      if (!doc) return <SelectValue placeholder="Choose a doctor" />;
                      return (
                        <div className="flex items-center gap-2.5 min-w-0 text-left">
                          <DoctorAvatarCircle
                            src={doc.value === "chloe-menon" ? undefined : doc.avatar}
                            name={doc.doctor}
                            initials={doc.initials}
                            className="h-7 w-7 text-[11px] shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm mr-2">{doc.doctor}</span>
                            <span className="text-xs text-slate-500 hidden sm:inline">
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
                <SelectContent className="border-slate-100 bg-white text-slate-900 shadow-2xl rounded-2xl p-2 z-50 max-h-72">
                  {doctorOptions.map((doctor) => (
                    <SelectItem
                      key={doctor.value}
                      value={doctor.value}
                      className="rounded-xl py-2 px-3 text-slate-700 focus:bg-sky-50 focus:text-slate-900 cursor-pointer text-xs sm:text-sm my-0.5"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <DoctorAvatarCircle
                          src={doctor.value === "chloe-menon" ? undefined : doctor.avatar}
                          name={doctor.doctor}
                          initials={doctor.initials}
                          className="h-8 w-8 text-xs shrink-0"
                        />
                        <div className="flex flex-col min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{doctor.doctor}</span>
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

              {/* Selected Doctor Card Preview */}
              {(() => {
                const doc = doctorOptions.find((d) => d.value === selectedDoctor);
                if (!doc) return null;
                return (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8fafd] border border-sky-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all">
                    <DoctorAvatarCircle
                      src={doc.value === "chloe-menon" ? undefined : doc.avatar}
                      name={doc.doctor}
                      initials={doc.initials}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {doc.doctor}
                        </h4>
                        <span className="rounded-md bg-[#dcfce7] text-[#15803d] text-[10px] font-bold px-1.5 py-0.5">
                          {doc.rating ? `★ ${doc.rating}` : "Verified"}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                        {doc.specialty.split(" - ")[0]} • {doc.hospital || "Synapse Health Center"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. DATE SELECTION */}
            <div className="space-y-2">
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

              {/* Quick Date Pills */}
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
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                  className="h-12 pl-10 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs sm:text-sm"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>
            </div>

            {/* 3. TIME SELECTION */}
            <div className="space-y-2">
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

              {/* Quick Time Slot Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {CLINIC_TIME_SLOTS.map((slot) => {
                  const isActive = selectedTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setSelectedTime(slot.value)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold text-center transition-all cursor-pointer ${
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
                  className="h-12 pl-10 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs sm:text-sm"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </div>
            </div>

            {/* Visit Details Inset */}
            <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                <MapPin className="h-4 w-4 text-[#00a8ff] shrink-0" />
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
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className={`h-11 sm:h-12 px-5 rounded-2xl ${portalSecondaryButtonClass}`}
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleScheduleAppointment}
                disabled={!isScheduleReady || isSavingSchedule}
                className="flex-1 h-11 sm:h-12 rounded-2xl bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,168,255,0.28)] hover:shadow-[0_6px_22px_rgba(0,168,255,0.38)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingSchedule ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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

      <Dialog open={rescheduleOpen} onOpenChange={handleRescheduleOpenChange}>
        <DialogContent className="sm:max-w-[540px] p-6 sm:p-7 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                <Clock className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Reschedule Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Adjustment
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Choose a new date and time for your visit with {selectedAppointment?.doctor ?? "your doctor"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Current Appointment Preview */}
            {selectedAppointment && (
              <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5 flex items-center gap-3">
                <DoctorAvatarCircle
                  name={selectedAppointment.doctor}
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{selectedAppointment.doctor}</h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    Currently: {formatDisplayDate(selectedAppointment.date)} at {selectedAppointment.time}
                  </p>
                </div>
              </div>
            )}

            {/* New Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reschedule-date" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#00a8ff]" />
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
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                  className="h-12 pl-10 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs sm:text-sm"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                />
              </div>
            </div>

            {/* New Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reschedule-time" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#00a8ff]" />
                  <span>New Time</span>
                </Label>
                {rescheduleTime && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {formatTimeLabel(rescheduleTime)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {CLINIC_TIME_SLOTS.map((slot) => {
                  const isActive = rescheduleTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setRescheduleTime(slot.value)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold text-center transition-all cursor-pointer ${
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
                  className="h-12 pl-10 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#00a8ff] focus-visible:ring-[2px] focus-visible:ring-[#00a8ff]/20 transition-all font-medium text-xs sm:text-sm"
                  value={rescheduleTime}
                  onChange={(event) => setRescheduleTime(event.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className={`h-11 sm:h-12 px-5 rounded-2xl ${portalSecondaryButtonClass}`}
                onClick={() => setRescheduleOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={!isRescheduleReady || isSavingReschedule}
                className="flex-1 h-11 sm:h-12 rounded-2xl bg-[#00a8ff] hover:bg-[#0095e6] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,168,255,0.28)] hover:shadow-[0_6px_22px_rgba(0,168,255,0.38)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingReschedule ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-[540px] p-6 sm:p-7 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#0099ff] border border-sky-100 shadow-sm">
                <FileText className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Appointment Notes
                  </DialogTitle>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Completed Visit
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Visit summary and follow-up details from your completed appointment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 bg-[#f8fafc]">
              <DoctorAvatarCircle
                name={selectedAppointment?.doctor || "Doctor"}
                className="h-11 w-11 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Consulting Specialist</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{selectedAppointment?.doctor ?? "—"}</p>
                <p className="text-[11px] text-slate-500">{selectedAppointment?.specialty ?? "Clinical Consultation"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#00a8ff]" />
                  <span>Visit Date</span>
                </p>
                <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900">
                  {selectedAppointment ? formatDisplayDate(selectedAppointment.date) : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#00a8ff]" />
                  <span>Time</span>
                </p>
                <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900">{selectedAppointment?.time ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-slate-900">
                <FileText className="h-4 w-4 text-[#00a8ff]" />
                <p className="text-xs sm:text-sm font-bold">Clinical Notes & Recommendations</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {selectedAppointment?.notes ?? "Clinical notes will appear here after each completed visit."}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                className="h-11 px-6 rounded-2xl bg-[#00a8ff] hover:bg-[#0095e6] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
                onClick={() => setNotesOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={handleCancelOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-6 sm:p-7 rounded-[28px] bg-white border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Cancel Appointment
                  </DialogTitle>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                    Cancellation
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to cancel your upcoming visit?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {appointmentToCancel && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 flex items-center gap-3">
                <DoctorAvatarCircle
                  name={appointmentToCancel.doctor}
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{appointmentToCancel.doctor}</h4>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {formatDisplayDate(appointmentToCancel.date)} at {appointmentToCancel.time}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
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

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="outline"
                className={`h-11 rounded-2xl ${portalSecondaryButtonClass}`}
                onClick={() => setCancelOpen(false)}
                disabled={isCancelling}
              >
                Keep Appointment
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. CONSULTING DOCTORS SECTION */}
      <section className="mb-8 rounded-[32px] bg-[#f8fafd]/90 sm:bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Manrope'] tracking-tight">
              Consulting Doctor
            </h2>
            <span className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-[#0284c7]">
              Linked Team
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAllDoctors(!showAllDoctors)}
            className="text-sm font-bold text-[#0099ff] hover:text-sky-600 transition-colors cursor-pointer"
          >
            {showAllDoctors ? "Show less" : "See all"}
          </button>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {(showAllDoctors ? doctorOptions : doctorOptions.slice(0, 3)).map((doctor, idx) => (
            <DoctorCardBlock
              key={doctor.value}
              doctor={doctor}
              isPrimary={idx === 0 && !showAllDoctors ? true : doctor.value === "amelia-hart"}
              onBook={(docValue) => {
                setSelectedDoctor(docValue);
                setScheduleOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      {/* Side-by-Side Tab Buttons: Upcoming vs Past */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-lime-500 text-slate-950 shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Upcoming Visits</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "upcoming" ? "bg-slate-950/15 text-slate-950" : "bg-slate-100 text-slate-600"
            }`}
          >
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "past"
              ? "bg-lime-500 text-slate-950 shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Past Visits</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "past" ? "bg-slate-950/15 text-slate-950" : "bg-slate-100 text-slate-600"
            }`}
          >
            {pastAppointments.length}
          </span>
        </button>
      </div>

      {/* Tab View Display */}
      {activeTab === "upcoming" && (
        <section className="space-y-4 max-w-5xl">
          <div className="space-y-4">
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
                    className="rounded-[24px] border border-slate-100 bg-white p-5 sm:p-6 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <DoctorAvatarCircle
                          src={matchedDoctor?.avatar}
                          name={appointment.doctor}
                          initials={matchedDoctor?.initials}
                          className="h-13 w-13 sm:h-14 sm:w-14"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-['Manrope']">{appointment.doctor}</h3>
                            <StatusPill status={appointment.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 font-medium">{appointment.specialty}</p>
                        </div>
                      </div>
                      <div className={portalMutedPanelClass}>
                        <div className="grid gap-3 px-4 py-3 text-xs font-semibold text-slate-700 sm:grid-cols-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-lime-600" />
                            <span>{formatDisplayDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-lime-600" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-sky-600" />
                            <span>{appointment.location || "Clinic Center"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        className={`active:scale-[0.98] rounded-2xl text-xs ${portalSecondaryButtonClass}`}
                        onClick={() => handleReschedule(appointment)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-2xl h-10 px-4 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                        onClick={() => handleCancelClick(appointment)}
                      >
                        <XCircle className="mr-1.5 h-4 w-4 text-rose-500" />
                        Cancel Appointment
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className={`${portalPanelClass} p-8 text-center text-xs text-slate-400`}>
                No upcoming visits scheduled. Click &quot;Schedule Appointment&quot; above to book your next visit.
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "past" && (
        <section className="space-y-4 max-w-5xl">
          <div className="space-y-4">
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
                    className="rounded-[24px] border border-slate-100 bg-white p-5 sm:p-6 text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <DoctorAvatarCircle
                          src={matchedDoctor?.avatar}
                          name={appointment.doctor}
                          initials={matchedDoctor?.initials}
                          className="h-12 w-12 sm:h-13 sm:w-13"
                        />
                        <div>
                          <h3 className="text-base font-bold text-slate-900 font-['Manrope']">{appointment.doctor}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{appointment.specialty}</p>
                        </div>
                      </div>
                      <StatusPill status={appointment.status} />
                    </div>
                    <div className="mt-4 grid gap-3 text-xs font-semibold text-slate-700 sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-lime-600" />
                        <span>{formatDisplayDate(appointment.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-lime-600" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <span>{appointment.location || "In-Person"}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className={`mt-5 active:scale-[0.98] rounded-2xl text-xs ${portalSecondaryButtonClass}`}
                      onClick={() => handleViewNotes(appointment)}
                    >
                      View Notes
                    </Button>
                  </article>
                );
              })
            ) : (
              <div className={`${portalPanelClass} p-8 text-center text-xs text-slate-400`}>
                No past visits on record.
              </div>
            )}
          </div>
        </section>
      )}
    </PatientPortalPage>
  );
}
