import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { type LabReportUploadRow, LAB_REPORTS_BUCKET } from "../lib/labReports";
import { extractTextFromPdfBlob } from "../lib/labReportExtraction";
import {
  buildMedicalRecordCorpusInsert,
  mapMedicalRecordCorpusRow,
  MEDICAL_RECORD_CORPUS_SELECT,
  type MedicalRecordCorpusRow,
  type MedicalRecordText,
} from "../lib/medicalRecordCorpus";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

function isPdfUpload(upload: LabReportUploadRow): boolean {
  return upload.original_filename.toLowerCase().endsWith(".pdf");
}

function isMissingMedicalRecordCorpusError(message: string | undefined): boolean {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("medical_record_corpus");
}

export function usePatientMedicalRecordCorpus(uploads: LabReportUploadRow[]) {
  const { user, configured } = useAuth();
  const [records, setRecords] = useState<MedicalRecordText[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const pdfUploads = useMemo(() => uploads.filter(isPdfUpload), [uploads]);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured() || !configured || !user) {
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
      const { data, error } = await sb
        .from("medical_record_corpus")
        .select(MEDICAL_RECORD_CORPUS_SELECT)
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        if (!isMissingMedicalRecordCorpusError(error.message)) {
          console.error("[medical record corpus]", error.message);
        }
        setRecords([]);
        setFailedCount(0);
        setLoading(false);
        return;
      }

      const persistedRows = ((data ?? []) as unknown) as MedicalRecordCorpusRow[];
      const persistedByUploadId = new Map(persistedRows.map((row) => [row.upload_id, row]));
      const missingUploads = pdfUploads.filter((upload) => !persistedByUploadId.has(upload.id));

      const settled = await Promise.allSettled(
        missingUploads.map(async (upload) => {
          const { data, error } = await sb.storage.from(LAB_REPORTS_BUCKET).download(upload.storage_path);
          if (error) throw new Error(error.message);

          const extracted = await extractTextFromPdfBlob(data);
          const text = extracted.text.trim();
          if (text.length < 60) return null;

          const insertPayload = buildMedicalRecordCorpusInsert({
            patientId: user.id,
            uploadId: upload.id,
            fileName: upload.original_filename,
            text,
          });

          const { data: inserted, error: insertError } = await sb
            .from("medical_record_corpus")
            .upsert(insertPayload, { onConflict: "upload_id" })
            .select(MEDICAL_RECORD_CORPUS_SELECT)
            .single();

          if (insertError) {
            if (isMissingMedicalRecordCorpusError(insertError.message)) {
              return null;
            }
            throw new Error(insertError.message);
          }

          return mapMedicalRecordCorpusRow((inserted as unknown) as MedicalRecordCorpusRow);
        }),
      );

      if (cancelled) return;

      const nextRecords: MedicalRecordText[] = persistedRows.map(mapMedicalRecordCorpusRow);
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
