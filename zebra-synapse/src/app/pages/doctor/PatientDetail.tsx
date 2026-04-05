import { useParams, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  ArrowLeft,
  Heart,
  Activity,
  TrendingUp,
  FileText,
  Pill,
  Calendar,
  Upload,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  formatBloodPressure,
  formatDisplayDate,
  type CareRelationshipListRow,
} from "../../../lib/careRelationships";
import { getSupabase } from "../../../lib/supabase";
import {
  CARE_ACTIONS_SELECT,
  careActionStatusLabel,
  careActionTypeLabel,
  formatCareActionDateTime,
  type CareActionRow,
  type CareActionStatus,
  type CareActionType,
} from "../../../lib/careActions";
import {
  PRESCRIPTIONS_SELECT,
  formatPrescriptionDate,
  prescriptionHeading,
  type PrescriptionRow,
} from "../../../lib/prescriptions";
import { toast } from "sonner";

type PatientLabUploadRow = {
  id: string;
  original_filename: string;
  created_at: string;
};

type QuickActionKind =
  | "follow_up"
  | "lab_request"
  | "message"
  | "referral"
  | "treatment_plan";

function formatLabUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function toDatetimeLocalInput(date: Date): string {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function quickActionConfig(type: QuickActionKind): {
  label: string;
  title: string;
  description: string;
  placeholder: string;
  requireSchedule?: boolean;
  detailsRequired?: boolean;
  status: CareActionStatus;
  success: string;
} {
  switch (type) {
    case "follow_up":
      return {
        label: "Schedule Follow-up",
        title: "Follow-up appointment",
        description: "Schedule the next visit and record what the patient should prepare.",
        placeholder: "Add the focus for the next visit, prep instructions, or clinic location.",
        requireSchedule: true,
        status: "scheduled",
        success: "Follow-up scheduled",
      };
    case "lab_request":
      return {
        label: "Request Lab Tests",
        title: "Lab test request",
        description: "Record the labs you want the patient to complete.",
        placeholder: "List the requested labs and any fasting or timing instructions.",
        detailsRequired: true,
        status: "open",
        success: "Lab request saved",
      };
    case "message":
      return {
        label: "Send Message",
        title: "Message to patient",
        description: "Save a patient-facing message in the care activity log.",
        placeholder: "Write the message you want associated with this patient record.",
        detailsRequired: true,
        status: "sent",
        success: "Message saved",
      };
    case "referral":
      return {
        label: "Refer to Specialist",
        title: "Specialist referral",
        description: "Record the specialist, reason, and any referral notes.",
        placeholder: "Enter the specialty, clinician, and referral context.",
        detailsRequired: true,
        status: "open",
        success: "Referral saved",
      };
    case "treatment_plan":
      return {
        label: "Update Treatment Plan",
        title: "Treatment plan update",
        description: "Document the latest treatment plan adjustments for this patient.",
        placeholder: "Summarize the updated plan, medication changes, and next steps.",
        detailsRequired: true,
        status: "completed",
        success: "Treatment plan update saved",
      };
  }
}

function downloadClinicalReport(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [rel, setRel] = useState<CareRelationshipListRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [prescLoading, setPrescLoading] = useState(false);
  const [prescSaving, setPrescSaving] = useState(false);
  const [labUploads, setLabUploads] = useState<PatientLabUploadRow[]>([]);
  const [labLoading, setLabLoading] = useState(false);
  const [careActions, setCareActions] = useState<CareActionRow[]>([]);
  const [careActionsLoading, setCareActionsLoading] = useState(false);
  const [careActionSaving, setCareActionSaving] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [activeActionKind, setActiveActionKind] = useState<QuickActionKind | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDetails, setActionDetails] = useState("");
  const [actionSchedule, setActionSchedule] = useState("");

  const load = useCallback(async () => {
    if (!patientId) {
      setLoadError("Missing patient id.");
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb || !user) {
      setLoadError("Not signed in.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error: qErr } = await sb
      .from("care_relationships")
      .select(CARE_RELATIONSHIPS_LIST_SELECT)
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (qErr) {
      setLoadError(qErr.message);
      setRel(null);
      setLoading(false);
      return;
    }

    setRel((data as CareRelationshipListRow | null) ?? null);
    setLoading(false);
  }, [patientId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPrescriptions([]);
    setCareActions([]);
  }, [patientId]);

  const loadPrescriptions = useCallback(async () => {
    if (!patientId) return;
    const sb = getSupabase();
    if (!sb) return;
    setPrescLoading(true);
    const { data, error } = await sb
      .from("prescriptions")
      .select(PRESCRIPTIONS_SELECT)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setPrescLoading(false);
    if (error) {
      console.error("[prescriptions]", error.message);
      toast.error("Could not load prescriptions");
      setPrescriptions([]);
      return;
    }
    setPrescriptions(((data ?? []) as unknown) as PrescriptionRow[]);
  }, [patientId]);

  useEffect(() => {
    if (rel) void loadPrescriptions();
  }, [rel, loadPrescriptions]);

  const loadLabUploads = useCallback(async () => {
    if (!patientId || !rel) return;
    const sb = getSupabase();
    if (!sb) return;
    setLabLoading(true);
    const { data, error } = await sb
      .from("lab_report_uploads")
      .select("id, original_filename, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setLabLoading(false);
    if (error) {
      console.error("[lab_report_uploads]", error.message);
      setLabUploads([]);
      return;
    }
    setLabUploads((data ?? []) as PatientLabUploadRow[]);
  }, [patientId, rel]);

  useEffect(() => {
    if (rel) void loadLabUploads();
  }, [rel, loadLabUploads]);

  const loadCareActions = useCallback(async () => {
    if (!patientId) return;
    const sb = getSupabase();
    if (!sb) return;
    setCareActionsLoading(true);
    const { data, error } = await sb
      .from("care_actions")
      .select(CARE_ACTIONS_SELECT)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setCareActionsLoading(false);
    if (error) {
      console.error("[care_actions]", error.message);
      toast.error("Could not load care activity");
      setCareActions([]);
      return;
    }
    setCareActions(((data ?? []) as unknown) as CareActionRow[]);
  }, [patientId]);

  useEffect(() => {
    if (rel) void loadCareActions();
  }, [rel, loadCareActions]);

  const insertCareAction = useCallback(
    async (payload: {
      actionType: CareActionType;
      title: string;
      details?: string | null;
      status: CareActionStatus;
      scheduledFor?: string | null;
    }) => {
      const sb = getSupabase();
      if (!sb || !user?.id || !patientId) return false;
      setCareActionSaving(true);
      const { error } = await sb.from("care_actions").insert({
        doctor_id: user.id,
        patient_id: patientId,
        action_type: payload.actionType,
        title: payload.title,
        details: payload.details?.trim() ? payload.details.trim() : null,
        status: payload.status,
        scheduled_for: payload.scheduledFor?.trim()
          ? new Date(payload.scheduledFor).toISOString()
          : null,
      });
      setCareActionSaving(false);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await loadCareActions();
      return true;
    },
    [loadCareActions, patientId, user?.id],
  );

  const patientName = rel?.patient?.full_name?.trim() || "Patient";
  const upcomingFollowUps = careActions
    .filter((action) => action.action_type === "follow_up" && action.scheduled_for)
    .sort((a, b) => {
      const left = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const right = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return left - right;
    });
  const nextFollowUp =
    upcomingFollowUps.find((action) =>
      action.scheduled_for ? new Date(action.scheduled_for).getTime() >= Date.now() : false,
    ) ?? upcomingFollowUps[0] ?? null;
  const recentNotes = careActions.filter((action) => action.action_type === "note").slice(0, 3);
  const activityFeed = careActions.filter((action) => action.action_type !== "note");
  const patient = {
    name: patientName,
    gender: "-",
    bloodType: "-",
    condition: rel?.primary_condition?.trim() || "-",
    phone: "-",
    email: "-",
    lastVisit: formatDisplayDate(rel?.last_visit ?? rel?.created_at),
    nextAppointment: "-",
    status: (rel?.health_status ?? "normal") as "normal" | "elevated" | "risk",
  };

  const nextAppointmentLabel = nextFollowUp?.scheduled_for
    ? formatCareActionDateTime(nextFollowUp.scheduled_for)
    : "-";

  const vitalsSummary = {
    heartRate: rel?.heart_rate,
    bloodPressure: formatBloodPressure(
      rel?.blood_pressure_systolic ?? null,
      rel?.blood_pressure_diastolic ?? null,
    ),
    glucose: rel?.glucose,
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handlePrescriptionUpload = async () => {
    const text = prescription.trim();
    if (!text) {
      toast.error("Enter prescription details first");
      return;
    }
    const sb = getSupabase();
    if (!sb || !user?.id || !patientId) return;
    setPrescSaving(true);
    const { error } = await sb.from("prescriptions").insert({
      patient_id: patientId,
      prescribed_by: user.id,
      details: text,
      status: "active",
    });
    setPrescSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prescription added to patient record");
    setPrescription("");
    void loadPrescriptions();
  };

  const handleMarkPrescriptionComplete = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from("prescriptions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prescription marked completed");
    void loadPrescriptions();
  };

  const openQuickAction = (type: QuickActionKind) => {
    const config = quickActionConfig(type);
    setActiveActionKind(type);
    setActionTitle(config.title);
    setActionDetails("");
    setActionSchedule(
      type === "follow_up"
        ? toDatetimeLocalInput(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7))
        : "",
    );
    setActionDialogOpen(true);
  };

  const handleNotesSubmit = async () => {
    const text = notes.trim();
    if (!text) {
      toast.error("Enter notes before saving");
      return;
    }
    const ok = await insertCareAction({
      actionType: "note",
      title: "Clinical note",
      details: text,
      status: "completed",
    });
    if (!ok) return;
    toast.success("Clinical note saved");
    setNotes("");
  };

  const handleQuickActionSubmit = async () => {
    if (!activeActionKind) return;
    const config = quickActionConfig(activeActionKind);
    const title = actionTitle.trim() || config.title;
    const details = actionDetails.trim();

    if (config.requireSchedule && !actionSchedule.trim()) {
      toast.error("Pick a follow-up time");
      return;
    }
    if (config.detailsRequired && !details) {
      toast.error("Add details before saving");
      return;
    }

    const ok = await insertCareAction({
      actionType: activeActionKind,
      title,
      details,
      status: config.status,
      scheduledFor: config.requireSchedule ? actionSchedule : null,
    });
    if (!ok) return;

    toast.success(config.success);
    setActionDialogOpen(false);
    setActiveActionKind(null);
    setActionTitle("");
    setActionDetails("");
    setActionSchedule("");
  };

  const handleGenerateReport = async () => {
    const activeMedicationSummary = prescriptions
      .filter((rx) => rx.status === "active")
      .map((rx) => prescriptionHeading(rx.details));
    const latestCareItems = careActions.slice(0, 5).map((action) => {
      const when = action.scheduled_for
        ? `scheduled ${formatCareActionDateTime(action.scheduled_for)}`
        : `logged ${formatCareActionDateTime(action.created_at)}`;
      return `- ${careActionTypeLabel(action.action_type)}: ${action.title} (${when})`;
    });
    const reportBody = [
      `Clinical Summary: ${patient.name}`,
      "",
      `Primary condition: ${patient.condition}`,
      `Health status: ${patient.status}`,
      `Last visit: ${patient.lastVisit}`,
      `Next appointment: ${nextAppointmentLabel}`,
      "",
      "Latest vitals",
      `- Heart rate: ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}`,
      `- Blood pressure: ${vitalsSummary.bloodPressure ?? "—"}`,
      `- Glucose: ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}`,
      "",
      "Risk flags",
      ...(rel?.risk_flags?.length
        ? rel.risk_flags.map((flag) => `- ${flag}`)
        : ["- None recorded"]),
      "",
      "Active prescriptions",
      ...(activeMedicationSummary.length
        ? activeMedicationSummary.map((item) => `- ${item}`)
        : ["- None"]),
      "",
      "Recent care activity",
      ...(latestCareItems.length ? latestCareItems : ["- No care actions recorded"]),
      "",
      `Generated on ${formatCareActionDateTime(new Date().toISOString())}`,
    ].join("\n");

    downloadClinicalReport(
      `${patient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-clinical-summary.txt`,
      reportBody,
    );

    const ok = await insertCareAction({
      actionType: "report",
      title: "Clinical summary generated",
      details:
        "Downloaded a text summary with current vitals, prescriptions, risk flags, and care activity.",
      status: "completed",
    });
    if (!ok) return;
    toast.success("Clinical summary downloaded");
  };

  const activePrescriptionsList = prescriptions.filter((r) => r.status === "active");
  const completedPrescriptionsList = prescriptions.filter(
    (r) => r.status === "completed",
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Loading patient...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-muted-foreground">
          Patient not found or you do not have access to this record.
        </p>
      </div>
    );
  }

  return (
    <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {activeActionKind ? quickActionConfig(activeActionKind).label : "Quick Action"}
          </DialogTitle>
          <DialogDescription>
            {activeActionKind
              ? quickActionConfig(activeActionKind).description
              : "Save a new care action for this patient."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action_title">Title</Label>
            <Input
              id="action_title"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          {activeActionKind === "follow_up" ? (
            <div className="space-y-2">
              <Label htmlFor="action_schedule">Scheduled time</Label>
              <Input
                id="action_schedule"
                type="datetime-local"
                value={actionSchedule}
                onChange={(e) => setActionSchedule(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="action_details">Details</Label>
            <Textarea
              id="action_details"
              value={actionDetails}
              onChange={(e) => setActionDetails(e.target.value)}
              rows={6}
              placeholder={
                activeActionKind
                  ? quickActionConfig(activeActionKind).placeholder
                  : "Add details"
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setActionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleQuickActionSubmit()}
            disabled={careActionSaving}
          >
            {careActionSaving ? "Saving…" : "Save Action"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <div className="p-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate("/doctor")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-muted flex items-center justify-center text-foreground">
              <span className="text-xl">{initials(patient.name)}</span>
            </div>
            <div>
              <h1 className="text-3xl text-foreground">{patient.name}</h1>
              <p className="text-muted-foreground mt-1">
                {patient.gender} • {patient.bloodType}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.phone} • {patient.email}
              </p>
            </div>
          </div>
          <Badge className={
            patient.status === "normal" ? "bg-green-100 text-green-800" :
            patient.status === "elevated" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }>
            {patient.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">Heart Rate</p>
            </div>
            <p className="text-2xl font-bold">
              {vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">Blood Pressure</p>
            </div>
            <p className="text-2xl font-bold">{vitalsSummary.bloodPressure ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-gray-500">Glucose</p>
            </div>
            <p className="text-2xl font-bold">
              {vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-500">Next Appointment</p>
            </div>
            <p className="text-lg font-bold">{nextAppointmentLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vitals History</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Primary Condition</p>
                  <p className="font-semibold">{patient.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Visit</p>
                  <p className="font-semibold">{patient.lastVisit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Appointment</p>
                  <p className="font-semibold">{nextAppointmentLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-semibold">{patient.phone}</p>
                  <p className="text-sm text-gray-600">{patient.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Medications</CardTitle>
                <CardDescription>Active prescriptions on file</CardDescription>
              </CardHeader>
              <CardContent>
                {prescLoading ? (
                  <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
                ) : activePrescriptionsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active prescriptions. Add one under Actions.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activePrescriptionsList.map((rx) => (
                      <div key={rx.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-indigo-600" />
                          <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{rx.details}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Prescribed by{" "}
                          {rx.prescribed_by === user?.id
                            ? "you"
                            : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                          on {formatPrescriptionDate(rx.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Vital trends</CardTitle>
              <CardDescription>Wearable or serial vitals (not demo data)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No time-series vitals are stored for this patient yet. The summary cards above show
                the latest values from your care relationship when provided. Charts will appear
                when device or clinic data is integrated.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader>
              <CardTitle>Patient lab files</CardTitle>
              <CardDescription>Reports the patient uploaded from their portal</CardDescription>
            </CardHeader>
            <CardContent>
              {labLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : labUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No lab files uploaded yet. Ask the patient to upload reports from Health Overview.
                  Parsed biomarkers are not shown until extraction is implemented.
                </p>
              ) : (
                <div className="space-y-3">
                  {labUploads.map((lab) => (
                    <div
                      key={lab.id}
                      className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{lab.original_filename}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded {formatLabUploadedAt(lab.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <CardTitle>Medication History</CardTitle>
              <CardDescription>Current and past prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {prescLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Active</h4>
                    {activePrescriptionsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {activePrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-green-500 pl-4 py-2"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {rx.prescribed_by === user?.id
                                    ? "You"
                                    : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                                  · {formatPrescriptionDate(rx.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                                {rx.prescribed_by === user?.id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleMarkPrescriptionComplete(rx.id)}
                                  >
                                    Mark completed
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Completed</h4>
                    {completedPrescriptionsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {completedPrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-gray-300 pl-4 py-2 opacity-90"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {rx.prescriber?.full_name?.trim() || "Doctor"} · prescribed{" "}
                                  {formatPrescriptionDate(rx.created_at)}
                                  {rx.completed_at
                                    ? ` · completed ${formatPrescriptionDate(rx.completed_at)}`
                                    : null}
                                </p>
                              </div>
                              <Badge className="bg-gray-100 text-gray-800 shrink-0">Completed</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <Card>
            <CardHeader>
              <CardTitle>AI insights</CardTitle>
              <CardDescription>Grounded in patient data only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Demo risk cards are removed. Insights will appear here when models run on structured
                lab extractions and verified vitals-not placeholder diabetes or adherence narratives.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Prescription</CardTitle>
                <CardDescription>Add new prescription for this patient</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prescription">Prescription Details</Label>
                    <Textarea
                      id="prescription"
                      placeholder="Enter medication name, dosage, frequency, and instructions..."
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={prescSaving}
                    onClick={() => void handlePrescriptionUpload()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {prescSaving ? "Saving…" : "Upload to Patient's Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>Add notes for this patient's record</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter clinical observations, treatment plans, or follow-up instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={() => void handleNotesSubmit()}
                    disabled={careActionSaving}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {careActionSaving ? "Saving…" : "Save Notes"}
                  </Button>
                  {recentNotes.length > 0 ? (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium">Recent notes</p>
                      {recentNotes.map((note) => (
                        <div key={note.id} className="rounded-lg border p-3">
                          <p className="text-sm whitespace-pre-wrap">{note.details}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Saved {formatCareActionDateTime(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Persist requests and updates on this patient's chart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button type="button" variant="outline" onClick={() => openQuickAction("follow_up")}>
                  Schedule Follow-up
                </Button>
                <Button type="button" variant="outline" onClick={() => openQuickAction("lab_request")}>
                  Request Lab Tests
                </Button>
                <Button type="button" variant="outline" onClick={() => openQuickAction("message")}>
                  Send Message
                </Button>
                <Button type="button" variant="outline" onClick={() => openQuickAction("referral")}>
                  Refer to Specialist
                </Button>
                <Button type="button" variant="outline" onClick={() => openQuickAction("treatment_plan")}>
                  Update Treatment Plan
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleGenerateReport()}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Care Activity</CardTitle>
              <CardDescription>Recent actions saved for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {careActionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading care activity…</p>
              ) : activityFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quick actions logged yet. Use the buttons above to save follow-ups, messages, referrals, lab requests, or reports.
                </p>
              ) : (
                <div className="space-y-3">
                  {activityFeed.map((action) => (
                    <div key={action.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{action.title}</p>
                            <Badge variant="outline">{careActionTypeLabel(action.action_type)}</Badge>
                            <Badge className="bg-muted text-foreground">
                              {careActionStatusLabel(action.status)}
                            </Badge>
                          </div>
                          {action.details ? (
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                              {action.details}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          <p>Logged {formatCareActionDateTime(action.created_at)}</p>
                          {action.scheduled_for ? (
                            <p className="mt-1">Scheduled {formatCareActionDateTime(action.scheduled_for)}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </Dialog>
  );
}






