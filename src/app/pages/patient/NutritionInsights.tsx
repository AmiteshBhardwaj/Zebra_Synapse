import { Apple } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getLatestLabPanel, getNutritionPlans } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function NutritionInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const plans = latestPanel ? getNutritionPlans(latestPanel) : [];

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
        title="Nutrition Plan"
        description="Meal plans and macros based on your lab data"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nutrition Plan</h1>
        <p className="mt-1 text-gray-600">Personalized guidance from your recorded markers</p>
      </div>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Apple className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No nutrition plan yet</CardTitle>
            <CardDescription>
              Add the structured values from one uploaded report on Health Overview to generate a
              nutrition plan from your real markers.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.headline}>
              <CardHeader>
                <CardTitle>{plan.headline}</CardTitle>
                <CardDescription>{plan.focus}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.actions.map((action) => (
                    <div key={action} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {action}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
