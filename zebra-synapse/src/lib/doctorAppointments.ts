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

export const INITIAL_APPOINTMENTS: DoctorAppointment[] = [
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

const STORAGE_KEY = "zebra_doc_appointments";

export function loadDoctorAppointments(): DoctorAppointment[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse appointments from localStorage:", e);
  }
  return INITIAL_APPOINTMENTS;
}

export function saveDoctorAppointments(apts: DoctorAppointment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apts));
    window.dispatchEvent(new CustomEvent("zebra-appointments-updated", { detail: apts }));
  } catch (e) {
    console.error("Failed to save appointments to localStorage:", e);
  }
}
