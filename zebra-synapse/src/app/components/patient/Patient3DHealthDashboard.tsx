import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Heart,
  Info,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { type Profile } from "../../../auth/types";
import { getSupabase } from "../../../lib/supabase";
import {
  type LabPanelRow,
  formatLabDate,
} from "../../../lib/labPanels";
import {
  type MetricAssessment,
  getMetricAssessments,
} from "../../../lib/labInsights";
import {
  PRESCRIPTIONS_SELECT,
  fetchPatientPrescriptions,
  formatPrescriptionDate,
  prescriptionHeading,
  type PrescriptionRow,
} from "../../../lib/prescriptions";
import { calculateBmi } from "../../../lib/careRelationships";
import { doctorOptions } from "../../pages/patient/Appointments";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

// Organ system IDs
export type OrganSystemId = "heart" | "blood" | "lungs" | "stomach" | "kidneys" | "brain";

interface OrganMeta {
  id: OrganSystemId;
  name: string;
  subtitle: string;
  hotspot: { x: number; y: number }; // Percentage coordinates on anatomy figure
  accentColor: string;
  gradient: string;
  biomarkerKeys: string[];
  description: string;
  healthyNotes: string;
}

const ORGAN_SYSTEMS: Record<OrganSystemId, OrganMeta> = {
  heart: {
    id: "heart",
    name: "Heart",
    subtitle: "Cardiovascular System",
    hotspot: { x: 54, y: 26 },
    accentColor: "#ef4444",
    gradient: "from-rose-500 to-red-600",
    biomarkerKeys: [
      "Total Cholesterol",
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Triglycerides",
      "hs-CRP",
      "Troponin",
      "Homocysteine",
    ],
    description: "Monitors coronary blood flow, lipid equilibrium, arterial pressure, and cardiac inflammatory signals.",
    healthyNotes: "Maintain low LDL (<100 mg/dL) and optimal HDL (>50 mg/dL) for peak cardiovascular health.",
  },
  blood: {
    id: "blood",
    name: "Blood Cells",
    subtitle: "Hematology & Immune",
    hotspot: { x: 79, y: 36.5 },
    accentColor: "#3b82f6",
    gradient: "from-blue-500 to-sky-600",
    biomarkerKeys: [
      "Hemoglobin",
      "WBC",
      "White Blood Cells",
      "Platelets",
      "RBC",
      "Lymphocytes",
      "Neutrophils",
      "Ferritin",
    ],
    description: "Assesses cellular oxygen carriage, platelet clotting efficiency, and leukocytic immunological response.",
    healthyNotes: "Stable hemoglobin and balanced white cell ratios signify robust immune resilience.",
  },
  lungs: {
    id: "lungs",
    name: "Lungs",
    subtitle: "Respiratory System",
    hotspot: { x: 44, y: 27 },
    accentColor: "#0ea5e9",
    gradient: "from-sky-500 to-cyan-600",
    biomarkerKeys: [
      "Eosinophils",
      "IgE",
      "Lymphocytes",
      "Monocytes",
      "hs-CRP",
      "Oxygen Saturation",
    ],
    description: "Evaluates alveolar gas transfer capacity, airway allergic reactivity, and systemic oxygenation.",
    healthyNotes: "Low systemic inflammatory markers correlate with clear pulmonary airways and high lung capacity.",
  },
  stomach: {
    id: "stomach",
    name: "Stomach",
    subtitle: "Digestive & Metabolic",
    hotspot: { x: 50, y: 37 },
    accentColor: "#f59e0b",
    gradient: "from-amber-500 to-orange-600",
    biomarkerKeys: [
      "Fasting Glucose",
      "Glucose",
      "Hemoglobin A1c",
      "ALT",
      "AST",
      "Bilirubin",
      "Alkaline Phosphatase",
      "Albumin",
    ],
    description: "Gauges glycemic regulation, gastric digestive secretion, and hepatic metabolic conversion.",
    healthyNotes: "Steady fasting glucose (<100 mg/dL) and optimal liver enzymes support vitality.",
  },
  kidneys: {
    id: "kidneys",
    name: "Kidneys",
    subtitle: "Renal & Electrolytes",
    hotspot: { x: 50, y: 44.5 },
    accentColor: "#8b5cf6",
    gradient: "from-violet-500 to-purple-600",
    biomarkerKeys: [
      "Creatinine",
      "eGFR",
      "Blood Urea Nitrogen",
      "Urea",
      "Uric Acid",
      "Sodium",
      "Potassium",
    ],
    description: "Monitors glomerulus filtration rate, nitrogenous waste elimination, and electrolyte balance.",
    healthyNotes: "High eGFR (>90 mL/min) and balanced sodium-potassium maintain healthy cellular hydration.",
  },
  brain: {
    id: "brain",
    name: "Brain",
    subtitle: "Neuro & Endocrine",
    hotspot: { x: 50, y: 8.5 },
    accentColor: "#06b6d4",
    gradient: "from-cyan-500 to-teal-600",
    biomarkerKeys: [
      "Vitamin B12",
      "Vitamin Folate",
      "TSH",
      "Thyroxine (T4)",
      "Free T3",
      "Calcium",
    ],
    description: "Tracks thyroid endocrine regulation, neuro-supportive vitamins, and synaptic metabolism.",
    healthyNotes: "Optimal B12 and balanced TSH support cognitive acuity, memory, and nervous system health.",
  },
};

// Resilient Doctor Avatar with Fallback Initials
function DoctorAvatar({
  src,
  name,
  initials,
}: {
  src?: string;
  name: string;
  initials?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const derivedInitials =
    initials ||
    name
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "DR";

  return (
    <div className="h-8.5 w-8.5 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0 bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center text-sky-800 font-bold text-[10px] shadow-inner">
      {!imageError && src ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{derivedInitials}</span>
      )}
    </div>
  );
}

// Helper to parse realistic prescription details
function parsePrescriptionItem(rx: PrescriptionRow) {
  const lines = rx.details.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "Medication";

  // Match dosage pattern e.g. 500mg, 20 mg, 20mcg, 150ml, 2000 IU, 1 tablet
  const dosageMatch =
    firstLine.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU|tablets?|capsules?|pills?)\b/i) ||
    (lines[1] && lines[1].match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU|tablets?|capsules?|pills?)\b/i));
  const dosage = dosageMatch ? dosageMatch[0] : "Prescribed Dose";

  let name = firstLine;
  if (dosageMatch && name.includes(dosageMatch[0])) {
    name = name.replace(dosageMatch[0], "").replace(/[-–—:,]+/g, " ").trim();
  }
  if (!name) name = prescriptionHeading(rx.details);

  const schedule =
    lines.length > 1
      ? lines[1]
      : firstLine.includes(" - ")
      ? firstLine.split(" - ")[1]
      : "Daily as directed";

  return {
    id: rx.id,
    name: name.length > 28 ? `${name.slice(0, 26)}…` : name,
    dosage,
    schedule,
    prescriber: rx.prescriber?.full_name || "Attending Physician",
    date: formatPrescriptionDate(rx.created_at),
  };
}

const BOTTLE_COLORS = ["#0284c7", "#059669", "#d97706", "#7c3aed", "#e11d48", "#2563eb"];

interface Patient3DHealthDashboardProps {
  profile: Profile | null;
  uploads: Array<{ id: string; original_filename: string; created_at: string }>;
  panels: LabPanelRow[];
  activePanel: LabPanelRow | null;
  selectedReportId: string;
  onSelectReportId: (id: string) => void;
  onUploadReport: (file: File) => Promise<{ extracted?: boolean; message?: string }>;
  onRefreshPanels: () => Promise<void>;
}

export function Patient3DHealthDashboard({
  profile,
  uploads,
  panels,
  activePanel,
  selectedReportId,
  onSelectReportId,
  onUploadReport,
  onRefreshPanels,
}: Patient3DHealthDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOrgan, setSelectedOrgan] = useState<OrganSystemId>("heart");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  // Real connected doctor, active prescriptions, and live profile from Supabase
  const [assignedDoctor, setAssignedDoctor] = useState<{
    id: string;
    name: string;
    specialty?: string;
    licenseNumber?: string;
    lastVisit?: string;
  } | null>(null);
  const [activePrescriptions, setActivePrescriptions] = useState<PrescriptionRow[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);

  // Fetch real patient clinical records from Supabase / cache
  useEffect(() => {
    let isMounted = true;
    const loadClinicalData = async () => {
      const sb = getSupabase();
      const uid = user?.id || profile?.id;

      try {
        if (sb && uid) {
          // 1. Fetch live profile details directly from Supabase DB to ensure synchronized state
          const { data: profileData } = await sb
            .from("profiles")
            .select("id, role, full_name, license_number, height_cm, weight_kg, age, gender, blood_type, dietary_preference, food_allergies, dietary_conditions, dietary_notes")
            .eq("id", uid)
            .maybeSingle();

          if (isMounted && profileData) {
            setDbProfile(profileData as Profile);
          }

          // 2. Fetch linked doctor from care_relationships
          const { data: careData } = await sb
            .from("care_relationships")
            .select(`
              doctor_id,
              primary_condition,
              last_visit,
              doctor:profiles!care_relationships_doctor_id_fkey ( id, full_name, license_number )
            `)
            .eq("patient_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (isMounted && careData) {
            const doc = careData.doctor as any;
            if (doc?.full_name) {
              setAssignedDoctor({
                id: careData.doctor_id,
                name: doc.full_name,
                specialty: careData.primary_condition || "Attending Physician",
                licenseNumber: doc.license_number,
                lastVisit: careData.last_visit,
              });
            }
          }
        }

        // 3. Fetch patient prescriptions (Supabase or cached/default fallback)
        const allRx = await fetchPatientPrescriptions(sb, uid);
        if (isMounted && allRx) {
          const activeOnly = allRx.filter((r) => r.status === "active");
          setActivePrescriptions(activeOnly);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching patient clinical records:", err);
      } finally {
        if (isMounted) setPrescriptionsLoading(false);
      }
    };

    void loadClinicalData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, profile?.id]);

  // Real consulting doctors list
  const consultingDoctorsList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      specialty: string;
      hospital: string;
      avatar?: string;
      initials: string;
      isAssigned?: boolean;
    }> = [];

    if (assignedDoctor) {
      list.push({
        id: assignedDoctor.id,
        name: assignedDoctor.name,
        specialty: assignedDoctor.specialty || "Attending Physician",
        hospital: "Assigned Care Team",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
        initials: assignedDoctor.name.replace(/^(Dr\.|Prof\.)\s*/i, "").slice(0, 2).toUpperCase() || "MD",
        isAssigned: true,
      });
    }

    // Add specialists from system directory
    doctorOptions.forEach((opt) => {
      if (!assignedDoctor || !opt.doctor.toLowerCase().includes(assignedDoctor.name.toLowerCase())) {
        list.push({
          id: opt.value,
          name: opt.doctor,
          specialty: opt.specialty,
          hospital: opt.hospital || "Synapse Medical Network",
          avatar: opt.avatar,
          initials: opt.initials || "DR",
          isAssigned: false,
        });
      }
    });

    return list.slice(0, 3);
  }, [assignedDoctor]);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + " | " + now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentDateTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Available reports list for dropdown
  const availableReports = useMemo(() => {
    const list: Array<{ id: string; name: string; date: string }> = [];
    if (uploads.length > 0) {
      uploads.forEach((u) => {
        list.push({
          id: u.id,
          name: u.original_filename,
          date: new Date(u.created_at).toLocaleDateString(),
        });
      });
    } else if (panels.length > 0) {
      panels.forEach((p) => {
        list.push({
          id: p.id,
          name: `Structured Lab Panel`,
          date: formatLabDate(p.recorded_at),
        });
      });
    }
    return list;
  }, [uploads, panels]);

  // Extract all metric assessments from active panel
  const allMetrics = useMemo(() => {
    if (!activePanel) return [];
    return getMetricAssessments(activePanel).filter((m) => m.status !== "missing");
  }, [activePanel]);

  // Current organ's relevant biomarkers
  const currentOrganMeta = ORGAN_SYSTEMS[selectedOrgan];
  const organBiomarkers = useMemo(() => {
    if (allMetrics.length === 0) {
      return [];
    }
    const matched = allMetrics.filter((m) => {
      return currentOrganMeta.biomarkerKeys.some(
        (key) => key.toLowerCase() === m.label.toLowerCase() || key.toLowerCase() === m.key.toLowerCase()
      );
    });

    return matched;
  }, [allMetrics, selectedOrgan, currentOrganMeta]);

  // Real Patient Demographic stats (Derived from live Supabase DB profile, props, or local state)
  const patientStats = useMemo(() => {
    let savedProfile: any = {};
    const uid = user?.id || profile?.id;
    if (uid) {
      try {
        const raw = localStorage.getItem(`zebra_profile_${uid}`);
        if (raw) savedProfile = JSON.parse(raw);
      } catch (e) {}
    }

    const currentProfile = dbProfile || profile || savedProfile;

    const emailName = user?.email ? user.email.split("@")[0] : null;
    const fullName = currentProfile?.full_name || savedProfile.full_name || emailName || "Patient";

    const bloodType =
      currentProfile?.blood_type ||
      (currentProfile as any)?.blood_group ||
      (currentProfile as any)?.bloodType ||
      savedProfile.blood_type ||
      savedProfile.bloodType ||
      "--";

    const gender =
      currentProfile?.gender ||
      savedProfile.gender ||
      "--";

    const rawAge = currentProfile?.age ?? savedProfile.age ?? null;
    const age = rawAge ? `${rawAge} yrs` : "--";

    const rawHeight = currentProfile?.height_cm ?? savedProfile.height_cm ?? null;
    const height = rawHeight ? `${rawHeight} cm` : "--";

    const rawWeight = currentProfile?.weight_kg ?? savedProfile.weight_kg ?? null;
    const weight = rawWeight ? `${rawWeight} kg` : "--";

    const bmiVal = (rawHeight && rawWeight) ? calculateBmi(Number(rawHeight), Number(rawWeight)) : null;
    const bmi = bmiVal ? `${bmiVal}` : "--";

    return { fullName, bloodType, gender, age, height, weight, bmi };
  }, [profile, dbProfile, user]);

  // Upload handler
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const res = await onUploadReport(selectedFile);
      await onRefreshPanels();
      toast.success(res.message || "Lab report uploaded & biomarkers extracted successfully!");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload lab report.");
    } finally {
      setIsUploading(false);
    }
  };

  // Historical Trendline Data computed dynamically per organ & patient lab panels
  const organTrendData = useMemo(() => {
    if (!panels || panels.length === 0) {
      return {
        hasData: false,
        points: [] as Array<{
          id: string;
          index: number;
          date: string;
          shortDate: string;
          score: number;
          status: "optimal" | "borderline" | "attention";
          labelList: string[];
          x: number;
          y: number;
        }>,
        trajectory: "no_data" as const,
        badgeText: "Awaiting Lab Reports",
        badgeVariant: "slate" as const,
        subtitle: "Upload lab reports to track real diagnostic trendlines",
        pathString: "",
        areaString: "",
      };
    }

    // Sort chronologically ascending (earliest to latest)
    const sorted = [...panels].sort((a, b) => {
      const aTime = new Date(`${a.recorded_at}T00:00:00`).getTime();
      const bTime = new Date(`${b.recorded_at}T00:00:00`).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const rawPoints = sorted.map((p, idx) => {
      const pMetrics = getMetricAssessments(p).filter((m) => m.status !== "missing");
      const matched = pMetrics.filter((m) =>
        currentOrganMeta.biomarkerKeys.some(
          (key) => key.toLowerCase() === m.label.toLowerCase() || key.toLowerCase() === m.key.toLowerCase()
        )
      );

      let normalCount = 0;
      let borderlineCount = 0;
      let abnormalCount = 0;
      let score = 90;
      let labelList: string[] = [];

      if (matched.length > 0) {
        normalCount = matched.filter((m) => m.status === "normal").length;
        borderlineCount = matched.filter((m) => m.status === "borderline").length;
        abnormalCount = matched.filter((m) => m.status === "high" || m.status === "low").length;
        score = Math.max(25, Math.min(100, 100 - borderlineCount * 12 - abnormalCount * 28));
        labelList = matched.map((m) => `${m.label}: ${m.value} ${m.unit} (${m.status})`);
      } else if (pMetrics.length > 0) {
        normalCount = pMetrics.filter((m) => m.status === "normal").length;
        borderlineCount = pMetrics.filter((m) => m.status === "borderline").length;
        abnormalCount = pMetrics.filter((m) => m.status === "high" || m.status === "low").length;
        score = Math.max(30, Math.min(100, 100 - borderlineCount * 10 - abnormalCount * 22));
        labelList = pMetrics.slice(0, 3).map((m) => `${m.label}: ${m.value} ${m.unit}`);
      }

      const dateObj = new Date(`${p.recorded_at}T00:00:00`);
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : p.recorded_at;
      const shortDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Panel ${idx + 1}`;

      const status: "optimal" | "borderline" | "attention" =
        abnormalCount > 0 ? "attention" : borderlineCount > 0 ? "borderline" : "optimal";

      return {
        id: p.id,
        index: idx,
        date: formattedDate,
        shortDate,
        score,
        status,
        labelList,
      };
    });

    // Map Coordinates (ViewBox 0 0 500 70)
    const points = rawPoints.map((pt, i) => {
      const x =
        rawPoints.length === 1
          ? 250
          : Math.round(35 + (i / (rawPoints.length - 1)) * 430);
      const y = Math.round(58 - ((pt.score - 20) / 80) * 44);
      return { ...pt, x, y };
    });

    // Generate smooth curve
    let pathString = "";
    if (points.length === 2) {
      const [p0, p1] = points;
      const midX = (p0.x + p1.x) / 2;
      pathString = `M ${p0.x} ${p0.y} C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    } else if (points.length > 2) {
      pathString = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        pathString += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
      }
    }

    const areaString =
      points.length >= 2
        ? `${pathString} L ${points[points.length - 1].x} 70 L ${points[0].x} 70 Z`
        : "";

    // Trajectory evaluation
    const firstPt = points[0];
    const latestPt = points[points.length - 1];
    const prevPt = points.length > 1 ? points[points.length - 2] : null;
    const delta = prevPt ? latestPt.score - prevPt.score : 0;

    let badgeText = "Stable Trajectory";
    let badgeVariant: "emerald" | "amber" | "rose" | "sky" | "slate" = "emerald";
    let trajectory: "improving" | "declining" | "stable" | "single_reading" = "stable";

    if (points.length === 1) {
      trajectory = "single_reading";
      if (latestPt.status === "optimal") {
        badgeText = "Optimal Baseline";
        badgeVariant = "emerald";
      } else if (latestPt.status === "borderline") {
        badgeText = "Borderline Baseline";
        badgeVariant = "amber";
      } else {
        badgeText = "Attention Required";
        badgeVariant = "rose";
      }
    } else {
      if (delta >= 6 || latestPt.score - firstPt.score >= 8) {
        badgeText = "Improving Trajectory";
        badgeVariant = "emerald";
        trajectory = "improving";
      } else if (delta <= -6 || latestPt.score - firstPt.score <= -8 || latestPt.status === "attention") {
        badgeText = latestPt.status === "attention" ? "Elevated Biomarkers" : "Declining Stability";
        badgeVariant = "rose";
        trajectory = "declining";
      } else if (latestPt.status === "borderline") {
        badgeText = "Borderline Stability";
        badgeVariant = "amber";
        trajectory = "stable";
      } else {
        badgeText = "Stable Trajectory";
        badgeVariant = "emerald";
        trajectory = "stable";
      }
    }

    const subtitle =
      points.length === 1
        ? `Single baseline recorded on ${points[0].date}`
        : `Tracking historical stability across ${points.length} recorded lab panels (${points[0].shortDate} – ${points[points.length - 1].shortDate})`;

    return {
      hasData: true,
      points,
      trajectory,
      badgeText,
      badgeVariant,
      subtitle,
      pathString,
      areaString,
    };
  }, [panels, currentOrganMeta]);

  // Computed biomarkers (real extracted metrics from active report or empty if no report uploaded)
  const displayBiomarkers = useMemo(() => {
    if (organBiomarkers.length > 0) return organBiomarkers;
    return [];
  }, [organBiomarkers]);

  return (
    <div className="min-h-screen xl:h-screen xl:max-h-screen w-full bg-gradient-to-br from-[#e6f1fc] via-[#edf5fd] to-[#dff0fb] text-slate-800 font-sans p-2.5 sm:p-3.5 xl:p-3.5 select-none overflow-x-hidden xl:overflow-hidden flex flex-col justify-between">
      <div className="max-w-[1700px] w-full mx-auto flex-1 flex flex-col gap-2.5 xl:gap-3 min-h-0">

        {/* ========================================================= */}
        {/* 1. TOP HEADER BAR: Title, Date, Search, Report Picker, Upload */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] shrink-0">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-[0_2px_10px_rgba(2,132,199,0.3)] shrink-0">
              <Sparkles className="h-4 w-4 fill-white/20" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Dashboard
              </h1>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Interactive 3D Anatomical & Diagnostic Intelligence
              </p>
            </div>
          </div>

          {/* Middle Clock & Search Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 max-w-xl justify-start md:justify-center">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50/80 border border-sky-100 text-[10px] font-semibold text-sky-800 shrink-0">
              <Clock className="h-3 w-3 text-sky-600" />
              <span>{currentDateTime || "Loading date & time..."}</span>
            </div>

            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biomarkers, doctors..."
                className="h-8.5 w-full rounded-xl border border-slate-200/80 bg-white/90 pl-8 pr-3 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          {/* Right Action Bar: Report Selector, Upload, Bell & Avatar */}
          <div className="flex items-center gap-2 justify-between md:justify-end shrink-0">
            {/* Active Report Selector Dropdown */}
            {availableReports.length > 0 ? (
              <div className="w-[150px] sm:w-[185px]">
                <Select value={selectedReportId} onValueChange={onSelectReportId}>
                  <SelectTrigger className="h-8.5 rounded-xl border-slate-200 bg-white/90 text-[11px] font-semibold text-slate-700 hover:border-sky-400 focus:ring-2 focus:ring-sky-500/20 shadow-sm">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3 w-3 text-sky-600 shrink-0" />
                      <span className="truncate">
                        {availableReports.find((r) => r.id === selectedReportId)?.name || "All Lab Reports"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-slate-100 bg-white shadow-xl rounded-xl p-1 z-50">
                    <SelectItem value="all" className="text-xs font-medium py-1.5 rounded-lg">
                      📊 Synthesized (All Reports)
                    </SelectItem>
                    {availableReports.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs font-medium py-1.5 rounded-lg">
                        📄 {r.name} ({r.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Quick Upload Button */}
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-[11px] font-semibold shadow-[0_2px_10px_rgba(2,132,199,0.3)] hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Upload className="h-3 w-3 stroke-[2.5]" />
              <span className="hidden sm:inline">Upload Report</span>
            </Button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate("/patient/wellness-tips")}
              title="Notifications"
              className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-white/90 border border-slate-200/80 text-slate-600 hover:text-sky-600 hover:bg-sky-50/50 shadow-sm transition-all"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* User Profile Avatar */}
            <div
              onClick={() => navigate("/patient/settings")}
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-2 ring-sky-400/40 cursor-pointer shadow-sm hover:scale-105 transition-transform"
            >
              <img
                src={
                  (profile as any)?.avatar_url ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                }
                alt={patientStats.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. MAIN 3-COLUMN LAYOUT: Anatomy (Left) | Organ & Lab Data (Center) | Patient & Doctors (Right) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 xl:gap-3.5 items-stretch flex-1 min-h-0">

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1: LEFT - 3D Full Body Muscular Anatomy & Hotspots (3.5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center justify-between rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 p-3 xl:p-3.5 shadow-[0_6px_25px_rgba(40,110,190,0.05)] relative overflow-hidden group h-full">
            
            {/* Background ambient lighting */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-44 h-44 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-36 h-36 bg-blue-300/30 rounded-full blur-2xl pointer-events-none" />

            {/* Top Anatomy Status Badge */}
            <div className="w-full flex items-center justify-between z-10 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/80 text-[10px] font-semibold text-sky-800">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                Live Anatomical Map
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                3D System
              </span>
            </div>

            {/* 3D Anatomy Model Illustration with Interactive Hotspots */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center select-none my-1">
              {/* Full Muscular Body Anatomy Render */}
              <div className="relative h-full max-h-[calc(100vh-210px)] aspect-[9/16] flex items-center justify-center">
                <img
                  src="/assets/human-model.webp"
                  alt="Human Muscular System Anatomy"
                  className="w-full h-full object-contain pointer-events-none drop-shadow-[0_10px_25px_rgba(14,165,233,0.18)] transition-transform duration-500 group-hover:scale-[1.01]"
                />

                {/* SVG Diagonal Callout Leader Line from Active Hotspot */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1={currentOrganMeta.hotspot.x}
                    y1={currentOrganMeta.hotspot.y}
                    x2={Math.min(currentOrganMeta.hotspot.x + 22, 98)}
                    y2={Math.max(currentOrganMeta.hotspot.y - 12, 4)}
                    stroke="rgba(255, 255, 255, 0.85)"
                    strokeWidth="0.75"
                    strokeDasharray="2 1"
                    className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] animate-pulse"
                  />
                  <line
                    x1={Math.min(currentOrganMeta.hotspot.x + 22, 98)}
                    y1={Math.max(currentOrganMeta.hotspot.y - 12, 4)}
                    x2="100"
                    y2={Math.max(currentOrganMeta.hotspot.y - 12, 4)}
                    stroke="rgba(255, 255, 255, 0.85)"
                    strokeWidth="0.75"
                    className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  />
                </svg>

                {/* Interactive Hotspot Target Rings */}
                {Object.values(ORGAN_SYSTEMS).map((organ) => {
                  const isSelected = selectedOrgan === organ.id;
                  return (
                    <button
                      key={organ.id}
                      onClick={() => setSelectedOrgan(organ.id)}
                      style={{
                        left: `${organ.hotspot.x}%`,
                        top: `${organ.hotspot.y}%`,
                      }}
                      className="group/pin absolute -translate-x-1/2 -translate-y-1/2 p-1.5 focus:outline-none transition-all duration-300 z-20 cursor-pointer"
                      title={`Inspect ${organ.name} diagnostic data`}
                    >
                      {/* Radar Sonar Pulse on Selection / Hover */}
                      <span
                        className={`absolute inset-0 rounded-full transition-all duration-300 ${
                          isSelected
                            ? "bg-white/50 animate-ping"
                            : "bg-white/20 group-hover/pin:bg-white/40"
                        }`}
                      />

                      {/* Outer Glowing Translucent Halo Ring */}
                      <div
                        className={`relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-white/70 backdrop-blur-[2px] transition-all duration-300 ${
                          isSelected
                            ? "bg-rose-500/25 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.85)] scale-110 ring-2 ring-rose-400"
                            : "bg-white/35 shadow-[0_0_12px_rgba(255,255,255,0.5)] group-hover/pin:scale-110 group-hover/pin:bg-white/50 group-hover/pin:border-white"
                        }`}
                      >
                        {/* Inner Solid White Core Dot */}
                        <span
                          className={`h-2 w-2 rounded-full transition-all duration-300 ${
                            isSelected
                              ? "bg-white shadow-[0_0_8px_#fff] scale-125 ring-2 ring-rose-500"
                              : "bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] group-hover/pin:scale-110"
                          }`}
                        />
                      </div>

                      {/* Floating Tooltip Label on Hover */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/pin:flex items-center px-1.5 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-semibold whitespace-nowrap shadow-xl border border-white/10 z-30">
                        {organ.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom "Explore More ↗" Button */}
            <Button
              onClick={() => navigate("/patient/disease-prediction")}
              className="w-full h-8.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-xs shadow-[0_2px_12px_rgba(2,132,199,0.3)] hover:shadow-md transition-all flex items-center justify-center gap-1.5 z-10 shrink-0"
            >
              <span>Explore More</span>
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </Button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2: CENTER - Active Organ Focus, Biomarkers & 2x2 Grid (5.5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-8 xl:col-span-6 flex flex-col justify-between gap-2.5 xl:gap-3 h-full min-h-0">

            {/* A. ACTIVE HERO ORGAN CARD */}
            <div className="relative rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-3 xl:p-3.5 shadow-[0_6px_25px_rgba(40,110,190,0.05)] overflow-hidden shrink-0">
              
              {/* Background ambient gradient flare */}
              <div
                className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none bg-gradient-to-br ${currentOrganMeta.gradient}`}
              />

              <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
                
                {/* 3D Rendered Organ Visual Illustration */}
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50/60 to-white/40 border border-white/80 p-2 shadow-inner">
                    <Organ3DGraphic organId={selectedOrgan} />
                  </div>
                </div>

                {/* Organ Diagnostic Biomarkers Overview */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-['Manrope'] truncate">
                          {currentOrganMeta.name}
                        </h2>
                        <Badge
                          variant="outline"
                          className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold px-2 py-0.5 shrink-0"
                        >
                          {currentOrganMeta.subtitle}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {currentOrganMeta.description}
                      </p>
                    </div>
                  </div>

                  {/* 2x2 Biomarker Stat Chips or Empty State */}
                  {displayBiomarkers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {displayBiomarkers.slice(0, 4).map((m: any, idx: number) => {
                        const isHigh = m.status === "high";
                        const isLow = m.status === "low";
                        const isBorderline = m.status === "borderline";

                        return (
                          <div
                            key={m.key || idx}
                            className="flex flex-col justify-between p-2 rounded-xl bg-slate-50/90 hover:bg-sky-50/60 border border-slate-100 hover:border-sky-200/80 transition-all shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[10px] font-semibold text-slate-500 truncate">
                                {m.label || m.key}
                              </span>
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  isHigh || isLow
                                    ? "bg-rose-500 animate-pulse"
                                    : isBorderline
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                            </div>

                            <div className="flex items-baseline justify-between gap-1.5">
                              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                                {m.value !== null && m.value !== undefined ? m.value : "--"}
                                <span className="text-[9px] font-sans font-normal text-slate-400 ml-1">
                                  {m.unit || ""}
                                </span>
                              </span>

                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                                  isHigh
                                    ? "bg-rose-100 text-rose-700"
                                    : isLow
                                    ? "bg-sky-100 text-sky-700"
                                    : isBorderline
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {m.status || "Normal"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-1.5 min-h-[96px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                        <Upload className="h-3.5 w-3.5 text-sky-600" />
                        <span>No Medical Report Uploaded</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium max-w-xs leading-tight">
                        Upload a lab report to view extracted biomarkers and vitals for {currentOrganMeta.name}.
                      </p>
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="mt-0.5 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload Report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* B. BIOMARKER TREND CHART */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-2.5 xl:p-3 shadow-[0_6px_25px_rgba(40,110,190,0.05)] space-y-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <h3 className="text-xs font-bold text-slate-900 leading-tight truncate">
                    {currentOrganMeta.name} Diagnostic Trendline
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                    {organTrendData.subtitle}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    organTrendData.badgeVariant === "emerald"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                      : organTrendData.badgeVariant === "rose"
                      ? "text-rose-700 bg-rose-50 border-rose-200/80"
                      : organTrendData.badgeVariant === "amber"
                      ? "text-amber-700 bg-amber-50 border-amber-200/80"
                      : "text-slate-600 bg-slate-50 border-slate-200"
                  }`}
                >
                  {organTrendData.trajectory === "improving" ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : organTrendData.trajectory === "declining" ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : organTrendData.trajectory === "single_reading" ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <Activity className="h-2.5 w-2.5" />
                  )}
                  {organTrendData.badgeText}
                </span>
              </div>

              {/* Smooth SVG Trend Line Visualizer */}
              <div className="relative h-15 xl:h-17 w-full rounded-xl bg-gradient-to-b from-sky-50/40 to-white/80 border border-slate-100 p-1.5 flex flex-col justify-between overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-30">
                  <div className="border-b border-dashed border-slate-300 w-full" />
                  <div className="border-b border-dashed border-slate-300 w-full" />
                </div>

                {organTrendData.hasData && organTrendData.points.length > 0 ? (
                  <>
                    <svg
                      viewBox="0 0 500 70"
                      className="w-full h-11 overflow-visible relative z-10"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="organTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor={
                              organTrendData.badgeVariant === "rose"
                                ? "#f43f5e"
                                : organTrendData.badgeVariant === "amber"
                                ? "#f59e0b"
                                : "#0284c7"
                            }
                            stopOpacity="0.25"
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              organTrendData.badgeVariant === "rose"
                                ? "#f43f5e"
                                : organTrendData.badgeVariant === "amber"
                                ? "#f59e0b"
                                : "#0284c7"
                            }
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>

                      {/* Area Fill under curve */}
                      {organTrendData.areaString && (
                        <path d={organTrendData.areaString} fill="url(#organTrendGradient)" />
                      )}

                      {/* Trajectory Stroke Line */}
                      {organTrendData.pathString && (
                        <path
                          d={organTrendData.pathString}
                          fill="none"
                          stroke={
                            organTrendData.badgeVariant === "rose"
                              ? "#f43f5e"
                              : organTrendData.badgeVariant === "amber"
                              ? "#f59e0b"
                              : "#0284c7"
                          }
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Single Point Horizontal Guide Line */}
                      {organTrendData.points.length === 1 && (
                        <line
                          x1="30"
                          y1={organTrendData.points[0].y}
                          x2="470"
                          y2={organTrendData.points[0].y}
                          stroke="#0284c7"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.5"
                        />
                      )}

                      {/* Interactive Data Point Nodes */}
                      {organTrendData.points.map((pt, i) => {
                        const isLatest = i === organTrendData.points.length - 1;
                        const ptColor =
                          pt.status === "attention"
                            ? "#ef4444"
                            : pt.status === "borderline"
                            ? "#f59e0b"
                            : "#0284c7";

                        return (
                          <g key={pt.id || i} className="group/node cursor-pointer">
                            <title>{`${pt.date}\nStability Index: ${pt.score}%\n${pt.labelList.join("\n") || "Normal parameters"}`}</title>
                            {/* Outer ping on latest */}
                            {isLatest && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="7"
                                fill={ptColor}
                                opacity="0.2"
                                className="animate-pulse"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isLatest ? "4.5" : "3.5"}
                              fill={isLatest ? ptColor : "#ffffff"}
                              stroke={ptColor}
                              strokeWidth="2"
                              className="transition-transform group-hover/node:scale-125"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Bottom Actual Panel Dates */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1 pt-0.5 border-t border-slate-100 z-10 select-none">
                      {organTrendData.points.map((pt, idx) => (
                        <span
                          key={pt.id || idx}
                          className={`truncate ${
                            idx === organTrendData.points.length - 1
                              ? "font-bold text-sky-700"
                              : "text-slate-500"
                          }`}
                          title={pt.date}
                        >
                          {pt.shortDate}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-0.5 relative z-10 py-1">
                    <p className="text-[11px] font-semibold text-slate-500">Historical Biomarker Baseline</p>
                    <p className="text-[9px] text-slate-400">
                      Upload lab panels to generate chronological stability trajectories for {currentOrganMeta.name}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* C. 2x2 ORGAN SELECTOR GRID */}
            <div className="grid grid-cols-2 gap-2 xl:gap-2.5 flex-1 min-h-0">
              {(["heart", "blood", "lungs", "stomach"] as OrganSystemId[]).map((orgId) => {
                const organ = ORGAN_SYSTEMS[orgId];
                const isSelected = selectedOrgan === orgId;

                return (
                  <button
                    key={orgId}
                    onClick={() => setSelectedOrgan(orgId)}
                    className={`group relative flex flex-col items-center justify-between p-2 xl:p-2.5 rounded-2xl transition-all duration-300 text-left cursor-pointer ${
                      isSelected
                        ? "bg-white border-2 border-sky-500 shadow-[0_4px_16px_rgba(2,132,199,0.15)] scale-[1.01]"
                        : "bg-white/70 hover:bg-white border border-white/90 hover:border-sky-300 shadow-[0_2px_10px_rgba(40,110,190,0.03)] hover:shadow-sm"
                    }`}
                  >
                    {/* Organ Thumbnail Render */}
                    <div className="relative h-11 w-11 xl:h-13 xl:w-13 flex items-center justify-center transition-transform group-hover:scale-105 duration-300 my-auto">
                      <Organ3DGraphic organId={orgId} size="small" />
                    </div>

                    {/* Bottom Title & Action Icon */}
                    <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100/80">
                      <span
                        className={`text-[11px] xl:text-xs font-bold tracking-tight ${
                          isSelected ? "text-sky-700" : "text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        My {organ.name}
                      </span>
                      <ArrowUpRight
                        className={`h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                          isSelected ? "text-sky-600" : "text-slate-400 group-hover:text-sky-600"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 3: RIGHT - Patient Card, Consulting Doctors & Medication (3.5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-12 xl:col-span-3 flex flex-col justify-between gap-2.5 xl:gap-3 h-full min-h-0">

            {/* A. PATIENT DEMOGRAPHIC CARD */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-3 xl:p-3.5 shadow-[0_6px_25px_rgba(40,110,190,0.05)] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl overflow-hidden ring-2 ring-sky-200 shrink-0">
                    <img
                      src={
                        (profile as any)?.avatar_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={patientStats.fullName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope'] truncate">
                      {patientStats.fullName}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      ID: #{profile?.id?.slice(0, 8).toUpperCase() || "SYN-2849"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6-Grid Stats: Blood, Gender, Age, Height, Weight, BMI */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400">Blood</p>
                  <p className="text-[11px] font-bold text-slate-900">{patientStats.bloodType}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400">Gender</p>
                  <p className="text-[11px] font-bold text-slate-900">{patientStats.gender}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400">Age</p>
                  <p className="text-[11px] font-bold text-slate-900">{patientStats.age}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400">Height</p>
                  <p className="text-[11px] font-bold text-slate-900">{patientStats.height}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400">Weight</p>
                  <p className="text-[11px] font-bold text-slate-900">{patientStats.weight}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-sky-50/80 border border-sky-100">
                  <p className="text-[9px] font-semibold text-sky-700">BMI</p>
                  <p className="text-[11px] font-bold text-sky-900">{patientStats.bmi}</p>
                </div>
              </div>
            </div>

            {/* B. CONSULTING DOCTOR LIST */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-2.5 xl:p-3 shadow-[0_6px_25px_rgba(40,110,190,0.05)] space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 font-['Manrope']">
                    Consulting Doctor
                  </h3>
                  {assignedDoctor && (
                    <Badge className="border-sky-200 bg-sky-50 text-sky-700 text-[9px] font-semibold py-0 px-1.5">
                      Linked Team
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => navigate("/patient/appointments")}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                >
                  See all
                </button>
              </div>

              <div className="space-y-1.5">
                {consultingDoctorsList.slice(0, 2).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50/80 hover:bg-sky-50/40 border border-slate-100 hover:border-sky-200 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <DoctorAvatar
                        src={doc.avatar}
                        name={doc.name}
                        initials={doc.initials}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h4 className="text-[11px] font-bold text-slate-900 truncate">
                            {doc.name}
                          </h4>
                          {doc.isAssigned && (
                            <span className="rounded bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1 py-0.2 shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 truncate">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/patient/appointments?doctor=${encodeURIComponent(doc.name)}`)}
                      className="w-full h-6.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-semibold shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Book Consultation</span>
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* C. ACTIVE MEDICATION SHELF */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 p-2.5 xl:p-3 shadow-[0_6px_25px_rgba(40,110,190,0.05)] space-y-2 flex-1 min-h-0 flex flex-col justify-between">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 font-['Manrope']">
                    Medication
                  </h3>
                  {activePrescriptions.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-lime-200 bg-lime-50 px-1.5 py-0.2 text-[9px] font-bold text-lime-800">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                      {activePrescriptions.length} Active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate("/patient/prescription")}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                >
                  See all
                </button>
              </div>

              {prescriptionsLoading ? (
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-center text-[10px] text-slate-400 flex-1">
                  Loading active medications…
                </div>
              ) : activePrescriptions.length === 0 ? (
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">No Active Prescriptions</p>
                    <p className="text-[9px] text-slate-400">
                      Doctor prescribed meds will sync here.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/patient/prescription")}
                    className="text-[10px] h-6 rounded-lg border-slate-200 hover:bg-sky-50 text-slate-700 font-medium px-2"
                  >
                    View Vault
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-center">
                  {activePrescriptions.slice(0, 2).map((rx, idx) => {
                    const parsed = parsePrescriptionItem(rx);
                    const bottleColor = BOTTLE_COLORS[idx % BOTTLE_COLORS.length];
                    return (
                      <div
                        key={rx.id}
                        onClick={() => navigate("/patient/prescription")}
                        className="group p-2 rounded-xl bg-slate-50/80 hover:bg-sky-50/50 border border-slate-100 hover:border-sky-200 transition-all cursor-pointer flex flex-col items-center text-center relative h-full justify-between"
                      >
                        <div className="h-9 w-8 flex items-center justify-center my-0.5 group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 60 80" className="h-full w-full drop-shadow-xs">
                            <rect x="22" y="5" width="16" height="8" rx="2" fill="#94a3b8" />
                            <rect x="15" y="13" width="30" height="55" rx="8" fill={bottleColor} opacity="0.85" />
                            <rect x="18" y="25" width="24" height="30" rx="3" fill="#ffffff" />
                            <line x1="22" y1="33" x2="38" y2="33" stroke="#cbd5e1" strokeWidth="2" />
                            <line x1="22" y1="40" x2="34" y2="40" stroke="#cbd5e1" strokeWidth="2" />
                          </svg>
                        </div>

                        <h4 className="text-[10px] font-bold text-slate-900 truncate w-full" title={parsed.name}>
                          {parsed.name}
                        </h4>
                        <p className="text-[9px] font-mono text-slate-500 font-semibold">
                          {parsed.dosage}
                        </p>
                        <p className="text-[8px] text-slate-400 truncate w-full">
                          {parsed.schedule}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. UPLOAD LAB REPORT MODAL */}
      {/* ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
                  <Upload className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Lab Report</h3>
                  <p className="text-xs text-slate-400">Extract biomarkers into your 3D health vault</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setSelectedFile(e.dataTransfer.files[0]);
                }
              }}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-sky-500 bg-sky-50/50"
                  : "border-slate-200 bg-slate-50/60 hover:border-sky-400 hover:bg-sky-50/20"
              }`}
            >
              <input
                type="file"
                id="modal-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="modal-upload" className="cursor-pointer block space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : "Choose a lab report file or drag & drop"}
                </p>
                <p className="text-[11px] text-slate-400">Supports Digital & Scanned PDF, PNG, JPG, WebP (up to 10MB)</p>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-xs font-medium text-sky-700 bg-sky-50 p-2.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                <span>Ready to extract biomarkers and update 3D anatomy cards.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
                className="flex-1 h-11 rounded-2xl border-slate-200 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedFile || isUploading}
                onClick={handleUploadSubmit}
                className="flex-1 h-11 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md"
              >
                {isUploading ? "Extracting..." : "Process Report"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// -------------------------------------------------------------
// 3D ORGAN GRAPHICS COMPONENT (High-Fidelity SVG Illustrations)
// -------------------------------------------------------------
function Organ3DGraphic({ organId, size = "large" }: { organId: OrganSystemId; size?: "large" | "small" }) {
  const isLarge = size === "large";

  switch (organId) {
    case "heart":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="heart3D" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ff5e62" />
              <stop offset="50%" stopColor="#e52d27" />
              <stop offset="85%" stopColor="#b31217" />
              <stop offset="100%" stopColor="#63060a" />
            </radialGradient>
            <linearGradient id="aorta3D" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="artery3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Vena Cava & Aortic Arches */}
          <path d="M65 30 C65 15 85 10 95 25 L95 55 L75 55 Z" fill="url(#aorta3D)" />
          <path d="M85 30 C95 10 120 15 120 40 L110 60 L90 55 Z" fill="url(#artery3D)" />

          {/* Superior Aorta branches */}
          <rect x="75" y="10" width="8" height="15" rx="3" fill="#0284c7" />
          <rect x="92" y="8" width="7" height="18" rx="3" fill="#dc2626" />
          <rect x="103" y="12" width="7" height="16" rx="3" fill="#dc2626" />

          {/* Main Cardiac Muscular Body */}
          <path
            d="M50 65 C40 85 45 115 80 148 C115 115 135 85 120 60 C110 45 85 50 80 65 C75 50 58 45 50 65 Z"
            fill="url(#heart3D)"
          />

          {/* Coronary Vessels */}
          <path
            d="M75 65 Q85 90 75 110 Q70 125 78 140"
            fill="none"
            stroke="#38bdf8"
            strokeWidth={isLarge ? "2" : "1.5"}
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M80 80 Q95 100 100 120"
            fill="none"
            stroke="#fecaca"
            strokeWidth={isLarge ? "2" : "1.5"}
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Specular 3D Highlight */}
          <ellipse cx="65" cy="75" rx="10" ry="16" fill="#ffffff" opacity="0.25" transform="rotate(-20 65 75)" />
        </svg>
      );

    case "blood":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="rbc3D" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>
          </defs>

          {/* Background Erythrocyte */}
          <ellipse cx="115" cy="55" rx="26" ry="18" fill="url(#rbc3D)" transform="rotate(-25 115 55)" opacity="0.85" />
          <ellipse cx="115" cy="55" rx="12" ry="7" fill="#1e3a8a" transform="rotate(-25 115 55)" opacity="0.6" />

          {/* Main Foreground Erythrocyte (Red Blood Cell) */}
          <ellipse cx="68" cy="95" rx="38" ry="26" fill="url(#rbc3D)" transform="rotate(-15 68 95)" />
          <ellipse cx="68" cy="95" rx="18" ry="11" fill="#1e3a8a" transform="rotate(-15 68 95)" opacity="0.5" />
          <ellipse cx="60" cy="88" rx="8" ry="4" fill="#ffffff" opacity="0.3" transform="rotate(-15 60 88)" />

          {/* Platelet / Small cell */}
          <ellipse cx="120" cy="115" rx="14" ry="10" fill="url(#rbc3D)" transform="rotate(30 120 115)" />
        </svg>
      );

    case "lungs":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="lung3D" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="90%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#075985" />
            </radialGradient>
          </defs>

          {/* Trachea */}
          <path d="M74 25 L86 25 L86 55 L98 70 L90 75 L80 62 L70 75 L62 70 L74 55 Z" fill="#94a3b8" />
          <line x1="75" y1="32" x2="85" y2="32" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="75" y1="40" x2="85" y2="40" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="75" y1="48" x2="85" y2="48" stroke="#ffffff" strokeWidth="1.5" />

          {/* Left Lung Lobe */}
          <path
            d="M68 62 C50 65 35 85 35 110 C35 135 55 145 72 140 C75 130 75 85 68 62 Z"
            fill="url(#lung3D)"
          />

          {/* Right Lung Lobe */}
          <path
            d="M92 62 C110 65 125 85 125 110 C125 135 105 145 88 140 C85 130 85 85 92 62 Z"
            fill="url(#lung3D)"
          />

          {/* Highlight */}
          <ellipse cx="50" cy="95" rx="8" ry="16" fill="#ffffff" opacity="0.25" />
          <ellipse cx="110" cy="95" rx="8" ry="16" fill="#ffffff" opacity="0.25" />
        </svg>
      );

    case "stomach":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="stomach3D" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="90%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>

          {/* Esophagus tube */}
          <path d="M60 25 C65 40 70 50 75 60 L88 56 C82 45 75 35 72 25 Z" fill="#cbd5e1" />

          {/* Gastric Body & Fundus J-Shape */}
          <path
            d="M75 58 C60 55 45 70 45 95 C45 130 85 145 110 135 C130 125 125 95 105 95 C88 95 85 115 68 112 C60 108 60 85 88 72 Z"
            fill="url(#stomach3D)"
          />

          {/* Duodenum tail */}
          <path d="M105 95 C118 95 125 85 128 75 L120 72 C116 80 112 85 105 87 Z" fill="#cbd5e1" />

          {/* 3D Specular Highlight */}
          <ellipse cx="60" cy="95" rx="6" ry="15" fill="#ffffff" opacity="0.25" transform="rotate(-15 60 95)" />
        </svg>
      );

    case "kidneys":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="kidney3D" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="90%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
          </defs>
          {/* Left Kidney */}
          <path
            d="M50 50 C32 65 32 105 52 120 C68 132 80 115 72 95 C65 80 70 65 50 50 Z"
            fill="url(#kidney3D)"
          />
          {/* Right Kidney */}
          <path
            d="M110 50 C128 65 128 105 108 120 C92 132 80 115 88 95 C95 80 90 65 110 50 Z"
            fill="url(#kidney3D)"
          />
        </svg>
      );

    case "brain":
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="brain3D" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="90%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#164e63" />
            </radialGradient>
          </defs>
          <path
            d="M80 40 C55 40 45 60 45 85 C45 110 65 125 80 125 C95 125 115 110 115 85 C115 60 105 40 80 40 Z"
            fill="url(#brain3D)"
          />
        </svg>
      );
  }
}


