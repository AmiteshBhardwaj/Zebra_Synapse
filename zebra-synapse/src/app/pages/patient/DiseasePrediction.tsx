import { AlertTriangle, Info, ShieldAlert, TrendingUp } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import PatientFeaturePlaceholder from "../../components/patient/PatientFeaturePlaceholder";
import { PatientPortalPage, portalPanelClass } from "../../components/patient/PortalTheme";

export default function DiseasePrediction() {
  const { hasLabReports, loading } = usePatientLabReports();

  if (loading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Disease Prediction"
        description="Risk assessments based on your lab-derived data"
      />
    );
  }

  return (
    <PatientFeaturePlaceholder
      eyebrow="Predictive Intelligence"
      title="Disease Prediction"
      description="Review future risk assessments in a dark analytical workspace designed to keep predictive insights readable, focused, and grounded in verified data."
      icon={TrendingUp}
      meta={[
        { label: "Risk models", value: "Standby" },
        { label: "Source data", value: "Structured biomarkers required" },
        { label: "Clinical posture", value: "Decision support only" },
      ]}
      callout={
        <section className={`${portalPanelClass} border-[#3B82F6]/15 bg-[#3B82F6]/[0.08] p-6`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/12">
              <Info className="h-5 w-5 text-[#93c5fd]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Not a diagnosis</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#c7ddff]">
                Any future risk scores here will be computed from structured values extracted from
                your uploads and your clinician&apos;s record, not from demo data or generic examples.
              </p>
            </div>
          </div>
        </section>
      }
      emptyTitle="No risk models to display yet"
      emptyDescription="You have lab files uploaded, but biomarkers have not yet been parsed into a format the models can use. Risk cards will appear here after extraction runs."
      highlights={[
        {
          label: "Model input quality",
          value: "Predictions wait until biomarkers are structured clearly enough for reliable interpretation.",
          icon: ShieldAlert,
          tone: "blue",
        },
        {
          label: "Risk presentation",
          value: "Future score cards will emphasize uncertainty, severity bands, and clinician review instead of flat percentages alone.",
          icon: AlertTriangle,
          tone: "yellow",
        },
        {
          label: "False certainty avoided",
          value: "This portal intentionally avoids showing sample diabetes or cardiovascular scores that are not tied to your results.",
          icon: TrendingUp,
          tone: "orange",
        },
      ]}
    />
  );
}
