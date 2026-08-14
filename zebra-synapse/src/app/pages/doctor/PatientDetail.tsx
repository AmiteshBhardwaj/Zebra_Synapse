import { useMemo } from "react";
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
  Bot,
  CheckCircle2,
  Check,
  Clock,
  Sparkles,
  Stethoscope,
  XCircle,
  Edit3,
  Ruler,
  Scale,
  Utensils,
  ShieldAlert,
  Flame,
  Leaf,
  Dumbbell,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { generateDeterministicExercisePlan } from "../../../lib/exercisePlan";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  formatBloodPressure,
  formatDisplayDate,
  calculateBmi,
  getBmiCategory,
  formatHeight,
  formatWeight,
  type CareRelationshipListRow,
} from "../../../lib/careRelationships";
import {
  fetchDoctorPatientQueries,
  verifyLabReportQuery,
  rejectAndReplaceLabReportQuery,
  type LabReportQueryRow,
} from "../../../lib/labReportChat";
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
  LAB_REPORT_UPLOAD_SELECT,
  getUploadStatusMeta,
} from "../../../lib/labReportAnalysis";
import {
  getDiseasePredictions,
  getLatestLabPanel,
  getNutritionPlans,
  getOverallStatus,
  getWellnessTips,
  synthesizeMultiPanelData,
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
  analysis_status: "uploaded" | "queued" | "processing" | "review_required" | "ready" | "failed";
  last_error: string | null;
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

  // Lab Report AI Chat Queries state
  const [queries, setQueries] = useState<LabReportQueryRow[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQueryForReject, setSelectedQueryForReject] = useState<LabReportQueryRow | null>(null);
  const [customDoctorResponse, setCustomDoctorResponse] = useState("");
  const [doctorRejectNotes, setDoctorRejectNotes] = useState("");
  const [queryActionSaving, setQueryActionSaving] = useState(false);

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
    setQueries([]);
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
      .select(LAB_REPORT_UPLOAD_SELECT)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setLabLoading(false);
    if (error) {
      console.error("[lab_report_uploads]", error.message);
      setLabUploads([]);
      return;
    }
    setLabUploads(((data ?? []) as unknown) as PatientLabUploadRow[]);
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

  const loadQueries = useCallback(async () => {
    if (!patientId || !user?.id) return;
    setQueriesLoading(true);
    try {
      const rows = await fetchDoctorPatientQueries({
        doctorId: user.id,
        patientId,
      });
      setQueries(rows);
    } catch (e) {
      console.error("[lab report queries]", e);
    } finally {
      setQueriesLoading(false);
    }
  }, [patientId, user?.id]);

  useEffect(() => {
    if (rel) void loadQueries();
  }, [rel, loadQueries]);

  const handleVerifyQuery = async (queryId: string, notesText?: string) => {
    if (!user?.id) return;
    setQueryActionSaving(true);
    try {
      await verifyLabReportQuery({
        queryId,
        doctorId: user.id,
        doctorNotes: notesText,
      });
      toast.success("Response verified and marked as approved by doctor!");
      void loadQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to verify query");
    } finally {
      setQueryActionSaving(false);
    }
  };

  const handleOpenRejectDialog = (query: LabReportQueryRow) => {
    setSelectedQueryForReject(query);
    setCustomDoctorResponse(query.doctor_response || "");
    setDoctorRejectNotes(query.doctor_notes || "");
    setRejectDialogOpen(true);
  };

  const handleSubmitRejectAndReplace = async () => {
    if (!selectedQueryForReject || !user?.id) return;
    if (!customDoctorResponse.trim()) {
      toast.error("Please provide your replacement clinical advice for the patient");
      return;
    }
    setQueryActionSaving(true);
    try {
      await rejectAndReplaceLabReportQuery({
        queryId: selectedQueryForReject.id,
        doctorId: user.id,
        doctorResponse: customDoctorResponse.trim(),
        doctorNotes: doctorRejectNotes.trim() || undefined,
      });
      toast.success("AI answer replaced with your verified clinical guidance!");
      setRejectDialogOpen(false);
      setSelectedQueryForReject(null);
      setCustomDoctorResponse("");
      setDoctorRejectNotes("");
      void loadQueries();
    } catch (e: any) {
      toast.error(e.message || "Failed to replace response");
    } finally {
      setQueryActionSaving(false);
    }
  };

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
  const patientHeight = rel?.patient?.height_cm;
  const patientWeight = rel?.patient?.weight_kg;
  const patientDietaryPreference = rel?.patient?.dietary_preference;
  const patientFoodAllergies = rel?.patient?.food_allergies;
  const patientDietaryConditions = rel?.patient?.dietary_conditions;
  const patientDietaryNotes = rel?.patient?.dietary_notes;
  const patientBmi = calculateBmi(patientHeight, patientWeight);
  const patientBmiCategory = getBmiCategory(patientBmi);

  const vitalsSummary = {
    heartRate: rel?.heart_rate,
    bloodPressure: formatBloodPressure(
      rel?.blood_pressure_systolic ?? null,
      rel?.blood_pressure_diastolic ?? null,
    ),
    glucose: rel?.glucose,
    height: patientHeight,
    weight: patientWeight,
    bmi: patientBmi,
    bmiCategory: patientBmiCategory,
    dietaryPreference: patientDietaryPreference,
    foodAllergies: patientFoodAllergies,
    dietaryConditions: patientDietaryConditions,
    dietaryNotes: patientDietaryNotes,
  };
  const latestLabPanel = getLatestLabPanel(labPanels);
  const synthesizedLab = useMemo(() => synthesizeMultiPanelData(labPanels), [labPanels]);
  const activeDoctorPanel = labPanels.length > 0 ? synthesizedLab.panel : latestLabPanel;
  const latestLabStatus = activeDoctorPanel ? getOverallStatus(activeDoctorPanel, synthesizedLab.metadata) : null;
  const diseasePredictions = activeDoctorPanel ? getDiseasePredictions(activeDoctorPanel, synthesizedLab.trends) : [];
  const nutritionPlans = activeDoctorPanel
    ? getNutritionPlans(activeDoctorPanel, synthesizedLab.trends, {
        dietaryPreference: patientDietaryPreference,
        foodAllergies: patientFoodAllergies,
        dietaryConditions: patientDietaryConditions,
        dietaryNotes: patientDietaryNotes,
      })
    : [];
  const wellnessTips = activeDoctorPanel ? getWellnessTips(activeDoctorPanel, synthesizedLab.trends) : [];
  const exercisePlan = activeDoctorPanel
    ? generateDeterministicExercisePlan(activeDoctorPanel, synthesizedLab.trends, {
        heightCm: patientHeight,
        weightKg: patientWeight,
        heartRate: rel?.heart_rate,
        systolicBp: rel?.blood_pressure_systolic,
        diastolicBp: rel?.blood_pressure_diastolic,
      })
    : null;
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
      "Latest vitals & body metrics",
      `- Heart rate: ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}`,
      `- Blood pressure: ${vitalsSummary.bloodPressure ?? "—"}`,
      `- Glucose: ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}`,
      `- Height: ${formatHeight(vitalsSummary.height)}`,
      `- Weight: ${formatWeight(vitalsSummary.weight)}`,
      `- Body Mass Index (BMI): ${vitalsSummary.bmi != null ? `${vitalsSummary.bmi} kg/m² (${vitalsSummary.bmiCategory.label})` : "—"}`,
      "",
      "Dietary preferences & conditions",
      `- Diet type: ${patientDietaryPreference ? patientDietaryPreference.charAt(0).toUpperCase() + patientDietaryPreference.slice(1) : "Omnivore"}`,
      `- Food allergies: ${patientFoodAllergies?.length ? patientFoodAllergies.join(", ") : "None reported"}`,
      `- Digestive & health conditions: ${patientDietaryConditions?.length ? patientDietaryConditions.map((c) => c.toUpperCase()).join(", ") : "None reported"}`,
      ...(patientDietaryNotes ? [`- Notes: ${patientDietaryNotes}`] : []),
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
        "Downloaded a text summary with current vitals, body metrics, prescriptions, risk flags, and care activity.",
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
    "min-h-full bg-[#090b10] px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto font-sans [&_[data-slot=card]]:rounded-[1.5rem] [&_[data-slot=card]]:border [&_[data-slot=card]]:border-slate-800 [&_[data-slot=card]]:bg-[#11141e] [&_[data-slot=card]]:text-white [&_[data-slot=card]]:shadow-[0_8px_32px_rgba(0,0,0,0.5)] [&_[data-slot=card-title]]:text-white [&_[data-slot=card-description]]:text-white/60 [&_[data-slot=tabs-list]]:h-auto [&_[data-slot=tabs-list]]:w-full [&_[data-slot=tabs-list]]:rounded-2xl [&_[data-slot=tabs-list]]:border [&_[data-slot=tabs-list]]:border-slate-800 [&_[data-slot=tabs-list]]:bg-[#0d0f17] [&_[data-slot=tabs-list]]:p-1.5 [&_[data-slot=tabs-trigger]]:rounded-xl [&_[data-slot=tabs-trigger]]:px-4 [&_[data-slot=tabs-trigger]]:py-2.5 [&_[data-slot=tabs-trigger]]:text-white/60 [&_[data-slot=tabs-trigger][data-state=active]]:border-transparent [&_[data-slot=tabs-trigger][data-state=active]]:bg-gradient-to-r [&_[data-slot=tabs-trigger][data-state=active]]:from-orange-500 [&_[data-slot=tabs-trigger][data-state=active]]:to-orange-600 [&_[data-slot=tabs-trigger][data-state=active]]:text-white [&_[data-slot=tabs-trigger][data-state=active]]:shadow-lg [&_[data-slot=tabs-trigger][data-state=active]]:shadow-orange-500/20 [&_label]:text-white [&_input]:text-white [&_input]:placeholder:text-white/40 [&_textarea]:border-slate-800 [&_textarea]:bg-[#090b10] [&_textarea]:text-white [&_textarea]:placeholder:text-white/40 [&_textarea]:focus-visible:border-orange-500 [&_textarea]:focus-visible:ring-orange-500/30";

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
    <>
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
            disabled={careActionSaving}
            onClick={() => void handleQuickActionSubmit()}
          >
            {careActionSaving ? "Saving..." : "Save Action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
      <DialogContent className={portalDialogClass}>
        <DialogHeader>
          <DialogTitle className="text-white">Reject & Replace AI Response</DialogTitle>
          <DialogDescription className="text-white/60">
            Override the automated AI response with your verified clinical guidance for the patient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {selectedQueryForReject && (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <p className="text-xs font-semibold text-white/50">Patient Query:</p>
              <p className="text-sm text-white/90 italic">"{selectedQueryForReject.user_query}"</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="doctor_response">Your Clinical Guidance (Sent to Patient)</Label>
            <Textarea
              id="doctor_response"
              value={customDoctorResponse}
              onChange={(e) => setCustomDoctorResponse(e.target.value)}
              rows={5}
              placeholder="Enter your clinical instructions and advice for the patient..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor_notes">Internal Clinician Notes (Optional)</Label>
            <Input
              id="doctor_notes"
              value={doctorRejectNotes}
              onChange={(e) => setDoctorRejectNotes(e.target.value)}
              placeholder="Why was the AI response rejected? (Internal record)"
              className={portalInputClass}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => setRejectDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className={portalPrimaryButtonClass}
            disabled={queryActionSaving || !customDoctorResponse.trim()}
            onClick={() => void handleSubmitRejectAndReplace()}
          >
            {queryActionSaving ? "Saving..." : "Submit Guidance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className={detailPageClass}>
      <Button variant="outline" className={`mb-6 ${portalSecondaryButtonClass}`} onClick={() => navigate("/doctor")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <div className="mb-8 rounded-2xl border border-slate-800 bg-[#11141e] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-slate-700 bg-[#151926] text-white">
              <span className="text-xl font-bold">{initials(patient.name)}</span>
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-3xl text-white sm:text-4xl">{patient.name}</h1>
              <p className="mt-1 text-white/60">
                {patientIdentityLine}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {patientContactLine}
              </p>
            </div>
          </div>
          <Badge className={`w-fit ${
            patient.status === "normal" ? "border border-green-500/20 bg-green-500/20 text-green-400" :
            patient.status === "elevated" ? "border border-yellow-500/20 bg-yellow-500/20 text-yellow-400" :
            "border border-red-500/20 bg-red-500/20 text-red-400"
          }`}>
            {patient.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-xs text-white/50">Heart Rate</p>
            </div>
            <p className="text-xl font-bold text-white">
              {vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-white/50">Blood Pressure</p>
            </div>
            <p className="text-xl font-bold text-white">{vitalsSummary.bloodPressure ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-white/50">Glucose</p>
            </div>
            <p className="text-xl font-bold text-white">
              {vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-white/50">Height</p>
            </div>
            <p className="text-xl font-bold text-white truncate" title={formatHeight(vitalsSummary.height)}>
              {vitalsSummary.height ? `${vitalsSummary.height} cm` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-white/50">Weight</p>
            </div>
            <p className="text-xl font-bold text-white truncate" title={formatWeight(vitalsSummary.weight)}>
              {vitalsSummary.weight ? `${vitalsSummary.weight} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#ff9c61]" />
                <p className="text-xs text-white/50">BMI</p>
              </div>
              {vitalsSummary.bmi != null && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${vitalsSummary.bmiCategory.badgeClass}`}>
                  {vitalsSummary.bmiCategory.label}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-white">
              {vitalsSummary.bmi != null ? vitalsSummary.bmi : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="queries" className="relative">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              AI Chat Reviews
              {queries.filter((q) => q.status === "pending_review").length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {queries.filter((q) => q.status === "pending_review").length}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
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
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-xs text-white/40">Height</p>
                    <p className="text-sm font-semibold text-white">{formatHeight(vitalsSummary.height)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Weight</p>
                    <p className="text-sm font-semibold text-white">{formatWeight(vitalsSummary.weight)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">BMI</p>
                    <p className="text-sm font-semibold text-white">
                      {vitalsSummary.bmi != null ? `${vitalsSummary.bmi} (${vitalsSummary.bmiCategory.label})` : "—"}
                    </p>
                  </div>
                </div>

                {/* Dietary Profile & Food Restrictions in Overview */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                      Diet & Food Profile
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-300">
                      {patientDietaryPreference
                        ? patientDietaryPreference.charAt(0).toUpperCase() + patientDietaryPreference.slice(1)
                        : "Omnivore"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {patientFoodAllergies && patientFoodAllergies.length > 0 ? (
                      patientFoodAllergies.map((allergy) => (
                        <span
                          key={allergy}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full"
                        >
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                          {allergy.charAt(0).toUpperCase() + allergy.slice(1).replace("_", " ")}
                        </span>
                      ))
                    ) : null}

                    {patientDietaryConditions && patientDietaryConditions.length > 0 ? (
                      patientDietaryConditions.map((cond) => (
                        <span
                          key={cond}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full"
                        >
                          <Flame className="w-2.5 h-2.5 text-rose-400" />
                          {cond.toUpperCase()}
                        </span>
                      ))
                    ) : null}

                    {(!patientFoodAllergies || patientFoodAllergies.length === 0) &&
                      (!patientDietaryConditions || patientDietaryConditions.length === 0) && (
                        <span className="text-xs text-white/40 italic">
                          No food allergies or GI conditions recorded
                        </span>
                      )}
                  </div>

                  {patientDietaryNotes && (
                    <p className="text-[11px] text-[#b4c9e8] bg-white/[0.03] p-2 rounded-lg border border-white/5 italic">
                      <span className="font-semibold text-white/70 not-italic mr-1">Notes:</span>
                      "{patientDietaryNotes}"
                    </p>
                  )}
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
                  Published biomarker panels appear separately once the patient portal pipeline approves them.
                </p>
              ) : (
                <div className="space-y-3">
                  {labUploads.map((lab) => {
                    const status = getUploadStatusMeta(lab.analysis_status);
                    return (
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
                            {lab.analysis_status === "review_required" ? (
                              <p className="mt-1 text-xs text-[#f1d8a2]">
                                Waiting for patient review before publication.
                              </p>
                            ) : null}
                            {lab.last_error ? (
                              <p className="mt-1 text-xs text-[#ffb58c]">{lab.last_error}</p>
                            ) : null}
                          </div>
                        </div>
                        <Badge className="border border-white/10 bg-white/[0.06] text-white/75">
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries">
          <Card className={portalPanelClass}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="h-5 w-5 text-cyan-400" />
                  Patient Lab Report Queries & AI Responses
                </CardTitle>
                <CardDescription>
                  Review AI answers generated for this patient's lab inquiries. You can verify (tickmark) accurate responses or reject and replace them with your custom clinical guidance.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadQueries()}
                  disabled={queriesLoading}
                  className={`${portalSecondaryButtonClass} text-xs`}
                >
                  Refresh Inquiries
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {queriesLoading ? (
                <p className="text-sm text-white/60">Loading queries...</p>
              ) : queries.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-white/70 font-medium">No lab report inquiries submitted yet</p>
                  <p className="text-xs text-white/40 max-w-sm mx-auto">
                    When this patient asks questions in their AI Lab Assistant, they will appear here for your verification and approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {queries.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-2xl border p-5 space-y-4 transition-all ${
                        q.status === "pending_review"
                          ? "border-amber-500/40 bg-amber-500/[0.04] shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                          : q.status === "verified"
                          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                          : "border-cyan-500/30 bg-cyan-500/[0.03]"
                      }`}
                    >
                      {/* Top Header info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <FileText className="h-4 w-4 text-cyan-400" />
                          <span className="font-semibold text-white">
                            {q.upload?.original_filename || "Lab Document"}
                          </span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/40">
                            Asked {new Date(q.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {q.status === "pending_review" && (
                            <Badge className="border border-amber-500/30 bg-amber-500/20 text-amber-300 gap-1">
                              <Clock className="h-3 w-3 animate-pulse text-amber-400" />
                              Pending Verification
                            </Badge>
                          )}
                          {q.status === "verified" && (
                            <Badge className="border border-emerald-500/30 bg-emerald-500/20 text-emerald-300 gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              Verified by Doctor
                            </Badge>
                          )}
                          {q.status === "rejected_and_replaced" && (
                            <Badge className="border border-cyan-500/30 bg-cyan-500/20 text-cyan-200 gap-1">
                              <Stethoscope className="h-3 w-3 text-cyan-400" />
                              Replaced with Doctor Guidance
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Question */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                        <p className="font-mono uppercase tracking-wider text-cyan-300 text-[10px]">Patient Question</p>
                        <p className="text-slate-100 font-medium text-sm">"{q.user_query}"</p>
                      </div>

                      {/* AI Generated or Doctor Replaced Response */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono uppercase tracking-wider text-slate-400 text-[10px]">
                            {q.status === "rejected_and_replaced" ? "Your Verified Clinical Replacement:" : "AI Generated Proposal:"}
                          </span>
                        </div>

                        <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {q.status === "rejected_and_replaced" ? q.doctor_response : q.ai_response}
                        </div>

                        {q.doctor_notes && (
                          <p className="text-xs text-slate-400 italic">
                            Internal note: {q.doctor_notes}
                          </p>
                        )}
                      </div>

                      {/* Doctor Action Controls */}
                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/10">
                        {q.status === "pending_review" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenRejectDialog(q)}
                              disabled={queryActionSaving}
                              className={`${portalSecondaryButtonClass} text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/20 gap-1.5`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject & Replace
                            </Button>

                            <Button
                              type="button"
                              onClick={() => void handleVerifyQuery(q.id)}
                              disabled={queryActionSaving}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Verify Response
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">
                              Reviewed {q.reviewed_at ? new Date(q.reviewed_at).toLocaleDateString() : ""}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRejectDialog(q)}
                              className={`${portalSecondaryButtonClass} text-xs gap-1`}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Revise Guidance
                            </Button>
                          </div>
                        )}
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

        <TabsContent value="insights">
          <div className="space-y-6">
            <Card className={portalPanelClass}>
              <CardHeader>
                <CardTitle>Clinical insights</CardTitle>
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

                {exercisePlan && (
                  <Card className={portalPanelClass}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5 text-cyan-400" />
                            AI Physical Activity & Exercise Plan
                          </CardTitle>
                          <CardDescription>Synthesized from lab biomarkers, BMI ({exercisePlan.bmiSummary.bmi || "Calculated"} kg/m²), and vitals</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10 text-xs">
                          {exercisePlan.weeklyTotals.totalActiveMinutes} mins / week
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Safety precautions */}
                      {exercisePlan.safetyPrecautions && exercisePlan.safetyPrecautions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Clinical Exercise Guardrails</p>
                          <div className="grid grid-cols-1 gap-2">
                            {exercisePlan.safetyPrecautions.slice(0, 2).map((sp) => (
                              <div key={sp.id} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-xs">
                                <div className="font-semibold text-amber-200">{sp.title}</div>
                                <div className="text-white/70 mt-1">{sp.reason}</div>
                                <div className="text-cyan-300 mt-1">{sp.guidance}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Days preview */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">7-Day Conditioning Schedule</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {exercisePlan.days.slice(0, 4).map((d) => (
                            <div key={d.dayNumber} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white">{d.dayName}</span>
                                <span className="text-cyan-300 font-mono">{d.estimatedDurationMin}m • {d.estimatedCalories} kcal</span>
                              </div>
                              <p className="text-xs text-white/60 mt-1 line-clamp-1">{d.focus}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
    </>
  );
}



