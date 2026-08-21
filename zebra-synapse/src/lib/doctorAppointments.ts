export type DoctorAppointment = {
  id: string;
  patientId?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName?: string;
  specialty?: string;
  condition: string;
  date: string; // YYYY-MM-DD
  time: string;
  durationMinutes: number;
  type: "in-person" | "teleconsult" | "follow-up" | "lab-review";
  status: "Requested" | "Confirmed" | "Completed" | "Cancelled" | "Rejected" | "In-Progress";
  location?: string;
  notes?: string;
  rejectionReason?: string;
  vitalsSummary?: string;
  urgency?: "normal" | "priority" | "urgent";
  requestedBy?: "patient" | "doctor";
  createdAt?: string;
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
  // Pending Appointment Requests from Patients
  {
    id: "apt-req-201",
    patientName: "Liam O'Connor",
    patientAge: 41,
    patientGender: "Male",
    condition: "Lipid Titration & Multi-Omics Follow-Up",
    date: "2026-08-18",
    time: "03:00 PM",
    durationMinutes: 30,
    type: "teleconsult",
    status: "Requested",
    location: "Virtual Consult Room #1",
    notes: "Patient reports mild muscle stiffness after increasing PCSK9 inhibitor dose; requests lab telemetry review.",
    urgency: "priority",
    requestedBy: "patient",
    doctorName: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
    createdAt: "2026-08-14T14:20:00Z",
  },
  {
    id: "apt-req-202",
    patientName: "Maya Lin",
    patientAge: 31,
    patientGender: "Female",
    condition: "Hypermobile Joint Flare & Pain Management",
    date: "2026-08-19",
    time: "10:00 AM",
    durationMinutes: 30,
    type: "in-person",
    status: "Requested",
    location: "Synapse Clinical Suite 402",
    notes: "Experiencing acute shoulder subluxation and increased fatigue over the past 48 hours.",
    urgency: "urgent",
    requestedBy: "patient",
    doctorName: "Dr. Hannah Patel",
    specialty: "Rheumatologist",
    createdAt: "2026-08-15T08:15:00Z",
  },
  // Confirmed Appointments
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
    doctorName: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
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
    doctorName: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
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
    doctorName: "Dr. Chloe Menon",
    specialty: "Cardiologist",
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
    doctorName: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
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
    doctorName: "Dr. Amelia Hart",
    specialty: "Internal Medicine & Primary Care",
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
    doctorName: "Dr. Farah Siddiqui",
    specialty: "Gastroenterologist",
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
    doctorName: "Dr. Isaac Romero",
    specialty: "Neurologist",
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

export function acceptDoctorAppointment(appointmentId: string): DoctorAppointment[] {
  const current = loadDoctorAppointments();
  const updated = current.map((a) =>
    a.id === appointmentId
      ? { ...a, status: "Confirmed" as const }
      : a
  );
  saveDoctorAppointments(updated);
  return updated;
}

export function rejectDoctorAppointment(appointmentId: string, rejectionReason?: string): DoctorAppointment[] {
  const current = loadDoctorAppointments();
  const updated = current.map((a) =>
    a.id === appointmentId
      ? {
          ...a,
          status: "Rejected" as const,
          rejectionReason: rejectionReason || "Declined by physician (schedule full or specialist referral recommended).",
        }
      : a
  );
  saveDoctorAppointments(updated);
  return updated;
}

export function requestDoctorAppointment(newAppointment: Omit<DoctorAppointment, "id" | "status" | "createdAt">): DoctorAppointment {
  const current = loadDoctorAppointments();
  const created: DoctorAppointment = {
    ...newAppointment,
    id: `apt-req-${Date.now()}`,
    status: "Requested",
    createdAt: new Date().toISOString(),
  };
  saveDoctorAppointments([created, ...current]);
  return created;
}
