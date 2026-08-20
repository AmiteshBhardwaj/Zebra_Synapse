import { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Video,
  Building,
  FileText,
  User,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  type DoctorAppointment,
  TIME_SLOTS,
  loadDoctorAppointments,
  saveDoctorAppointments,
} from "../../../lib/doctorAppointments";
import type { DoctorPatientListItem } from "../../../lib/careRelationships";

type Props = {
  patients: DoctorPatientListItem[];
  defaultPatientId?: string;
  onScheduled?: () => void;
  trigger?: React.ReactNode;
};

export default function QuickScheduleAppointmentDialog({
  patients,
  defaultPatientId,
  onScheduled,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(defaultPatientId || "");
  const [customName, setCustomName] = useState("");
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [time, setTime] = useState<string>("09:00 AM");
  const [type, setType] = useState<"in-person" | "teleconsult" | "follow-up" | "lab-review">("teleconsult");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "priority" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);

  // Sync defaultPatientId when opening
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (defaultPatientId) {
        setSelectedPatientId(defaultPatientId);
        const p = patients.find((pat) => pat.patientId === defaultPatientId);
        if (p) setCondition(p.condition || "");
      } else if (patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patients[0].patientId);
        setCondition(patients[0].condition || "");
      }
    }
  };

  const handlePatientSelect = (val: string) => {
    setSelectedPatientId(val);
    if (val !== "custom") {
      const found = patients.find((p) => p.patientId === val);
      if (found) {
        setCondition(found.condition || "");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let pName = "";
    let pId: string | undefined = undefined;

    if (selectedPatientId === "custom") {
      if (!customName.trim()) {
        toast.error("Please enter the patient's name.");
        return;
      }
      pName = customName.trim();
    } else {
      const match = patients.find((p) => p.patientId === selectedPatientId);
      if (!match) {
        toast.error("Please select a valid patient.");
        return;
      }
      pName = match.name;
      pId = match.patientId;
    }

    if (!date) {
      toast.error("Please select a date for the appointment.");
      return;
    }

    setSubmitting(true);

    const location =
      type === "teleconsult"
        ? "Virtual Consult Room #1"
        : "Synapse Clinical Suite 402";

    const newAppointment: DoctorAppointment = {
      id: `apt-${Date.now()}`,
      patientId: pId,
      patientName: pName,
      condition: condition.trim() || "Clinical Consultation",
      date,
      time,
      durationMinutes: type === "teleconsult" ? 30 : 45,
      type,
      status: "Confirmed",
      location,
      notes: notes.trim() || undefined,
      urgency,
      vitalsSummary: "Baseline Monitored",
    };

    const current = loadDoctorAppointments();
    const updated = [newAppointment, ...current];
    saveDoctorAppointments(updated);

    toast.success(`Appointment scheduled with ${pName} for ${date} at ${time}`);
    setSubmitting(false);
    setOpen(false);
    onScheduled?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold shadow-sm shadow-[#3E36B0]/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Visit</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-[28px] shadow-2xl text-[#111111] font-poppins">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-[#3E36B0]">
            <div className="w-8 h-8 rounded-xl bg-[#E5ECF9] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#3E36B0]" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-[#111111]">
              Schedule Consultation
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Book an in-person visit, video teleconsultation, or clinical review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Patient Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Patient</Label>
            <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Select patient..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-xs font-medium">
                {patients.map((p) => (
                  <SelectItem key={p.patientId} value={p.patientId}>
                    {p.name} ({p.condition || "Surveillance"})
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Custom / New Patient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPatientId === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Patient Full Name</Label>
              <Input
                type="text"
                placeholder="e.g. John Doe"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-medium"
                required
              />
            </div>
          )}

          {/* Date & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Time Slot</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-xs font-medium max-h-48">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consultation Type & Urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Consultation Type</Label>
              <Select
                value={type}
                onValueChange={(val: any) => setType(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-xs font-medium">
                  <SelectItem value="teleconsult">📹 Teleconsultation</SelectItem>
                  <SelectItem value="in-person">🏥 In-Person Visit</SelectItem>
                  <SelectItem value="lab-review">🔬 Lab Review</SelectItem>
                  <SelectItem value="follow-up">📋 Follow-Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Priority</Label>
              <Select
                value={urgency}
                onValueChange={(val: any) => setUrgency(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-xs font-medium">
                  <SelectItem value="normal">Standard (Normal)</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="urgent">🚨 Urgent Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Condition / Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Clinical Focus / Condition</Label>
            <Input
              type="text"
              placeholder="e.g. Hypertension Follow-up, Genomic Review"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-medium"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Clinical Notes (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Review latest lipid panel & adjust dosage"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-xl bg-[#F4F6FC] border-slate-200 text-xs font-medium"
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#3E36B0] hover:bg-[#312B91] text-white text-xs font-bold shadow-md shadow-[#3E36B0]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Booking..." : "Confirm Appointment"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
