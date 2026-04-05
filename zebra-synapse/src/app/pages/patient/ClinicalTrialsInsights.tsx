import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import {
  CategoryBarChart,
  OverviewStatCards,
} from "../../components/patient/InsightVisuals";
import { getLatestLabPanel, getMetricsForDashboard, getTrialMatches } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function ClinicalTrialsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const matches = latestPanel ? getTrialMatches(latestPanel) : [];
  const trialDrivers = latestPanel ? getMetricsForDashboard(latestPanel, 8) : [];
  const matchBars = matches.map((match, index) => ({
    key: match.title.toLowerCase().replace(/\s+/g, "-"),
    label: match.title,
    value: Math.max(match.query.split(/\s+/).length, 2),
    fill: ["#0f766e", "#2563eb", "#d97706", "#d9485f"][index % 4],
    detail: match.summary,
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
        title="Clinical Trials"
        description="Trial matching based on conditions inferred from your labs"
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clinical Trials</h1>
        <p className="mt-1 text-gray-600">Studies matched to themes found in your latest lab panel</p>
      </div>

      {!hasPanels || !latestPanel ? (
        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <FlaskConical className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <CardTitle>No trial matches yet</CardTitle>
            <CardDescription>
              Trial matching starts once one uploaded report has structured biomarkers recorded.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <OverviewStatCards
            stats={[
              {
                label: "Match Themes",
                value: matches.length,
                detail: "Trial-search themes derived from the latest biomarker pattern.",
                tone: "blue",
              },
              {
                label: "Driver Markers",
                value: trialDrivers.length,
                detail: "Biomarkers currently influencing trial search categories.",
                tone: "teal",
              },
              {
                label: "Search Queries",
                value: matches.length,
                detail: "Direct ClinicalTrials.gov queries ready to launch.",
                tone: "amber",
              },
              {
                label: "Recorded Panels",
                value: panels.length,
                detail: "History that will improve matching when more reports are added.",
                tone: "rose",
              },
            ]}
          />

          <CategoryBarChart
            items={matchBars}
            title="Trial search landscape"
            description="Each bar reflects a matched trial-search theme derived from your panel."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {matches.map((match) => (
              <Card key={match.title}>
                <CardHeader>
                  <CardTitle>{match.title}</CardTitle>
                  <CardDescription>{match.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Search phrase: {match.query}</p>
                  <a
                    href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(match.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-primary underline"
                  >
                    Search ClinicalTrials.gov
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
