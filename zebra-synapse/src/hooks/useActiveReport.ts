import { useCallback, useMemo, useState } from "react";
import { type LabPanelRow } from "../lib/labPanels";
import { getLatestLabPanel } from "../lib/labInsights";

const REPORT_STORAGE_KEY = "synapse_active_report_id";

export function useActiveReport(panels: LabPanelRow[]) {
  const [selectedReportId, setSelectedReportIdState] = useState<string>(() => {
    try {
      return sessionStorage.getItem(REPORT_STORAGE_KEY) || "none";
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

  const activePanel = useMemo(() => {
    if (!panels || panels.length === 0) return null;
    if (selectedReportId === "none" || !selectedReportId) {
      return getLatestLabPanel(panels);
    }
    const match = panels.find((p) => p.upload_id === selectedReportId || p.id === selectedReportId);
    return match ?? getLatestLabPanel(panels);
  }, [panels, selectedReportId]);

  return {
    selectedReportId,
    setSelectedReportId,
    activePanel,
  };
}
