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
