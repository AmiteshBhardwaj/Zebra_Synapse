import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  clearBrowserSupabaseSession,
  getSupabase,
  isAuthSessionError,
  isRlsPermissionError,
  isSupabaseConfigured,
} from "../lib/supabase";

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
  const queueKickTimestampsRef = useRef<Record<string, number>>({});

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

  const invokeQueueProcessor = useCallback(
    async (uploadId?: string) => {
      if (!user) return;
      const sb = getSupabase();
      if (!sb) return;

      const key = uploadId ?? "__global__";
      const now = Date.now();
      const lastKickAt = queueKickTimestampsRef.current[key] ?? 0;
      if (now - lastKickAt < 15000) {
        return;
      }
      queueKickTimestampsRef.current[key] = now;

      const { error } = await sb.functions.invoke("process-lab-report-queue", {
        body: uploadId ? { uploadId } : {},
      });
      if (error) {
        console.error("[lab report queue]", error);
      }
    },
    [user],
  );

  useEffect(() => {
    const nextPendingUpload = uploads.find((upload) => isPendingUploadStatus(upload.analysis_status));
    if (!nextPendingUpload) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void invokeQueueProcessor(nextPendingUpload.id);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [invokeQueueProcessor, uploads]);

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
        if (isAuthSessionError(rowErr)) {
          await clearBrowserSupabaseSession(sb);
          throw new Error("Your session expired. Sign in again, then retry the upload.");
        }
        if (isRlsPermissionError(rowErr)) {
          throw new Error("Upload blocked by Supabase permissions. Sign in with a patient account and verify your profile row has role = 'patient'.");
        }
        throw rowErr;
      }

      await refetch();

      let extractedDirectly = false;
      let directMessage = "";
      try {
        if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
          const { extractLabPanelFromPdf } = await import("../lib/labReportExtraction");
          const result = await extractLabPanelFromPdf(file);
          if (result.status === "success" && result.panel.matchedCount > 0) {
            const { buildPanelPayloadFromExtraction } = await import("../lib/labReportAnalysis");
            
            // Insert extraction draft row first to satisfy trigger FK
            const { data: extData } = await sb
              .from("lab_report_extractions")
              .insert({
                upload_id: uploadId,
                raw_text: result.panel.notes,
                extracted_recorded_at: result.panel.recordedAt,
                biomarkers_json: result.panel.biomarkers,
                review_state: "auto_published",
              })
              .select("id")
              .maybeSingle();

            const extractionId = extData?.id ?? null;

            const panelPayload = buildPanelPayloadFromExtraction({
              patientId: user.id,
              uploadId,
              extractionId: extractionId as string,
              recordedAt: result.panel.recordedAt,
              biomarkers: result.panel.biomarkers,
              notes: result.panel.notes,
            });

            const { error: pErr } = await sb.from("lab_panels").insert(panelPayload);
            if (pErr) {
              console.error("[lab panel insert error]", pErr.message);
            } else {
              await sb.from("lab_report_uploads").update({
                analysis_status: "ready",
                document_type: "lab_report",
                processed_at: new Date().toISOString(),
              }).eq("id", uploadId);
              extractedDirectly = true;
              directMessage = `Successfully extracted ${result.panel.matchedCount} biomarkers from ${file.name}.`;
            }
          }
        }
      } catch (clientParseErr) {
        console.warn("[client pdf parse fallback]", clientParseErr);
      }

      await refetch();

      void invokeQueueProcessor(uploadId);

      const statusLabel = getUploadStatusMeta(extractedDirectly ? "ready" : "queued").label;
      return {
        queued: !extractedDirectly,
        extracted: extractedDirectly,
        uploadId,
        message: extractedDirectly
          ? directMessage
          : `Upload complete. ${statusLabel} for server-side analysis.`,
      };
    },
    [user, refetch, invokeQueueProcessor],
  );

  return {
    uploads,
    loading,
    refetch,
    uploadLabReport,
    hasLabReports: uploads.length > 0,
  };
}
