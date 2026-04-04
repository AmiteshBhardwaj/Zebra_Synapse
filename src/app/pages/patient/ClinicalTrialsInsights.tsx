import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { getLatestLabPanel, getTrialMatches } from "../../../lib/labInsights";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";

export default function ClinicalTrialsInsights() {
  const { hasLabReports, loading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const latestPanel = getLatestLabPanel(panels);
  const matches = latestPanel ? getTrialMatches(latestPanel) : [];

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
      )}
    </div>
  );
}
