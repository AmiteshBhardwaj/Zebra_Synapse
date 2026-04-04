import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  LAB_REPORTS_BUCKET,
  buildLabReportStoragePath,
  type LabReportUploadRow,
} from "../lib/labReports";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

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
    async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");

      const path = buildLabReportStoragePath(user.id, file.name);
      const { error: upErr } = await sb.storage.from(LAB_REPORTS_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: rowErr } = await sb.from("lab_report_uploads").insert({
        patient_id: user.id,
        storage_path: path,
        original_filename: file.name,
      });
      if (rowErr) {
        await sb.storage.from(LAB_REPORTS_BUCKET).remove([path]);
        throw rowErr;
      }

      await refetch();
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
