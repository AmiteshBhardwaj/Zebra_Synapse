export type LabReportUploadRow = {
  id: string;
  patient_id: string;
  storage_path: string;
  original_filename: string;
  created_at: string;
};

const BUCKET = "lab-reports";

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "report";
}

export function buildLabReportStoragePath(userId: string, originalName: string): string {
  const safe = sanitizeStorageFileName(originalName);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `${userId}/${id}_${safe}`;
}

export { BUCKET as LAB_REPORTS_BUCKET };
