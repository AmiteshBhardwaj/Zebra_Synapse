import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AuthApiError,
  type AuthChangeEvent,
  type Session,
  type User,
} from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearBrowserSupabaseSession,
  getSupabase,
  isInvalidRefreshTokenError,
  isSupabaseConfigured,
} from "../lib/supabase";
import { getAuthInactivityTimeoutMs } from "../lib/security";
import type { Profile } from "./types";

type AuthContextValue = {
  session: Session | null;
  user: User | { id: string; email?: string } | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setDemoSession: (role: "patient" | "doctor", email: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(
  sb: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  let { data, error } = await sb
    .from("profiles")
    .select("id, role, full_name, license_number, height_cm, weight_kg, dietary_preference, food_allergies, dietary_conditions, dietary_notes")
    .eq("id", userId)
    .maybeSingle();

  if (error && (error.message.includes("schema cache") || error.message.includes("column") || error.message.includes("does not exist"))) {
    console.warn("[auth] Supabase profiles select fallback:", error.message);
    const fallback = await sb
      .from("profiles")
      .select("id, role, full_name, license_number")
      .eq("id", userId)
      .maybeSingle();

    if (!fallback.error) {
      data = (fallback.data as unknown) as any;
      error = null;
    }
  }

  if (error) {
    console.error("[auth] profiles fetch:", error.message);
  }

  let baseProfile: Profile | null = data ? (data as Profile) : null;

  if (!baseProfile) {
    // Attempt auto-healing: insert/upsert missing profile row for this authenticated user
    try {
      const { data: userData } = await sb.auth.getUser();
      const user = userData?.user;
      const meta = user?.user_metadata || {};
      const defaultRole = meta.role === "doctor" ? "doctor" : "patient";
      const defaultName =
        meta.full_name || meta.name || user?.email?.split("@")[0] || "User";

      const { data: newProfile, error: insertError } = await sb
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: defaultRole,
            full_name: defaultName,
          },
          { onConflict: "id" }
        )
        .select("id, role, full_name, license_number, height_cm, weight_kg, dietary_preference, food_allergies, dietary_conditions, dietary_notes")
        .maybeSingle();

      if (insertError) {
        console.warn("[auth] auto-creating profile row in DB:", insertError.message);
      }

      baseProfile = (newProfile as Profile | null) ?? {
        id: userId,
        role: defaultRole,
        full_name: defaultName,
        license_number: null,
      };
    } catch (e) {
      console.warn("[auth] profile recovery exception:", e);
      baseProfile = {
        id: userId,
        role: "patient",
        full_name: "User",
        license_number: null,
      };
    }
  }

  try {
    const localOverride = localStorage.getItem(`zebra_profile_${userId}`);
    if (localOverride) {
      const parsed = JSON.parse(localOverride);
      return { ...baseProfile, ...parsed };
    }
  } catch {}

  return baseProfile;
}

const DEMO_STORAGE_KEY = "zebra-synapse.demo_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Fallback demo state when Supabase auth is not active
  const [demoUser, setDemoUser] = useState<{ id: string; email?: string } | null>(() => {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.user ?? null;
      }
    } catch {}
    return null;
  });

  const [demoProfile, setDemoProfile] = useState<Profile | null>(() => {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.profile ?? null;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(isSupabaseConfigured());
  const inactivityTimerRef = useRef<number | null>(null);
  const bootstrapCompleteRef = useRef(false);
  const inactivityTimeoutMs = getAuthInactivityTimeoutMs();

  const setDemoSession = useCallback((role: "patient" | "doctor", email: string) => {
    let existingProfile: Partial<Profile> = {};
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.profile?.role === role) {
          existingProfile = parsed.profile;
        }
      }
    } catch {}

    const demoData = {
      user: { id: `demo-${role}-id`, email },
      profile: {
        id: `demo-${role}-id`,
        role,
        full_name: role === "patient" ? "Patient User" : "Dr. Alex Smith",
        license_number: role === "doctor" ? "MD-98421" : null,
        height_cm: role === "patient" ? 175 : null,
        weight_kg: role === "patient" ? 70 : null,
        dietary_preference: role === "patient" ? "vegan" : null,
        food_allergies: role === "patient" ? ["lactose"] : null,
        dietary_conditions: role === "patient" ? ["gerd"] : null,
        dietary_notes: role === "patient" ? "Prefers low-sodium and avoid spicy evening dinners" : null,
        ...existingProfile,
      },
    };
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoData));
      localStorage.setItem(`zebra_profile_${demoData.user.id}`, JSON.stringify(demoData.profile));
    } catch {}
    setDemoUser(demoData.user);
    setDemoProfile(demoData.profile);
  }, []);

  const clearInvalidSession = useCallback(
    async (sb: SupabaseClient) => {
      await clearBrowserSupabaseSession(sb);
      setSession(null);
      setProfile(null);
      setDemoUser(null);
      setDemoProfile(null);
      try {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {}
      setLoading(false);
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const sb = getSupabase();
    const uid = session?.user?.id;
    if (!sb || !uid) {
      if (demoUser?.id) {
        try {
          const stored = localStorage.getItem(DEMO_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.profile) setDemoProfile(parsed.profile);
          }
        } catch {}
      }
      return;
    }
    const p = await fetchProfile(sb, uid);
    if (p) {
      setProfile(p);
    }
  }, [session?.user?.id, demoUser?.id]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>): Promise<{ error: Error | null }> => {
      const activeUid = session?.user?.id ?? demoUser?.id;
      if (!activeUid) {
        return { error: new Error("No active user logged in") };
      }

      const current: Profile = (session?.user ? profile : demoProfile) ?? {
        id: activeUid,
        role: "patient" as const,
        full_name: "Patient User",
        license_number: null,
      };

      const updated: Profile = {
        ...current,
        ...patch,
        license_number: patch.license_number !== undefined ? patch.license_number : (current.license_number ?? null),
      };

      // 1. Instant state update
      if (session?.user) {
        setProfile(updated);
      } else {
        setDemoProfile(updated);
      }

      // 2. Persist to localStorage caches
      try {
        localStorage.setItem(`zebra_profile_${activeUid}`, JSON.stringify(updated));
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.profile = updated;
        if (!parsed.user && demoUser) parsed.user = demoUser;
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(parsed));
      } catch (e) {
        console.warn("[auth] localStorage update error:", e);
      }

      // 3. Persist to Supabase if connected
      const sb = getSupabase();
      if (sb && session?.user?.id) {
        try {
          let { error } = await sb
            .from("profiles")
            .update(patch)
            .eq("id", session.user.id);

          // Graceful fallback if database schema lacks optional extended columns
          if (error && (
            error.message.includes("schema cache") ||
            error.message.includes("column") ||
            error.message.includes("does not exist")
          )) {
            console.warn("[auth] Supabase profiles schema fallback:", error.message);
            const corePatch: Record<string, any> = {};
            if (patch.full_name !== undefined) corePatch.full_name = patch.full_name;
            if (patch.license_number !== undefined) corePatch.license_number = patch.license_number;

            const fallbackRes = await sb
              .from("profiles")
              .update(corePatch)
              .eq("id", session.user.id);

            if (!fallbackRes.error) {
              error = null;
            }
          }

          if (error) {
            console.error("[auth] supabase updateProfile error:", error.message);
            return { error: new Error(error.message) };
          }
        } catch (err: any) {
          console.error("[auth] supabase updateProfile exception:", err);
          return { error: err instanceof Error ? err : new Error(String(err)) };
        }
      }

      return { error: null };
    },
    [session?.user, session?.user?.id, demoUser, profile, demoProfile],
  );

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    const sync = async (s: Session | null) => {
      setSession(s);
      if (s?.user) {
        const p = await fetchProfile(sb, s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    const handleAuthStateChange = async (
      event: AuthChangeEvent,
      nextSession: Session | null,
    ) => {
      if (!bootstrapCompleteRef.current && event === "INITIAL_SESSION") {
        return;
      }

      if (!nextSession) {
        await sync(null);
        return;
      }

      try {
        const { error } = await sb.auth.getUser(nextSession.access_token);
        if (error) {
          throw error;
        }
        await sync(nextSession);
      } catch (error) {
        if (
          error instanceof AuthApiError &&
          isInvalidRefreshTokenError(error)
        ) {
          console.warn("[auth] clearing invalid auth state change session");
          await clearInvalidSession(sb);
          return;
        }

        console.error(
          `[auth] state change ${event.toLowerCase()}:`,
          error instanceof Error ? error.message : error,
        );
        await sync(null);
      }
    };

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, s) => {
      void handleAuthStateChange(event, s);
    });

    void (async () => {
      try {
        const {
          data: { session: cachedSession },
          error: sessionError,
        } = await sb.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }
        if (!cachedSession) {
          await sync(null);
          bootstrapCompleteRef.current = true;
          return;
        }

        const { error: userError } = await sb.auth.getUser();
        if (userError) {
          throw userError;
        }

        await sync(cachedSession);
      } catch (error) {
        if (
          error instanceof AuthApiError &&
          isInvalidRefreshTokenError(error)
        ) {
          console.warn("[auth] clearing invalid persisted session");
          await clearInvalidSession(sb);
          bootstrapCompleteRef.current = true;
          return;
        }

        console.error(
          "[auth] session bootstrap:",
          error instanceof Error ? error.message : error,
        );
        await sync(null);
      } finally {
        bootstrapCompleteRef.current = true;
      }
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {}
    setDemoUser(null);
    setDemoProfile(null);
    setSession(null);
    setProfile(null);
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearTimer = () => {
      if (inactivityTimerRef.current != null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    const resetTimer = () => {
      clearTimer();
      if (!session?.user && !demoUser) return;

      inactivityTimerRef.current = window.setTimeout(() => {
        void signOut();
      }, inactivityTimeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    resetTimer();
    for (const eventName of events) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }
    document.addEventListener("visibilitychange", resetTimer);

    return () => {
      clearTimer();
      for (const eventName of events) {
        window.removeEventListener(eventName, resetTimer);
      }
      document.removeEventListener("visibilitychange", resetTimer);
    };
  }, [inactivityTimeoutMs, session?.user, demoUser, signOut]);

  const activeUser = session?.user ?? demoUser;
  const activeProfile = profile ?? demoProfile;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: activeUser as User | null,
      profile: activeProfile,
      loading,
      configured: isSupabaseConfigured(),
      refreshProfile,
      updateProfile,
      signOut,
      setDemoSession,
    }),
    [session, activeUser, activeProfile, loading, refreshProfile, updateProfile, signOut, setDemoSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
