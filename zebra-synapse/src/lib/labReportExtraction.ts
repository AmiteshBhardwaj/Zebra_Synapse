import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { BIOMARKER_DEFINITIONS } from "./biomarkerCatalog";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type LegacyBiomarkerKey =
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
  values: Partial<Record<LegacyBiomarkerKey, number>>;
  biomarkers: Record<string, number>;
  matchedCount: number;
  notes: string;
};

export type ExtractedPdfText = {
  text: string;
  lines: string[];
};

type ExtractionResult =
  | { status: "success"; panel: ExtractedLabPanel }
  | { status: "no_data"; reason: string }
  | { status: "unsupported"; reason: string };

type TextItem = {
  str: string;
  transform: number[];
};

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\r/g, "\n");
}

function normalizeLine(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPageLines(items: readonly unknown[]): string[] {
  const positionedItems = items
    .filter((item): item is TextItem => {
      if (!item || typeof item !== "object") return false;
      if (!("str" in item) || !("transform" in item)) return false;
      const candidate = item as { str?: unknown; transform?: unknown };
      return typeof candidate.str === "string" && Array.isArray(candidate.transform);
    })
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
    }))
    .filter((item) => item.str.length > 0);

  const lines: Array<{ y: number; items: Array<{ str: string; x: number }> }> = [];
  for (const item of positionedItems) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) < 2);
    if (existing) {
      existing.items.push({ str: item.str, x: item.x });
    } else {
      lines.push({ y: item.y, items: [{ str: item.str, x: item.x }] });
    }
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      normalizeLine(
        line.items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str)
          .join(" "),
      ),
    )
    .filter((line) => line.length > 0);
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

function extractValueFromLines(
  lines: string[],
  labels: RegExp[],
  units: string[],
  exclude?: RegExp[],
): number | null {
  const hasUnitConstraint = units.some((unit) => unit.trim().length > 0);
  const unitPattern = units.filter((unit) => unit.trim().length > 0).map(escapeRegex).join("|");
  const valuePattern = hasUnitConstraint
    ? new RegExp(`(\\d+(?:\\.\\d+)?)(?=\\s*(?:${unitPattern})(?:\\s|$))`, "gi")
    : /(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/gi;

  for (const line of lines) {
    if (exclude?.some((pattern) => pattern.test(line))) continue;

    const labelMatch = labels.find((pattern) => pattern.test(line));
    if (!labelMatch) continue;

    const startIndex = line.search(labelMatch);
    const afterLabel = startIndex >= 0 ? line.slice(startIndex) : line;
    const resultMatch = valuePattern.exec(afterLabel);
    valuePattern.lastIndex = 0;

    if (!resultMatch?.[1]) continue;
    const value = Number(resultMatch[1]);
    if (Number.isFinite(value)) return value;
  }

  return null;
}

export async function extractTextFromPdfBlob(file: Blob): Promise<ExtractedPdfText> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;

  let text = "";
  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = buildPageLines(content.items);
    lines.push(...pageLines);
    text += `\n${pageLines.join("\n")}`;
  }

  return {
    text: normalizeText(text),
    lines,
  };
}

export async function extractLabPanelFromPdf(file: File): Promise<ExtractionResult> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return { status: "unsupported", reason: "Only PDF lab reports can be auto-extracted." };
  }

  const { text: normalized, lines } = await extractTextFromPdfBlob(file);
  if (normalized.trim().length < 20) {
    return {
      status: "unsupported",
      reason: "The PDF does not contain readable text. It is probably a scanned image PDF.",
    };
  }

  const biomarkers: Record<string, number> = {};
  for (const definition of BIOMARKER_DEFINITIONS) {
    const extracted =
      extractValueFromLines(lines, definition.patterns, definition.units, definition.exclude) ??
      extractValue(
        normalized,
        definition.patterns.map(
          (pattern) => new RegExp(`${pattern.source}\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)`, pattern.flags),
        ),
      );
    if (extracted != null) {
      biomarkers[definition.key] = extracted;
    }
  }

  const values: Partial<Record<LegacyBiomarkerKey, number>> = {
    hemoglobinA1c: biomarkers.hemoglobin_a1c,
    fastingGlucose: biomarkers.fasting_glucose,
    totalCholesterol: biomarkers.total_cholesterol,
    ldl: biomarkers.ldl,
    hdl: biomarkers.hdl,
    triglycerides: biomarkers.triglycerides,
    hemoglobin: biomarkers.hemoglobin,
    wbc: biomarkers.wbc,
    platelets: biomarkers.platelets,
    creatinine: biomarkers.creatinine,
  };

  const matchedCount = Object.keys(biomarkers).length;
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
      biomarkers,
      matchedCount,
      notes: "Auto-extracted from uploaded PDF. Review values if the source format is unusual.",
    },
  };
}
