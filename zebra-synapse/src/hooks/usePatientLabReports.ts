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

  const activeClientAnalysisRef = useRef<Set<string>>(new Set());

  const analyzeUploadedLabReport = useCallback(
    async (uploadId: string): Promise<void> => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");

      if (activeClientAnalysisRef.current.has(uploadId)) {
        return;
      }
      activeClientAnalysisRef.current.add(uploadId);

      try {
        // 1. Fetch the upload record
        const { data: uploadRow, error: fetchErr } = await sb
          .from("lab_report_uploads")
          .select("id, patient_id, storage_path, original_filename, analysis_status")
          .eq("id", uploadId)
          .eq("patient_id", user.id)
          .maybeSingle();

        if (fetchErr || !uploadRow) {
          throw new Error(fetchErr?.message ?? "Report upload record not found.");
        }

        // Optimistically set to processing
        await sb
          .from("lab_report_uploads")
          .update({ analysis_status: "processing", analysis_version: "lab-pipeline-v1" })
          .eq("id", uploadId);

        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, analysis_status: "processing" } : u)),
        );

        // 2. Download the uploaded PDF from storage
        const { data: fileBlob, error: downloadErr } = await sb.storage
          .from(LAB_REPORTS_BUCKET)
          .download(uploadRow.storage_path);

        if (downloadErr || !fileBlob) {
          await sb
            .from("lab_report_uploads")
            .update({
              analysis_status: "failed",
              last_error: "Could not retrieve file from storage bucket.",
            })
            .eq("id", uploadId);
          await refetch();
          throw new Error("Could not retrieve file from storage bucket.");
        }

        // 3. Perform extraction
        const { extractLabPanelFromPdf } = await import("../lib/labReportExtraction");
        const result = await extractLabPanelFromPdf(fileBlob, uploadRow.original_filename);

        if (result.status === "success" && result.panel.matchedCount > 0) {
          const { buildPanelPayloadFromExtraction } = await import("../lib/labReportAnalysis");

          let extractionId: string | null = null;
          try {
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
            if (extData?.id) extractionId = extData.id;
          } catch {
            // Ignore extraction draft RLS constraints
          }

          const panelPayload = buildPanelPayloadFromExtraction({
            patientId: user.id,
            uploadId,
            extractionId: extractionId || null,
            recordedAt: result.panel.recordedAt,
            biomarkers: result.panel.biomarkers,
            notes: result.panel.notes,
          });

          // Delete prior panel if any
          await sb.from("lab_panels").delete().eq("upload_id", uploadId).eq("patient_id", user.id);
          const { error: pErr } = await sb.from("lab_panels").insert(panelPayload);

          if (pErr) {
            console.error("[lab panel insert error]", pErr.message);
            await sb
              .from("lab_report_uploads")
              .update({
                analysis_status: "failed",
                last_error: `Failed to store biomarker panel: ${pErr.message}`,
              })
              .eq("id", uploadId);
          } else {
            await sb
              .from("lab_report_uploads")
              .update({
                analysis_status: "ready",
                document_type: "lab_report",
                processed_at: new Date().toISOString(),
                last_error: null,
              })
              .eq("id", uploadId);
          }
        } else {
          await sb
            .from("lab_report_uploads")
            .update({
              analysis_status: "failed",
              last_error:
                result.status === "no_data" || result.status === "unsupported"
                  ? result.reason
                  : "No supported biomarkers could be extracted from this report.",
            })
            .eq("id", uploadId);
        }

        await refetch();
      } finally {
        activeClientAnalysisRef.current.delete(uploadId);
      }
    },
    [user, refetch],
  );

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

      // Try invoking the backend edge function
      try {
        const { error } = await sb.functions.invoke("process-lab-report-queue", {
          body: uploadId ? { uploadId } : {},
        });
        if (error) {
          console.warn("[lab report queue edge func unavailable, fallback to browser analysis]", error);
          if (uploadId) {
            void analyzeUploadedLabReport(uploadId);
          }
        }
      } catch {
        if (uploadId) {
          void analyzeUploadedLabReport(uploadId);
        }
      }
    },
    [user, analyzeUploadedLabReport],
  );

  useEffect(() => {
    const nextPendingUpload = uploads.find((upload) => isPendingUploadStatus(upload.analysis_status));
    if (!nextPendingUpload) {
      return;
    }

    const timeout = window.setTimeout(() => {
      // Trigger both edge processor and instant client-side analysis
      void analyzeUploadedLabReport(nextPendingUpload.id);
      void invokeQueueProcessor(nextPendingUpload.id);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [analyzeUploadedLabReport, invokeQueueProcessor, uploads]);

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
      if (upErr) {
        if (isRlsPermissionError(upErr)) {
          throw new Error("Storage upload blocked by Supabase permissions. Ensure migration 020_fix_rls_policies.sql is applied to Supabase.");
        }
        throw upErr;
      }

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

      // Immediately run analysis
      let extractedDirectly = false;
      let directMessage = "";
      try {
        await analyzeUploadedLabReport(uploadId);
        extractedDirectly = true;
        directMessage = `Successfully uploaded and extracted biomarkers from ${file.name}.`;
      } catch (err) {
        console.warn("[upload analysis fallback]", err);
      }

      await refetch();

      const statusLabel = getUploadStatusMeta(extractedDirectly ? "ready" : "queued").label;
      return {
        queued: !extractedDirectly,
        extracted: extractedDirectly,
        uploadId,
        message: directMessage.length > 0
          ? directMessage
          : `Upload complete. ${statusLabel} for server-side analysis.`,
      };
    },
    [user, refetch, analyzeUploadedLabReport],
  );

  const deleteLabReport = useCallback(
    async (uploadId: string): Promise<void> => {
      if (!user) throw new Error("Not signed in");
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");

      // 1. Fetch the storage path before deleting the row
      const { data: uploadRow, error: fetchErr } = await sb
        .from("lab_report_uploads")
        .select("storage_path")
        .eq("id", uploadId)
        .eq("patient_id", user.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!uploadRow) throw new Error("Report not found or access denied.");

      // 2. Delete linked lab panels (FK is ON DELETE SET NULL, so we clean up explicitly)
      const { error: panelErr } = await sb
        .from("lab_panels")
        .delete()
        .eq("upload_id", uploadId)
        .eq("patient_id", user.id);

      if (panelErr) {
        console.warn("[delete lab report] could not delete linked panel:", panelErr.message);
      }

      // 3. Delete the upload row (extractions & queries cascade automatically)
      const { error: rowErr, count: deletedCount } = await sb
        .from("lab_report_uploads")
        .delete({ count: "exact" })
        .eq("id", uploadId)
        .eq("patient_id", user.id);

      if (rowErr) {
        console.error("[delete lab report] row delete error:", rowErr);
        throw rowErr;
      }
      // deletedCount === 0 means RLS silently blocked the delete (no error returned but nothing was deleted).
      // deletedCount === null means the count couldn't be retrieved — treat as success but warn.
      if (deletedCount === 0) {
        console.error("[delete lab report] 0 rows deleted — RLS is likely blocking DELETE. auth.uid():", user.id, "uploadId:", uploadId);
        throw new Error("Delete was blocked — your account may not own this report. Check Supabase DELETE RLS on lab_report_uploads.");
      }
      if (deletedCount === null) {
        console.warn("[delete lab report] count returned null — could not verify deletion. Proceeding optimistically.");
      }

      // 4. Optimistically remove from local state immediately so polling
      //    effects can't momentarily re-show the deleted row before the
      //    next refetch resolves.
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));

      // 5. Remove the file from storage (best-effort; don't block on failure)
      if (uploadRow.storage_path) {
        const { error: storageErr } = await sb.storage
          .from(LAB_REPORTS_BUCKET)
          .remove([uploadRow.storage_path]);
        if (storageErr) {
          console.warn("[delete lab report] storage removal failed:", storageErr.message);
        }
      }

      // 6. Sync with server to confirm final state
      await refetch();
    },
    [user, refetch],
  );

  return {
    uploads,
    loading,
    refetch,
    uploadLabReport,
    deleteLabReport,
    analyzeUploadedLabReport,
    hasLabReports: uploads.length > 0,
  };
}
