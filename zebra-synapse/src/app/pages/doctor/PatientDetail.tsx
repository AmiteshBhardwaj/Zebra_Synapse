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
import {
  LAB_PANEL_SELECT,
  formatLabDate,
  type LabPanelRow,
} from "../../../lib/labPanels";
import {
  getDiseasePredictions,
  getLatestLabPanel,
  getNutritionPlans,
  getOverallStatus,
  getWellnessTips,
} from "../../../lib/labInsights";
import { toast } from "sonner";
import {
  portalDialogClass,
  portalInputClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";

type PatientLabUploadRow = {
  id: string;
  original_filename: string;
  created_at: string;
};

type TimelineItem = {
  id: string;
  kind: "care_action" | "prescription";
  title: string;
  details: string | null;
  createdAt: string;
  badge: string;
  status?: string;
  scheduledFor?: string | null;
};

type QuickActionKind =
  | "follow_up"
  | "lab_request"
  | "message"
  | "referral"
  | "treatment_plan";

function isMissingCareActionsTableError(message: string | undefined): boolean {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("could not find the table 'public.care_actions'")
    || normalized.includes('could not find the table "public.care_actions"');
}

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

function joinAvailableValues(values: Array<string | null | undefined>, fallback: string) {
  const items = values.map((value) => value?.trim()).filter(Boolean);
  return items.length ? items.join(" • ") : fallback;
}

function formatNullableMetric(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "-";
  return `${value}${suffix}`;
}

function buildRelationshipInsights(args: {
  glucose: number | null | undefined;
  bloodPressureSystolic: number | null | undefined;
  bloodPressureDiastolic: number | null | undefined;
  riskFlags: string[] | null | undefined;
  status: "normal" | "elevated" | "risk";
}) {
  const insights: Array<{ title: string; summary: string; nextStep: string }> = [];

  if (args.riskFlags?.length) {
    insights.push({
      title: "Priority risk flags",
      summary: `Current chart flags: ${args.riskFlags.join(", ")}.`,
      nextStep: "Review these flags alongside the current care plan and recent prescriptions.",
    });
  }

  if (args.glucose != null) {
    if (args.glucose >= 126) {
      insights.push({
        title: "Glucose is in a diabetes-range pattern",
        summary: `The latest glucose value is ${args.glucose} mg/dL, which warrants clinical review.`,
        nextStep: "Confirm with repeat labs or A1c and align the treatment plan with the patient.",
      });
    } else if (args.glucose >= 100) {
      insights.push({
        title: "Glucose is above the ideal fasting range",
        summary: `The latest glucose value is ${args.glucose} mg/dL, suggesting closer monitoring.`,
        nextStep: "Track trend direction and reinforce diet, activity, and follow-up timing.",
      });
    }
  }

  if (
    args.bloodPressureSystolic != null &&
    args.bloodPressureDiastolic != null &&
    (args.bloodPressureSystolic >= 130 || args.bloodPressureDiastolic >= 80)
  ) {
    insights.push({
      title: "Blood pressure remains elevated",
      summary: `Current blood pressure is ${args.bloodPressureSystolic}/${args.bloodPressureDiastolic}.`,
      nextStep: "Recheck adherence, home readings, and whether medication adjustment is needed.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Current chart looks stable",
      summary: `The latest linked-care status is ${args.status}. No additional structured alerts were generated from the current snapshot alone.`,
      nextStep: "Use lab uploads or serial vitals to strengthen longitudinal insight quality.",
    });
  }

  return insights;
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
  const [labPanels, setLabPanels] = useState<LabPanelRow[]>([]);
  const [labPanelsLoading, setLabPanelsLoading] = useState(false);
  const [careActions, setCareActions] = useState<CareActionRow[]>([]);
  const [careActionsLoading, setCareActionsLoading] = useState(false);
  const [careActionsUnavailable, setCareActionsUnavailable] = useState(false);
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
    setLabUploads([]);
    setLabPanels([]);
    setCareActions([]);
    setCareActionsUnavailable(false);
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

  const loadLabPanels = useCallback(async () => {
    if (!patientId || !rel) return;
    const sb = getSupabase();
    if (!sb) return;
    setLabPanelsLoading(true);
    const { data, error } = await sb
      .from("lab_panels")
      .select(LAB_PANEL_SELECT)
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false });
    setLabPanelsLoading(false);
    if (error) {
      console.error("[lab_panels]", error.message);
      setLabPanels([]);
      return;
    }
    setLabPanels(((data ?? []) as unknown) as LabPanelRow[]);
  }, [patientId, rel]);

  useEffect(() => {
    if (rel) void loadLabPanels();
  }, [rel, loadLabPanels]);

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
      if (isMissingCareActionsTableError(error.message)) {
        setCareActionsUnavailable(true);
        setCareActions([]);
        return;
      }
      console.error("[care_actions]", error.message);
      toast.error("Could not load care activity");
      setCareActions([]);
      return;
    }
    setCareActionsUnavailable(false);
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
        if (isMissingCareActionsTableError(error.message)) {
          setCareActionsUnavailable(true);
          toast.error("Supabase is missing the care_actions table. Apply migration 008_care_actions.sql.");
          return false;
        }
        toast.error(error.message);
        return false;
      }
      setCareActionsUnavailable(false);
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
  const patient = {
    name: patientName,
    gender: "",
    bloodType: "",
    condition: rel?.primary_condition?.trim() || "Not recorded",
    phone: "",
    email: "",
    lastVisit: formatDisplayDate(rel?.last_visit ?? rel?.created_at),
    status: (rel?.health_status ?? "normal") as "normal" | "elevated" | "risk",
  };

  const nextAppointmentLabel = nextFollowUp?.scheduled_for
    ? formatCareActionDateTime(nextFollowUp.scheduled_for)
    : "-";
  const patientIdentityLine = joinAvailableValues(
    [patient.gender, patient.bloodType],
    "Profile details not available",
  );
  const patientContactLine = joinAvailableValues(
    [patient.phone, patient.email],
    "No contact details on file",
  );

  const vitalsSummary = {
    heartRate: rel?.heart_rate,
    bloodPressure: formatBloodPressure(
      rel?.blood_pressure_systolic ?? null,
      rel?.blood_pressure_diastolic ?? null,
    ),
    glucose: rel?.glucose,
  };
  const latestLabPanel = getLatestLabPanel(labPanels);
  const latestLabStatus = latestLabPanel ? getOverallStatus(latestLabPanel) : null;
  const diseasePredictions = latestLabPanel ? getDiseasePredictions(latestLabPanel) : [];
  const nutritionPlans = latestLabPanel ? getNutritionPlans(latestLabPanel) : [];
  const wellnessTips = latestLabPanel ? getWellnessTips(latestLabPanel) : [];
  const relationshipInsights = buildRelationshipInsights({
    glucose: rel?.glucose,
    bloodPressureSystolic: rel?.blood_pressure_systolic,
    bloodPressureDiastolic: rel?.blood_pressure_diastolic,
    riskFlags: rel?.risk_flags,
    status: patient.status,
  });
  const activityFeed: TimelineItem[] = [
    ...careActions.map((action) => ({
      id: action.id,
      kind: "care_action" as const,
      title: action.title,
      details: action.details,
      createdAt: action.created_at,
      badge: careActionTypeLabel(action.action_type),
      status: careActionStatusLabel(action.status),
      scheduledFor: action.scheduled_for,
    })),
    ...prescriptions.map((rx) => ({
      id: `prescription-${rx.id}`,
      kind: "prescription" as const,
      title: prescriptionHeading(rx.details),
      details: rx.details,
      createdAt: rx.created_at,
      badge: "Prescription",
      status: rx.status === "completed" ? "Completed" : "Active",
      scheduledFor: null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      `- Heart rate: ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "â€”"}`,
      `- Blood pressure: ${vitalsSummary.bloodPressure ?? "â€”"}`,
      `- Glucose: ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "â€”"}`,
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
  const detailPageClass =
    "min-h-full bg-transparent p-8 text-white [&_[data-slot=card]]:rounded-[1.5rem] [&_[data-slot=card]]:border [&_[data-slot=card]]:border-white/10 [&_[data-slot=card]]:bg-white/[0.05] [&_[data-slot=card]]:text-white [&_[data-slot=card]]:shadow-[0_8px_32px_rgba(0,0,0,0.4)] [&_[data-slot=card]]:backdrop-blur-xl [&_[data-slot=card-title]]:text-white [&_[data-slot=card-description]]:text-white/60 [&_[data-slot=tabs-list]]:h-auto [&_[data-slot=tabs-list]]:w-full [&_[data-slot=tabs-list]]:flex-wrap [&_[data-slot=tabs-list]]:rounded-2xl [&_[data-slot=tabs-list]]:border [&_[data-slot=tabs-list]]:border-white/10 [&_[data-slot=tabs-list]]:bg-white/[0.04] [&_[data-slot=tabs-list]]:p-1 [&_[data-slot=tabs-trigger]]:rounded-xl [&_[data-slot=tabs-trigger]]:px-4 [&_[data-slot=tabs-trigger]]:py-2.5 [&_[data-slot=tabs-trigger]]:text-white/60 [&_[data-slot=tabs-trigger][data-state=active]]:border-transparent [&_[data-slot=tabs-trigger][data-state=active]]:bg-gradient-to-r [&_[data-slot=tabs-trigger][data-state=active]]:from-orange-500 [&_[data-slot=tabs-trigger][data-state=active]]:to-orange-600 [&_[data-slot=tabs-trigger][data-state=active]]:text-white [&_[data-slot=tabs-trigger][data-state=active]]:shadow-lg [&_[data-slot=tabs-trigger][data-state=active]]:shadow-orange-500/20 [&_label]:text-white [&_input]:text-white [&_input]:placeholder:text-white/40 [&_textarea]:border-white/10 [&_textarea]:bg-white/[0.05] [&_textarea]:text-white [&_textarea]:placeholder:text-white/40 [&_textarea]:focus-visible:border-orange-500 [&_textarea]:focus-visible:ring-orange-500/30";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-white/60">
        Loading patient...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-8 text-white">
        <Button variant="outline" className={portalSecondaryButtonClass} onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-[#ff9c9c]" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="space-y-4 p-8 text-white">
        <Button variant="outline" className={portalSecondaryButtonClass} onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-white/60">
          Patient not found or you do not have access to this record.
        </p>
      </div>
    );
  }

  return (
    <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
      <DialogContent className={portalDialogClass}>
        <DialogHeader>
          <DialogTitle className="text-white">
            {activeActionKind ? quickActionConfig(activeActionKind).label : "Quick Action"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
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
              className={portalInputClass}
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
                className={portalInputClass}
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
          <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => setActionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className={portalPrimaryButtonClass}
            onClick={() => void handleQuickActionSubmit()}
            disabled={careActionSaving}
          >
            {careActionSaving ? "Saving..." : "Save Action"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <div className={detailPageClass}>
      <Button variant="outline" className={`mb-6 ${portalSecondaryButtonClass}`} onClick={() => navigate("/doctor")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.05] text-white">
              <span className="text-xl">{initials(patient.name)}</span>
            </div>
            <div>
              <h1 className="text-3xl text-white">{patient.name}</h1>
              <p className="mt-1 text-white/60">
                {patientIdentityLine}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {patientContactLine}
              </p>
            </div>
          </div>
          <Badge className={
            patient.status === "normal" ? "border border-green-500/20 bg-green-500/20 text-green-400" :
            patient.status === "elevated" ? "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400" :
            "border border-red-500/20 bg-red-500/20 text-red-400"
          }>
            {patient.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-sm text-white/40">Heart Rate</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-white/40">Blood Pressure</p>
            </div>
            <p className="text-2xl font-bold text-white">{vitalsSummary.bloodPressure ?? "-"}</p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-white/40">Glucose</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <p className="text-sm text-white/40">Next Appointment</p>
            </div>
            <p className="text-lg font-bold text-white">{nextAppointmentLabel}</p>
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
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-white/40">Primary Condition</p>
                  <p className="font-semibold text-white">{patient.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Last Visit</p>
                  <p className="font-semibold text-white">{patient.lastVisit}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Next Appointment</p>
                  <p className="font-semibold text-white">{nextAppointmentLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Contact</p>
                  <p className="font-semibold text-white">{patient.phone}</p>
                  <p className="text-sm text-white/60">{patient.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle>Current Medications</CardTitle>
                <CardDescription>Active prescriptions on file</CardDescription>
              </CardHeader>
              <CardContent>
                {prescLoading ? (
                  <p className="text-sm text-white/60">Loading prescriptions...</p>
                ) : activePrescriptionsList.length === 0 ? (
                  <p className="text-sm text-white/60">
                    No active prescriptions. Add one under Actions.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activePrescriptionsList.map((rx) => (
                      <div key={rx.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-[#ff9c61]" />
                          <p className="font-semibold text-white">{prescriptionHeading(rx.details)}</p>
                        </div>
                        <p className="text-sm text-white/70 whitespace-pre-wrap">{rx.details}</p>
                        <p className="text-xs text-white/40 mt-2">
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle>Current clinical snapshot</CardTitle>
                  <CardDescription>Latest linked-care vitals and chart context</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Heart Rate</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatNullableMetric(vitalsSummary.heartRate, " bpm")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Blood Pressure</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {vitalsSummary.bloodPressure ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Glucose</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatNullableMetric(vitalsSummary.glucose, " mg/dL")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Last Visit</p>
                    <p className="mt-2 text-lg font-semibold text-white">{patient.lastVisit}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle>Trend coverage</CardTitle>
                  <CardDescription>Structured history available for this patient</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Lab panels on file</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{labPanels.length}</p>
                    <p className="mt-2 text-sm text-white/60">
                      {latestLabPanel
                        ? `Latest structured panel recorded ${formatLabDate(latestLabPanel.recorded_at)}.`
                        : "No structured lab panel yet. The doctor portal is currently limited to the latest care snapshot."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm text-white/40">Uploaded reports</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{labUploads.length}</p>
                    <p className="mt-2 text-sm text-white/60">
                      Uploads create longitudinal context for glucose, A1c, and related insights.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle>Vitals history timeline</CardTitle>
                <CardDescription>Recorded observations available to the doctor portal</CardDescription>
              </CardHeader>
              <CardContent>
                {labPanelsLoading ? (
                  <p className="text-sm text-white/60">Loading vitals history...</p>
                ) : labPanels.length === 0 ? (
                  <p className="text-sm text-white/60">
                    No longitudinal lab-backed history is stored yet. The cards above show the latest
                    linked-care snapshot. Upload reports or record additional structured panels to
                    unlock a true timeline.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {labPanels.map((panel) => (
                      <div key={panel.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">{formatLabDate(panel.recorded_at)}</p>
                            <p className="mt-1 text-sm text-white/60">
                              Structured panel values recorded for this patient.
                            </p>
                          </div>
                          {panel.notes ? (
                            <p className="max-w-xl text-sm text-white/60">{panel.notes}</p>
                          ) : null}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                            <p className="text-xs text-white/40">Fasting Glucose</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatNullableMetric(panel.fasting_glucose, " mg/dL")}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                            <p className="text-xs text-white/40">Hemoglobin A1c</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatNullableMetric(panel.hemoglobin_a1c, "%")}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                            <p className="text-xs text-white/40">Creatinine</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatNullableMetric(panel.creatinine, " mg/dL")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="labs">
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle>Patient lab files</CardTitle>
              <CardDescription>Reports the patient uploaded from their portal</CardDescription>
            </CardHeader>
            <CardContent>
              {labLoading ? (
                <p className="text-sm text-white/60">Loading...</p>
              ) : labUploads.length === 0 ? (
                <p className="text-sm text-white/60">
                  No lab files uploaded yet. Ask the patient to upload reports from Health Overview.
                  Parsed biomarkers are not shown until extraction is implemented.
                </p>
              ) : (
                <div className="space-y-3">
                  {labUploads.map((lab) => (
                    <div
                      key={lab.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                          <FileText className="w-5 h-5 text-[#ff9c61]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-white">{lab.original_filename}</p>
                          <p className="text-sm text-white/40">
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
          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle>Medication History</CardTitle>
              <CardDescription>Current and past prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {prescLoading ? (
                <p className="text-sm text-white/60">Loading...</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-sm text-white/50 mb-3">Active</h4>
                    {activePrescriptionsList.length === 0 ? (
                      <p className="text-sm text-white/60">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {activePrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-green-500 pl-4 py-2"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-white/70 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-white/40 mt-2">
                                  {rx.prescribed_by === user?.id
                                    ? "You"
                                    : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                                  • {formatPrescriptionDate(rx.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className="border border-green-500/20 bg-green-500/20 text-green-400">Active</Badge>
                                {rx.prescribed_by === user?.id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={portalSecondaryButtonClass}
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
                    <h4 className="font-medium text-sm text-white/50 mb-3">Completed</h4>
                    {completedPrescriptionsList.length === 0 ? (
                      <p className="text-sm text-white/60">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {completedPrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-gray-300 pl-4 py-2 opacity-90"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-white">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-white/70 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-white/40 mt-2">
                                  {rx.prescriber?.full_name?.trim() || "Doctor"} • prescribed{" "}
                                  {formatPrescriptionDate(rx.created_at)}
                                  {rx.completed_at
                                    ? ` • completed ${formatPrescriptionDate(rx.completed_at)}`
                                    : null}
                                </p>
                              </div>
                              <Badge className="shrink-0 border border-white/10 bg-white/[0.08] text-white/75">Completed</Badge>
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
          <div className="space-y-6">
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle>AI insights</CardTitle>
                <CardDescription>Grounded in current chart data and structured labs</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {relationshipInsights.map((insight) => (
                  <div key={insight.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">{insight.title}</p>
                    <p className="mt-2 text-sm text-white/60">{insight.summary}</p>
                    <p className="mt-3 text-sm text-[#ffb788]">{insight.nextStep}</p>
                  </div>
                ))}
                {latestLabStatus ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">Latest structured panel</p>
                    <p className="mt-2 text-sm text-white/60">
                      {latestLabStatus.label} from the panel recorded {formatLabDate(latestLabPanel!.recorded_at)}.
                    </p>
                    <p className="mt-3 text-sm text-[#ffb788]">{latestLabStatus.summary}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {latestLabPanel ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className={portalPanelClass}>
                  <CardHeader>
                    <CardTitle>Disease risk signals</CardTitle>
                    <CardDescription>Rule-based patterns from the latest structured panel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {diseasePredictions.map((prediction) => (
                      <div key={prediction.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{prediction.title}</p>
                          <Badge className="border border-white/10 bg-white/[0.08] text-white">
                            {prediction.level}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-white/60">{prediction.rationale}</p>
                        <p className="mt-3 text-sm text-[#ffb788]">{prediction.nextStep}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className={portalPanelClass}>
                  <CardHeader>
                    <CardTitle>Recommended coaching themes</CardTitle>
                    <CardDescription>Nutrition and wellness guidance inferred from the latest panel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nutritionPlans.slice(0, 2).map((plan) => (
                      <div key={plan.headline} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="font-semibold text-white">{plan.headline}</p>
                        <p className="mt-2 text-sm text-white/60">{plan.focus}</p>
                        <p className="mt-3 text-sm text-[#ffb788]">{plan.actions[0]}</p>
                      </div>
                    ))}
                    {wellnessTips.slice(0, 2).map((tip) => (
                      <div key={tip.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="font-semibold text-white">{tip.title}</p>
                        <p className="mt-2 text-sm text-white/60">{tip.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={portalPanelClass}>
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
                    className={`w-full ${portalPrimaryButtonClass}`}
                    disabled={prescSaving}
                    onClick={() => void handlePrescriptionUpload()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {prescSaving ? "Saving..." : "Upload to Patient's Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={portalPanelClass}>
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
                    className={`w-full ${portalSecondaryButtonClass}`}
                    variant="outline"
                    onClick={() => void handleNotesSubmit()}
                    disabled={careActionSaving}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {careActionSaving ? "Saving..." : "Save Notes"}
                  </Button>
                  {recentNotes.length > 0 ? (
                    <div className="space-y-3 border-t border-white/10 pt-4">
                      <p className="text-sm font-medium text-white">Recent notes</p>
                      {recentNotes.map((note) => (
                        <div key={note.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-sm whitespace-pre-wrap text-white">{note.details}</p>
                          <p className="mt-2 text-xs text-white/40">
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

          <Card className={`${portalPanelClass} mt-6`}>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Persist requests and updates on this patient's chart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => openQuickAction("follow_up")}>
                  Schedule Follow-up
                </Button>
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => openQuickAction("lab_request")}>
                  Request Lab Tests
                </Button>
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => openQuickAction("message")}>
                  Send Message
                </Button>
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => openQuickAction("referral")}>
                  Refer to Specialist
                </Button>
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => openQuickAction("treatment_plan")}>
                  Update Treatment Plan
                </Button>
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => void handleGenerateReport()}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`${portalPanelClass} mt-6`}>
            <CardHeader>
              <CardTitle>Care Activity</CardTitle>
              <CardDescription>Recent actions saved for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {careActionsUnavailable ? (
                <p className="text-sm text-white/60">
                  Care activity is unavailable because this Supabase project is missing
                  <code className="mx-1 text-xs">public.care_actions</code>.
                  Apply
                  <code className="mx-1 text-xs">supabase/migrations/008_care_actions.sql</code>
                  and refresh.
                </p>
              ) : careActionsLoading ? (
                <p className="text-sm text-white/60">Loading care activity...</p>
              ) : activityFeed.length === 0 ? (
                <p className="text-sm text-white/60">
                  No care activity logged yet. Notes, quick actions, and prescriptions will appear here once saved.
                </p>
              ) : (
                <div className="space-y-3">
                  {activityFeed.map((action) => (
                    <div key={action.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{action.title}</p>
                            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/75">
                              {action.badge}
                            </Badge>
                            {action.status ? (
                              <Badge className="border border-white/10 bg-white/[0.08] text-white">
                                {action.status}
                              </Badge>
                            ) : null}
                          </div>
                          {action.details ? (
                            <p className="mt-2 text-sm text-white/60 whitespace-pre-wrap">
                              {action.details}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-white/40">
                          <p>Logged {formatCareActionDateTime(action.createdAt)}</p>
                          {action.scheduledFor ? (
                            <p className="mt-1">Scheduled {formatCareActionDateTime(action.scheduledFor)}</p>
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



