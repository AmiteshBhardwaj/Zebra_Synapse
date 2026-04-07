export type MedicalRecordText = {
  id?: string;
  patientId?: string;
  uploadId: string;
  fileName: string;
  text: string;
  charCount: number;
  createdAt?: string;
};

export type MedicalRecordCorpusRow = {
  id: string;
  patient_id: string;
  upload_id: string;
  file_name: string;
  text: string;
  char_count: number;
  created_at: string;
};

export const MEDICAL_RECORD_CORPUS_SELECT = `
  id,
  patient_id,
  upload_id,
  file_name,
  text,
  char_count,
  created_at
`.trim();

export function sanitizeMedicalRecordText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export function buildMedicalRecordCorpusInsert(args: {
  patientId: string;
  uploadId: string;
  fileName: string;
  text: string;
}) {
  const sanitizedText = sanitizeMedicalRecordText(args.text);

  return {
    patient_id: args.patientId,
    upload_id: args.uploadId,
    file_name: args.fileName.trim().slice(0, 180),
    text: sanitizedText,
    char_count: sanitizedText.length,
  };
}

export function mapMedicalRecordCorpusRow(row: MedicalRecordCorpusRow): MedicalRecordText {
  return {
    id: row.id,
    patientId: row.patient_id,
    uploadId: row.upload_id,
    fileName: row.file_name,
    text: row.text,
    charCount: row.char_count,
    createdAt: row.created_at,
  };
}
