import { createWorker } from "tesseract.js";

export interface OcrProgressCallback {
  (progress: number, status: string): void;
}

export interface OcrExtractionResult {
  text: string;
  lines: string[];
}

/**
 * Clean and normalize raw OCR text for laboratory report parsing.
 */
function cleanOcrText(rawText: string): string {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/(\d+)\s*([.,·])\s*(\d+)/g, "$1.$3")
    .replace(/(\d+)\s*,\s*(\d{1,2})(?!\d)/g, "$1.$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\b(mg\s*\/\s*dL|mg\s*\/\s*dl|mg\s*\/dl|mg\/dL)\b/gi, "mg/dL")
    .replace(/\b(g\s*\/\s*dL|g\s*\/\s*dl|g\s*\/dl|g\/dL)\b/gi, "g/dL")
    .replace(/\b(mmol\s*\/\s*L|mmol\s*\/L)\b/gi, "mmol/L")
    .replace(/\b(pg\s*\/\s*mL|pg\s*\/mL)\b/gi, "pg/mL")
    .replace(/\b(ng\s*\/\s*mL|ng\s*\/mL)\b/gi, "ng/mL")
    .replace(/\b(uIU\s*\/\s*mL|uIU\s*\/mL|µIU\s*\/mL|μIU\s*\/mL)\b/gi, "μIU/mL")
    .replace(/\b(IU\s*\/\s*L|IU\s*\/L|U\s*\/\s*L)\b/gi, "U/L")
    .replace(/[\u03bc\u00b5]/g, "μ");
}

/**
 * Execute client-side OCR on one or more report image canvases/data URLs using Tesseract.js.
 */
export async function extractTextFromImagesWithOcr(
  images: Array<{ mimeType: string; base64Data: string }>,
  onProgress?: OcrProgressCallback
): Promise<OcrExtractionResult> {
  if (!images || images.length === 0) {
    return { text: "", lines: [] };
  }

  const allPageTexts: string[] = [];
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    onProgress?.(5, "Initializing local OCR engine...");
    worker = await createWorker("eng");
    await worker.setParameters({
      preserve_interword_spaces: "1",
    });

    const totalPages = images.length;

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const img = images[i];
      const dataUri = `data:${img.mimeType};base64,${img.base64Data}`;

      const progressBase = 10 + Math.floor((i / totalPages) * 80);
      onProgress?.(progressBase, `Scanning report page ${pageNum} of ${totalPages}...`);

      const ret = await worker.recognize(dataUri);
      const pageText = cleanOcrText(ret.data.text || "");
      if (pageText.trim()) {
        allPageTexts.push(pageText);
      }
    }

    onProgress?.(95, "Finalizing report text extraction...");
  } catch (ocrErr) {
    console.error("[Local OCR Extraction Error]:", ocrErr);
    throw ocrErr;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore worker termination errors
      }
    }
  }

  const combinedText = allPageTexts.join("\n\n");
  const rawLines = combinedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  return {
    text: combinedText,
    lines: rawLines,
  };
}
