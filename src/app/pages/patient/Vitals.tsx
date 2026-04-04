import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Activity } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function Vitals() {
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
        title="Vitals"
        description="Wearable and lab-linked vitals after you upload reports"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vitals</h1>
        <p className="text-gray-600 mt-1">Data from your devices and lab reports</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Activity className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <CardTitle>No vitals to show yet</CardTitle>
          <CardDescription>
            You have lab files on file, but this app does not display vitals until values are
            extracted from those reports or synced from a wearable integration. No placeholder
            numbers are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect lab parsing or a device integration next to populate heart rate, blood
            pressure, and trends from your real data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
