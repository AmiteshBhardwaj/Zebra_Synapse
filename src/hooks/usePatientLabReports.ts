import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  LAB_REPORTS_BUCKET,
  buildLabReportStoragePath,
  type LabReportUploadRow,
} from "../lib/labReports";
import { extractLabPanelFromPdf } from "../lib/labReportExtraction";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

type UploadLabReportResult = {
  extracted: boolean;
  message?: string;
};

export function usePatientLabReports() {
  const { user, configured } = useAuth();
  const [uploads, setUploads] = useState<LabReportUploadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured() || !configured || !user) {
      setUploads([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setUploads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await sb
      .from("lab_report_uploads")
      .select("id, patient_id, storage_path, original_filename, created_at")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lab reports]", error.message);
      setUploads([]);
    } else {
      setUploads((data ?? []) as LabReportUploadRow[]);
    }
    setLoading(false);
  }, [user, configured]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const uploadLabReport = useCallback(
    async (file: File): Promise<UploadLabReportResult> => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");

      const path = buildLabReportStoragePath(user.id, file.name);
      const { error: upErr } = await sb.storage.from(LAB_REPORTS_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: uploadRow, error: rowErr } = await sb
        .from("lab_report_uploads")
        .insert({
          patient_id: user.id,
          storage_path: path,
          original_filename: file.name,
        })
        .select("id, patient_id, storage_path, original_filename, created_at")
        .single();
      if (rowErr) {
        await sb.storage.from(LAB_REPORTS_BUCKET).remove([path]);
        throw rowErr;
      }

      let result: UploadLabReportResult = { extracted: false };
      const extraction = await extractLabPanelFromPdf(file).catch((error: unknown) => ({
        status: "unsupported" as const,
        reason: error instanceof Error ? error.message : "Could not read the PDF.",
      }));

      if (extraction.status === "success") {
        const { values, recordedAt, matchedCount, notes } = extraction.panel;
        const { error: panelErr } = await sb.from("lab_panels").upsert(
          {
            patient_id: user.id,
            upload_id: uploadRow.id,
            recorded_at: recordedAt,
            hemoglobin_a1c: values.hemoglobinA1c ?? null,
            fasting_glucose: values.fastingGlucose ?? null,
            total_cholesterol: values.totalCholesterol ?? null,
            ldl: values.ldl ?? null,
            hdl: values.hdl ?? null,
            triglycerides: values.triglycerides ?? null,
            hemoglobin: values.hemoglobin ?? null,
            wbc: values.wbc ?? null,
            platelets: values.platelets ?? null,
            creatinine: values.creatinine ?? null,
            notes,
          },
          { onConflict: "upload_id" },
        );
        if (!panelErr) {
          result = {
            extracted: true,
            message: `Extracted ${matchedCount} biomarker${matchedCount === 1 ? "" : "s"} from the PDF.`,
          };
        } else {
          console.error("[lab panel extract]", panelErr.message);
          result = {
            extracted: false,
            message: "The PDF uploaded, but saving the extracted biomarkers failed.",
          };
        }
      } else if (extraction.status === "unsupported" || extraction.status === "no_data") {
        result = {
          extracted: false,
          message: extraction.reason,
        };
      }

      await refetch();
      return result;
    },
    [user, refetch],
  );

  return {
    uploads,
    loading,
    refetch,
    uploadLabReport,
    hasLabReports: uploads.length > 0,
  };
}
