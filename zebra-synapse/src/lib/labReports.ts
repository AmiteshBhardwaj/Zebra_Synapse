const BUCKET = "lab-reports";

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "report";
}

export function buildLabReportStoragePath(userId: string, originalName: string): string {
  const safe = sanitizeStorageFileName(originalName);
  const id = createClientGeneratedId();
  return `${userId}/${id}_${safe}`;
}

export function createClientGeneratedId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export { BUCKET as LAB_REPORTS_BUCKET };
