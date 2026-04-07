import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiRiskCareSnapshot,
  AiRiskFeaturePayload,
  AiRiskInferenceResponse,
  AiRiskStoredInsight,
  AiRiskStoredRow,
} from "../lib/aiRiskInsights";
import {
  AI_RISK_INSIGHTS_SELECT,
  buildAiRiskPayload,
  computeAiRiskSnapshotHash,
  isAiRiskInsightStale,
  mapAiRiskRow,
} from "../lib/aiRiskInsights";
import type { LabPanelRow } from "../lib/labPanels";
import type { LabReportUploadRow } from "../lib/labReports";
import type { MedicalRecordText } from "../lib/medicalRecordCorpus";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

async function resolveFunctionErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return "The AI inference request failed.";
  }

  const candidate = error as Error & {
    context?: {
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
  };

  if (candidate.context?.json) {
    try {
      const payload = await candidate.context.json();
      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
      ) {
        return (payload as { error: string }).error;
      }
    } catch {
      // Fall through to other extraction paths.
    }
  }

  if (candidate.context?.text) {
    try {
      const text = await candidate.context.text();
      if (text.trim().length > 0) return text.trim();
    } catch {
      // Fall through to the original error message.
    }
  }

  return error.message;
}

function normalizeAuthHeader(accessToken: string | null | undefined): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

type UseAiRiskInsightArgs = {
  patientId?: string;
  panels: LabPanelRow[];
  uploads?: LabReportUploadRow[];
  recordTexts?: MedicalRecordText[];
  careSnapshot?: AiRiskCareSnapshot | null;
  enabled?: boolean;
};

export function useAiRiskInsight({
  patientId,
  panels,
  uploads = [],
  recordTexts = [],
  careSnapshot = null,
  enabled = true,
}: UseAiRiskInsightArgs) {
  const [insight, setInsight] = useState<AiRiskStoredInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo<AiRiskFeaturePayload | null>(() => {
    if (!patientId) return null;
    return buildAiRiskPayload({
      patientId,
      panels,
      uploads,
      recordTexts,
      careSnapshot,
    });
  }, [careSnapshot, panels, patientId, recordTexts, uploads]);

  const snapshotHash = useMemo(
    () => (payload ? computeAiRiskSnapshotHash(payload) : null),
    [payload],
  );
  const isStale = useMemo(
    () => (insight ? isAiRiskInsightStale(insight, snapshotHash) : false),
    [insight, snapshotHash],
  );

  const loadLatest = useCallback(async () => {
    if (!enabled || !patientId || !isSupabaseConfigured()) {
      setInsight(null);
      setLoading(false);
      return null;
    }

    const sb = getSupabase();
    if (!sb) {
      setInsight(null);
      setLoading(false);
      return null;
    }

    const { data, error: loadError } = await sb
      .from("ai_risk_insights")
      .select(AI_RISK_INSIGHTS_SELECT)
      .eq("patient_id", patientId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
      setInsight(null);
      setLoading(false);
      return null;
    }

    const mapped = data ? mapAiRiskRow((data as unknown) as AiRiskStoredRow) : null;
    setInsight(mapped);
    setLoading(false);
    return mapped;
  }, [enabled, patientId]);

  const refresh = useCallback(
    async (force = false) => {
      if (!enabled || !payload || !snapshotHash || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        setLoading(false);
        return;
      }

      setRefreshing(true);
      setError(null);

      const latest = await loadLatest();
      const hasUsableInputs = payload.panels.length > 0 || Boolean(payload.careSnapshot);

      if (!force && latest) {
        if (!isAiRiskInsightStale(latest, snapshotHash) || !hasUsableInputs) {
          setRefreshing(false);
          return;
        }
      } else if (!hasUsableInputs) {
        setRefreshing(false);
        return;
      }

      const {
        data: { session },
      } = await sb.auth.getSession();

      const { data, error: invokeError } = await sb.functions.invoke("ai-risk-inference", {
        body: { patientId, forceRefresh: force },
        headers: normalizeAuthHeader(session?.access_token),
      });

      if (invokeError) {
        setError(await resolveFunctionErrorMessage(invokeError));
        setRefreshing(false);
        return;
      }

      const response = data as AiRiskInferenceResponse | null;
      const next = response?.insight ? mapAiRiskRow(response.insight as AiRiskStoredRow) : null;
      if (next) setInsight(next);
      setRefreshing(false);
    },
    [enabled, loadLatest, patientId, payload, snapshotHash],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return {
    insight,
    loading,
    refreshing,
    error,
    isStale,
    refetch: () => refresh(true),
    hasInsight: Boolean(insight),
  };
}
