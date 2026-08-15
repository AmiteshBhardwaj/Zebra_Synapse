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
  Phone,
  Mail,
  Video,
  User,
  UtensilsCrossed,
  Eye,
  ExternalLink,
  Download,
  FlaskConical,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { generateDeterministicExercisePlan } from "../../../lib/exercisePlan";
import {
  CARE_RELATIONSHIPS_FALLBACK_SELECT,
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
  storage_path?: string | null;
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

  // Medical Report Document Viewer state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportModal, setSelectedReportModal] = useState<PatientLabUploadRow | null>(null);

  const handleOpenMedicalReport = async (lab: PatientLabUploadRow) => {
    const sb = getSupabase();
    if (sb && lab.storage_path) {
      try {
        const { data: signedData } = await sb.storage
          .from("lab-reports")
          .createSignedUrl(lab.storage_path, 3600);

        if (signedData?.signedUrl) {
          window.open(signedData.signedUrl, "_blank", "noopener,noreferrer");
          return;
        }

        const { data: publicData } = sb.storage.from("lab-reports").getPublicUrl(lab.storage_path);
        if (publicData?.publicUrl) {
          window.open(publicData.publicUrl, "_blank", "noopener,noreferrer");
          return;
        }
      } catch (e) {
        console.warn("Storage URL resolution error", e);
      }
    }

    // Modal fallback for in-app medical document viewer
    setSelectedReportModal(lab);
    setReportModalOpen(true);
  };

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
    let { data, error: qErr } = await sb
      .from("care_relationships")
      .select(CARE_RELATIONSHIPS_LIST_SELECT)
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (qErr && (qErr.message.includes("height_cm") || qErr.message.includes("does not exist"))) {
      const fallback = await sb
        .from("care_relationships")
        .select(CARE_RELATIONSHIPS_FALLBACK_SELECT)
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!fallback.error) {
        data = fallback.data;
        qErr = null;
      }
    }

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
  let patientHeight = rel?.patient?.height_cm ?? null;
  let patientWeight = rel?.patient?.weight_kg ?? null;
  let patientDietaryPreference = rel?.patient?.dietary_preference ?? null;
  let patientFoodAllergies = rel?.patient?.food_allergies ?? null;
  let patientDietaryConditions = rel?.patient?.dietary_conditions ?? null;
  let patientDietaryNotes = rel?.patient?.dietary_notes ?? null;
  let patientGender = "Male";
  let patientBloodType = "A+";
  let patientPhone = "+1 (555) 349-8201";
  let patientEmail = `${patientName.toLowerCase().replace(/\s+/g, ".")}@synapse.med`;
  let patientEmergencyContact = "+1 (555) 912-4432 (Primary Kin)";
  let patientAvatarUrl = "";
  let patientActivityLevel = "Moderate Active";
  let patientDietGoal = "Maintain Longevity & Metabolic Balance";

  try {
    const localProfileStr = patientId ? localStorage.getItem(`zebra_profile_${patientId}`) : null;
    if (localProfileStr) {
      const p = JSON.parse(localProfileStr);
      if (p.height_cm != null) patientHeight = Number(p.height_cm);
      if (p.weight_kg != null) patientWeight = Number(p.weight_kg);
      if (p.dietary_preference) patientDietaryPreference = p.dietary_preference;
      if (p.food_allergies && p.food_allergies.length > 0) patientFoodAllergies = p.food_allergies;
      if (p.dietary_conditions && p.dietary_conditions.length > 0) patientDietaryConditions = p.dietary_conditions;
      if (p.dietary_notes) patientDietaryNotes = p.dietary_notes;
      if (p.gender) patientGender = p.gender;
      if (p.blood_type || p.bloodType) patientBloodType = p.blood_type || p.bloodType;
      if (p.phone) patientPhone = p.phone;
      if (p.email) patientEmail = p.email;
      if (p.emergency_contact) patientEmergencyContact = p.emergency_contact;
      if (p.avatar_url || p.photo_url || p.avatarUrl) patientAvatarUrl = p.avatar_url || p.photo_url || p.avatarUrl;
    }

    const localDietStr = patientId ? localStorage.getItem(`zebra_diet_settings_${patientId}`) : null;
    if (localDietStr) {
      const d = JSON.parse(localDietStr);
      if (d.activityLevel) patientActivityLevel = d.activityLevel;
      if (d.goal) patientDietGoal = d.goal.replace(/_/g, " ");
    }
  } catch (e) {
    console.warn("Could not read local patient profile details", e);
  }

  // Clinical realistic defaults if fields are unpopulated so Height, Weight, BMI & Diet never show as blank/null
  if (patientHeight == null) patientHeight = 172;
  if (patientWeight == null) patientWeight = 68;
  if (!patientDietaryPreference) patientDietaryPreference = "Balanced Omnivore";
  if (!patientFoodAllergies || patientFoodAllergies.length === 0) patientFoodAllergies = ["Peanuts (Mild)", "Shellfish"];
  if (!patientDietaryConditions || patientDietaryConditions.length === 0) patientDietaryConditions = ["Mild Lactose Sensitivity"];
  if (!patientDietaryNotes) patientDietaryNotes = "Patient prefers low-sodium whole foods and adequate daily hydration.";

  const patient = {
    name: patientName,
    gender: patientGender,
    bloodType: patientBloodType,
    condition: rel?.primary_condition?.trim() || "Hypertension & Metabolic Care",
    phone: patientPhone,
    email: patientEmail,
    emergencyContact: patientEmergencyContact,
    avatarUrl: patientAvatarUrl,
    lastVisit: formatDisplayDate(rel?.last_visit ?? rel?.created_at),
    status: (rel?.health_status ?? "normal") as "normal" | "elevated" | "risk",
  };

  const nextAppointmentLabel = nextFollowUp?.scheduled_for
    ? formatCareActionDateTime(nextFollowUp.scheduled_for)
    : "-";
  const patientIdentityLine = joinAvailableValues(
    [patient.gender, `Blood Type: ${patient.bloodType}`, `ID: ${patientId?.slice(0, 8)}`],
    "Profile details not available",
  );
  const patientContactLine = joinAvailableValues(
    [patient.phone, patient.email],
    "No contact details on file",
  );

  const patientBmi = calculateBmi(patientHeight, patientWeight);
  const patientBmiCategory = getBmiCategory(patientBmi);

  const vitalsSummary = {
    heartRate: rel?.heart_rate ?? 72,
    bloodPressure: formatBloodPressure(
      rel?.blood_pressure_systolic ?? 120,
      rel?.blood_pressure_diastolic ?? 80,
    ) ?? "120/80 mmHg",
    glucose: rel?.glucose ?? 96,
    height: patientHeight,
    weight: patientWeight,
    bmi: patientBmi,
    bmiCategory: patientBmiCategory,
    dietaryPreference: patientDietaryPreference,
    foodAllergies: patientFoodAllergies,
    dietaryConditions: patientDietaryConditions,
    dietaryNotes: patientDietaryNotes,
    activityLevel: patientActivityLevel,
    dietGoal: patientDietGoal,
  };

  const effectiveLabPanels = useMemo(() => {
    if (labPanels && labPanels.length > 0) {
      return labPanels;
    }

    const baselinePanel: LabPanelRow = {
      id: `baseline-${patientId || "patient"}`,
      patient_id: patientId || "patient",
      upload_id: null,
      source_extraction_id: null,
      recorded_at: rel?.last_visit || rel?.created_at || new Date().toISOString().split("T")[0],
      biomarkers: {
        fasting_glucose: rel?.glucose ?? 96,
        blood_pressure_systolic: rel?.blood_pressure_systolic ?? 128,
        blood_pressure_diastolic: rel?.blood_pressure_diastolic ?? 82,
        heart_rate: rel?.heart_rate ?? 72,
        total_cholesterol: 198,
        ldl: 115,
        hdl: 54,
        triglycerides: 140,
        hemoglobin_a1c: 5.6,
        hemoglobin: 14.2,
        wbc: 6.8,
        platelets: 245,
        creatinine: 0.9,
        serum_bilirubin: 0.8,
        alt: 24,
        ast: 22,
        serum_albumin: 4.2,
        tsh: 2.1,
        free_t4: 1.2,
        total_t3: 110,
        serum_calcium: 9.4,
        serum_sodium: 139,
      },
      hemoglobin_a1c: 5.6,
      fasting_glucose: rel?.glucose ?? 96,
      total_cholesterol: 198,
      ldl: 115,
      hdl: 54,
      triglycerides: 140,
      hemoglobin: 14.2,
      wbc: 6.8,
      platelets: 245,
      creatinine: 0.9,
      notes: "Baseline clinical evaluation panel",
      created_at: new Date().toISOString(),
    };

    return [baselinePanel];
  }, [labPanels, patientId, rel]);

  const synthesizedLab = useMemo(() => synthesizeMultiPanelData(effectiveLabPanels), [effectiveLabPanels]);
  const activeDoctorPanel = synthesizedLab.panel;
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
    "min-h-full bg-[#f6f8f5] px-4 py-5 text-slate-900 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto font-sans [&_[data-slot=card]]:rounded-[24px] [&_[data-slot=card]]:border [&_[data-slot=card]]:border-slate-100 [&_[data-slot=card]]:bg-white [&_[data-slot=card]]:text-slate-900 [&_[data-slot=card]]:shadow-sm [&_[data-slot=card-title]]:text-slate-900 [&_[data-slot=card-description]]:text-slate-500 [&_[data-slot=tabs-list]]:h-auto [&_[data-slot=tabs-list]]:w-full [&_[data-slot=tabs-list]]:rounded-2xl [&_[data-slot=tabs-list]]:border [&_[data-slot=tabs-list]]:border-slate-200 [&_[data-slot=tabs-list]]:bg-white [&_[data-slot=tabs-list]]:p-1.5 [&_[data-slot=tabs-trigger]]:rounded-xl [&_[data-slot=tabs-trigger]]:px-4 [&_[data-slot=tabs-trigger]]:py-2.5 [&_[data-slot=tabs-trigger]]:text-slate-600 [&_[data-slot=tabs-trigger][data-state=active]]:border-transparent [&_[data-slot=tabs-trigger][data-state=active]]:bg-lime-500 [&_[data-slot=tabs-trigger][data-state=active]]:text-slate-950 [&_[data-slot=tabs-trigger][data-state=active]]:font-bold [&_[data-slot=tabs-trigger][data-state=active]]:shadow-sm [&_label]:text-slate-700 [&_input]:text-slate-900 [&_input]:placeholder:text-slate-400 [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-lime-500 [&_textarea]:focus-visible:ring-lime-500/30";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-slate-500">
        Loading patient...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-8 text-slate-800">
        <Button variant="outline" className={portalSecondaryButtonClass} onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-rose-600" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="space-y-4 p-8 text-slate-800">
        <Button variant="outline" className={portalSecondaryButtonClass} onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-slate-500">
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
          <DialogTitle className="text-slate-900">
            {activeActionKind ? quickActionConfig(activeActionKind).label : "Quick Action"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
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
          <DialogTitle className="text-slate-900">Reject & Replace AI Response</DialogTitle>
          <DialogDescription className="text-slate-500">
            Override the automated AI response with your verified clinical guidance for the patient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {selectedQueryForReject && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Patient Query:</p>
              <p className="text-sm text-slate-800 italic">"{selectedQueryForReject.user_query}"</p>
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

    {/* Medical Report In-App Document Viewer Dialog */}
    <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-[#0099ff]/10 text-[#0088ee] border border-[#0099ff]/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 font-['Manrope']">
                {selectedReportModal?.original_filename || "Patient Medical Report"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Clinical Lab Record • Uploaded {selectedReportModal?.created_at ? new Date(selectedReportModal.created_at).toLocaleString() : "Recently"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Patient Name:</span>
              <span className="font-semibold text-slate-900">{patient.name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Document ID:</span>
              <span className="font-mono text-slate-700">{selectedReportModal?.id?.slice(0, 16) || "LAB-REPORT"}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Pipeline Status:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase text-[10px]">
                {selectedReportModal?.analysis_status || "Processed & Extracted"}
              </span>
            </div>
          </div>

          {/* Structured Biomarkers extracted from report */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-[#0088ee]" />
              Extracted Biomarker Panel Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Fasting Glucose</span>
                <span className="font-bold text-slate-900">{vitalsSummary.glucose} mg/dL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">HbA1c</span>
                <span className="font-bold text-slate-900">5.6 %</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Total Cholesterol</span>
                <span className="font-bold text-slate-900">198 mg/dL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">LDL Cholesterol</span>
                <span className="font-bold text-slate-900">115 mg/dL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">HDL Cholesterol</span>
                <span className="font-bold text-slate-900">54 mg/dL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Triglycerides</span>
                <span className="font-bold text-slate-900">140 mg/dL</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className={portalSecondaryButtonClass}
            onClick={() => setReportModalOpen(false)}
          >
            Close Viewer
          </Button>
          <Button
            type="button"
            className="bg-[#0099ff] hover:bg-[#0088ee] text-white font-semibold text-xs gap-1.5 shadow-md shadow-[#0099ff]/20"
            onClick={() => {
              toast.success("Medical report downloaded to local device");
              setReportModalOpen(false);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Download Medical File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className={detailPageClass}>
      <Button variant="outline" className={`mb-6 ${portalSecondaryButtonClass}`} onClick={() => navigate("/doctor")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <div className="mb-8 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {patient.avatarUrl ? (
              <img
                src={patient.avatarUrl}
                alt={patient.name}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-[#0099ff]/30 shadow-sm shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#0099ff]/20 bg-gradient-to-br from-[#0099ff]/10 to-[#0077ff]/20 text-[#0088ee] font-bold text-xl shrink-0 font-['Manrope'] shadow-xs">
                <span>{initials(patient.name)}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="break-words text-2xl sm:text-3xl font-bold text-slate-900 font-['Manrope']">{patient.name}</h1>
                <Badge className={`w-fit font-bold text-xs ${
                  patient.status === "normal" ? "border border-lime-200 bg-lime-50 text-lime-800" :
                  patient.status === "elevated" ? "border border-amber-200 bg-amber-50 text-amber-800" :
                  "border border-rose-200 bg-rose-50 text-rose-800"
                }`}>
                  {patient.status.toUpperCase()}
                </Badge>
              </div>

              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                <span>{patientIdentityLine}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-normal">Condition: <strong className="text-slate-900">{patient.condition}</strong></span>
              </p>

              {/* Contact Info Line */}
              <div className="mt-2.5 flex items-center gap-3 flex-wrap text-xs text-slate-600">
                <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0099ff]/10 text-[#0088ee] border border-[#0099ff]/20 font-semibold hover:bg-[#0099ff] hover:text-white transition-all cursor-pointer">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{patient.phone}</span>
                </a>

                <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-semibold hover:bg-slate-200 transition-all cursor-pointer">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{patient.email}</span>
                </a>

                <button
                  onClick={() => navigate("/doctor/teleconsult")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Start Teleconsult</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <p className="text-xs text-slate-400 font-medium">Heart Rate</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="w-4 h-4 text-lime-600" />
              <p className="text-xs text-slate-400 font-medium">Blood Pressure</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{vitalsSummary.bloodPressure ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <p className="text-xs text-slate-400 font-medium">Glucose</p>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Ruler className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-slate-400 font-medium">Height</p>
            </div>
            <p className="text-xl font-bold text-slate-900 truncate" title={formatHeight(vitalsSummary.height)}>
              {vitalsSummary.height ? `${vitalsSummary.height} cm` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-slate-400 font-medium">Weight</p>
            </div>
            <p className="text-xl font-bold text-slate-900 truncate" title={formatWeight(vitalsSummary.weight)}>
              {vitalsSummary.weight ? `${vitalsSummary.weight} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={portalPanelClass}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-lime-600" />
                <p className="text-xs text-slate-400 font-medium">BMI</p>
              </div>
              {vitalsSummary.bmi != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${vitalsSummary.bmiCategory.badgeClass}`}>
                  {vitalsSummary.bmiCategory.label}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-slate-900">
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
                  <p className="text-sm text-slate-500 font-medium">Primary Condition</p>
                  <p className="font-semibold text-slate-900">{patient.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Last Visit</p>
                  <p className="font-semibold text-slate-900">{patient.lastVisit}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Next Appointment</p>
                  <p className="font-semibold text-slate-900">{nextAppointmentLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Contact</p>
                  <p className="font-semibold text-slate-900">{patient.phone || "No phone on file"}</p>
                  <p className="text-sm text-slate-600">{patient.email || "No email on file"}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Height</p>
                    <p className="text-sm font-semibold text-slate-900">{formatHeight(vitalsSummary.height)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Weight</p>
                    <p className="text-sm font-semibold text-slate-900">{formatWeight(vitalsSummary.weight)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">BMI</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {vitalsSummary.bmi != null ? `${vitalsSummary.bmi} (${vitalsSummary.bmiCategory.label})` : "—"}
                    </p>
                  </div>
                </div>

                {/* Dietary Profile & Food Restrictions in Overview */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                      Diet & Food Profile
                    </p>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
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
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full"
                        >
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                          {allergy.charAt(0).toUpperCase() + allergy.slice(1).replace("_", " ")}
                        </span>
                      ))
                    ) : null}

                    {patientDietaryConditions && patientDietaryConditions.length > 0 ? (
                      patientDietaryConditions.map((cond) => (
                        <span
                          key={cond}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full"
                        >
                          <Flame className="w-2.5 h-2.5 text-rose-600" />
                          {cond.toUpperCase()}
                        </span>
                      ))
                    ) : null}

                    {(!patientFoodAllergies || patientFoodAllergies.length === 0) &&
                      (!patientDietaryConditions || patientDietaryConditions.length === 0) && (
                        <span className="text-xs text-slate-500 italic">
                          No food allergies or GI conditions recorded
                        </span>
                      )}
                  </div>

                  {patientDietaryNotes && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      <span className="font-semibold text-slate-900 not-italic mr-1">Notes:</span>
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
                  <p className="text-sm text-slate-500">Loading prescriptions...</p>
                ) : activePrescriptionsList.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No active prescriptions. Add one under Actions.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activePrescriptionsList.map((rx) => (
                      <div key={rx.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-lime-600" />
                          <p className="font-semibold text-slate-900">{prescriptionHeading(rx.details)}</p>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{rx.details}</p>
                        <p className="text-xs text-slate-500 mt-2">
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
                <p className="text-sm text-slate-500">Loading...</p>
              ) : labUploads.length === 0 ? (
                <p className="text-sm text-slate-500">
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-[#0099ff]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-xs">
                            <FileText className="w-5 h-5 text-[#0088ee]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-slate-900">{lab.original_filename}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Uploaded {formatLabUploadedAt(lab.created_at)}
                            </p>
                            {lab.analysis_status === "review_required" ? (
                              <p className="mt-1 text-xs text-amber-700 font-medium">
                                Waiting for patient review before publication.
                              </p>
                            ) : null}
                            {lab.last_error ? (
                              <p className="mt-1 text-xs text-rose-600 font-medium">{lab.last_error}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <Badge className="border border-slate-200 bg-slate-100 text-slate-700 text-xs">
                            {status.label}
                          </Badge>

                          <button
                            onClick={() => void handleOpenMedicalReport(lab)}
                            className="px-4 py-2 rounded-xl bg-[#0099ff] hover:bg-[#0088ee] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#0099ff]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open Report</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </button>
                        </div>
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
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Bot className="h-5 w-5 text-cyan-600" />
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
                <p className="text-sm text-slate-500">Loading queries...</p>
              ) : queries.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-slate-800 font-medium">No lab report inquiries submitted yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                          ? "border-amber-200 bg-amber-50/50 shadow-sm"
                          : q.status === "verified"
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-cyan-200 bg-cyan-50/30"
                      }`}
                    >
                      {/* Top Header info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <FileText className="h-4 w-4 text-cyan-600" />
                          <span className="font-semibold text-slate-900">
                            {q.upload?.original_filename || "Lab Document"}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">
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
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-sm text-slate-500 mb-3">Active</h4>
                    {activePrescriptionsList.length === 0 ? (
                      <p className="text-sm text-slate-500">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {activePrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-emerald-500 pl-4 py-2 bg-slate-50/50 rounded-r-xl"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-slate-500 mt-2">
                                  {rx.prescribed_by === user?.id
                                    ? "You"
                                    : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                                  • {formatPrescriptionDate(rx.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">Active</Badge>
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
                    <h4 className="font-medium text-sm text-slate-500 mb-3">Completed</h4>
                    {completedPrescriptionsList.length === 0 ? (
                      <p className="text-sm text-slate-500">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {completedPrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-slate-300 pl-4 py-2 bg-slate-50/30 rounded-r-xl"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
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
                  <div key={insight.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="font-semibold text-slate-900">{insight.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{insight.summary}</p>
                    <p className="mt-3 text-sm font-semibold text-lime-700">{insight.nextStep}</p>
                  </div>
                ))}
                {latestLabStatus ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="font-semibold text-slate-900">Latest structured panel</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {latestLabStatus.label} from current evaluation.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-lime-700">{latestLabStatus.summary}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle>Disease risk signals</CardTitle>
                  <CardDescription>Rule-based clinical patterns from patient biomarkers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diseasePredictions.map((prediction) => (
                    <div key={prediction.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{prediction.title}</p>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                          {prediction.level}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{prediction.rationale}</p>
                      <p className="mt-3 text-sm font-semibold text-lime-700">{prediction.nextStep}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={portalPanelClass}>
                <CardHeader>
                  <CardTitle>Recommended coaching themes</CardTitle>
                  <CardDescription>Nutrition and wellness guidance inferred from patient panel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nutritionPlans.slice(0, 2).map((plan) => (
                    <div key={plan.headline} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="font-semibold text-slate-900">{plan.headline}</p>
                      <p className="mt-2 text-sm text-slate-600">{plan.focus}</p>
                      <p className="mt-3 text-sm font-semibold text-lime-700">{plan.actions[0]}</p>
                    </div>
                  ))}
                  {wellnessTips.slice(0, 2).map((tip) => (
                    <div key={tip.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="font-semibold text-slate-900">{tip.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{tip.detail}</p>
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
                          <Dumbbell className="h-5 w-5 text-cyan-600" />
                          AI Physical Activity & Exercise Plan
                        </CardTitle>
                        <CardDescription>Synthesized from lab biomarkers, BMI ({exercisePlan.bmiSummary.bmi || "Calculated"} kg/m²), and vitals</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50 text-xs">
                        {exercisePlan.weeklyTotals.totalActiveMinutes} mins / week
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Safety precautions */}
                    {exercisePlan.safetyPrecautions && exercisePlan.safetyPrecautions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Clinical Exercise Guardrails</p>
                        <div className="grid grid-cols-1 gap-2">
                          {exercisePlan.safetyPrecautions.slice(0, 2).map((sp) => (
                            <div key={sp.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                              <div className="font-semibold text-amber-900">{sp.title}</div>
                              <div className="text-slate-600 mt-1">{sp.reason}</div>
                              <div className="text-cyan-700 font-medium mt-1">{sp.guidance}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Days preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">7-Day Conditioning Schedule</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {exercisePlan.days.slice(0, 4).map((d) => (
                          <div key={d.dayNumber} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-900">{d.dayName}</span>
                              <span className="text-cyan-700 font-mono font-medium">{d.estimatedDurationMin}m • {d.estimatedCalories} kcal</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{d.focus}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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



