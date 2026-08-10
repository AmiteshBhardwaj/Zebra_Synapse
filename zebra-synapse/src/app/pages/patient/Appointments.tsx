import { useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Plus,
  Stethoscope,
  Video,
} from "lucide-react";
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

type Appointment = {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  type: "video" | "in-person";
  location?: string;
  status: string;
  notes?: string;
};

const doctorOptions = [
  { value: "sarah", label: "Dr. Sarah Johnson - Cardiologist", doctor: "Dr. Sarah Johnson", specialty: "Cardiologist" },
  { value: "michael", label: "Dr. Michael Chen - Endocrinologist", doctor: "Dr. Michael Chen", specialty: "Endocrinologist" },
  { value: "emily", label: "Dr. Emily Williams - General Physician", doctor: "Dr. Emily Williams", specialty: "General Physician" },
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

export default function Appointments() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedType, setSelectedType] = useState<Appointment["type"] | "">("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  // Tab state: "upcoming" selected by default
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([
    {
      id: 1,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-04-15",
      time: "10:00 AM",
      type: "in-person",
      location: "Heart & Vascular Center, Suite 402",
      status: "Confirmed",
    },
    {
      id: 2,
      doctor: "Dr. Michael Chen",
      specialty: "Endocrinologist",
      date: "2026-04-22",
      time: "2:30 PM",
      type: "video",
      status: "Confirmed",
    },
  ]);

  const [pastAppointments] = useState<Appointment[]>([
    {
      id: 3,
      doctor: "Dr. Emily Williams",
      specialty: "General Physician",
      date: "2026-03-10",
      time: "11:15 AM",
      type: "in-person",
      location: "Main Clinic, Room 105",
      status: "Completed",
      notes: "Annual checkup completed. Vital signs optimal. Recommended routine lipid panel recheck in 6 months.",
    },
    {
      id: 4,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-01-18",
      time: "9:30 AM",
      type: "video",
      status: "Completed",
      notes: "Follow-up on blood pressure monitoring. BP medication dosage remains unchanged. Continue log entries.",
    },
  ]);

  const resetScheduleForm = () => {
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
    setSelectedType("");
  };

  const handleScheduleAppointment = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !selectedType) return;

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
        type: selectedType,
        location: selectedType === "in-person" ? "Medical Plaza, Suite 210" : undefined,
        status: "Confirmed",
      };

      setUpcomingAppointments((current) => [nextAppointment, ...current]);
      setIsSavingSchedule(false);
      setScheduleOpen(false);
      resetScheduleForm();
      // Ensure we switch to upcoming view to show the newly scheduled appointment
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
      setUpcomingAppointments((current) =>
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

  const handleRescheduleOpenChange = (open: boolean) => {
    setRescheduleOpen(open);
    if (!open) {
      setSelectedAppointment(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setIsSavingReschedule(false);
    }
  };

  const isScheduleReady = Boolean(selectedDoctor && selectedDate && selectedTime && selectedType);
  const isRescheduleReady = Boolean(selectedAppointment && rescheduleDate && rescheduleTime);

  return (
    <PatientPortalPage>
      <Dialog open={scheduleOpen} onOpenChange={handleScheduleOpenChange}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
              <Calendar className="h-6 w-6 text-[#ff9c61]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Appointments</h1>
                <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                  Care Coordination
                </span>
              </div>
              <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
                Manage upcoming visits, schedule video consultations, and review completed medical appointments.
              </p>
            </div>
          </div>

          <DialogTrigger asChild>
            <Button className={`h-11 px-5 rounded-xl ${portalPrimaryButtonClass}`}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className={portalDialogClass}>
          <DialogHeader>
            <DialogTitle className="text-white">Schedule New Appointment</DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Choose a doctor and preferred time for your appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doctor" className="text-sm text-white">
                Select Doctor
              </Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger id="doctor" className={portalSelectTriggerClass}>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent className={portalSelectContentClass}>
                  {doctorOptions.map((doctor) => (
                    <SelectItem key={doctor.value} value={doctor.value} className={portalSelectItemClass}>
                      {doctor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm text-white">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                className={portalInputClass}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm text-white">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                className={portalInputClass}
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm text-white">
                Appointment Type
              </Label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as Appointment["type"])}>
                <SelectTrigger id="type" className={portalSelectTriggerClass}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className={portalSelectContentClass}>
                  <SelectItem value="video" className={portalSelectItemClass}>
                    Video Consultation
                  </SelectItem>
                  <SelectItem value="in-person" className={portalSelectItemClass}>
                    In-Person Visit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className={`w-full active:scale-[0.98] ${portalPrimaryButtonClass}`}
              onClick={handleScheduleAppointment}
              disabled={!isScheduleReady || isSavingSchedule}
            >
              {isSavingSchedule ? "Confirming..." : "Confirm Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={handleRescheduleOpenChange}>
        <DialogContent className={portalDialogClass}>
          <DialogHeader>
            <DialogTitle className="text-white">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Choose a new date and time for {selectedAppointment?.doctor ?? "this appointment"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date" className="text-sm text-white">
                New Date
              </Label>
              <Input
                id="reschedule-date"
                type="date"
                className={portalInputClass}
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time" className="text-sm text-white">
                New Time
              </Label>
              <Input
                id="reschedule-time"
                type="time"
                className={portalInputClass}
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
              />
            </div>
            <Button
              className={`w-full active:scale-[0.98] ${portalPrimaryButtonClass}`}
              onClick={handleConfirmReschedule}
              disabled={!isRescheduleReady || isSavingReschedule}
            >
              {isSavingReschedule ? "Updating..." : "Confirm New Time"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className={portalDialogClass}>
          <DialogHeader>
            <DialogTitle className="text-white">Appointment Notes</DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Visit summary and follow-up details from your completed appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Doctor</p>
              <p className="mt-2 text-sm font-medium text-white">{selectedAppointment?.doctor ?? "—"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Appointment Date</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedAppointment ? formatDisplayDate(selectedAppointment.date) : "—"}
                </p>
              </div>
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Time</p>
                <p className="mt-2 text-sm font-medium text-white">{selectedAppointment?.time ?? "—"}</p>
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-[#111111]/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <FileText className="h-4 w-4 text-[#ff9c61]" />
                <p className="text-sm font-medium">Notes</p>
              </div>
              <p className="text-sm leading-7 text-[#D4D4D8]">
                {selectedAppointment?.notes ?? "Clinical notes will appear here after each completed visit."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Side-by-Side Tab Buttons: Upcoming vs Past */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-gradient-to-r from-[#ff7a33] to-[#ff9b61] text-white shadow-[0_8px_20px_rgba(255,122,51,0.3)]"
              : "border border-white/10 bg-white/[0.04] text-[#92a8c7] hover:bg-white/10 hover:text-white"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Upcoming</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "upcoming" ? "bg-white/20 text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "past"
              ? "bg-gradient-to-r from-[#ff7a33] to-[#ff9b61] text-white shadow-[0_8px_20px_rgba(255,122,51,0.3)]"
              : "border border-white/10 bg-white/[0.04] text-[#92a8c7] hover:bg-white/10 hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Past</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "past" ? "bg-white/20 text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {pastAppointments.length}
          </span>
        </button>
      </div>

      {/* Tab View Display */}
      {activeTab === "upcoming" ? (
        <section className="space-y-4 max-w-4xl">
          <div className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[1.5rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-6 text-white shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#ff6a00]/30 hover:shadow-[0_28px_80px_rgba(255,106,0,0.12)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5BD4] to-[#3b82f6] shadow-[0_12px_32px_rgba(108,91,212,0.28)]">
                        <Stethoscope className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-white">{appointment.doctor}</h3>
                          <StatusPill status={appointment.status} />
                        </div>
                        <p className="mt-1 text-sm text-[#A1A1AA]">{appointment.specialty}</p>
                      </div>
                    </div>
                    <div className={portalMutedPanelClass}>
                      <div className="grid gap-3 px-4 py-3 text-sm text-[#E5E7EB] sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#ff9c61]" />
                          <span>{formatDisplayDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#ff9c61]" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {appointment.type === "video" ? (
                            <>
                              <Video className="h-4 w-4 text-[#8f83ff]" />
                              <span>Video Consultation</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 text-[#8f83ff]" />
                              <span>{appointment.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className={`active:scale-[0.98] ${portalSecondaryButtonClass}`}
                      onClick={() => handleReschedule(appointment)}
                    >
                      Reschedule
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className={`${portalPanelClass} p-8 text-center text-sm text-[#92a8c7]`}>
                No upcoming appointments scheduled. Click &quot;Schedule Appointment&quot; above to book your next visit.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-4 max-w-4xl">
          <div className="space-y-4">
            {pastAppointments.length > 0 ? (
              pastAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[1.5rem] border border-white/8 bg-[#171717]/90 p-6 text-white shadow-[0_18px_45px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/15"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                        <Stethoscope className="h-5 w-5 text-white/70" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{appointment.doctor}</h3>
                        <p className="mt-1 text-sm text-[#A1A1AA]">{appointment.specialty}</p>
                      </div>
                    </div>
                    <StatusPill status={appointment.status} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-[#D4D4D8] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#ff9c61]" />
                      <span>{formatDisplayDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#ff9c61]" />
                      <span>{appointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {appointment.type === "video" ? (
                        <>
                          <Video className="h-4 w-4 text-[#8f83ff]" />
                          <span>Video Consultation</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 text-[#8f83ff]" />
                          <span>In-Person</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className={`mt-5 active:scale-[0.98] ${portalSecondaryButtonClass}`}
                    onClick={() => handleViewNotes(appointment)}
                  >
                    View Notes
                  </Button>
                </article>
              ))
            ) : (
              <div className={`${portalPanelClass} p-8 text-center text-sm text-[#92a8c7]`}>
                No past appointments on record.
              </div>
            )}
          </div>
        </section>
      )}
    </PatientPortalPage>
  );
}
