/**
 * Unified Gemini API Key resolver, validator, and model catalog.
 * Supports modern Gemini 3.x models and the Interactions / generateContent APIs.
 */

const STORAGE_KEYS = ["gemini_api_key", "VITE_GEMINI_API_KEY", "vite_gemini_api_key"];

export function getGeminiApiKey(): string {
  // 1. Check browser localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    for (const key of STORAGE_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val && val.trim().length > 0) {
        return val.trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  // 2. Check Vite environment variables
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
    if (metaEnv?.VITE_GEMINI_API_KEY) {
      return metaEnv.VITE_GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
    }
    if (metaEnv?.GEMINI_API_KEY) {
      return metaEnv.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Ignore error in non-module environments
  }

  // 3. Check process.env if available
  try {
    const procEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env;
    if (procEnv?.VITE_GEMINI_API_KEY) {
      return procEnv.VITE_GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
    }
    if (procEnv?.GEMINI_API_KEY) {
      return procEnv.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Ignore
  }

  return "";
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    const cleaned = key.trim().replace(/^["']|["']$/g, "");
    if (cleaned) {
      window.localStorage.setItem("gemini_api_key", cleaned);
      window.localStorage.setItem("VITE_GEMINI_API_KEY", cleaned);
    } else {
      window.localStorage.removeItem("gemini_api_key");
      window.localStorage.removeItem("VITE_GEMINI_API_KEY");
      window.localStorage.removeItem("vite_gemini_api_key");
      window.sessionStorage.removeItem("gemini_tested_working_model");
    }
  }
}

export const DEFAULT_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
];

export function getGeminiModels(): string[] {
  // 1. Check if a known working model was verified in this session
  if (typeof window !== "undefined" && window.sessionStorage) {
    const cachedWorking = window.sessionStorage.getItem("gemini_tested_working_model");
    if (cachedWorking && DEFAULT_GEMINI_MODELS.includes(cachedWorking)) {
      return [cachedWorking, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== cachedWorking)];
    }
  }

  // 2. Check custom model override in localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    const custom = window.localStorage.getItem("gemini_model") || window.localStorage.getItem("VITE_GEMINI_MODEL");
    if (custom && custom.trim().length > 0) {
      const clean = custom.trim().replace(/^["']|["']$/g, "");
      return [clean, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== clean)];
    }
  }

  // 3. Check Vite env
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
    if (metaEnv?.VITE_GEMINI_MODEL?.trim()) {
      const clean = metaEnv.VITE_GEMINI_MODEL.trim().replace(/^["']|["']$/g, "");
      return [clean, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== clean)];
    }
    if (metaEnv?.GEMINI_MODEL?.trim()) {
      const clean = metaEnv.GEMINI_MODEL.trim().replace(/^["']|["']$/g, "");
      return [clean, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== clean)];
    }
  } catch {
    // Ignore
  }

  return DEFAULT_GEMINI_MODELS;
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

export interface GeminiKeyTestResult {
  ok: boolean;
  status: number;
  message: string;
  availableModels: string[];
  workingModel?: string;
}

/**
 * Validate an API key against Google Generative Language endpoints and identify working models.
 */
export async function testGeminiApiKey(customKey?: string): Promise<GeminiKeyTestResult> {
  const key = (customKey !== undefined ? customKey : getGeminiApiKey()).trim().replace(/^["']|["']$/g, "");

  if (!key) {
    return {
      ok: false,
      status: 400,
      message: "No Gemini API key provided. Please enter a valid API key.",
      availableModels: [],
    };
  }

  try {
    // 1. Check models list endpoint
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      {
        headers: {
          "x-goog-api-key": key,
        },
      }
    );

    if (!listRes.ok) {
      const errJson = await listRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || listRes.statusText;

      if (listRes.status === 403) {
        return {
          ok: false,
          status: 403,
          message: `Permission Denied (403): ${errMsg}. Please ensure the Generative Language API is enabled in your Google Cloud / AI Studio project and your key has sufficient permissions.`,
          availableModels: [],
        };
      }
      if (listRes.status === 400) {
        return {
          ok: false,
          status: 400,
          message: `Invalid API Key (400): ${errMsg}`,
          availableModels: [],
        };
      }
      return {
        ok: false,
        status: listRes.status,
        message: `Google API Error (${listRes.status}): ${errMsg}`,
        availableModels: [],
      };
    }

    const listData = await listRes.json();
    const allModels: string[] = (listData.models || []).map((m: { name: string }) =>
      m.name.replace(/^models\//, "")
    );

    // Filter for current non-deprecated 3.x/flash generation models
    const activeCandidates = DEFAULT_GEMINI_MODELS.filter((m) => allModels.includes(m));

    // 2. Test generation capability on the best active candidate
    const testCandidates = activeCandidates.length > 0 ? activeCandidates : DEFAULT_GEMINI_MODELS;
    let verifiedWorkingModel: string | undefined;

    for (const model of testCandidates) {
      try {
        const testGen = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Ping test" }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          }
        );

        if (testGen.ok) {
          verifiedWorkingModel = model;
          if (typeof window !== "undefined" && window.sessionStorage) {
            window.sessionStorage.setItem("gemini_tested_working_model", model);
          }
          break;
        }
      } catch {
        // Try next candidate
      }
    }

    if (verifiedWorkingModel) {
      return {
        ok: true,
        status: 200,
        message: `API Key verified! Connected to ${verifiedWorkingModel}.`,
        availableModels: activeCandidates,
        workingModel: verifiedWorkingModel,
      };
    }

    return {
      ok: false,
      status: 403,
      message:
        "Key was recognized but could not generate content. Project may lack active billing or permissions for Gemini 3.x models.",
      availableModels: activeCandidates,
    };
  } catch (netErr) {
    return {
      ok: false,
      status: 0,
      message: `Network error reaching Google Gemini API: ${netErr instanceof Error ? netErr.message : String(netErr)}`,
      availableModels: [],
    };
  }
}
