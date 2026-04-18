import { AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  MetricPriorityBars,
  MetricSparklineGrid,
  MetricStatusDonut,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
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
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const metrics = latestPanel
    ? getMetricAssessments(latestPanel).filter((metric) => metric.status !== "missing")
    : [];

  if (loading || panelsLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Medical Records"
        description="View lab tests and biomarker trends from your uploads."
      />
    );
  }

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Clinical Archive"
        title="Medical Records"
        description="Review uploaded reports, inspect extracted biomarker panels, and move through your lab history in the same premium dark workspace used by Health Overview."
        icon={FileText}
        meta={[
          { label: "Uploaded Files", value: uploads.length },
          { label: "Structured Panels", value: panels.length },
          { label: "Latest Panel", value: latestPanel ? formatLabDate(latestPanel.recorded_at) : "Awaiting values" },
        ]}
      />

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

      {!hasPanels || !latestPanel ? (
        <div className="rounded-[1.5rem] border border-[#FFC857]/15 bg-[#FFC857]/8 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFC857]/14">
              <AlertCircle className="h-5 w-5 text-[#ffe09d]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">No structured values recorded yet</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#f1d8a2]">
                Your files are uploaded, but no published panel is available yet. Open Medical Records
                to review any low-confidence extraction before it becomes live portal data.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Panel Date",
                value: formatLabDate(latestPanel.recorded_at),
                detail: "The latest structured report currently driving your records.",
                tone: "blue",
              },
              {
                label: "Extracted Biomarkers",
                value: metrics.length,
                detail: "Markers available for visual review and downstream analysis.",
                tone: "teal",
              },
              {
                label: "Abnormal Markers",
                value: metrics.filter((metric) => metric.status === "high" || metric.status === "low").length,
                detail: "Markers currently outside the configured range.",
                tone: "rose",
              },
              {
                label: "Report History",
                value: panels.length,
                detail: "Panels available for time-based comparison.",
                tone: "amber",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricStatusDonut
              metrics={metrics}
              title="Panel composition"
              description="A visual split of how your current report distributes across normal and flagged markers."
            />
            <MetricPriorityBars
              metrics={metrics}
              title="Top flagged biomarkers"
              description="The most relevant biomarkers are ranked visually before the full table."
              limit={12}
            />
          </div>

          <MetricSparklineGrid
            panels={panels}
            metricKeys={metrics.slice(0, 6).map((metric) => metric.key)}
            title="Panel trend snapshots"
            description="Each mini-chart tracks how a key marker moved across recent recorded panels."
          />

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle className="text-white">Latest biomarker panel</CardTitle>
              <CardDescription className="text-[#A1A1AA]">
                Structured values recorded for {formatLabDate(latestPanel.recorded_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={portalTableWrapClass}>
                <Table className={portalTableClass}>
                  <TableHeader>
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className={portalTableHeadClass}>Marker</TableHead>
                      <TableHead className={portalTableHeadClass}>Value</TableHead>
                      <TableHead className={portalTableHeadClass}>Reference</TableHead>
                      <TableHead className={portalTableHeadClass}>Status</TableHead>
                      <TableHead className={portalTableHeadClass}>Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((metric, index) => (
                      <TableRow key={metric.key} className={portalTableRowClass(index)}>
                        <TableCell className={`${portalTableCellClass} font-medium text-white`}>
                          {metric.label}
                        </TableCell>
                        <TableCell className={portalTableCellClass}>
                          {getMetricValueLabel(metric)}
                        </TableCell>
                        <TableCell className={`${portalTableCellClass} text-[#A1A1AA]`}>
                          {metric.range}
                        </TableCell>
                        <TableCell className={portalTableCellClass}>
                          <StatusPill status={metric.status} />
                        </TableCell>
                        <TableCell className={`${portalTableCellClass} whitespace-normal text-[#D4D4D8]`}>
                          {metric.summary}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Panel history</h2>
                {panels.map((panel) => (
                  <div key={panel.id} className={`${portalInsetClass} p-4`}>
                    <p className="font-medium text-white">{formatLabDate(panel.recorded_at)}</p>
                    <p className="mt-1 text-sm text-[#A1A1AA]">
                      {Object.keys(panel.biomarkers ?? {}).length} biomarkers extracted from this panel
                    </p>
                    {panel.notes ? <p className="mt-2 text-sm text-[#D4D4D8]">{panel.notes}</p> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PatientPortalPage>
  );
}
