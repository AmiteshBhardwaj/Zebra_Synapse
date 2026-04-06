import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
const AUTH_STORAGE_KEY = "zebra-synapse.auth";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.length &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
  );
}

/** Returns the browser Supabase client, or null if env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: AUTH_STORAGE_KEY,
        },
      },
    );
  }
  return client;
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
