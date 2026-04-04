import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type BiomarkerKey =
  | "hemoglobinA1c"
  | "fastingGlucose"
  | "totalCholesterol"
  | "ldl"
  | "hdl"
  | "triglycerides"
  | "hemoglobin"
  | "wbc"
  | "platelets"
  | "creatinine";

export type ExtractedLabPanel = {
  recordedAt: string;
  values: Partial<Record<BiomarkerKey, number>>;
  matchedCount: number;
  notes: string;
};

type ExtractionResult =
  | { status: "success"; panel: ExtractedLabPanel }
  | { status: "no_data"; reason: string }
  | { status: "unsupported"; reason: string };

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\r/g, "\n");
}

function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!slash) return null;
  const month = Number(slash[1]);
  const day = Number(slash[2]);
  const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
  if (!month || !day || !year) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function extractRecordedAt(text: string): string {
  const patterns = [
    /(?:collected|collection date|specimen date|reported|report date|date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i,
    /(?:collected|collection date|specimen date|reported|report date|date)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const iso = match?.[1] ? toIsoDate(match[1]) : null;
    if (iso) return iso;
  }

  return new Date().toISOString().slice(0, 10);
}

function extractValue(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function countMatches(values: Partial<Record<BiomarkerKey, number>>): number {
  return Object.values(values).filter((value) => value != null).length;
}

export async function extractLabPanelFromPdf(file: File): Promise<ExtractionResult> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return { status: "unsupported", reason: "Only PDF lab reports can be auto-extracted." };
  }

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;

  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    text += `\n${pageText}`;
  }

  const normalized = normalizeText(text);
  if (normalized.trim().length < 20) {
    return {
      status: "unsupported",
      reason: "The PDF does not contain readable text. It is probably a scanned image PDF.",
    };
  }

  const values: Partial<Record<BiomarkerKey, number>> = {
    hemoglobinA1c: extractValue(normalized, [
      /(?:hemoglobin\s*a1c|hba1c|glycated\s+hemoglobin)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    fastingGlucose: extractValue(normalized, [
      /(?:fasting\s+glucose|glucose,\s*fasting|fasting\s+blood\s+glucose)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /(?:glucose)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dL)?/i,
    ]),
    totalCholesterol: extractValue(normalized, [
      /(?:total\s+cholesterol|cholesterol,\s*total)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    ldl: extractValue(normalized, [
      /(?:ldl(?:\s+cholesterol)?|ldl-c)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    hdl: extractValue(normalized, [
      /(?:hdl(?:\s+cholesterol)?|hdl-c)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    triglycerides: extractValue(normalized, [
      /(?:triglycerides?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    hemoglobin: extractValue(normalized, [
      /(?:hemoglobin|hgb)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    wbc: extractValue(normalized, [
      /(?:white\s+blood\s+cell(?:\s+count)?|wbc)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    platelets: extractValue(normalized, [
      /(?:platelet(?:s|\s+count)?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
    creatinine: extractValue(normalized, [
      /(?:creatinine)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ]),
  };

  const matchedCount = countMatches(values);
  if (matchedCount === 0) {
    return {
      status: "no_data",
      reason: "No supported biomarkers were found in the PDF text.",
    };
  }

  return {
    status: "success",
    panel: {
      recordedAt: extractRecordedAt(normalized),
      values,
      matchedCount,
      notes: "Auto-extracted from uploaded PDF. Review values if the source format is unusual.",
    },
  };
}
