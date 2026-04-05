export type CareActionType =
  | "follow_up"
  | "lab_request"
  | "message"
  | "referral"
  | "treatment_plan"
  | "report"
  | "note";

export type CareActionStatus = "open" | "scheduled" | "sent" | "completed";

export type CareActionRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
  action_type: CareActionType;
  title: string;
  details: string | null;
  status: CareActionStatus;
  scheduled_for: string | null;
  created_at: string;
};

export const CARE_ACTIONS_SELECT = `
  id,
  doctor_id,
  patient_id,
  action_type,
  title,
  details,
  status,
  scheduled_for,
  created_at
`.trim();

export function formatCareActionDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function careActionTypeLabel(type: CareActionType): string {
  switch (type) {
    case "follow_up":
      return "Follow-up";
    case "lab_request":
      return "Lab request";
    case "message":
      return "Message";
    case "referral":
      return "Referral";
    case "treatment_plan":
      return "Treatment plan";
    case "report":
      return "Report";
    case "note":
      return "Clinical note";
  }
}

export function careActionStatusLabel(status: CareActionStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "scheduled":
      return "Scheduled";
    case "sent":
      return "Sent";
    case "completed":
      return "Completed";
  }
}

