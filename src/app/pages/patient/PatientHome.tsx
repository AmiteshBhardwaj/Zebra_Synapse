import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, CheckCircle, FileText } from "lucide-react";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Health Overview</h1>
        <p className="text-gray-600 mt-1">
          {hasLabReports
            ? "Your uploaded lab reports are stored securely. Insights below will use extracted data when processing is enabled."
            : "Upload a lab report to unlock medical records, vitals summaries, and personalized insights."}
        </p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload lab test results</CardTitle>
            <CardDescription>
              PDF or image files (e.g. CBC, metabolic panel). Other health pages stay empty until at
              least one file is uploaded.
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
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span>Ready to upload. We&apos;ll store this file and attach it to your record.</span>
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

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your reports…</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Charts and health scores</CardTitle>
              <CardDescription>Powered by your lab data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Glucose trends, cholesterol panels, vitals, and risk scores will appear here once
                values are extracted from your uploaded reports. Until then, no placeholder medical
                numbers are shown.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
