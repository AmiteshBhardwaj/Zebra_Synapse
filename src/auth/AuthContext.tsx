import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
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

    void sb.auth.getSession().then(({ data: { session: s } }) => {
      void sync(s);
    });

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
