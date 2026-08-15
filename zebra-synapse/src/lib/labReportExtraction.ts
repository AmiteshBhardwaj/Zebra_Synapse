import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getGeminiApiKey, getGeminiModels } from "./geminiKey";
import { BIOMARKER_DEFINITIONS } from "./biomarkerCatalog";
import { extractTextFromImagesWithOcr } from "./ocrService";

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
  extractionSource?: "digital" | "gemini_vision" | "local_ocr";
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

  lines.sort((a, b) => b.y - a.y);
  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);
    return normalizeLine(line.items.map((item) => item.str).join(" "));
  });
}

function toIsoDate(dateStr: string): string | null {
  const clean = dateStr.trim().replace(/^[^\d]+/, "");
  
  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // DD-MMM-YYYY (e.g. 15-Aug-2026, 15/Aug/2026, 15 Aug 2026)
  const textMonthMatch = clean.match(/^(\d{1,2})[-/.\s]+([a-zA-Z]{3,9})[-/.\s]+(\d{2,4})/);
  if (textMonthMatch) {
    const d = parseInt(textMonthMatch[1], 10);
    const mStr = textMonthMatch[2].toLowerCase().slice(0, 3);
    let y = parseInt(textMonthMatch[3], 10);
    if (y < 100) y += 2000;

    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const m = months[mStr];
    if (m && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10);
    let y = parseInt(ddmmyyyy[3], 10);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return null;
}

export function extractRecordedAt(rawText: string): string | null {
  const patterns = [
    /(?:collected\s*(?:on|date|time)?|specimen\s*date|sample\s*collected|draw\s*date|collection\s*date|registered\s*on|dated|date)[\s:\-]*([0-9]{1,4}[-/.\s][A-Za-z0-9]{2,9}[-/.\s][0-9]{2,4})/i,
    /([0-9]{1,2}[-/][A-Za-z]{3}[-/][0-9]{2,4})/i,
    /([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/,
  ];

  for (const pat of patterns) {
    const match = rawText.match(pat);
    if (match?.[1]) {
      const parsed = toIsoDate(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

export const BIOMARKER_SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
  hemoglobin_a1c: { min: 3.0, max: 20.0 },
  fasting_glucose: { min: 20.0, max: 800.0 },
  postprandial_glucose: { min: 20.0, max: 800.0 },
  random_glucose: { min: 20.0, max: 800.0 },
  total_cholesterol: { min: 40.0, max: 800.0 },
  ldl: { min: 10.0, max: 600.0 },
  hdl: { min: 5.0, max: 200.0 },
  triglycerides: { min: 20.0, max: 2500.0 },
  vldl: { min: 2.0, max: 300.0 },
  non_hdl_cholesterol: { min: 20.0, max: 700.0 },
  total_cholesterol_to_hdl_ratio: { min: 0.5, max: 30.0 },
  fasting_insulin: { min: 0.1, max: 500.0 },
  homa_ir: { min: 0.1, max: 50.0 },
  hemoglobin: { min: 2.0, max: 26.0 },
  wbc: { min: 500.0, max: 100000.0 },
  platelets: { min: 10000.0, max: 1500000.0 },
  rbc: { min: 1.0, max: 10.0 },
  hematocrit: { min: 10.0, max: 75.0 },
  mcv: { min: 40.0, max: 140.0 },
  mch: { min: 10.0, max: 50.0 },
  mchc: { min: 15.0, max: 50.0 },
  rdw: { min: 5.0, max: 40.0 },
  creatinine: { min: 0.1, max: 25.0 },
  blood_urea_nitrogen: { min: 1.0, max: 250.0 },
  bun_to_creatinine_ratio: { min: 1.0, max: 100.0 },
  egfr: { min: 1.0, max: 200.0 },
  uric_acid: { min: 0.5, max: 25.0 },
  tsh: { min: 0.005, max: 150.0 },
  free_t3: { min: 0.1, max: 30.0 },
  free_t4: { min: 0.05, max: 15.0 },
  total_t3: { min: 10.0, max: 800.0 },
  total_t4: { min: 0.5, max: 30.0 },
  crp: { min: 0.01, max: 500.0 },
  high_sensitivity_crp: { min: 0.01, max: 100.0 },
  esr: { min: 0.0, max: 200.0 },
  ferritin: { min: 1.0, max: 10000.0 },
  serum_iron: { min: 5.0, max: 600.0 },
  tibc: { min: 50.0, max: 1000.0 },
  transferrin_saturation: { min: 1.0, max: 100.0 },
  vitamin_d: { min: 2.0, max: 250.0 },
  vitamin_b12: { min: 20.0, max: 5000.0 },
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
  return (
    /^(?:note|remarks|clinical\s+notes|interpretation|factors\s+that|presence\s+of|target\s+goals|sample\s+report|scan\s+to\s+validate|analyzer|technology|accession\s+no|collected\s+on|received\s+on|approved\s+on|patient\s+name|page\s+\d+\s+of\s+\d+|observation\s+result)/i.test(
      line
    ) ||
    /(?:deficiency\s+is\s+defined|insufficiency\s+has\s+been\s+defined|sufficiency\s+has\s+been\s+defined|toxicity\s+is\s+observed|interpretation\s+as\s+per)/i.test(
      line
    ) ||
    /(?:reference\s+group|non\s+diabetic\s+adults|at\s+risk\s+\(prediabetes\)|diagnosing\s+diabetes|therapeutic\s+goals)/i.test(
      line
    )
  );
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
  exclude?: RegExp[]
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

    const cleaned = sanitizeLineText(afterLabel);

    // Try matching first numeric token in cleaned text
    const firstNumMatch =
      cleaned.match(/^(?:[:\-]|is)?\s*(?:>|<|=)?\s*(\d+(?:\.\d+)?)/i) ||
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
        "i"
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

/**
 * Shared extraction core across digital PDF text and OCR lines.
 */
function extractBiomarkersFromLineList(
  lines: string[],
  rawText: string
): { biomarkers: Record<string, number>; detectedDate: string | null } {
  const biomarkers: Record<string, number> = {};

  for (const definition of BIOMARKER_DEFINITIONS) {
    const extractedVal = extractValueFromLines(
      lines,
      definition.patterns,
      definition.units,
      definition.key,
      definition.exclude
    );

    if (extractedVal != null) {
      const bounds = BIOMARKER_SANITY_BOUNDS[definition.key];
      if (!bounds || (extractedVal >= bounds.min && extractedVal <= bounds.max)) {
        biomarkers[definition.key] = extractedVal;
      }
    }
  }

  const detectedDate = extractRecordedAt(rawText);
  return { biomarkers, detectedDate };
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
 * Render PDF pages to high-resolution JPEG image blobs / base64 strings for Gemini Vision and OCR.
 */
export async function renderPdfPagesToImages(
  file: Blob,
  options: { scale?: number; maxPages?: number } = {}
): Promise<Array<{ base64Data: string; mimeType: string }>> {
  const scale = options.scale || 1.5;
  const maxPages = options.maxPages || 20;

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);

  const images: Array<{ base64Data: string; mimeType: string }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as unknown as (params: unknown) => { promise: Promise<void> })({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64Data = dataUrl.split(",")[1];
    images.push({ base64Data, mimeType: "image/jpeg" });
  }

  return images;
}

export async function convertImageBlobToBase64(
  file: Blob
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
 * Handles active 3.x models and multiple API endpoint variants.
 */
async function extractBiomarkersFromImagesWithGemini(
  images: Array<{ base64Data: string; mimeType: string }>,
  geminiApiKey: string
): Promise<{
  recordedAt: string | null;
  biomarkers: Record<string, number>;
  confidenceNotes: string;
  lastError: string | null;
}> {
  const supportedBiomarkersList = BIOMARKER_DEFINITIONS.map(
    (d) => `• "${d.key}": ${d.label} (Standard units: ${d.units.join(", ")})`
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
   - NEVER extract the biological reference interval / normal range limits.
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

  const BATCH_SIZE = 4;
  const chunks: Array<Array<{ base64Data: string; mimeType: string }>> = [];
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    chunks.push(images.slice(i, i + BATCH_SIZE));
  }

  let lastApiError: string | null = null;

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

      const visionModels = getGeminiModels();
      let success = false;

      for (const model of visionModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
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
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`[gemini vision ${model} failed]:`, errText);
            try {
              const parsedErr = JSON.parse(errText);
              if (parsedErr?.error?.message) {
                lastApiError = `[${model}] ${parsedErr.error.message}`;
              }
            } catch {
              lastApiError = `[${model}] HTTP ${res.status}: ${res.statusText}`;
            }
            continue;
          }

          const data = await res.json();
          // Support standard generateContent candidate response or Interactions API typed responses
          const textContent =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            data?.interaction?.steps?.[0]?.output?.text?.trim() ||
            "";

          if (textContent) {
            parseAndAccumulateVisionJson(textContent);
            success = true;
            break;
          }
        } catch (mErr) {
          console.warn(`[gemini vision ${model} error]:`, mErr);
          lastApiError = mErr instanceof Error ? mErr.message : String(mErr);
        }
      }

      if (!success) {
        console.warn("[all gemini vision models failed for this image chunk]");
      }
    } catch (chunkErr) {
      console.warn("[gemini vision chunk error]", chunkErr);
    }
  }

  function parseAndAccumulateVisionJson(jsonStr: string) {
    try {
      // Remove any markdown codeblocks if wrapped
      const cleanJson = jsonStr.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(cleanJson);
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
    lastError: lastApiError,
  };
}

function buildLegacyValues(biomarkers: Record<string, number>): Partial<Record<LegacyBiomarkerKey, number>> {
  return {
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
}

/**
 * Universal Foolproof Extraction:
 * Tier 1: Digital PDF Vector Text Layer Extraction
 * Tier 2: Gemini Multimodal Vision (3.x models)
 * Tier 3: In-Browser Local OCR Fallback (Tesseract.js)
 */
export async function extractLabPanelFromPdf(
  file: File | Blob,
  filename?: string,
  onProgress?: (progress: number, step: string) => void
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

  onProgress?.(10, "Checking digital report text...");

  const geminiApiKey = getGeminiApiKey();
  const biomarkers: Record<string, number> = {};
  let detectedDate: string | null = null;

  // =========================================================================
  // TIER 1: Digital PDF Vector Text Extraction
  // =========================================================================
  if (isPdf) {
    try {
      const extracted = await extractTextFromPdfBlob(file);
      if (extracted.lines.length > 0) {
        const textExtract = extractBiomarkersFromLineList(extracted.lines, extracted.text);
        Object.assign(biomarkers, textExtract.biomarkers);
        if (textExtract.detectedDate) detectedDate = textExtract.detectedDate;
      }
    } catch (err) {
      console.warn("[pdf digital text extract warning]", err);
    }
  }

  // If digital text found sufficient biomarkers, return success immediately
  if (Object.keys(biomarkers).length >= 2) {
    onProgress?.(100, "Extraction complete!");
    return {
      status: "success",
      panel: {
        recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
        values: buildLegacyValues(biomarkers),
        biomarkers,
        matchedCount: Object.keys(biomarkers).length,
        notes: "Auto-extracted from digital lab report text.",
        extractionSource: "digital",
      },
    };
  }

  // =========================================================================
  // PREPARE PAGE IMAGES FOR SCANNED / IMAGE REPORT PIPELINE
  // =========================================================================
  onProgress?.(30, "Rendering document for high-accuracy analysis...");
  let pageImages: Array<{ base64Data: string; mimeType: string }> = [];

  try {
    if (isPdf) {
      pageImages = await renderPdfPagesToImages(file, { scale: 1.5, maxPages: 25 });
    } else if (isImage) {
      const directImage = await convertImageBlobToBase64(file);
      pageImages = [directImage];
    }
  } catch (renderErr) {
    console.warn("[page image render error]", renderErr);
  }

  if (pageImages.length === 0) {
    if (Object.keys(biomarkers).length > 0) {
      return {
        status: "success",
        panel: {
          recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
          values: buildLegacyValues(biomarkers),
          biomarkers,
          matchedCount: Object.keys(biomarkers).length,
          notes: "Extracted partial biomarkers from digital text layer.",
          extractionSource: "digital",
        },
      };
    }
    return {
      status: "no_data",
      reason: "Could not render document pages for image analysis.",
    };
  }

  // =========================================================================
  // TIER 2: Gemini Multimodal Vision (if API key available)
  // =========================================================================
  let aiVisionSucceeded = false;
  let aiVisionNotes = "";

  if (geminiApiKey) {
    onProgress?.(50, "Analyzing with Gemini Multimodal AI...");
    try {
      const visionResult = await extractBiomarkersFromImagesWithGemini(pageImages, geminiApiKey);
      for (const [k, v] of Object.entries(visionResult.biomarkers)) {
        if (biomarkers[k] == null) {
          biomarkers[k] = v;
        }
      }
      if (!detectedDate && visionResult.recordedAt) {
        detectedDate = visionResult.recordedAt;
      }
      if (Object.keys(visionResult.biomarkers).length > 0) {
        aiVisionSucceeded = true;
        aiVisionNotes = visionResult.confidenceNotes || "Extracted via Gemini Multimodal Vision";
      }
    } catch (aiErr) {
      console.warn("[Gemini Vision error, will proceed to local OCR fallback]:", aiErr);
    }
  }

  if (aiVisionSucceeded && Object.keys(biomarkers).length > 0) {
    onProgress?.(100, "Extraction complete!");
    return {
      status: "success",
      panel: {
        recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
        values: buildLegacyValues(biomarkers),
        biomarkers,
        matchedCount: Object.keys(biomarkers).length,
        notes: aiVisionNotes,
        extractionSource: "gemini_vision",
      },
    };
  }

  // =========================================================================
  // TIER 3: Local In-Browser OCR Fallback (Foolproof Engine)
  // =========================================================================
  onProgress?.(65, "Running local OCR scan fallback...");
  try {
    const ocrResult = await extractTextFromImagesWithOcr(pageImages, (p, s) => {
      onProgress?.(65 + Math.floor((p / 100) * 30), s);
    });

    if (ocrResult.lines.length > 0) {
      const ocrExtracted = extractBiomarkersFromLineList(ocrResult.lines, ocrResult.text);
      for (const [k, v] of Object.entries(ocrExtracted.biomarkers)) {
        if (biomarkers[k] == null) {
          biomarkers[k] = v;
        }
      }
      if (!detectedDate && ocrExtracted.detectedDate) {
        detectedDate = ocrExtracted.detectedDate;
      }
    }
  } catch (ocrFallbackErr) {
    console.warn("[Local OCR fallback error]:", ocrFallbackErr);
  }

  const finalMatchedCount = Object.keys(biomarkers).length;
  if (finalMatchedCount > 0) {
    onProgress?.(100, "Extraction complete!");
    return {
      status: "success",
      panel: {
        recordedAt: detectedDate || new Date().toISOString().slice(0, 10),
        values: buildLegacyValues(biomarkers),
        biomarkers,
        matchedCount: finalMatchedCount,
        notes: "Auto-extracted via Local In-Browser OCR (Scanned report fallback).",
        extractionSource: "local_ocr",
      },
    };
  }

  return {
    status: "no_data",
    reason:
      "No supported clinical biomarkers could be identified in this document. Please ensure the document is clear or enter the values manually.",
  };
}
