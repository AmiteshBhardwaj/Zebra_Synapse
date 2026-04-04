import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Upload,
  CheckCircle,
  FileText,
  Sparkles,
  Activity,
  AlertCircle,
} from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { EMPTY_LAB_PANEL_INPUT, formatLabDate } from "../../../lib/labPanels";
import {
  getLatestLabPanel,
  getMetricAssessments,
  getMetricValueLabel,
  getOverallStatus,
} from "../../../lib/labInsights";

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function PatientHome() {
  const { hasLabReports, loading, uploads, uploadLabReport } = usePatientLabReports();
  const { panels, loading: panelsLoading, savePanel, hasPanels } = usePatientLabPanels();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingPanel, setSavingPanel] = useState(false);
  const [panelForm, setPanelForm] = useState({
    ...EMPTY_LAB_PANEL_INPUT,
    recordedAt: new Date().toISOString().slice(0, 10),
  });

  const latestPanel = useMemo(() => getLatestLabPanel(panels), [panels]);
  const overall = latestPanel ? getOverallStatus(latestPanel) : null;
  const topMetrics = latestPanel ? getMetricAssessments(latestPanel).slice(0, 4) : [];

  const uploadsWithoutPanels = useMemo(() => {
    const usedUploadIds = new Set(
      panels.map((panel) => panel.upload_id).filter((value): value is string => Boolean(value)),
    );
    return uploads.filter((upload) => !usedUploadIds.has(upload.id));
  }, [panels, uploads]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    try {
      await uploadLabReport(selectedFile);
      toast.success("Lab report uploaded.");
      setSelectedFile(null);
      const input = document.getElementById("lab-upload") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field: keyof typeof panelForm, value: string) => {
    setPanelForm((current) => ({ ...current, [field]: value }));
  };

  const handleSavePanel = async () => {
    setSavingPanel(true);
    try {
      await savePanel(panelForm);
      toast.success("Structured lab values saved. Analysis is now available across your portal.");
      setPanelForm({
        ...EMPTY_LAB_PANEL_INPUT,
        recordedAt: new Date().toISOString().slice(0, 10),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save lab values";
      toast.error(msg);
    } finally {
      setSavingPanel(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Health Overview</h1>
        <p className="text-gray-600 mt-1">
          {hasPanels
            ? "Your latest structured lab results are now driving the analysis across the portal."
            : hasLabReports
              ? "Your report files are saved. Add the values from the report below to generate analysis."
              : "Upload a lab report to unlock medical records, vitals summaries, and personalized insights."}
        </p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload lab test results</CardTitle>
            <CardDescription>
              PDF or image files are stored securely. After upload, enter the values from the
              report once so the rest of the portal can analyze them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="lab-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
              />
              <label htmlFor="lab-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : "Click to choose a file"}
                </p>
                <p className="text-xs text-gray-500">PDF, PNG, or JPG up to 10MB</p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                <span>Ready to upload. After upload, enter the values from the report.</span>
              </div>
            )}
            <Button
              className="w-full mt-4"
              disabled={!selectedFile || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Uploading…" : "Upload lab report"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {hasLabReports ? (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Generate structured analysis</CardTitle>
              <CardDescription>
                Automatic OCR is not wired into this project yet, so enter the key markers from the
                report once. Every patient insight page will then use those real values.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {uploadsWithoutPanels.length === 0 ? (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>All uploaded reports already have structured values</AlertTitle>
                  <AlertDescription>
                    Upload another report to record a newer panel, or review the latest analysis below.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Uploaded report</Label>
                      <Select
                        value={panelForm.uploadId}
                        onValueChange={(value) => setField("uploadId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a report" />
                        </SelectTrigger>
                        <SelectContent>
                          {uploadsWithoutPanels.map((upload) => (
                            <SelectItem key={upload.id} value={upload.id}>
                              {upload.original_filename}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recorded_at">Lab date</Label>
                      <Input
                        id="recorded_at"
                        type="date"
                        value={panelForm.recordedAt}
                        onChange={(e) => setField("recordedAt", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="hemoglobin_a1c">Hemoglobin A1c (%)</Label>
                      <Input id="hemoglobin_a1c" inputMode="decimal" value={panelForm.hemoglobinA1c} onChange={(e) => setField("hemoglobinA1c", e.target.value)} placeholder="5.6" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fasting_glucose">Fasting glucose (mg/dL)</Label>
                      <Input id="fasting_glucose" inputMode="decimal" value={panelForm.fastingGlucose} onChange={(e) => setField("fastingGlucose", e.target.value)} placeholder="92" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_cholesterol">Total cholesterol (mg/dL)</Label>
                      <Input id="total_cholesterol" inputMode="decimal" value={panelForm.totalCholesterol} onChange={(e) => setField("totalCholesterol", e.target.value)} placeholder="178" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ldl">LDL (mg/dL)</Label>
                      <Input id="ldl" inputMode="decimal" value={panelForm.ldl} onChange={(e) => setField("ldl", e.target.value)} placeholder="102" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hdl">HDL (mg/dL)</Label>
                      <Input id="hdl" inputMode="decimal" value={panelForm.hdl} onChange={(e) => setField("hdl", e.target.value)} placeholder="48" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="triglycerides">Triglycerides (mg/dL)</Label>
                      <Input id="triglycerides" inputMode="decimal" value={panelForm.triglycerides} onChange={(e) => setField("triglycerides", e.target.value)} placeholder="140" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                      <Input id="hemoglobin" inputMode="decimal" value={panelForm.hemoglobin} onChange={(e) => setField("hemoglobin", e.target.value)} placeholder="13.4" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wbc">White blood cells (x10^3/uL)</Label>
                      <Input id="wbc" inputMode="decimal" value={panelForm.wbc} onChange={(e) => setField("wbc", e.target.value)} placeholder="6.2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="platelets">Platelets (x10^3/uL)</Label>
                      <Input id="platelets" inputMode="decimal" value={panelForm.platelets} onChange={(e) => setField("platelets", e.target.value)} placeholder="250" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creatinine">Creatinine (mg/dL)</Label>
                      <Input id="creatinine" inputMode="decimal" value={panelForm.creatinine} onChange={(e) => setField("creatinine", e.target.value)} placeholder="0.92" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Report notes</Label>
                    <Textarea
                      id="notes"
                      value={panelForm.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="Optional context from the report, such as fasting status or clinician comments."
                      rows={3}
                    />
                  </div>

                  <Button type="button" disabled={savingPanel} onClick={() => void handleSavePanel()}>
                    {savingPanel ? "Saving values..." : "Generate analysis from this report"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your reports…</p>
      ) : panelsLoading ? (
        <p className="text-sm text-muted-foreground">Loading your lab analysis...</p>
      ) : hasLabReports ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your lab reports</CardTitle>
              <CardDescription>Files on file for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploads.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium">{u.original_filename}</p>
                    <p className="text-sm text-muted-foreground">{formatUploadedAt(u.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {latestPanel ? (
            <Card>
              <CardHeader>
                <CardTitle>Latest lab analysis</CardTitle>
                <CardDescription>
                  Based on the values recorded for {formatLabDate(latestPanel.recorded_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert
                  className={
                    overall?.tone === "attention"
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950"
                  }
                >
                  {overall?.tone === "attention" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{overall?.label}</AlertTitle>
                  <AlertDescription>{overall?.summary}</AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {topMetrics.map((metric) => (
                    <div key={metric.key} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{metric.label}</p>
                      </div>
                      <p className="text-2xl font-semibold">{getMetricValueLabel(metric)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Range: {metric.range}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{metric.summary}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analysis pending values</CardTitle>
                <CardDescription>Uploads alone do not create biomarkers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your files are stored correctly, but this app needs the key report values entered
                  once before it can generate records, disease prediction, nutrition guidance, and
                  wellness insights.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
