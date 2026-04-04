import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getLatestLabPanel, getWellnessTips } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function WellnessTipsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const tips = latestPanel ? getWellnessTips(latestPanel) : [];

  if (loading || panelsLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
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
        <p className="mt-1 text-gray-600">Personalized recommendations from your recorded lab data</p>
      </div>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No personalized tips yet</CardTitle>
            <CardDescription>
              Personalized tips appear after you enter the values from one uploaded report.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tips.map((tip) => (
            <Card key={tip.title}>
              <CardHeader>
                <CardTitle>{tip.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tip.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
