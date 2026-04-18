import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  LAB_REPORTS_BUCKET,
  buildLabReportStoragePath,
  createClientGeneratedId,
} from "../lib/labReports";
import {
  LAB_REPORT_UPLOAD_SELECT,
  getUploadStatusMeta,
  isPendingUploadStatus,
  type LabReportUploadRow,
} from "../lib/labReportAnalysis";
import { getLabReportFileError } from "../lib/security";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

type UploadLabReportResult = {
  queued: boolean;
  extracted: boolean;
  uploadId?: string;
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
      .select(LAB_REPORT_UPLOAD_SELECT)
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lab reports]", error.message);
      setUploads([]);
    } else {
      setUploads(((data ?? []) as unknown) as LabReportUploadRow[]);
    }
    setLoading(false);
  }, [user, configured]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!uploads.some((upload) => isPendingUploadStatus(upload.analysis_status))) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refetch();
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [refetch, uploads]);

  const uploadLabReport = useCallback(
    async (file: File): Promise<UploadLabReportResult> => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const fileError = getLabReportFileError(file);
      if (fileError) throw new Error(fileError);

      const path = buildLabReportStoragePath(user.id, file.name);
      const uploadId = createClientGeneratedId();
      const { error: upErr } = await sb.storage.from(LAB_REPORTS_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: rowErr } = await sb.from("lab_report_uploads").insert({
          id: uploadId,
          patient_id: user.id,
          storage_path: path,
          original_filename: file.name,
          analysis_status: "uploaded",
          analysis_version: "lab-pipeline-v1",
        });
      if (rowErr) {
        await sb.storage.from(LAB_REPORTS_BUCKET).remove([path]);
        throw rowErr;
      }

      await refetch();

      void sb.functions.invoke("process-lab-report-queue", {
        body: { uploadId },
      }).catch((error: unknown) => {
        console.error("[lab report queue]", error);
      });

      const statusLabel = getUploadStatusMeta("queued").label;
      return {
        queued: true,
        extracted: false,
        uploadId,
        message: `Upload complete. ${statusLabel} for server-side analysis.`,
      };
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
