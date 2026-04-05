/** Rows returned from care_relationships list/detail queries with embedded patient profile. */
export type CareRelationshipListRow = {
  patient_id: string;
  last_visit: string | null;
  primary_condition: string | null;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  glucose: number | null;
  health_status: "normal" | "elevated" | "risk";
  risk_flags: string[];
  created_at: string;
  patient: { full_name: string | null } | null;
};

export type DoctorPatientListItem = {
  patientId: string;
  name: string;
  lastVisitLabel: string;
  condition: string;
  vitals: {
    heartRate: number | null;
    bloodPressure: string | null;
    glucose: number | null;
    status: "normal" | "elevated" | "risk";
  };
  riskFlags: string[];
};

export const CARE_RELATIONSHIPS_LIST_SELECT = `
  patient_id,
  last_visit,
  primary_condition,
  heart_rate,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  glucose,
  health_status,
  risk_flags,
  created_at,
  patient:profiles!care_relationships_patient_id_fkey ( full_name )
`.trim();

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBloodPressure(
  sys: number | null,
  dia: number | null,
): string | null {
  if (sys == null || dia == null) return null;
  return `${sys}/${dia}`;
}

export function mapRowToListItem(row: CareRelationshipListRow): DoctorPatientListItem {
  const name = row.patient?.full_name?.trim() || "Patient";
  const last = row.last_visit || row.created_at;
  return {
    patientId: row.patient_id,
    name,
    lastVisitLabel: formatDisplayDate(last),
    condition: row.primary_condition?.trim() || "Registered patient",
    vitals: {
      heartRate: row.heart_rate,
      bloodPressure: formatBloodPressure(
        row.blood_pressure_systolic,
        row.blood_pressure_diastolic,
      ),
      glucose: row.glucose,
      status: row.health_status,
    },
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
  };
}
