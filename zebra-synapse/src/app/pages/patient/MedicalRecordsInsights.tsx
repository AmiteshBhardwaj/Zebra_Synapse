import { useMemo, useState } from "react";
import { AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel, getMetricAssessments, getMetricValueLabel } from "../../../lib/labInsights";
import {
  PatientPageHero,
  PatientPortalPage,
  StatusPill,
  portalInsetClass,
  portalPanelClass,
  portalTableCellClass,
  portalTableClass,
  portalTableHeadClass,
  portalTableRowClass,
  portalTableWrapClass,
} from "../../components/patient/PortalTheme";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function MedicalRecordsInsights() {
  const { uploads } = usePatientLabReports();
  const { panels } = usePatientLabPanels();

  // Report selection state - defaults to "none" so empty state is displayed until chosen
  const [selectedReportId, setSelectedReportId] = useState<string>("none");

  // List of available reports for dropdown
  const availableReports = useMemo(() => {
    const list: Array<{ id: string; name: string; date: string }> = [];
    if (uploads.length > 0) {
      uploads.forEach((u) => {
        list.push({
          id: u.id,
          name: u.original_filename,
          date: new Date(u.created_at).toLocaleDateString(),
        });
      });
    } else if (panels.length > 0) {
      panels.forEach((p) => {
        list.push({
          id: p.id,
          name: `Structured Lab Panel`,
          date: formatLabDate(p.recorded_at),
        });
      });
    } else {
      // Demo medical report option so user can test & select immediately
      list.push({
        id: "demo-report-1",
        name: "cn2.pdf (Apr 1, 2026)",
        date: "Apr 1, 2026",
      });
      list.push({
        id: "demo-report-2",
        name: "Comprehensive Metabolic Panel & CBC.pdf",
        date: "Mar 15, 2026",
      });
    }
    return list;
  }, [uploads, panels]);

  const latestPanel = getLatestLabPanel(panels);
  const metrics = latestPanel
    ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing")
    : [];

  return (
    <PatientPortalPage>
      {/* 1. INITIAL EMPTY STATE SCREEN UNTIL A MEDICAL REPORT IS SELECTED */}
      {selectedReportId === "none" ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4 py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_20px_50px_rgba(255,122,51,0.22)]">
            <FileText className="h-9 w-9 text-[#ff9b61]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Please choose a medical report
          </h1>

          <p className="max-w-md text-sm text-[#92a8c7] leading-relaxed mb-8">
            Select a medical report from your records below to view extracted biomarker panels, trend movement, and record history.
          </p>

          <div className="w-full max-w-sm sm:max-w-md">
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-[#ff9b61]/40 bg-[#0d1829]/95 px-5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:border-[#ff9b61] focus:ring-2 focus:ring-[#ff7a33]/50 transition-all cursor-pointer">
                <SelectValue placeholder="Select a medical report..." />
              </SelectTrigger>
              <SelectContent className="border-white/14 bg-[#0a1323] text-white shadow-2xl rounded-2xl p-1.5">
                <SelectItem value="none" className="py-3 text-white/40 cursor-pointer">
                  -- Select a Medical Report --
                </SelectItem>
                {availableReports.map((report) => (
                  <SelectItem
                    key={report.id}
                    value={report.id}
                    className="py-3 px-3 text-white font-medium hover:bg-white/10 cursor-pointer rounded-xl"
                  >
                    📄 {report.name} ({report.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        /* 2. FULL MEDICAL RECORDS WORKSPACE WHEN A REPORT IS SELECTED */
        <>
          {/* Top Report Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff9c61]/15 border border-[#ff9c61]/30">
                <FileText className="h-4.5 w-4.5 text-[#ff9c61]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/45">Active Medical Record</p>
                <p className="text-xs font-semibold text-white">
                  {availableReports.find((r) => r.id === selectedReportId)?.name ?? "Selected Record"}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto min-w-[260px]">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-10 w-full rounded-xl border-white/14 bg-[#0d1829]/90 text-xs font-medium text-white shadow-sm hover:border-[#ff9b61] transition-all cursor-pointer">
                  <SelectValue placeholder="Change medical report..." />
                </SelectTrigger>
                <SelectContent className="border-white/14 bg-[#0a1323] text-white shadow-2xl rounded-xl p-1">
                  <SelectItem value="none" className="py-2 text-white/40 cursor-pointer">
                    -- Clear Selection --
                  </SelectItem>
                  {availableReports.map((report) => (
                    <SelectItem key={report.id} value={report.id} className="py-2 text-white text-xs cursor-pointer">
                      📄 {report.name} ({report.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>



          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Uploaded lab reports</CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                These files are stored for your account and feed the downstream record views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                {uploads.map((test) => (
                  <div key={test.id} className="rounded-[1.2rem] border border-white/8 bg-[#111111]/80 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FF8C42] shadow-[0_12px_28px_rgba(255,106,0,0.25)]">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{test.original_filename}</p>
                        <p className="mt-1 text-sm text-[#A1A1AA]">
                          Uploaded {formatUploadedAt(test.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {latestPanel ? (
            <OverviewStatCards
              stats={[
                {
                  label: "Panel Date",
                  value: formatLabDate(latestPanel.recorded_at),
                  detail: "Date associated with this recorded laboratory panel.",
                  tone: "teal",
                },
                {
                  label: "Extracted Biomarkers",
                  value: Object.keys(latestPanel.biomarkers ?? {}).length,
                  detail: "Total number of structured markers in this panel.",
                  tone: "amber",
                },
                {
                  label: "Abnormal Markers",
                  value: metrics.filter((m) => m.status === "high" || m.status === "low").length,
                  detail: "Markers flagged outside the standard reference range.",
                  tone: "rose",
                },
                {
                  label: "Report History",
                  value: uploads.length,
                  detail: "Total lab report files attached to this patient record.",
                  tone: "blue",
                },
              ]}
            />
          ) : null}

          {metrics.length > 0 ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <MetricPriorityBars
                  metrics={metrics}
                  title="Biomarker priorities"
                  description="Markers from this panel sorted by deviation severity so urgent readings stay clear."
                  limit={8}
                />
                <MetricStatusDonut
                  metrics={metrics}
                  title="Panel status distribution"
                  description="High-level breakdown of normal, borderline, and outside-range markers."
                />
              </div>

              <MetricSparklineGrid
                panels={panels}
                metricKeys={metrics.slice(0, 6).map((m) => m.key)}
                title="Historical marker movement"
                description="Compare how values shifted across historical lab panels."
              />

              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle className="text-white">Structured biomarker values</CardTitle>
                  <CardDescription className="text-[#A1A1AA]">
                    Full breakdown of lab values extracted for {latestPanel ? formatLabDate(latestPanel.recorded_at) : "latest panel"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={portalTableWrapClass}>
                    <Table className={portalTableClass}>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className={portalTableHeadClass}>Biomarker</TableHead>
                          <TableHead className={portalTableHeadClass}>Value</TableHead>
                          <TableHead className={portalTableHeadClass}>Reference Range</TableHead>
                          <TableHead className={portalTableHeadClass}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric, idx) => (
                          <TableRow key={metric.key} className={portalTableRowClass(idx)}>
                            <TableCell className={`${portalTableCellClass} font-medium text-white`}>
                              {metric.label}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              {getMetricValueLabel(metric)}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              {metric.range}
                            </TableCell>
                            <TableCell className={portalTableCellClass}>
                              <StatusPill status={metric.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
    </PatientPortalPage>
  );
}
