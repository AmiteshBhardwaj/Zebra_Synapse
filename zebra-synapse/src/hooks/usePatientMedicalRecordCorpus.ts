import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { type LabReportUploadRow, LAB_REPORTS_BUCKET } from "../lib/labReports";
import { extractTextFromPdfBlob } from "../lib/labReportExtraction";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export type PatientMedicalRecordText = {
  uploadId: string;
  fileName: string;
  text: string;
  charCount: number;
};

function isPdfUpload(upload: LabReportUploadRow): boolean {
  return upload.original_filename.toLowerCase().endsWith(".pdf");
}

export function usePatientMedicalRecordCorpus(uploads: LabReportUploadRow[]) {
  const { user, configured } = useAuth();
  const [records, setRecords] = useState<PatientMedicalRecordText[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const pdfUploads = useMemo(() => uploads.filter(isPdfUpload), [uploads]);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured() || !configured || !user || pdfUploads.length === 0) {
      setRecords([]);
      setFailedCount(0);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const sb = getSupabase();
    if (!sb) {
      setRecords([]);
      setFailedCount(0);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    void (async () => {
      const settled = await Promise.allSettled(
        pdfUploads.map(async (upload) => {
          const { data, error } = await sb.storage.from(LAB_REPORTS_BUCKET).download(upload.storage_path);
          if (error) throw new Error(error.message);

          const extracted = await extractTextFromPdfBlob(data);
          const text = extracted.text.trim();
          if (text.length < 60) return null;

          return {
            uploadId: upload.id,
            fileName: upload.original_filename,
            text,
            charCount: text.length,
          } satisfies PatientMedicalRecordText;
        }),
      );

      if (cancelled) return;

      const nextRecords: PatientMedicalRecordText[] = [];
      let nextFailedCount = 0;

      for (const result of settled) {
        if (result.status === "fulfilled" && result.value) {
          nextRecords.push(result.value);
        } else if (result.status === "rejected") {
          nextFailedCount += 1;
        }
      }

      setRecords(nextRecords);
      setFailedCount(nextFailedCount);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, pdfUploads, user]);

  return {
    records,
    loading,
    failedCount,
    pdfCount: pdfUploads.length,
    analyzedPdfCount: records.length,
  };
}
