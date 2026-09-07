import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const AUTH_STORAGE_KEY = "zebra-synapse.auth";
const AUTH_CODE_VERIFIER_STORAGE_KEY = `${AUTH_STORAGE_KEY}-code-verifier`;

function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** Returns the browser Supabase client singleton, or null if env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: AUTH_STORAGE_KEY,
      },
    });
  }
  return client;
}

export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_CODE_VERIFIER_STORAGE_KEY);
  } catch {}
}

export async function clearBrowserSupabaseSession(sb: SupabaseClient): Promise<void> {
  clearSupabaseAuthStorage();
  try {
    await sb.auth.signOut({ scope: "local" });
  } catch {}
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return null;
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error) || typeof error.code !== "string") {
    return "";
  }
  return error.code;
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("refresh_token_not_found")
  );
}

export function isAuthSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);

  return (
    isInvalidRefreshTokenError(error) ||
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("auth session missing") ||
    message.includes("session not found") ||
    (status === 401 && message.length > 0)
  );
}

export function isRlsPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);
  const code = getErrorCode(error).toLowerCase();

  return (
    status === 403 ||
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
}

export function getAuthEmailRedirectUrl(path = "/"): string | undefined {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
  const baseUrl =
    configuredSiteUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!baseUrl) return undefined;

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return undefined;
  }
}
