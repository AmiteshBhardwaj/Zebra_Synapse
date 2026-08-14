import { useMemo } from "react";
import { Layers, FileText, TrendingUp, TrendingDown, Minus, Calendar, Sparkles } from "lucide-react";
import { type LabPanelRow, formatLabDate } from "../../../lib/labPanels";
import type { LabReportUploadRow } from "../../../lib/labReportAnalysis";
import type { MultiPanelMetadata, BiomarkerTrendMap } from "../../../lib/labInsights";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

export type ReportScopeSelectorProps = {
  panels: LabPanelRow[];
  uploads?: LabReportUploadRow[];
  selectedReportId: string;
  onSelectReportId: (id: string) => void;
  multiPanelMeta: MultiPanelMetadata;
  biomarkerTrends?: BiomarkerTrendMap;
  className?: string;
};

export default function ReportScopeSelector({
  panels,
  uploads = [],
  selectedReportId,
  onSelectReportId,
  multiPanelMeta,
  biomarkerTrends,
  className = "",
}: ReportScopeSelectorProps) {
  const isComprehensive =
    selectedReportId === "all" || selectedReportId === "none" || !selectedReportId;

  // Build the list of selectable options
  const reportOptions = useMemo(() => {
    const list: Array<{ id: string; label: string; date: string; isAll?: boolean }> = [
      {
        id: "all",
        label: `All Uploaded Reports (Comprehensive — ${panels.length} reports)`,
        date: multiPanelMeta.dateRange.spanText,
        isAll: true,
      },
    ];

    panels.forEach((p, idx) => {
      // Find matching upload filename if available
      const uploadMatch = uploads.find((u) => u.id === p.upload_id);
      const filename = uploadMatch?.original_filename;
      const formattedDate = formatLabDate(p.recorded_at);
      const label = filename
        ? `${filename} (${formattedDate})`
        : `Report #${panels.length - idx} (${formattedDate})`;

      list.push({
        id: p.upload_id || p.id,
        label,
        date: formattedDate,
      });
    });

    return list;
  }, [panels, uploads, multiPanelMeta]);

  if (panels.length <= 1) {
    // If there's only 0 or 1 report, show a clean indicator without complicated dropdown
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d131f]/80 p-3.5 backdrop-blur-md ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {panels.length === 1
                  ? `Report: ${formatLabDate(panels[0].recorded_at)}`
                  : "Awaiting Lab Uploads"}
              </span>
              <Badge className="border-cyan-500/30 bg-cyan-500/15 text-[10px] text-cyan-300">
                {panels.length === 1 ? "Active Panel" : "No Data"}
              </Badge>
            </div>
            <p className="text-[11px] text-[#92a8c7]">
              {panels.length === 1
                ? `${multiPanelMeta.uniqueBiomarkersCount} biomarkers extracted from this report`
                : "Upload lab reports in Medical Records to generate automated insights"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0d131f]/90 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all ${className}`}
    >
      {/* Top Header Row: Scope Context & Dropdown Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors shrink-0 ${
              isComprehensive
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            }`}
          >
            {isComprehensive ? (
              <Layers className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff9c61]">
                Analysis Scope
              </p>
              <Badge
                className={`text-[9px] px-1.5 py-0 h-4 uppercase font-semibold tracking-wider ${
                  isComprehensive
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                    : "border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                }`}
              >
                {isComprehensive ? "Multi-Report" : "Single Report"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {isComprehensive
                ? "Comprehensive Multi-Report Mode"
                : "Single Report Snapshot"}
            </p>
          </div>
        </div>

        {/* Dropdown Scope Selector */}
        <div className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
          <Select value={selectedReportId} onValueChange={onSelectReportId}>
            <SelectTrigger className="h-10 w-full rounded-xl border-white/15 bg-[#070b13] px-3 text-xs font-medium text-white shadow-inner hover:border-cyan-500/50 focus:ring-1 focus:ring-cyan-400">
              <SelectValue placeholder="Choose analysis scope..." />
            </SelectTrigger>
            <SelectContent className="border-cyan-500/20 bg-[#0d131f] text-white shadow-2xl rounded-xl p-1 max-w-[92vw] sm:max-w-md">
              {reportOptions.map((opt) => (
                <SelectItem
                  key={opt.id}
                  value={opt.id}
                  className="py-2.5 text-xs text-white focus:bg-cyan-500/20 focus:text-cyan-200 cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    {opt.isAll ? (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span className={`truncate ${opt.isAll ? "font-semibold text-emerald-300" : "text-white/90"}`}>
                      {opt.label}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bottom Row: Scope Stats & Longitudinal Trend Indicators */}
      <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/90">
            <Calendar className="mr-1.5 h-3 w-3 text-sky-400 shrink-0" />
            <span>{multiPanelMeta.dateRange.spanText}</span>
          </Badge>

          <Badge className="border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mr-1.5 shrink-0" />
            <span>{multiPanelMeta.uniqueBiomarkersCount} Biomarkers Tracked</span>
          </Badge>
        </div>

        {/* Trend badges when in comprehensive multi-report mode */}
        {isComprehensive && multiPanelMeta.totalReports > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {multiPanelMeta.worseningCount > 0 && (
              <Badge className="border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                <TrendingUp className="mr-1 h-3 w-3 shrink-0" />
                <span>{multiPanelMeta.worseningCount} Upward</span>
              </Badge>
            )}
            {multiPanelMeta.improvingCount > 0 && (
              <Badge className="border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <TrendingDown className="mr-1 h-3 w-3 shrink-0" />
                <span>{multiPanelMeta.improvingCount} Improving</span>
              </Badge>
            )}
            {multiPanelMeta.stableCount > 0 && (
              <Badge className="border border-slate-500/30 bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                <Minus className="mr-1 h-3 w-3 shrink-0" />
                <span>{multiPanelMeta.stableCount} Stable</span>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
