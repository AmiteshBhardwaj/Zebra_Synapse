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
    return null;
  }

  return (
    <div
      className={`rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all ${className}`}
    >
      {/* Top Header Row: Scope Context & Dropdown Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors shrink-0 ${
              isComprehensive
                ? "border-sky-200 bg-sky-50 text-[#0099ff] shadow-sm"
                : "border-sky-200 bg-sky-50 text-sky-700 shadow-sm"
            }`}
          >
            {isComprehensive ? (
              <Layers className="h-5 w-5 stroke-[2.2]" />
            ) : (
              <FileText className="h-5 w-5 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Analysis Scope
              </p>
              <Badge
                className="text-[9px] px-1.5 py-0 h-4 uppercase font-semibold tracking-wider border-sky-200 bg-sky-50 text-[#0284c7]"
              >
                {isComprehensive ? "Multi-Report" : "Single Report"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-['Manrope']">
              {isComprehensive
                ? "Comprehensive Multi-Report Mode"
                : "Single Report Snapshot"}
            </p>
          </div>
        </div>

        {/* Dropdown Scope Selector */}
        <div className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
          <Select value={selectedReportId} onValueChange={onSelectReportId}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 px-3 text-xs font-medium text-slate-800 hover:border-[#0099ff] focus:ring-1 focus:ring-[#0099ff] transition-all">
              <SelectValue placeholder="Choose analysis scope..." />
            </SelectTrigger>
            <SelectContent className="border-slate-100 bg-white text-slate-800 shadow-xl rounded-2xl p-1 max-w-[92vw] sm:max-w-md">
              {reportOptions.map((opt) => (
                <SelectItem
                  key={opt.id}
                  value={opt.id}
                  className="py-2.5 text-xs text-slate-700 focus:bg-sky-50 focus:text-sky-950 cursor-pointer rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    {opt.isAll ? (
                      <Sparkles className="h-3.5 w-3.5 text-[#0099ff] shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    )}
                    <span className={`truncate ${opt.isAll ? "font-bold text-[#0284c7]" : "text-slate-700"}`}>
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
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 font-medium">
            <Calendar className="mr-1.5 h-3 w-3 text-sky-600 shrink-0" />
            <span>{multiPanelMeta.dateRange.spanText}</span>
          </Badge>

          <Badge className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-500 mr-1.5 shrink-0" />
            <span>{multiPanelMeta.uniqueBiomarkersCount} Biomarkers Tracked</span>
          </Badge>
        </div>

        {/* Trend badges when in comprehensive multi-report mode */}
        {isComprehensive && multiPanelMeta.totalReports > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {multiPanelMeta.worseningCount > 0 && (
              <Badge className="border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                <TrendingUp className="mr-1 h-3 w-3 shrink-0" />
                <span>{multiPanelMeta.worseningCount} Upward</span>
              </Badge>
            )}
            {multiPanelMeta.improvingCount > 0 && (
              <Badge className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <TrendingDown className="mr-1 h-3 w-3 shrink-0" />
                <span>{multiPanelMeta.improvingCount} Improving</span>
              </Badge>
            )}
            {multiPanelMeta.stableCount > 0 && (
              <Badge className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
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
