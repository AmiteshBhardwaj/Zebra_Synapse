import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { FlaskConical } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function ClinicalTrials() {
  const { hasLabReports, loading } = usePatientLabReports();

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clinical Trials</h1>
        <p className="text-gray-600 mt-1">Studies matched to your health profile</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <FlaskConical className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>No trial matches yet</CardTitle>
          <CardDescription>
            Demo trials (for example diabetes prevention studies) are hidden until structured data
            from your lab reports can drive eligibility matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can still browse{" "}
            <a
              href="https://clinicaltrials.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              ClinicalTrials.gov
            </a>{" "}
            directly with your care team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
