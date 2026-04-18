import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  LAB_REPORT_EXTRACTION_SELECT,
  buildPanelPayloadFromExtraction,
  coerceBiomarkerMap,
  type LabReportExtractionRow,
} from "../lib/labReportAnalysis";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

type PublishExtractionReviewInput = {
  extractionId: string;
  uploadId: string;
  recordedAt: string;
  biomarkers: Record<string, number>;
  reviewNotes?: string;
};

export function usePatientLabReportExtractions() {
  const { user, configured } = useAuth();
  const [extractions, setExtractions] = useState<LabReportExtractionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured() || !configured || !user) {
      setExtractions([]);
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setExtractions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await sb
      .from("lab_report_extractions")
      .select(LAB_REPORT_EXTRACTION_SELECT)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[lab report extractions]", error.message);
      setExtractions([]);
    } else {
      setExtractions((((data ?? []) as unknown) as LabReportExtractionRow[]).map((row) => ({
        ...row,
        biomarkers_json: coerceBiomarkerMap(row.biomarkers_json),
      })));
    }
    setLoading(false);
  }, [configured, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const publishReviewedExtraction = useCallback(
    async (input: PublishExtractionReviewInput) => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");

      const payload = buildPanelPayloadFromExtraction({
        patientId: user.id,
        uploadId: input.uploadId,
        extractionId: input.extractionId,
        recordedAt: input.recordedAt,
        biomarkers: input.biomarkers,
        notes: "Patient-reviewed extraction published from uploaded PDF.",
      });

      const { error: panelError } = await sb
        .from("lab_panels")
        .upsert(payload, { onConflict: "upload_id" });
      if (panelError) throw panelError;

      const now = new Date().toISOString();
      const { error: extractionError } = await sb
        .from("lab_report_extractions")
        .update({
          extracted_recorded_at: input.recordedAt,
          biomarkers_json: input.biomarkers,
          review_state: "published",
          review_notes: input.reviewNotes?.trim() || null,
          reviewed_by: user.id,
          reviewed_at: now,
        })
        .eq("id", input.extractionId);
      if (extractionError) throw extractionError;

      const { error: uploadError } = await sb
        .from("lab_report_uploads")
        .update({
          analysis_status: "ready",
          document_type: "lab_report",
          analysis_version: "lab-pipeline-v1",
          last_error: null,
          processed_at: now,
        })
        .eq("id", input.uploadId);
      if (uploadError) throw uploadError;

      await refetch();
    },
    [refetch, user],
  );

  return {
    extractions,
    loading,
    refetch,
    publishReviewedExtraction,
  };
}
