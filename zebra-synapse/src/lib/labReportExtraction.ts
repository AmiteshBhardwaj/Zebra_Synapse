import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { BIOMARKER_DEFINITIONS } from "./biomarkerCatalog.ts";

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
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u03bc\u00b5]/g, "μ")
    .replace(/\bT\s+otal\b/g, "Total")
    .replace(/de\s+fi\s+ned/gi, "defined")
    .replace(/a\s+ff\s+ect/gi, "affect")
    .replace(/Re\s+fl\s+ects/gi, "Reflects")
    .replace(/signi\s+fi\s+cant/gi, "significant")
    .replace(/clari\s+fi\s+cations/gi, "clarifications")
    .replace(/recti\s+fi\s+cations/gi, "rectifications")
    .replace(/fl\s+uctuations/gi, "fluctuations")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "\n");
}

function normalizeLine(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u03bc\u00b5]/g, "μ")
    .replace(/\bT\s+otal\b/g, "Total")
    .replace(/de\s+fi\s+ned/gi, "defined")
    .replace(/a\s+ff\s+ect/gi, "affect")
    .replace(/Re\s+fl\s+ects/gi, "Reflects")
    .replace(/signi\s+fi\s+cant/gi, "significant")
    .replace(/clari\s+fi\s+cations/gi, "clarifications")
    .replace(/recti\s+fi\s+cations/gi, "rectifications")
    .replace(/fl\s+uctuations/gi, "fluctuations")
    .replace(/[ \t]+/g, " ")
    .trim();
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
    const existing = lines.find((line) => Math.abs(line.y - item.y) < 4);
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

  const alphaMonth = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})/);
  if (alphaMonth) {
    const day = Number(alphaMonth[1]);
    const monthStr = alphaMonth[2].toLowerCase();
    const yearStr = alphaMonth[3];
    const year = Number(yearStr.length === 2 ? `20${yearStr}` : yearStr);
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    if (monthStr in months) {
      const parsed = new Date(Date.UTC(year, months[monthStr], day));
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    }
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
    /(?:collected\s+on|collection\s+date|specimen\s+date|reported\s+on|report\s+date|registration\s+on|date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i,
    /(?:collected\s+on|collection\s+date|specimen\s+date|reported\s+on|report\s+date|registration\s+on|date)\s*[:\-]?\s*(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4})/i,
    /(?:collected\s+on|collection\s+date|specimen\s+date|reported\s+on|report\s+date|registration\s+on|date)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const iso = match?.[1] ? toIsoDate(match[1]) : null;
    if (iso) return iso;
  }

  return new Date().toISOString().slice(0, 10);
}

const BIOMARKER_SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
  hemoglobin_a1c: { min: 3.0, max: 20.0 },
  fasting_glucose: { min: 20.0, max: 800.0 },
  total_cholesterol: { min: 40.0, max: 800.0 },
  ldl: { min: 10.0, max: 600.0 },
  hdl: { min: 10.0, max: 200.0 },
  triglycerides: { min: 20.0, max: 2000.0 },
  vldl: { min: 1.0, max: 300.0 },
  hemoglobin: { min: 3.0, max: 25.0 },
  wbc: { min: 200.0, max: 100000.0 },
  platelets: { min: 10000.0, max: 1500000.0 },
  creatinine: { min: 0.1, max: 25.0 },
  rbc_count: { min: 1.0, max: 10.0 },
  hematocrit: { min: 10.0, max: 75.0 },
  mcv: { min: 40.0, max: 140.0 },
  mch: { min: 10.0, max: 60.0 },
  mchc: { min: 20.0, max: 50.0 },
  rdw_cv: { min: 5.0, max: 40.0 },
  esr: { min: 0.0, max: 200.0 },
  tsh: { min: 0.01, max: 150.0 },
  t3: { min: 0.1, max: 30.0 },
  t4: { min: 0.1, max: 50.0 },
  iron: { min: 5.0, max: 1000.0 },
  tibc: { min: 50.0, max: 1500.0 },
  transferrin_saturation: { min: 1.0, max: 100.0 },
  vitamin_d_25_oh: { min: 2.0, max: 300.0 },
  vitamin_b12: { min: 20.0, max: 5000.0 },
  urea: { min: 2.0, max: 300.0 },
  blood_urea_nitrogen: { min: 1.0, max: 150.0 },
  uric_acid: { min: 0.5, max: 30.0 },
  calcium: { min: 2.0, max: 25.0 },
  sgpt: { min: 1.0, max: 2000.0 },
  sgot: { min: 1.0, max: 2000.0 },
  total_bilirubin: { min: 0.05, max: 40.0 },
  conjugated_bilirubin: { min: 0.0, max: 30.0 },
  unconjugated_bilirubin: { min: 0.0, max: 30.0 },
  sodium: { min: 80.0, max: 200.0 },
  potassium: { min: 1.0, max: 15.0 },
  chloride: { min: 50.0, max: 180.0 },
  total_protein: { min: 2.0, max: 15.0 },
  albumin: { min: 1.0, max: 10.0 },
  globulin: { min: 0.5, max: 10.0 },
  ag_ratio: { min: 0.1, max: 10.0 },
  neutrophils_percent: { min: 0.0, max: 100.0 },
  lymphocytes_percent: { min: 0.0, max: 100.0 },
  eosinophils_percent: { min: 0.0, max: 100.0 },
  monocytes_percent: { min: 0.0, max: 100.0 },
  basophils_percent: { min: 0.0, max: 100.0 },
};

function isExemptNoteOrGuidelineLine(line: string): boolean {
  return /^(?:note|remarks|clinical\s+notes|interpretation|factors\s+that|presence\s+of|target\s+goals|sample\s+report|scan\s+to\s+validate|analyzer|technology|accession\s+no|collected\s+on|received\s+on|approved\s+on|patient\s+name|page\s+\d+\s+of\s+\d+|observation\s+result)/i.test(line) ||
    /(?:deficiency\s+is\s+defined|insufficiency\s+has\s+been\s+defined|sufficiency\s+has\s+been\s+defined|toxicity\s+is\s+observed|interpretation\s+as\s+per)/i.test(line) ||
    /(?:reference\s+group|non\s+diabetic\s+adults|at\s+risk\s+\(prediabetes\)|diagnosing\s+diabetes|therapeutic\s+goals)/i.test(line);
}

function sanitizeLineText(text: string): string {
  return text
    .replace(/\(\s*<?\s*>?\s*=?\s*\d+(?:\.\d+)?\s*(?:[\-\–\—~|to]\s*\d+(?:\.\d+)?)?\s*%?\s*\)/gi, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:[\-\–\—~]|to)\s*\d+(?:\.\d+)?\b/gi, " ")
    .replace(/(?:<|<=|>|>=)\s*\d+(?:\.\d+)?/g, " ")
    .replace(/(?:ref|reference|normal|range|interval|desirable|optimal|borderline)\s*[:\-]?\s*[\d\.\s\-\<\>\=]+/gi, " ");
}

function scaleBiomarkerValue(biomarkerKey: string, val: number, lineText: string): number {
  if (biomarkerKey === "platelets") {
    const isLakhs = /lakh/i.test(lineText) || val < 20;
    const isThousands = /10\^?3|thousand|k\/ul/i.test(lineText) || (val >= 50 && val <= 1000);
    if (isLakhs) return Math.round(val * 100000);
    if (isThousands) return Math.round(val * 1000);
  }

  if (biomarkerKey === "wbc") {
    const isThousands = /10\^?3|thousand|k\/ul/i.test(lineText) || (val >= 1.0 && val <= 30.0);
    if (isThousands) return Math.round(val * 1000);
  }

  return val;
}

function extractValueFromLines(
  lines: string[],
  labels: RegExp[],
  units: string[],
  biomarkerKey: string,
  exclude?: RegExp[],
): number | null {
  const bounds = BIOMARKER_SANITY_BOUNDS[biomarkerKey];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isExemptNoteOrGuidelineLine(line)) continue;
    if (exclude?.some((pattern) => pattern.test(line))) continue;

    const labelMatch = labels.find((pattern) => pattern.test(line));
    if (!labelMatch) continue;

    // Multi-line card check (e.g. Dr Lal PathLabs with "Value : X" on subsequent line)
    const windowLines = lines.slice(i, i + 3);
    const combinedWindow = windowLines.join(" ");
    const cardMatch = combinedWindow.match(/Value\s*:\s*(?:>|<|=)?\s*(\d+(?:\.\d+)?)/i);
    if (cardMatch?.[1]) {
      let val = Number(cardMatch[1]);
      if (Number.isFinite(val)) {
        val = scaleBiomarkerValue(biomarkerKey, val, combinedWindow);
        if (!bounds || (val >= bounds.min && val <= bounds.max)) {
          return val;
        }
      }
    }

    const matchExec = labelMatch.exec(line);
    if (!matchExec) continue;
    const startIndex = matchExec.index;
    const afterLabel = line.slice(startIndex + matchExec[0].length).trim();

    // 1. Structured Tabular Result Extraction
    // In table: [Label] [Result] [Unit] [Ref Range] [Method]
    // Example: "HbA1C 5.7 % 4.8-5.7 HPLC" -> afterLabel is "5.7 % 4.8-5.7 HPLC"
    // Example: "Iron 129 μg/dL 49-181 Pyridylazo Dye" -> afterLabel is "129 μg/dL 49-181 Pyridylazo Dye"
    // Example: "ESR 9 mm/hr <20 Modified Westergren" -> afterLabel is "9 mm/hr <20 Modified Westergren"
    const cleaned = sanitizeLineText(afterLabel);

    // Try matching first numeric token in cleaned text
    const firstNumMatch = cleaned.match(/^(?:[:\-]|is)?\s*(?:>|<|=)?\s*(\d+(?:\.\d+)?)/i) ||
      cleaned.match(/(?:>|<|=)?\s*(\d+(?:\.\d+)?)/);

    if (firstNumMatch?.[1]) {
      let val = Number(firstNumMatch[1]);
      if (Number.isFinite(val)) {
        val = scaleBiomarkerValue(biomarkerKey, val, line);
        if (!bounds || (val >= bounds.min && val <= bounds.max)) {
          return val;
        }
      }
    }

    // 2. Unit-constrained match fallback
    const hasUnitConstraint = units.some((unit) => unit.trim().length > 0);
    if (hasUnitConstraint) {
      const unitPatternStr = units
        .filter((u) => u.trim().length > 0)
        .map(escapeRegex)
        .join("|");
      const unitRegex = new RegExp(
        `(?:>|<|=)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${unitPatternStr})`,
        "i",
      );
      const matchWithUnit = cleaned.match(unitRegex);
      if (matchWithUnit?.[1]) {
        let val = Number(matchWithUnit[1]);
        if (Number.isFinite(val)) {
          val = scaleBiomarkerValue(biomarkerKey, val, line);
          if (!bounds || (val >= bounds.min && val <= bounds.max)) {
            return val;
          }
        }
      }
    }
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

/**
 * Render all pages of a PDF to high-resolution JPEG images for multimodal OCR/Vision.
 */
export async function renderPdfPagesToImages(
  file: Blob,
  options?: { maxPages?: number; scale?: number },
): Promise<Array<{ pageNumber: number; base64Data: string; mimeType: string }>> {
  if (typeof document === "undefined") {
    return [];
  }

  const maxPages = options?.maxPages ?? 25;
  const scale = options?.scale ?? 1.5; // 1.5x scale yields ~150 DPI for crisp handwriting/table OCR
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pagesCount = Math.min(pdf.numPages, maxPages);
  const images: Array<{ pageNumber: number; base64Data: string; mimeType: string }> = [];

  for (let pageNum = 1; pageNum <= pagesCount; pageNum += 1) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const canvasContext = canvas.getContext("2d", { willReadFrequently: false });
      if (!canvasContext) continue;

      await page.render({ canvasContext, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      images.push({ pageNumber: pageNum, base64Data, mimeType: "image/jpeg" });
    } catch (renderErr) {
      console.warn(`[pdf page ${pageNum} render failed]`, renderErr);
    }
  }

  return images;
}

/**
 * Convert a standard image file/blob (PNG, JPG, WebP) directly to base64 for Gemini Vision.
 */
export async function convertImageBlobToBase64(
  file: Blob,
): Promise<{ base64Data: string; mimeType: string }> {
  const mimeType = file.type || "image/jpeg";
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);
  return { base64Data, mimeType };
}

/**
 * Perform Multimodal Vision Extraction with Gemini on batches of page images.
 */
async function extractBiomarkersFromImagesWithGemini(
  images: Array<{ base64Data: string; mimeType: string }>,
  geminiApiKey: string,
): Promise<{
  recordedAt: string | null;
  biomarkers: Record<string, number>;
  confidenceNotes: string;
}> {
  const supportedBiomarkersList = BIOMARKER_DEFINITIONS.map(
    (d) => `• "${d.key}": ${d.label} (Standard units: ${d.units.join(", ")})`,
  ).join("\n");

  const prompt = `
You are an expert clinical laboratory data extraction AI.
Analyze the attached medical laboratory report image(s). The document may be:
1. A computerized lab test report table.
2. A scanned document (DocScanner/CamScanner).
3. A smartphone camera photo of a physical report.
4. A doctor handwritten prescription / handwritten lab test register.

### Supported Biomarker Keys:
${supportedBiomarkersList}

### CRITICAL CLINICAL EXTRACTION RULES:
1. **Patient Result vs Reference Range**:
   - Only extract the patient's **actual observed result value**.
   - NEVER extract the biological reference interval / normal range limits (e.g., if the line says "Fasting Glucose: 112 mg/dL | Normal: 70 - 100", extract 112, NOT 70 or 100).
2. **Handwriting & Scans**:
   - Read cursive doctor handwriting, handwritten numbers, tick marks, rubber stamp values, and low-contrast scanned text carefully.
   - If a number has a decimal point (e.g., "1.1" vs "11" for Serum Creatinine), ensure correct decimal interpretation based on standard clinical ranges.
3. **Unit Normalization**:
   - If glucose is in mmol/L, convert to mg/dL (multiply by 18).
   - If creatinine is in µmol/L, convert to mg/dL (divide by 88.4).
   - If cholesterol is in mmol/L, convert to mg/dL (multiply by 38.67).
   - Output all values in standard numerical units.
4. **Collection Date**:
   - Extract the specimen collection date or report date in "YYYY-MM-DD" format. If multiple dates appear, prioritize the collection/specimen date. If not found, return null.

Return your response in this EXACT JSON structure:
{
  "recorded_at": "YYYY-MM-DD or null",
  "biomarkers": {
    "key_name": 12.34
  },
  "confidence_notes": "Brief explanation of extraction source, e.g. 'Extracted 6 tests from printed table' or 'Deciphered 3 handwritten biomarker entries'"
}
`.trim();

  const aggregatedBiomarkers: Record<string, number> = {};
  let detectedDate: string | null = null;
  const notesAccumulator: string[] = [];

  // Batch images in groups of 4 to avoid exceeding HTTP payload limits while keeping extraction parallelized
  const BATCH_SIZE = 4;
  const chunks: Array<Array<{ base64Data: string; mimeType: string }>> = [];
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    chunks.push(images.slice(i, i + BATCH_SIZE));
  }

  for (const chunk of chunks) {
    try {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: prompt },
      ];

      for (const img of chunk) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64Data,
          },
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        },
      );

      if (!res.ok) {
        // Fallback to gemini-1.5-flash if 2.5 is unavailable
        const fallbackRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          },
        );

        if (!fallbackRes.ok) {
          console.warn("[gemini vision call failed]", await fallbackRes.text());
          continue;
        }

        const fallbackData = await fallbackRes.json();
        const textContent =
          fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (textContent) {
          parseAndAccumulateVisionJson(textContent);
        }
        continue;
      }

      const data = await res.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (textContent) {
        parseAndAccumulateVisionJson(textContent);
      }
    } catch (chunkErr) {
      console.warn("[gemini vision chunk error]", chunkErr);
    }
  }

  function parseAndAccumulateVisionJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed?.recorded_at && !detectedDate) {
        const iso = toIsoDate(String(parsed.recorded_at));
        if (iso) detectedDate = iso;
      }
      if (parsed?.confidence_notes && typeof parsed.confidence_notes === "string") {
        notesAccumulator.push(parsed.confidence_notes);
      }
      if (parsed?.biomarkers && typeof parsed.biomarkers === "object") {
        for (const [key, rawVal] of Object.entries(parsed.biomarkers)) {
          const num = typeof rawVal === "number" ? rawVal : Number(rawVal);
          if (Number.isFinite(num) && num > 0) {
            const bounds = BIOMARKER_SANITY_BOUNDS[key];
            if (!bounds || (num >= bounds.min && num <= bounds.max)) {
              if (aggregatedBiomarkers[key] == null) {
                aggregatedBiomarkers[key] = num;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[json parse error in vision output]", e);
    }
  }

  return {
    recordedAt: detectedDate,
    biomarkers: aggregatedBiomarkers,
    confidenceNotes: notesAccumulator.join("; ") || "Extracted via Gemini Multimodal Vision",
  };
}

/**
 * Universal Extraction: Handles Digital PDFs, Scanned PDFs, Mobile Scans, Direct Photos, and Handwritten Reports.
 */
export async function extractLabPanelFromPdf(
  file: File | Blob,
  filename?: string,
): Promise<ExtractionResult> {
  const name = filename || (file instanceof File ? file.name : "report.pdf");
  const lowerName = name.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
  const isImage =
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp") ||
    (file.type && file.type.startsWith("image/"));

  if (!isPdf && !isImage) {
    return {
      status: "unsupported",
      reason: "Only PDF, JPG, PNG, and WebP lab reports are supported.",
    };
  }

  const geminiApiKey = (
    (typeof import.meta !== "undefined" && (
      (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
      (import.meta as any)?.env?.GEMINI_API_KEY
    )) ||
    ((globalThis as any)?.process?.env?.VITE_GEMINI_API_KEY) ||
    ((globalThis as any)?.process?.env?.GEMINI_API_KEY) ||
    ""
  ).trim();

  let normalizedText = "";
  let lines: string[] = [];
  const biomarkers: Record<string, number> = {};
  let detectedDate: string | null = null;

  // TIER 1: Digital PDF Vector Text Extraction
  if (isPdf) {
    try {
      const extracted = await extractTextFromPdfBlob(file);
      normalizedText = extracted.text;
      lines = extracted.lines;

      if (lines.length > 0) {
        for (const definition of BIOMARKER_DEFINITIONS) {
          const extractedVal = extractValueFromLines(
            lines,
            definition.patterns,
            definition.units,
            definition.key,
            definition.exclude,
          );

          if (extractedVal != null) {
            const bounds = BIOMARKER_SANITY_BOUNDS[definition.key];
            if (!bounds || (extractedVal >= bounds.min && extractedVal <= bounds.max)) {
              biomarkers[definition.key] = extractedVal;
            }
          }
        }
        detectedDate = extractRecordedAt(normalizedText);
      }
    } catch (err) {
      console.warn("[pdf digital text extract warning]", err);
    }
  }

  // TIER 2: If digital text found sufficient biomarkers, return success immediately
  if (Object.keys(biomarkers).length >= 2) {
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

    return {
      status: "success",
      panel: {
        recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
        values,
        biomarkers,
        matchedCount: Object.keys(biomarkers).length,
        notes: "Auto-extracted from digital lab report text.",
      },
    };
  }

  // TIER 3: Scanned PDF, DocScanner, Photo, or Handwritten Report -> Multimodal Vision
  if (!geminiApiKey) {
    // If we extracted at least 1 biomarker from text, return it
    if (Object.keys(biomarkers).length > 0) {
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

      return {
        status: "success",
        panel: {
          recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
          values,
          biomarkers,
          matchedCount: Object.keys(biomarkers).length,
          notes: "Extracted partial biomarkers from digital text. Add VITE_GEMINI_API_KEY for full scanned report recognition.",
        },
      };
    }

    return {
      status: "no_data",
      reason:
        "No digital text layer found (scanned/photographed document). Configure VITE_GEMINI_API_KEY in your settings to enable AI Vision & Handwriting OCR, or use digital reports.",
    };
  }

  // Collect images for Vision analysis
  let pageImages: Array<{ base64Data: string; mimeType: string }> = [];

  if (isPdf) {
    pageImages = await renderPdfPagesToImages(file, { scale: 1.5, maxPages: 25 });
  } else if (isImage) {
    const directImage = await convertImageBlobToBase64(file);
    pageImages = [directImage];
  }

  if (pageImages.length === 0) {
    return {
      status: "no_data",
      reason: "Could not render document pages for image analysis.",
    };
  }

  // Execute Gemini Multimodal Vision
  const visionResult = await extractBiomarkersFromImagesWithGemini(pageImages, geminiApiKey);

  // Merge any vision biomarkers with regex biomarkers
  for (const [k, v] of Object.entries(visionResult.biomarkers)) {
    if (biomarkers[k] == null) {
      biomarkers[k] = v;
    }
  }

  if (!detectedDate && visionResult.recordedAt) {
    detectedDate = visionResult.recordedAt;
  }

  const matchedCount = Object.keys(biomarkers).length;
  if (matchedCount === 0) {
    return {
      status: "no_data",
      reason:
        "No supported biomarkers could be identified in this document. Verify the image clarity or enter values manually.",
    };
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

  return {
    status: "success",
    panel: {
      recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
      values,
      biomarkers,
      matchedCount,
      notes: visionResult.confidenceNotes || "Auto-extracted via Multimodal Vision (Scanned / Handwritten).",
    },
  };
}
