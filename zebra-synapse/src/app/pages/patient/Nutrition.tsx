import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Apple } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function Nutrition() {
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
        title="Nutrition Plan"
        description="Meal plans and macros based on your lab data"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nutrition Plan</h1>
        <p className="text-gray-600 mt-1">Personalized guidance from your real markers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Apple className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>No nutrition plan yet</CardTitle>
          <CardDescription>
            You have lab files on file, but no structured lab values are available to drive calories,
            macros, or meal suggestions. Those will appear here after your reports are processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generic sample meal plans are not shown, so nothing here is mistaken for medical advice
            tied to your labs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
