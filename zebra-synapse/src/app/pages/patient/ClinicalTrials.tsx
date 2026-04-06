import { ExternalLink, FlaskConical, Microscope, SearchCheck } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import PatientFeaturePlaceholder from "../../components/patient/PatientFeaturePlaceholder";
import { PatientPortalPage } from "../../components/patient/PortalTheme";

export default function ClinicalTrials() {
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
        title="Clinical Trials"
        description="Trial matching based on conditions inferred from your labs"
      />
    );
  }

  return (
    <PatientFeaturePlaceholder
      eyebrow="Research Matching"
      title="Clinical Trials"
      description="Explore future study matches in a focused dark workspace that keeps eligibility signals readable and separate from generic public listings."
      icon={FlaskConical}
      meta={[
        { label: "Matched studies", value: "0" },
        { label: "Eligibility engine", value: "Waiting for structured data" },
        { label: "Search scope", value: "Patient-specific only" },
      ]}
      emptyTitle="No trial matches yet"
      emptyDescription="Demo trials are intentionally hidden until structured data from your lab reports can drive eligibility matching with real clinical context."
      highlights={[
        {
          label: "Eligibility matching",
          value: "Condition markers, lab thresholds, and profile details will narrow results once your records are structured.",
          icon: SearchCheck,
          tone: "orange",
        },
        {
          label: "Study relevance",
          value: "This keeps the portal from surfacing generic diabetes or cardiometabolic studies that may not fit you.",
          icon: Microscope,
          tone: "purple",
        },
        {
          label: "External research search",
          value: (
            <span>
              You can still browse{" "}
              <a
                href="https://clinicaltrials.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#ffb07a] transition-colors hover:text-white"
              >
                ClinicalTrials.gov
                <ExternalLink className="h-3.5 w-3.5" />
              </a>{" "}
              directly with your care team.
            </span>
          ),
          icon: FlaskConical,
          tone: "blue",
        },
      ]}
    />
  );
}
