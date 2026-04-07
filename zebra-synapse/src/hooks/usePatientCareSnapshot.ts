import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { AiRiskCareSnapshot } from "../lib/aiRiskInsights";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function usePatientCareSnapshot() {
  const { user, configured } = useAuth();
  const [snapshot, setSnapshot] = useState<AiRiskCareSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured() || !configured || !user) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await sb
      .from("care_relationships")
      .select(
        "last_visit, primary_condition, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, glucose, health_status, risk_flags, created_at",
      )
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[care snapshot]", error.message);
      setSnapshot(null);
    } else {
      setSnapshot((data as AiRiskCareSnapshot | null) ?? null);
    }

    setLoading(false);
  }, [configured, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    snapshot,
    loading,
    refetch,
    hasSnapshot: Boolean(snapshot),
  };
}
