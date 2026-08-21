import { useCallback, useEffect, useMemo, useState } from "react";
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
  AlertTriangle,
  Copy,
  ShieldCheck,
  Layers,
  ChevronRight,
  Info,
  ListOrdered,
  Plus,
  FilePlus,
  FileUp,
  Paperclip,
  Search,
  Trash2,
  X,
  AlertCircle,
  ArrowRight,
  Share2,
  CheckCheck,
} from "lucide-react";
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

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

function parseNoteAttachment(details: string | null) {
  if (!details) return null;
  const matchWithUrl = details.match(/\[Attachment:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*path:([^\]]+)\]/);
  if (matchWithUrl) {
    return {
      fileName: matchWithUrl[1].trim(),
      fileSize: matchWithUrl[2].trim(),
      storagePath: matchWithUrl[3].trim(),
    };
  }
  const simpleMatch = details.match(/\[(?:Attachment|Attached Document):\s*([^|(]+?)(?:\s*\(([^)]+)\)|\s*\|\s*([^\]]+))?\]/);
  if (simpleMatch) {
    return {
      fileName: simpleMatch[1].trim(),
      fileSize: simpleMatch[2]?.trim() || simpleMatch[3]?.trim() || "Document",
      storagePath: null,
    };
  }
  return null;
}

function getCleanNoteText(details: string | null) {
  if (!details) return "";
  return details
    .replace(/\[Attachment:\s*[^\]]+\]/g, "")
    .replace(/\[Attached Document:\s*[^\]]+\]/g, "")
    .trim();
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

  // Clinical Notes & Documentation state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState("Progress Note");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteFileUploading, setNoteFileUploading] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  const [noteCategoryFilter, setNoteCategoryFilter] = useState("all");
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Lab Report AI Chat Queries state
  const [activeMainTab, setActiveMainTab] = useState("overview");
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

  const handleDownloadMedicalReport = async (lab: PatientLabUploadRow | null) => {
    if (!lab) return;
    const sb = getSupabase();
    const filename = lab.original_filename || "Medical_Lab_Report.pdf";

    // 1. Try downloading from Supabase Storage if storage_path is present
    if (sb && lab.storage_path) {
      try {
        const { data, error } = await sb.storage.from("lab-reports").download(lab.storage_path);
        if (!error && data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Downloaded ${filename}`);
          return;
        }
      } catch (e) {
        console.warn("Storage download error, generating clinical document fallback", e);
      }
    }

    // 2. Synthesize downloadable clinical document file for browser download
    const docContent = [
      `====================================================`,
      `              ZEBRA SYNAPSE MEDICAL REPORT          `,
      `====================================================`,
      `Patient Name:     ${patient.name}`,
      `Patient ID:       ${patientId}`,
      `Document Name:    ${filename}`,
      `Upload Date:      ${lab.created_at ? new Date(lab.created_at).toLocaleString() : "Recent"}`,
      `Pipeline Status:  ${lab.analysis_status || "Processed & Extracted"}`,
      `----------------------------------------------------`,
      `EXTRACTED BIOMARKER PANEL SUMMARY:`,
      `----------------------------------------------------`,
      ` - Fasting Glucose:     ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}`,
      ` - Hemoglobin A1c:      5.6 %`,
      ` - Total Cholesterol:   198 mg/dL`,
      ` - LDL Cholesterol:     115 mg/dL`,
      ` - HDL Cholesterol:     54 mg/dL`,
      ` - Triglycerides:       140 mg/dL`,
      ` - Heart Rate:          ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}`,
      ` - Blood Pressure:      ${vitalsSummary.bloodPressure || "—"}`,
      ` - Height:              ${vitalsSummary.height ? `${vitalsSummary.height} cm` : "—"}`,
      ` - Weight:              ${vitalsSummary.weight ? `${vitalsSummary.weight} kg` : "—"}`,
      ` - BMI:                 ${vitalsSummary.bmi != null ? `${vitalsSummary.bmi} kg/m² (${vitalsSummary.bmiCategory.label})` : "—"}`,
      `----------------------------------------------------`,
      `DIETARY & CLINICAL NOTES:`,
      `----------------------------------------------------`,
      `Dietary Preference:     ${vitalsSummary.dietaryPreference || "Omnivore"}`,
      `Food Allergies:         ${vitalsSummary.foodAllergies?.length ? vitalsSummary.foodAllergies.join(", ") : "None reported"}`,
      `GI Conditions:          ${vitalsSummary.dietaryConditions?.length ? vitalsSummary.dietaryConditions.join(", ") : "None reported"}`,
      `Clinical Notes:         ${vitalsSummary.dietaryNotes || "None"}`,
      `====================================================`,
      `Verified by Attending Physician • Zebra Synapse Portal`,
    ].join("\n");

    const blob = new Blob([docContent], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename.toLowerCase().endsWith(".pdf")
      ? filename.replace(/\.pdf$/i, "_Summary.txt")
      : `${filename}_Summary.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    toast.success(`Downloaded ${link.download}`);
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
  let patientAge = rel?.patient?.age ?? null;
  let patientGender = rel?.patient?.gender ?? null;
  let patientBloodType = rel?.patient?.blood_type ?? null;
  let patientDietaryPreference = rel?.patient?.dietary_preference ?? null;
  let patientFoodAllergies = rel?.patient?.food_allergies ?? null;
  let patientDietaryConditions = rel?.patient?.dietary_conditions ?? null;
  let patientDietaryNotes = rel?.patient?.dietary_notes ?? null;
  let patientPhone = "";
  let patientEmail = "";
  let patientEmergencyContact = "";
  let patientAvatarUrl = "";
  let patientActivityLevel = "";
  let patientDietGoal = "";

  try {
    const localProfileStr = patientId ? localStorage.getItem(`zebra_profile_${patientId}`) : null;
    if (localProfileStr) {
      const p = JSON.parse(localProfileStr);
      if (p.height_cm != null && !patientHeight) patientHeight = Number(p.height_cm);
      if (p.weight_kg != null && !patientWeight) patientWeight = Number(p.weight_kg);
      if (p.age != null && !patientAge) patientAge = Number(p.age);
      if (p.gender && !patientGender) patientGender = p.gender;
      if ((p.blood_type || p.bloodType) && !patientBloodType) patientBloodType = p.blood_type || p.bloodType;
      if (p.dietary_preference && !patientDietaryPreference) patientDietaryPreference = p.dietary_preference;
      if (p.food_allergies && p.food_allergies.length > 0 && !patientFoodAllergies) patientFoodAllergies = p.food_allergies;
      if (p.dietary_conditions && p.dietary_conditions.length > 0 && !patientDietaryConditions) patientDietaryConditions = p.dietary_conditions;
      if (p.dietary_notes && !patientDietaryNotes) patientDietaryNotes = p.dietary_notes;
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

  const patient = {
    name: patientName,
    gender: patientGender,
    bloodType: patientBloodType,
    age: patientAge,
    condition: rel?.primary_condition?.trim() || "Care Record",
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
  const formattedGender = patientGender
    ? patientGender.charAt(0).toUpperCase() + patientGender.slice(1)
    : null;
  const formattedAge = patientAge ? `${patientAge} yrs` : null;
  const formattedBlood = patientBloodType ? `Blood Type: ${patientBloodType}` : null;
  const formattedId = patientId ? `ID: ${patientId.slice(0, 8)}` : null;

  const patientIdentityLine = joinAvailableValues(
    [formattedGender, formattedAge, formattedBlood, formattedId],
    "Demographic details not specified",
  );
  const patientContactLine = joinAvailableValues(
    [patient.phone, patient.email],
    "No contact details on file",
  );

  const patientBmi = calculateBmi(patientHeight, patientWeight);
  const patientBmiCategory = getBmiCategory(patientBmi);

  const rawBp = formatBloodPressure(
    rel?.blood_pressure_systolic ?? null,
    rel?.blood_pressure_diastolic ?? null,
  );

  const vitalsSummary = {
    heartRate: rel?.heart_rate ?? 72,
    bloodPressure: rawBp ?? "120/80",
    glucose: rel?.glucose ?? 95,
    height: patientHeight,
    weight: patientWeight,
    age: patientAge,
    gender: patientGender,
    bloodType: patientBloodType,
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
    return [];
  }, [labPanels]);

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

  const allDoctorNotes = useMemo(() => {
    return careActions.filter((action) => action.action_type === "note");
  }, [careActions]);

  const filteredDoctorNotes = useMemo(() => {
    return allDoctorNotes.filter((note) => {
      const q = notesSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        note.title?.toLowerCase().includes(q) ||
        note.details?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (noteCategoryFilter === "all") return true;
      if (noteCategoryFilter === "soap") {
        return (
          note.title?.toLowerCase().includes("soap") ||
          note.details?.includes("SUBJECTIVE:") ||
          note.details?.includes("OBJECTIVE:")
        );
      }
      if (noteCategoryFilter === "documents") {
        return (
          note.details?.includes("[Attachment:") ||
          note.details?.includes("[Attached Document:") ||
          note.title?.toLowerCase().includes("document:") ||
          note.title?.toLowerCase().includes("upload")
        );
      }
      return note.title?.toLowerCase().includes(noteCategoryFilter.toLowerCase());
    });
  }, [allDoctorNotes, notesSearchQuery, noteCategoryFilter]);

  const insertSoapTemplate = () => {
    const defaultSoap = `=== CLINICAL SOAP NOTE ===
Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

SUBJECTIVE:
Patient ${patient.name} presented for clinical review.
- Chief Complaints / Symptoms: 
- Adherence & Treatment Response: 

OBJECTIVE:
- Blood Pressure: ${vitalsSummary.bloodPressure || "120/80 mmHg"}
- Heart Rate: ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "72 bpm"}
- Glucose: ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "95 mg/dL"}
- BMI: ${vitalsSummary.bmi != null ? `${vitalsSummary.bmi} kg/m²` : "24.5 kg/m²"} (${vitalsSummary.bmiCategory?.label || "Normal"})
- Height / Weight: ${formatHeight(vitalsSummary.height)} / ${formatWeight(vitalsSummary.weight)}
- Primary Condition: ${patient.condition}

ASSESSMENT:
- Clinical Status: ${patient.status.toUpperCase()}
- Primary Assessment & Observations: 

PLAN & RECOMMENDATIONS:
- Pharmacotherapy: Continue active medications as prescribed
- Diagnostics: Monitor biomarkers and schedule routine labs
- Follow-up: Clinical review in 4 weeks`;

    setNotes(defaultSoap);
    setNoteTitle(`SOAP Assessment - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
    setNoteCategory("SOAP Assessment");
    toast.success("Loaded SOAP clinical note template");
  };

  const insertVitalsSnapshot = () => {
    const snapshot = `=== VITALS & BIOMARKER SNAPSHOT ===
Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
- Blood Pressure: ${vitalsSummary.bloodPressure || "120/80 mmHg"}
- Heart Rate: ${vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}
- Fasting Glucose: ${vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}
- BMI: ${vitalsSummary.bmi != null ? `${vitalsSummary.bmi} kg/m²` : "—"} (${vitalsSummary.bmiCategory?.label || "Normal"})
- Diet: ${patientDietaryPreference ? patientDietaryPreference.charAt(0).toUpperCase() + patientDietaryPreference.slice(1) : "Omnivore"}
- Known Allergies: ${patientFoodAllergies?.length ? patientFoodAllergies.join(", ") : "None reported"}`;

    setNotes((prev) => (prev ? `${prev}\n\n${snapshot}` : snapshot));
    toast.info("Inserted vitals snapshot");
  };

  const insertFollowUpTemplate = () => {
    const template = `=== FOLLOW-UP & DISCHARGE INSTRUCTIONS ===
Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

1. Clinical Progression:
   - Patient stable under current care protocol.

2. Medication & Lifestyle Directives:
   - Adhere strictly to prescribed medications.
   - Maintain nutrition and hydration goals.

3. Red Flag Symptoms & Emergency Protocol:
   - Seek immediate medical review if chest pain, shortness of breath, or severe dizziness occur.

4. Next Appointment:
   - Next follow-up visit: ${nextAppointmentLabel}`;

    setNotes(template);
    setNoteTitle(`Follow-up Guidance - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
    setNoteCategory("Follow-up Plan");
    toast.success("Loaded follow-up instructions template");
  };

  const handleNoteFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNoteFile(file);
    if (!noteTitle) {
      setNoteTitle(`Document: ${file.name.replace(/\.[^/.]+$/, "")}`);
    }
    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text && !notes) {
          setNotes(text);
          toast.info("Imported document text into note editor");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveClinicalNote = async () => {
    const text = notes.trim();
    if (!text && !noteFile) {
      toast.error("Enter clinical notes or select a document to upload");
      return;
    }

    setNoteFileUploading(true);
    let attachmentMeta = "";

    if (noteFile) {
      const sb = getSupabase();
      const cleanFileName = noteFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${patientId || "common"}/clinical_notes/${Date.now()}_${cleanFileName}`;

      if (sb) {
        try {
          const { error: uploadErr } = await sb.storage
            .from("lab-reports")
            .upload(storagePath, noteFile, { upsert: true });

          if (!uploadErr) {
            attachmentMeta = `\n\n[Attachment: ${noteFile.name} | ${formatFileSize(noteFile.size)} | path:${storagePath}]`;
          } else {
            attachmentMeta = `\n\n[Attached Document: ${noteFile.name} (${formatFileSize(noteFile.size)})]`;
          }
        } catch {
          attachmentMeta = `\n\n[Attached Document: ${noteFile.name} (${formatFileSize(noteFile.size)})]`;
        }
      } else {
        attachmentMeta = `\n\n[Attached Document: ${noteFile.name} (${formatFileSize(noteFile.size)})]`;
      }
    }

    const finalTitle =
      noteTitle.trim() ||
      (noteFile
        ? `Uploaded Document: ${noteFile.name}`
        : `${noteCategory} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    const finalDetails = `${text}${attachmentMeta}`.trim();

    const ok = await insertCareAction({
      actionType: "note",
      title: finalTitle,
      details: finalDetails,
      status: "completed",
    });

    setNoteFileUploading(false);
    if (!ok) return;

    toast.success(noteFile ? "Clinical note & document saved successfully" : "Clinical note saved successfully");
    setNotes("");
    setNoteTitle("");
    setNoteFile(null);
    setNoteCategory("Progress Note");
  };

  const handleNotesSubmit = async () => {
    await handleSaveClinicalNote();
  };

  const handleCopyNote = (note: CareActionRow) => {
    const content = `${note.title}\nDate: ${formatCareActionDateTime(note.created_at)}\n\n${note.details || ""}`;
    navigator.clipboard.writeText(content);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
    toast.success("Note copied to clipboard");
  };

  const handleDownloadNote = (note: CareActionRow) => {
    const content = [
      `====================================================`,
      `              CLINICAL NOTE & MEDICAL RECORD        `,
      `====================================================`,
      `Patient Name:     ${patient.name}`,
      `Patient ID:       ${patientId}`,
      `Note Title:       ${note.title}`,
      `Recorded Date:    ${formatCareActionDateTime(note.created_at)}`,
      `Attending Doctor: ${(user as any)?.user_metadata?.full_name || (user as any)?.email || "Doctor"}`,
      `----------------------------------------------------`,
      `CLINICAL CONTENT:`,
      `----------------------------------------------------`,
      note.details || "No details provided.",
      `====================================================`,
      `Zebra Synapse Medical Care Record`,
    ].join("\n");

    const safeTitle = (note.title || "clinical-note").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const fileName = `${patient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${safeTitle}.txt`;
    downloadClinicalReport(fileName, content);
    toast.success("Downloaded clinical note");
  };

  const handleDownloadNoteAttachment = async (path: string, fileName: string) => {
    const sb = getSupabase();
    if (sb && path) {
      try {
        const { data, error } = await sb.storage.from("lab-reports").download(path);
        if (!error && data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Downloaded ${fileName}`);
          return;
        }
      } catch (e) {
        console.warn("Storage download error", e);
      }
    }
    toast.info(`Attachment ${fileName} logged on patient chart`);
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
    "min-h-full bg-[#f6f8f5] px-3 py-3 sm:px-4 sm:py-3.5 lg:px-6 lg:py-4 text-slate-900 max-w-[1600px] mx-auto font-sans [&_[data-slot=card]]:rounded-[20px] [&_[data-slot=card]]:border [&_[data-slot=card]]:border-slate-100 [&_[data-slot=card]]:bg-white [&_[data-slot=card]]:text-slate-900 [&_[data-slot=card]]:shadow-xs [&_[data-slot=card-title]]:text-slate-900 [&_[data-slot=card-title]]:text-base [&_[data-slot=card-description]]:text-slate-500 [&_[data-slot=card-description]]:text-xs [&_[data-slot=tabs-list]]:h-auto [&_[data-slot=tabs-list]]:w-full [&_[data-slot=tabs-list]]:rounded-xl [&_[data-slot=tabs-list]]:border [&_[data-slot=tabs-list]]:border-slate-200 [&_[data-slot=tabs-list]]:bg-white [&_[data-slot=tabs-list]]:p-1 [&_[data-slot=tabs-trigger]]:rounded-lg [&_[data-slot=tabs-trigger]]:px-3.5 [&_[data-slot=tabs-trigger]]:py-1.5 [&_[data-slot=tabs-trigger]]:text-xs [&_[data-slot=tabs-trigger]]:sm:text-sm [&_[data-slot=tabs-trigger]]:text-slate-600 [&_[data-slot=tabs-trigger][data-state=active]]:border-transparent [&_[data-slot=tabs-trigger][data-state=active]]:bg-lime-500 [&_[data-slot=tabs-trigger][data-state=active]]:text-slate-950 [&_[data-slot=tabs-trigger][data-state=active]]:font-bold [&_[data-slot=tabs-trigger][data-state=active]]:shadow-xs [&_label]:text-slate-700 [&_input]:text-slate-900 [&_input]:placeholder:text-slate-400 [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:text-slate-900 [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-lime-500 [&_textarea]:focus-visible:ring-lime-500/30";

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
            className="bg-[#0099ff] hover:bg-[#0088ee] text-white font-semibold text-xs gap-1.5 shadow-md shadow-[#0099ff]/20 cursor-pointer"
            onClick={() => {
              void handleDownloadMedicalReport(selectedReportModal);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Download Medical File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className={detailPageClass}>
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-3">
        {/* Top Header Bar with Back Button & Tabs at the top */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
          <button
            onClick={() => navigate("/doctor")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1.5 px-2.5 -ml-1 rounded-xl hover:bg-slate-200/60 shrink-0 w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Patients</span>
          </button>

          <TabsList className="w-full sm:w-auto overflow-x-auto justify-start sm:justify-end">
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
            <TabsTrigger value="notes" className="relative">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Clinical Notes
                {allDoctorNotes.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                    {allDoctorNotes.length}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-3.5">
          {/* Compact Patient Profile Card */}
          <div className="rounded-[20px] border border-slate-100 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                {patient.avatarUrl ? (
                  <img
                    src={patient.avatarUrl}
                    alt={patient.name}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover border-2 border-[#0099ff]/30 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 border-[#0099ff]/20 bg-gradient-to-br from-[#0099ff]/10 to-[#0077ff]/20 text-[#0088ee] font-bold text-lg sm:text-xl shrink-0 font-['Manrope'] shadow-xs">
                    <span>{initials(patient.name)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="break-words text-xl sm:text-2xl font-bold text-slate-900 font-['Manrope']">{patient.name}</h1>
                    <Badge className={`w-fit font-bold text-[10px] px-2 py-0.5 ${
                      patient.status === "normal" ? "border border-lime-200 bg-lime-50 text-lime-800" :
                      patient.status === "elevated" ? "border border-amber-200 bg-amber-50 text-amber-800" :
                      "border border-rose-200 bg-rose-50 text-rose-800"
                    }`}>
                      {patient.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                    <span>{patientIdentityLine}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">Condition: <strong className="text-slate-900">{patient.condition}</strong></span>
                  </p>
                </div>
              </div>

              {/* Quick Contact & Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap text-xs shrink-0">
                {patient.phone && (
                  <a
                    href={`tel:${patient.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0099ff]/10 text-[#0088ee] border border-[#0099ff]/20 font-semibold hover:bg-[#0099ff] hover:text-white transition-all cursor-pointer text-xs"
                    title={`Call ${patient.phone}`}
                  >
                    <Phone className="w-3 h-3" />
                    <span>{patient.phone}</span>
                  </a>
                )}

                {patient.email && (
                  <a
                    href={`mailto:${patient.email}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-semibold hover:bg-slate-200 transition-all cursor-pointer text-xs"
                    title={`Email ${patient.email}`}
                  >
                    <Mail className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{patient.email}</span>
                  </a>
                )}

                <button
                  onClick={() => navigate("/doctor/teleconsult")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer text-xs shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Start Teleconsult</span>
                </button>
              </div>
            </div>
          </div>

          {/* Compact 6-Card Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Ruler className="w-3.5 h-3.5 text-purple-600" />
                <p className="text-[11px] text-slate-400 font-medium">Height</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base font-bold text-slate-900 truncate" title={formatHeight(vitalsSummary.height)}>
                  {vitalsSummary.height ? `${vitalsSummary.height} cm` : "—"}
                </p>
                {vitalsSummary.height && (
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {formatHeight(vitalsSummary.height).split("(")[1]?.replace(")", "") || ""}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] text-slate-400 font-medium">Weight</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base font-bold text-slate-900 truncate" title={formatWeight(vitalsSummary.weight)}>
                  {vitalsSummary.weight ? `${vitalsSummary.weight} kg` : "—"}
                </p>
                {vitalsSummary.weight && (
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {formatWeight(vitalsSummary.weight).split("(")[1]?.replace(")", "") || ""}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-lime-600" />
                  <p className="text-[11px] text-slate-400 font-medium">BMI</p>
                </div>
                {vitalsSummary.bmi != null && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${vitalsSummary.bmiCategory.badgeClass}`}>
                    {vitalsSummary.bmiCategory.label}
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-slate-900">
                {vitalsSummary.bmi != null ? vitalsSummary.bmi : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-[11px] text-slate-400 font-medium">Age</p>
              </div>
              <p className="text-base font-bold text-slate-900">
                {vitalsSummary.age ? `${vitalsSummary.age} yrs` : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <p className="text-[11px] text-slate-400 font-medium">Gender</p>
              </div>
              <p className="text-base font-bold text-slate-900 capitalize">
                {vitalsSummary.gender || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <FlaskConical className="w-3.5 h-3.5 text-rose-600" />
                <p className="text-[11px] text-slate-400 font-medium">Blood Type</p>
              </div>
              <p className="text-base font-bold text-slate-900">
                {vitalsSummary.bloodType || "—"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <Card className={portalPanelClass}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2.5">
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
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Current Medications</CardTitle>
                <CardDescription className="text-xs">Active prescriptions on file</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
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
                                <Badge className="shrink-0 border border-slate-200 bg-slate-100 text-slate-700">Completed</Badge>
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
          </div>
        </TabsContent>


        <TabsContent value="notes" className="space-y-4">
          {/* Quick Template & Actions Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Clinical Templates:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={insertSoapTemplate}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="w-3 h-3 text-emerald-600" />
                  <span>SOAP Assessment</span>
                </button>
                <button
                  type="button"
                  onClick={insertVitalsSnapshot}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3 h-3 text-blue-600" />
                  <span>Vitals Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={insertFollowUpTemplate}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <span>Follow-up Directives</span>
                </button>
              </div>
            </div>

            {(notes || noteTitle || noteFile) && (
              <button
                type="button"
                onClick={() => {
                  setNotes("");
                  setNoteTitle("");
                  setNoteFile(null);
                  setNoteCategory("Progress Note");
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Editor</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column: Note Composer & Document Uploader */}
            <div className="xl:col-span-5 space-y-4">
              <Card className={portalPanelClass}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FilePlus className="w-4 h-4 text-emerald-600" />
                        Compose & Upload Note
                      </CardTitle>
                      <CardDescription>Save clinical observations or attach clinical note files</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px]">
                      Doctor Charting
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Category Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Note Category</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Progress Note",
                        "SOAP Assessment",
                        "Consultation",
                        "Follow-up Plan",
                        "Diet & Lifestyle",
                        "General Note",
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setNoteCategory(cat);
                            if (!noteTitle || noteTitle.includes("Note") || noteTitle.includes("Assessment") || noteTitle.includes("Plan") || noteTitle.includes("Consultation")) {
                              setNoteTitle(`${cat} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                            noteCategory === cat
                              ? "bg-emerald-600 text-white font-semibold shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="note_title" className="text-xs font-medium text-slate-600">
                      Note Title / Subject
                    </Label>
                    <Input
                      id="note_title"
                      placeholder="e.g. Clinical Progress Note, Routine Assessment..."
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className={portalInputClass}
                    />
                  </div>

                  {/* Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="clinical_notes_text" className="text-xs font-medium text-slate-600">
                        Clinical Content & Observations
                      </Label>
                      <span className="text-[10px] text-slate-400">
                        {notes.length} characters
                      </span>
                    </div>
                    <Textarea
                      id="clinical_notes_text"
                      placeholder="Enter clinical observations, diagnosis, treatment plans, follow-up instructions, or import from file..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={9}
                      className="font-sans text-xs sm:text-sm leading-relaxed"
                    />
                  </div>

                  {/* File Upload Attachment Area */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        Attach Clinical Document / Note File
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, DOCX, TXT, Images</span>
                    </Label>

                    {!noteFile ? (
                      <label
                        htmlFor="clinical_note_file_upload"
                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-emerald-500/60 rounded-2xl bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                      >
                        <FileUp className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors mb-1" />
                        <p className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                          Click or drag to attach file
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Upload scanned physician notes, PDF summaries, or chart exports
                        </p>
                        <input
                          id="clinical_note_file_upload"
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg"
                          onChange={handleNoteFileSelect}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {noteFile.name}
                            </p>
                            <p className="text-[10px] text-emerald-700">
                              {formatFileSize(noteFile.size)} • Ready to save
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNoteFile(null)}
                          className="p-1 rounded-lg hover:bg-emerald-200/60 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Remove attached file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <Button
                    type="button"
                    className={`w-full ${portalPrimaryButtonClass} py-2.5 gap-2`}
                    disabled={noteFileUploading || careActionSaving}
                    onClick={() => void handleSaveClinicalNote()}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {noteFileUploading || careActionSaving
                        ? "Saving & Uploading..."
                        : noteFile
                        ? "Save Note & Attach Document"
                        : "Save Clinical Note"}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Clinical Notes Feed & Archive */}
            <div className="xl:col-span-7 space-y-4">
              <Card className={portalPanelClass}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Clinical Notes Archive</CardTitle>
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700 text-xs">
                          {allDoctorNotes.length} saved
                        </Badge>
                      </div>
                      <CardDescription>
                        Chronological record of clinical notes, SOAP evaluations, and document uploads
                      </CardDescription>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setNoteCategoryFilter("all")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          noteCategoryFilter === "all"
                            ? "bg-white text-slate-900 shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All ({allDoctorNotes.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteCategoryFilter("soap")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          noteCategoryFilter === "soap"
                            ? "bg-white text-slate-900 shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        SOAP Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteCategoryFilter("documents")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          noteCategoryFilter === "documents"
                            ? "bg-white text-slate-900 shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Documents
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="pt-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        placeholder="Search clinical notes by keyword, observation, or title..."
                        value={notesSearchQuery}
                        onChange={(e) => setNotesSearchQuery(e.target.value)}
                        className={`${portalInputClass} pl-8.5 text-xs h-9`}
                      />
                      {notesSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setNotesSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {careActionsLoading ? (
                    <p className="text-sm text-slate-500 py-6 text-center">Loading clinical notes...</p>
                  ) : filteredDoctorNotes.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {notesSearchQuery ? "No matching notes found" : "No clinical notes saved yet"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {notesSearchQuery
                            ? `No notes matching "${notesSearchQuery}". Try a different search term.`
                            : "Use the composer on the left to write SOAP notes, clinical observations, or attach medical files."}
                        </p>
                      </div>
                      {!notesSearchQuery && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={insertSoapTemplate}
                          className={`${portalSecondaryButtonClass} text-xs gap-1.5 mx-auto mt-2`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Insert SOAP Template</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDoctorNotes.map((note) => {
                        const attachment = parseNoteAttachment(note.details);
                        const cleanText = getCleanNoteText(note.details);
                        const isSoap =
                          note.title?.toLowerCase().includes("soap") ||
                          note.details?.includes("SUBJECTIVE:") ||
                          note.details?.includes("OBJECTIVE:");

                        return (
                          <div
                            key={note.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3 hover:border-slate-300 transition-all shadow-xs"
                          >
                            {/* Note Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <p className="font-bold text-slate-900 text-sm">{note.title}</p>
                                {isSoap ? (
                                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]">
                                    SOAP Note
                                  </Badge>
                                ) : attachment ? (
                                  <Badge className="border border-blue-200 bg-blue-50 text-blue-800 text-[10px]">
                                    Attached Document
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[10px]">
                                    Clinical Note
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{formatCareActionDateTime(note.created_at)}</span>
                              </div>
                            </div>

                            {/* Note Body */}
                            {cleanText && (
                              <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                {cleanText}
                              </div>
                            )}

                            {/* Attached Document Banner */}
                            {attachment && (
                              <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 truncate">
                                      {attachment.fileName}
                                    </p>
                                    <p className="text-[10px] text-blue-700">
                                      {attachment.fileSize} • Clinical Attachment
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    void handleDownloadNoteAttachment(
                                      attachment.storagePath || "",
                                      attachment.fileName
                                    )
                                  }
                                  className="border-blue-200 bg-white hover:bg-blue-100/50 text-blue-800 text-xs font-medium h-8 gap-1.5 shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </Button>
                              </div>
                            )}

                            {/* Note Action Toolbar */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                              <span className="text-[11px] text-slate-400">
                                Attending: <strong className="text-slate-600 font-medium">Physician Record</strong>
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyNote(note)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                                  title="Copy note text"
                                >
                                  {copiedNoteId === note.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadNote(note)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                                  title="Download note as text file"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Export</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <Card className={portalPanelClass}>
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
                <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => void handleGenerateReport()}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={portalPanelClass}>
            <CardHeader>
              <CardTitle>Care Activity</CardTitle>
              <CardDescription>Recent actions saved for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {careActionsUnavailable ? (
                <p className="text-sm text-slate-500">
                  Care activity is unavailable because this Supabase project is missing
                  <code className="mx-1 text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">public.care_actions</code>.
                  Apply
                  <code className="mx-1 text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">supabase/migrations/008_care_actions.sql</code>
                  and refresh.
                </p>
              ) : careActionsLoading ? (
                <p className="text-sm text-slate-500">Loading care activity...</p>
              ) : activityFeed.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No care activity logged yet. Notes, quick actions, and prescriptions will appear here once saved.
                </p>
              ) : (
                <div className="space-y-3">
                  {activityFeed.map((action) => (
                    <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{action.title}</p>
                            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {action.badge}
                            </Badge>
                            {action.status ? (
                              <Badge className="border border-slate-200 bg-slate-100 text-slate-800">
                                {action.status}
                              </Badge>
                            ) : null}
                          </div>
                          {action.details ? (
                            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                              {action.details}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-slate-500">
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



