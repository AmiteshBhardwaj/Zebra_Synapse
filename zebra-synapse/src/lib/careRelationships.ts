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
  patient: {
    full_name: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    dietary_preference?: string | null;
    food_allergies?: string[] | null;
    dietary_conditions?: string[] | null;
    dietary_notes?: string | null;
  } | null;
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
  patient:profiles!care_relationships_patient_id_fkey ( full_name, height_cm, weight_kg, dietary_preference, food_allergies, dietary_conditions, dietary_notes )
`.trim();

export const CARE_RELATIONSHIPS_FALLBACK_SELECT = `
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

export function calculateBmi(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null;
}

export type BmiCategoryInfo = {
  label: "Underweight" | "Normal" | "Overweight" | "Obese" | "Unknown";
  badgeClass: string;
  textClass: string;
};

export function getBmiCategory(bmi: number | null | undefined): BmiCategoryInfo {
  if (bmi == null || !Number.isFinite(bmi)) {
    return {
      label: "Unknown",
      badgeClass: "border-white/10 bg-white/5 text-white/60",
      textClass: "text-white/60",
    };
  }
  if (bmi < 18.5) {
    return {
      label: "Underweight",
      badgeClass: "border-amber-500/30 bg-amber-500/15 text-amber-300",
      textClass: "text-amber-400",
    };
  }
  if (bmi < 25) {
    return {
      label: "Normal",
      badgeClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
      textClass: "text-emerald-400",
    };
  }
  if (bmi < 30) {
    return {
      label: "Overweight",
      badgeClass: "border-orange-500/30 bg-orange-500/15 text-orange-300",
      textClass: "text-orange-400",
    };
  }
  return {
    label: "Obese",
    badgeClass: "border-rose-500/30 bg-rose-500/15 text-rose-300",
    textClass: "text-rose-400",
  };
}

export function formatHeight(heightCm: number | null | undefined): string {
  if (!heightCm || heightCm <= 0) return "—";
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${heightCm} cm (${feet}'${inches}")`;
}

export function formatWeight(weightKg: number | null | undefined): string {
  if (!weightKg || weightKg <= 0) return "—";
  const lbs = Math.round(weightKg * 2.20462 * 10) / 10;
  return `${weightKg} kg (${lbs} lbs)`;
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

