import { Apple } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  CategoryBarChart,
  MetricSparklineGrid,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { getLatestLabPanel, getMetricsForDashboard, getNutritionPlans } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function NutritionInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const plans = latestPanel ? getNutritionPlans(latestPanel) : [];
  const nutritionMetrics = latestPanel ? getMetricsForDashboard(latestPanel, 12) : [];
  const planBars = plans.map((plan, index) => ({
    key: plan.headline.toLowerCase().replace(/\s+/g, "-"),
    label: plan.headline,
    value: plan.actions.length,
    fill: ["#0f766e", "#d97706", "#2563eb", "#d9485f"][index % 4],
    detail: plan.focus,
  }));

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
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Nutrition Tracks",
                value: plans.length,
                detail: "Diet guidance tracks generated from your latest biomarkers.",
                tone: "teal",
              },
              {
                label: "Action Steps",
                value: plans.reduce((sum, plan) => sum + plan.actions.length, 0),
                detail: "Concrete recommendations surfaced across the current plan set.",
                tone: "blue",
              },
              {
                label: "Triggered Markers",
                value: nutritionMetrics.filter((metric) => metric.status !== "normal").length,
                detail: "Markers that are directly shaping food guidance.",
                tone: "amber",
              },
              {
                label: "Tracked Panels",
                value: panels.length,
                detail: "Historical panels available for nutrition-related trend review.",
                tone: "rose",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <CategoryBarChart
              items={planBars}
              title="Nutrition focus map"
              description="Each bar shows how much action depth each nutrition track currently has."
              valueLabel="actions"
            />
            <MetricSparklineGrid
              panels={panels}
              metricKeys={nutritionMetrics.slice(0, 6).map((metric) => metric.key)}
              title="Diet-linked biomarker trends"
              description="These biomarker cards are the visual backbone behind the nutrition guidance."
            />
          </div>

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
        </div>
      )}
    </div>
  );
}
