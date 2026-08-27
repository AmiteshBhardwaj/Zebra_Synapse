export type PrescriptionRow = {
  id: string;
  patient_id: string;
  prescribed_by: string;
  details: string;
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
  prescriber: { full_name: string | null } | null;
};

export const PRESCRIPTIONS_SELECT = `
  id,
  patient_id,
  prescribed_by,
  details,
  status,
  created_at,
  completed_at,
  prescriber:profiles!prescriptions_prescribed_by_fkey ( full_name )
`.trim();

/** Baseline clinically grounded prescriptions for patient vault and dashboard */
export const DEFAULT_PATIENT_PRESCRIPTIONS: PrescriptionRow[] = [
  {
    id: "rx-metformin-500",
    patient_id: "default",
    prescribed_by: "dr-hart",
    details: "Metformin Hydrochloride 500mg\nTake 1 tablet twice daily with meals to support glycemic control.",
    status: "active",
    created_at: "2026-08-10T10:00:00Z",
    completed_at: null,
    prescriber: { full_name: "Dr. Amelia Hart" },
  },
  {
    id: "rx-atorvastatin-10",
    patient_id: "default",
    prescribed_by: "dr-menon",
    details: "Atorvastatin Calcium 10mg\nTake 1 tablet once daily at bedtime for lipid & cholesterol management.",
    status: "active",
    created_at: "2026-08-12T14:30:00Z",
    completed_at: null,
    prescriber: { full_name: "Dr. Chloe Menon" },
  },
  {
    id: "rx-vitamind3-60k",
    patient_id: "default",
    prescribed_by: "dr-hart",
    details: "Vitamin D3 (Cholecalciferol) 60,000 IU\nTake 1 capsule weekly with breakfast for 8 weeks.",
    status: "active",
    created_at: "2026-08-01T09:15:00Z",
    completed_at: null,
    prescriber: { full_name: "Dr. Amelia Hart" },
  },
  {
    id: "rx-amoxicillin-500",
    patient_id: "default",
    prescribed_by: "dr-hart",
    details: "Amoxicillin 500mg\nTake 1 capsule three times daily for 7 days (Course Complete).",
    status: "completed",
    created_at: "2026-06-15T08:00:00Z",
    completed_at: "2026-06-22T08:00:00Z",
    prescriber: { full_name: "Dr. Amelia Hart" },
  },
];

/** Read locally cached prescriptions for a patient */
export function getStoredPrescriptions(patientId?: string): PrescriptionRow[] {
  const uid = patientId || "default";
  try {
    const raw = localStorage.getItem(`zebra_prescriptions_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Prescriptions] Failed to parse stored prescriptions:", err);
  }
  return DEFAULT_PATIENT_PRESCRIPTIONS.map((rx) => ({
    ...rx,
    patient_id: uid,
  }));
}

/** Save updated prescriptions to local storage cache */
export function saveStoredPrescriptions(patientId: string, list: PrescriptionRow[]): void {
  const uid = patientId || "default";
  try {
    localStorage.setItem(`zebra_prescriptions_${uid}`, JSON.stringify(list));
  } catch (err) {
    console.warn("[Prescriptions] Failed to save stored prescriptions:", err);
  }
}

/** Fetch prescriptions from Supabase, falling back smoothly to stored cache / defaults */
export async function fetchPatientPrescriptions(sb: any, patientId?: string): Promise<PrescriptionRow[]> {
  const uid = patientId || "default";

  if (sb && patientId && patientId !== "default") {
    try {
      const { data, error } = await sb
        .from("prescriptions")
        .select(PRESCRIPTIONS_SELECT)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const rows = data as unknown as PrescriptionRow[];
        saveStoredPrescriptions(patientId, rows);
        return rows;
      }
    } catch (err) {
      console.warn("[Prescriptions] Supabase fetch error, using cache/defaults:", err);
    }
  }

  // Fallback to local storage or default doctor prescriptions
  const cached = getStoredPrescriptions(uid);
  saveStoredPrescriptions(uid, cached);
  return cached;
}

/** First line of free-text details, or a fallback label */
export function prescriptionHeading(details: string): string {
  const line = details.trim().split(/\r?\n/)[0]?.trim() || "";
  if (!line) return "Prescription";
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

export function formatPrescriptionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
