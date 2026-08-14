import { useCallback, useMemo, useState } from "react";
import { type LabPanelRow } from "../lib/labPanels";
import {
  synthesizeMultiPanelData,
  type BiomarkerTrendMap,
  type MultiPanelMetadata,
} from "../lib/labInsights";

const REPORT_STORAGE_KEY = "synapse_active_report_id";

export function useActiveReport(panels: LabPanelRow[]) {
  const [selectedReportId, setSelectedReportIdState] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem(REPORT_STORAGE_KEY);
      return stored && stored !== "none" ? stored : "none";
    } catch {
      return "none";
    }
  });

  const setSelectedReportId = useCallback((id: string) => {
    setSelectedReportIdState(id);
    try {
      sessionStorage.setItem(REPORT_STORAGE_KEY, id);
    } catch (e) {
      console.warn("Could not save active report id", e);
    }
  }, []);

  const multiPanelSynthesis = useMemo(() => {
    return synthesizeMultiPanelData(panels ?? []);
  }, [panels]);

  const { activePanel, isAllReports, biomarkerTrends, multiPanelMeta } = useMemo(() => {
    if (!panels || panels.length === 0) {
      return {
        activePanel: null,
        isAllReports: true,
        biomarkerTrends: {} as BiomarkerTrendMap,
        multiPanelMeta: multiPanelSynthesis.metadata,
      };
    }

    if (selectedReportId === "all" || selectedReportId === "none" || !selectedReportId) {
      return {
        activePanel: multiPanelSynthesis.panel,
        isAllReports: true,
        biomarkerTrends: multiPanelSynthesis.trends,
        multiPanelMeta: multiPanelSynthesis.metadata,
      };
    }

    const match = panels.find((p) => p.upload_id === selectedReportId || p.id === selectedReportId);
    if (match) {
      const singleMeta: MultiPanelMetadata = {
        totalReports: 1,
        dateRange: {
          earliest: match.recorded_at,
          latest: match.recorded_at,
          spanText: match.recorded_at,
        },
        uniqueBiomarkersCount: Object.keys(match.biomarkers ?? {}).length,
        worseningCount: 0,
        improvingCount: 0,
        stableCount: 0,
        reportSources: [
          {
            id: match.id,
            uploadId: match.upload_id,
            recordedAt: match.recorded_at,
            label: `Single Report (${match.recorded_at})`,
          },
        ],
      };

      return {
        activePanel: match,
        isAllReports: false,
        biomarkerTrends: {} as BiomarkerTrendMap,
        multiPanelMeta: singleMeta,
      };
    }

    return {
      activePanel: null,
      isAllReports: false,
      biomarkerTrends: {} as BiomarkerTrendMap,
      multiPanelMeta: multiPanelSynthesis.metadata,
    };
  }, [panels, selectedReportId, multiPanelSynthesis]);

  return {
    selectedReportId,
    setSelectedReportId,
    activePanel,
    synthesizedPanel: multiPanelSynthesis.panel,
    biomarkerTrends,
    multiPanelMeta,
    isAllReports,
  };
}
