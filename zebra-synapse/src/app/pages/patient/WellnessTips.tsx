import { HeartHandshake, MoonStar, Sparkles, Waves } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import PatientFeaturePlaceholder from "../../components/patient/PatientFeaturePlaceholder";
import { PatientPortalPage } from "../../components/patient/PortalTheme";

export default function WellnessTips() {
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
        title="Wellness Tips"
        description="Tips grounded in your lab results and vitals"
      />
    );
  }

  return (
    <PatientFeaturePlaceholder
      eyebrow="Lifestyle Guidance"
      title="Wellness Tips"
      description="Surface recovery, sleep, movement, and everyday habit guidance inside the same premium dark environment used across the rest of the patient portal."
      icon={Sparkles}
      meta={[
        { label: "Tip categories", value: "Pending" },
        { label: "Signals", value: "Labs and vitals" },
        { label: "Tone", value: "Personalized only" },
      ]}
      emptyTitle="No personalized tips yet"
      emptyDescription="Wellness content will be generated from extracted lab values and linked vitals, not from demo copy about glucose, blood pressure, or generic lifestyle suggestions."
      highlights={[
        {
          label: "Sleep and recovery",
          value: "Sleep quality prompts and recovery guidance can appear once the system understands your trends.",
          icon: MoonStar,
          tone: "purple",
        },
        {
          label: "Movement and energy",
          value: "Activity recommendations stay linked to your own markers instead of broad one-size-fits-all coaching.",
          icon: Waves,
          tone: "blue",
        },
        {
          label: "Care alignment",
          value: "Tips are designed to complement your clinician guidance rather than replace it.",
          icon: HeartHandshake,
          tone: "orange",
        },
      ]}
      supplementary={
        <p className="text-sm leading-7 text-[#D4D4D8]">
          Uploads are saved; tip categories will populate when the pipeline can read your markers.
        </p>
      }
    />
  );
}
