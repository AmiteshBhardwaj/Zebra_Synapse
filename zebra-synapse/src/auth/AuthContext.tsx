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
  signOut: () => Promise<void>;
  setDemoSession: (role: "patient" | "doctor", email: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(
  sb: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, full_name, license_number")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] profiles fetch:", error.message);
    return null;
  }
  if (!data) return null;
  return data as Profile;
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
    const demoData = {
      user: { id: `demo-${role}-id`, email },
      profile: {
        id: `demo-${role}-id`,
        role,
        full_name: role === "patient" ? "Patient User" : "Dr. Alex Smith",
        license_number: role === "doctor" ? "MD-98421" : null,
      },
    };
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoData));
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
      setProfile(null);
      return;
    }
    const p = await fetchProfile(sb, uid);
    setProfile(p);
  }, [session?.user?.id]);

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
      signOut,
      setDemoSession,
    }),
    [session, activeUser, activeProfile, loading, refreshProfile, signOut, setDemoSession],
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
