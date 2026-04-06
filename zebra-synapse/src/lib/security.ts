const MIN_PASSWORD_LENGTH = 12;
const MAX_LAB_REPORT_BYTES = 10 * 1024 * 1024;
const ALLOWED_LAB_REPORT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_LAB_REPORT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Password must include a number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a special character.";
  }

  return null;
}

export function getAuthInactivityTimeoutMs(): number {
  const raw = import.meta.env.VITE_AUTH_INACTIVITY_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 60_000) {
    return parsed;
  }

  return 15 * 60 * 1000;
}

export function getLabReportFileError(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_LAB_REPORT_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );

  if (!hasAllowedExtension) {
    return "Only PDF, JPG, and PNG lab reports are allowed.";
  }

  if (file.type && !ALLOWED_LAB_REPORT_TYPES.has(file.type)) {
    return "The uploaded file type does not match the allowed lab report formats.";
  }

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_LAB_REPORT_BYTES) {
    return "Lab reports must be 10 MB or smaller.";
  }

  return null;
}
