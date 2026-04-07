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
import { AuthApiError, type Session, type User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearSupabaseAuthStorage,
  getSupabase,
  isInvalidRefreshTokenError,
  isSupabaseConfigured,
} from "../lib/supabase";
import { getAuthInactivityTimeoutMs } from "../lib/security";
import type { Profile } from "./types";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const inactivityTimerRef = useRef<number | null>(null);
  const inactivityTimeoutMs = getAuthInactivityTimeoutMs();

  const clearInvalidSession = useCallback(
    async (sb: SupabaseClient) => {
      clearSupabaseAuthStorage();
      await sb.auth.signOut({ scope: "local" });
      setSession(null);
      setProfile(null);
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
          return;
        }

        console.error(
          "[auth] session bootstrap:",
          error instanceof Error ? error.message : error,
        );
        await sync(null);
      }
    })();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      void sync(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
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
      if (!session?.user) return;

      inactivityTimerRef.current = window.setTimeout(() => {
        const sb = getSupabase();
        if (!sb) return;
        void sb.auth.signOut();
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
  }, [inactivityTimeoutMs, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured(),
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
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
