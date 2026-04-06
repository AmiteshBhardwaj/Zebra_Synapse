import { AlertCircle, Clock3, FileText, FolderKanban, Microscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import { formatLabDate } from "../../../lib/labPanels";
import { getLatestLabPanel } from "../../../lib/labInsights";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
} from "../../components/patient/PortalTheme";

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

export default function MedicalRecords() {
  const { hasLabReports, loading, uploads } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
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
        description="View lab tests and biomarker trends from your uploads"
      />
    );
  }

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Clinical Archive"
        title="Medical Records"
        description="Review uploaded reports and structured biomarker history in the same dark record workspace used across the rest of the patient portal."
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
          <CardDescription className="text-[#A1A1AA]">These are the files stored for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPanels || !latestPanel ? (
            <div className="rounded-[1.5rem] border border-[#FFC857]/15 bg-[#FFC857]/8 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFC857]/15 bg-[#FFC857]/12">
                  <AlertCircle className="h-5 w-5 text-[#ffe09d]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">No structured values recorded yet</h2>
                  <p className="mt-2 text-sm leading-7 text-[#f1d8a2]">
                    Your files are uploaded, but Medical Records needs the actual biomarkers from the
                    report. Enter those values on Health Overview first.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {uploads.map((test) => (
              <div
                key={test.id}
                className="rounded-[1.25rem] border border-white/8 bg-[#111111]/80 p-4 shadow-[0_18px_36px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6A00]/25 hover:shadow-[0_22px_46px_rgba(255,106,0,0.1)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5BD4] to-[#3B82F6] shadow-[0_12px_28px_rgba(59,130,246,0.22)]">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{test.original_filename}</p>
                    <p className="mt-1 text-sm text-[#A1A1AA]">Uploaded {formatUploadedAt(test.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={`${portalPanelClass} h-full`}>
          <CardHeader>
            <CardTitle className="text-white">
              {latestPanel ? "Latest biomarker panel" : "Biomarker trends"}
            </CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              {latestPanel
                ? `Structured values recorded for ${formatLabDate(latestPanel.recorded_at)}`
                : "Go to Health Overview and enter values from one uploaded report to generate records."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-[#D4D4D8]">
              When your reports are parsed into structured results, hemoglobin, lipids, glucose,
              and other trends will show here. There is no demo data; only your real extractions
              will appear.
            </p>
          </CardContent>
        </Card>

        <div className={`${portalPanelClass} p-6`}>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Archive Signals</p>
            <h2 className="text-xl font-semibold text-white">Record pipeline status</h2>
            <p className="text-sm leading-7 text-[#A1A1AA]">
              This section stays empty until the uploaded files can be turned into structured biomarkers and panel history.
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              {
                icon: FolderKanban,
                label: "File storage",
                value: `${uploads.length} uploaded file${uploads.length === 1 ? "" : "s"} currently stored in your account.`,
              },
              {
                icon: Microscope,
                label: "Biomarker extraction",
                value: hasPanels ? `${panels.length} panel${panels.length === 1 ? "" : "s"} available for review.` : "No structured panel is available yet.",
              },
              {
                icon: Clock3,
                label: "Latest update",
                value: latestPanel ? formatLabDate(latestPanel.recorded_at) : "Waiting for your first structured panel.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className={`${portalInsetClass} p-4`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#ff9c61]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PatientPortalPage>
  );
}
