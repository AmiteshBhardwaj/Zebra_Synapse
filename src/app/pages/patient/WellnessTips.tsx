import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Sparkles } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function WellnessTips() {
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
        title="Wellness Tips"
        description="Tips grounded in your lab results and vitals"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wellness Tips</h1>
        <p className="text-gray-600 mt-1">Personalized recommendations from your data</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>No personalized tips yet</CardTitle>
          <CardDescription>
            Wellness content will be generated from extracted lab values and linked vitals—not from
            demo copy about glucose or blood pressure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Uploads are saved; tip categories will populate when the pipeline can read your markers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
