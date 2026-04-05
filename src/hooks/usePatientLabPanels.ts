import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  buildLabPanelInsertPayload,
  LAB_PANEL_SELECT,
  type LabPanelInput,
  type LabPanelRow,
} from "../lib/labPanels";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function usePatientLabPanels() {
  const { user, configured } = useAuth();
  const [panels, setPanels] = useState<LabPanelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured() || !configured || !user) {
      setPanels([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setPanels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await sb
      .from("lab_panels")
      .select(LAB_PANEL_SELECT)
      .eq("patient_id", user.id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lab panels]", error.message);
      setPanels([]);
    } else {
      setPanels(((data ?? []) as unknown) as LabPanelRow[]);
    }
    setLoading(false);
  }, [configured, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const savePanel = useCallback(
    async (input: LabPanelInput) => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const payload = buildLabPanelInsertPayload(user.id, input);

      const hasAnyValue = [
        payload.hemoglobin_a1c,
        payload.fasting_glucose,
        payload.total_cholesterol,
        payload.ldl,
        payload.hdl,
        payload.triglycerides,
        payload.hemoglobin,
        payload.wbc,
        payload.platelets,
        payload.creatinine,
      ].some((value) => value != null);

      if (!payload.upload_id) {
        throw new Error("Choose the uploaded report these values came from.");
      }
      if (!payload.recorded_at) {
        throw new Error("Choose the lab date from the report.");
      }
      if (!hasAnyValue) {
        throw new Error("Enter at least one lab value to generate analysis.");
      }

      const { error } = await sb.from("lab_panels").insert(payload);
      if (error) throw error;
      await refetch();
    },
    [refetch, user],
  );

  return {
    panels,
    loading,
    refetch,
    savePanel,
    hasPanels: panels.length > 0,
  };
}
