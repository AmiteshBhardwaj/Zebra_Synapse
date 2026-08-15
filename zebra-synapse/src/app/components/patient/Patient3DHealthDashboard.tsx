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
import { type UserProfile } from "../../../types/supabase";
import {
  type LabPanelRow,
  formatLabDate,
} from "../../../lib/labPanels";
import {
  type MetricAssessment,
  getMetricAssessments,
} from "../../../lib/labInsights";
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

// Featured Consulting Doctors
const CONSULTING_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Edward Pitter",
    specialty: "Cardiac Surgeon",
    hospital: "Synapse Heart Institute",
    experience: "14 yrs exp",
    rating: "4.9",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-2",
    name: "Dr. Liza Paul",
    specialty: "Consultant Cardiologist",
    hospital: "Metropolitan Care Center",
    experience: "11 yrs exp",
    rating: "4.8",
    avatar: "https://images.unsplash.com/photo-1594824813589-3d02f2320b60?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-3",
    name: "Dr. Mike Harrison",
    specialty: "Sr. Consultant Cardiologist",
    hospital: "Zebra Specialized Clinic",
    experience: "18 yrs exp",
    rating: "5.0",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
];

// Prescribed Medications
const ACTIVE_MEDICATIONS = [
  {
    id: "med-1",
    name: "v-C 123 Foretin",
    dosage: "125mg",
    schedule: "Daily • After breakfast",
    bottleColor: "#d97706",
    badge: "Active",
  },
  {
    id: "med-2",
    name: "Bisolvon Elixir",
    dosage: "150ml",
    schedule: "2x Daily • Morning & Night",
    bottleColor: "#dc2626",
    badge: "Refill in 4d",
  },
  {
    id: "med-3",
    name: "CardioProtect Lipostan",
    dosage: "20mg",
    schedule: "Night • Before sleep",
    bottleColor: "#2563eb",
    badge: "Active",
  },
];

interface Patient3DHealthDashboardProps {
  profile: UserProfile | null;
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
  const navigate = useNavigate();
  const [selectedOrgan, setSelectedOrgan] = useState<OrganSystemId>("heart");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

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
      // Default fallback standard mock values if no report uploaded yet
      return getDefaultMockBiomarkers(selectedOrgan);
    }
    const matched = allMetrics.filter((m) => {
      return currentOrganMeta.biomarkerKeys.some(
        (key) => key.toLowerCase() === m.label.toLowerCase() || key.toLowerCase() === m.key.toLowerCase()
      );
    });

    if (matched.length === 0) {
      return getDefaultMockBiomarkers(selectedOrgan);
    }
    return matched;
  }, [allMetrics, selectedOrgan, currentOrganMeta]);

  // Patient Demographic stats
  const patientStats = useMemo(() => {
    const fullName = profile?.full_name || "Peter James";
    const bloodType = (profile as any)?.blood_group || "O+";
    const gender = (profile as any)?.gender || "Male";
    const age = (profile as any)?.age || "28 years";
    const height = (profile as any)?.height || "163cm";
    const weight = (profile as any)?.weight || "68kg";
    const bmi = (profile as any)?.bmi || "25.6";

    return { fullName, bloodType, gender, age, height, weight, bmi };
  }, [profile]);

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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e6f1fc] via-[#edf5fd] to-[#dff0fb] text-slate-800 font-sans p-3 sm:p-5 lg:p-6 select-none overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto space-y-4 sm:space-y-6">

        {/* ========================================================= */}
        {/* 1. TOP HEADER BAR: Title, Date, Search, Report Picker, Upload */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[26px] bg-white/75 backdrop-blur-md border border-white/90 p-4 sm:p-5 shadow-[0_8px_30px_rgba(30,100,180,0.06)]">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(2,132,199,0.3)]">
              <Sparkles className="h-5 w-5 fill-white/20" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Dashboard
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Interactive 3D Anatomical & Diagnostic Intelligence
              </p>
            </div>
          </div>

          {/* Middle Clock & Search Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1 max-w-2xl justify-start md:justify-center">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50/80 border border-sky-100 text-[11px] font-semibold text-sky-800">
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              <span>{currentDateTime || "Loading date & time..."}</span>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biomarkers, doctors..."
                className="h-10 w-full rounded-2xl border border-slate-200/80 bg-white/90 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          {/* Right Action Bar: Report Selector, Upload, Bell & Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between md:justify-end">
            {/* Active Report Selector Dropdown */}
            {availableReports.length > 0 ? (
              <div className="w-[170px] sm:w-[210px]">
                <Select value={selectedReportId} onValueChange={onSelectReportId}>
                  <SelectTrigger className="h-10 rounded-2xl border-slate-200 bg-white/90 text-xs font-semibold text-slate-700 hover:border-sky-400 focus:ring-2 focus:ring-sky-500/20 shadow-sm">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">
                        {availableReports.find((r) => r.id === selectedReportId)?.name || "All Lab Reports"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-slate-100 bg-white shadow-xl rounded-2xl p-1 z-50">
                    <SelectItem value="all" className="text-xs font-medium py-2 rounded-xl">
                      📊 Synthesized (All Reports)
                    </SelectItem>
                    {availableReports.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs font-medium py-2 rounded-xl">
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
              className="h-10 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-semibold shadow-[0_4px_16px_rgba(2,132,199,0.3)] hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Upload Report</span>
            </Button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate("/patient/wellness-tips")}
              title="Notifications"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/90 border border-slate-200/80 text-slate-600 hover:text-sky-600 hover:bg-sky-50/50 shadow-sm transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* User Profile Avatar */}
            <div
              onClick={() => navigate("/patient/settings")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden ring-2 ring-sky-400/40 cursor-pointer shadow-sm hover:scale-105 transition-transform"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1: LEFT - 3D Full Body Muscular Anatomy & Hotspots (3.5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center justify-between rounded-[28px] bg-white/75 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] min-h-[580px] sm:min-h-[640px] relative overflow-hidden group">
            
            {/* Background ambient lighting */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-300/30 rounded-full blur-2xl pointer-events-none" />

            {/* Top Anatomy Status Badge */}
            <div className="w-full flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-semibold text-sky-800">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                Live Anatomical Map
              </span>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                3D System
              </span>
            </div>

            {/* 3D Anatomy Model Illustration with Interactive Hotspots */}
            <div className="relative w-full max-w-[280px] sm:max-w-[310px] my-3 flex items-center justify-center select-none">
              {/* Full Muscular Body Anatomy Render */}
              <div className="relative w-full aspect-[9/16] flex items-center justify-center">
                <img
                  src="/assets/human-model.webp"
                  alt="Human Muscular System Anatomy"
                  className="w-full h-full object-contain pointer-events-none drop-shadow-[0_15px_35px_rgba(14,165,233,0.18)] transition-transform duration-500 group-hover:scale-[1.01]"
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

                {/* Interactive Hotspot Target Rings (Matching Exact Reference Style) */}
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
                      className="group/pin absolute -translate-x-1/2 -translate-y-1/2 p-2 focus:outline-none transition-all duration-300 z-20 cursor-pointer"
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
                        className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/70 backdrop-blur-[2px] transition-all duration-300 ${
                          isSelected
                            ? "bg-rose-500/25 border-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.85)] scale-110 ring-2 ring-rose-400"
                            : "bg-white/35 shadow-[0_0_15px_rgba(255,255,255,0.5)] group-hover/pin:scale-115 group-hover/pin:bg-white/50 group-hover/pin:border-white"
                        }`}
                      >
                        {/* Inner Solid White Core Dot */}
                        <span
                          className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                            isSelected
                              ? "bg-white shadow-[0_0_10px_#fff] scale-125 ring-2 ring-rose-500"
                              : "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] group-hover/pin:scale-110"
                          }`}
                        />
                      </div>

                      {/* Floating Tooltip Label on Hover */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/pin:flex items-center px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-semibold whitespace-nowrap shadow-xl border border-white/10 z-30">
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
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-xs shadow-[0_4px_18px_rgba(2,132,199,0.35)] hover:shadow-lg transition-all flex items-center justify-center gap-1.5 z-10"
            >
              <span>Explore More</span>
              <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2: CENTER - Active Organ Focus, Biomarkers & 2x2 Grid (5.5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-8 xl:col-span-6 space-y-5 sm:space-y-6">

            {/* A. ACTIVE HERO ORGAN CARD (Replaces simulated vitals with Real Biomarkers) */}
            <div className="relative rounded-[28px] bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-7 shadow-[0_10px_35px_rgba(40,110,190,0.06)] overflow-hidden">
              
              {/* Background ambient gradient flare */}
              <div
                className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none bg-gradient-to-br ${currentOrganMeta.gradient}`}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* 3D Rendered Organ Visual Illustration */}
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  <div className="relative h-36 w-36 sm:h-44 sm:w-44 flex items-center justify-center rounded-3xl bg-gradient-to-br from-sky-50/60 to-white/40 border border-white/80 p-3 shadow-inner">
                    <Organ3DGraphic organId={selectedOrgan} />
                  </div>
                </div>

                {/* Organ Diagnostic Biomarkers Overview */}
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Manrope']">
                          {currentOrganMeta.name}
                        </h2>
                        <Badge
                          variant="outline"
                          className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold px-2 py-0.5"
                        >
                          {currentOrganMeta.subtitle}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {currentOrganMeta.description}
                      </p>
                    </div>
                  </div>

                  {/* 2x2 Biomarker Stat Chips */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {organBiomarkers.slice(0, 4).map((m: any, idx: number) => {
                      const isHigh = m.status === "high";
                      const isLow = m.status === "low";
                      const isBorderline = m.status === "borderline";

                      return (
                        <div
                          key={m.key || idx}
                          className="flex flex-col justify-between p-3 rounded-2xl bg-slate-50/90 hover:bg-sky-50/60 border border-slate-100 hover:border-sky-200/80 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-semibold text-slate-500 truncate">
                              {m.label || m.key}
                            </span>
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isHigh || isLow
                                  ? "bg-rose-500 animate-pulse"
                                  : isBorderline
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                          </div>

                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                              {m.value !== null && m.value !== undefined ? m.value : "--"}
                              <span className="text-[10px] font-sans font-normal text-slate-400 ml-1">
                                {m.unit || ""}
                              </span>
                            </span>

                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
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
                </div>
              </div>
            </div>

            {/* B. BIOMARKER TREND CHART (Historical Diagnostic Curve) */}
            <div className="rounded-[28px] bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {currentOrganMeta.name} Diagnostic Trendline
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Tracking historical stability across recorded lab panels
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  <TrendingUp className="h-3 w-3" />
                  Stable Trajectory
                </span>
              </div>

              {/* Smooth SVG Trend Line Visualizer */}
              <div className="relative h-28 w-full rounded-2xl bg-gradient-to-b from-sky-50/40 to-white/80 border border-slate-100 p-2 flex flex-col justify-end overflow-hidden">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-slate-300 w-full" />
                  <div className="border-b border-dashed border-slate-300 w-full" />
                  <div className="border-b border-dashed border-slate-300 w-full" />
                </div>

                {/* SVG Curve Line */}
                <svg
                  viewBox="0 0 500 90"
                  className="w-full h-20 overflow-visible relative z-10"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Filled area below curve */}
                  <path
                    d="M 0 65 Q 60 50, 120 58 T 240 45 T 360 38 T 500 30 L 500 90 L 0 90 Z"
                    fill="url(#trendGradient)"
                  />

                  {/* Main Wavy Line */}
                  <path
                    d="M 0 65 Q 60 50, 120 58 T 240 45 T 360 38 T 500 30"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  <circle cx="120" cy="58" r="4.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
                  <circle cx="240" cy="45" r="4.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
                  <circle cx="360" cy="38" r="4.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
                  <circle cx="500" cy="30" r="5.5" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                </svg>

                {/* Time Axis Labels */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-2 pt-1 border-t border-slate-100 z-10">
                  <span>09:00</span>
                  <span>10:00</span>
                  <span>11:00</span>
                  <span>12:00</span>
                  <span>01:00</span>
                  <span>02:00</span>
                </div>
              </div>
            </div>

            {/* C. 2x2 ORGAN SELECTOR GRID */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(["heart", "blood", "lungs", "stomach"] as OrganSystemId[]).map((orgId) => {
                const organ = ORGAN_SYSTEMS[orgId];
                const isSelected = selectedOrgan === orgId;

                return (
                  <button
                    key={orgId}
                    onClick={() => setSelectedOrgan(orgId)}
                    className={`group relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-[24px] transition-all duration-300 text-left cursor-pointer ${
                      isSelected
                        ? "bg-white border-2 border-sky-500 shadow-[0_8px_25px_rgba(2,132,199,0.18)] scale-[1.02]"
                        : "bg-white/70 hover:bg-white border border-white/90 hover:border-sky-300 shadow-[0_4px_18px_rgba(40,110,190,0.04)] hover:shadow-md"
                    }`}
                  >
                    {/* Organ Thumbnail Render */}
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Organ3DGraphic organId={orgId} size="small" />
                    </div>

                    {/* Bottom Title & Action Icon */}
                    <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80">
                      <span
                        className={`text-xs sm:text-sm font-bold tracking-tight ${
                          isSelected ? "text-sky-700" : "text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        My {organ.name}
                      </span>
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
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
          <div className="lg:col-span-12 xl:col-span-3 space-y-5 sm:space-y-6">

            {/* A. PATIENT DEMOGRAPHIC CARD */}
            <div className="rounded-[28px] bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl overflow-hidden ring-2 ring-sky-200">
                    <img
                      src={
                        (profile as any)?.avatar_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={patientStats.fullName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-['Manrope']">
                      {patientStats.fullName}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400">
                      ID: #{profile?.id?.slice(0, 8).toUpperCase() || "SYN-2849"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6-Grid Stats: Blood, Gender, Age, Height, Weight, BMI */}
              <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400">Blood</p>
                  <p className="text-xs font-bold text-slate-900">{patientStats.bloodType}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400">Gender</p>
                  <p className="text-xs font-bold text-slate-900">{patientStats.gender}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400">Age</p>
                  <p className="text-xs font-bold text-slate-900">{patientStats.age}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400">Height</p>
                  <p className="text-xs font-bold text-slate-900">{patientStats.height}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400">Weight</p>
                  <p className="text-xs font-bold text-slate-900">{patientStats.weight}</p>
                </div>
                <div className="p-2 rounded-xl bg-sky-50/80 border border-sky-100">
                  <p className="text-[10px] font-semibold text-sky-700">BMI</p>
                  <p className="text-xs font-bold text-sky-900">{patientStats.bmi}</p>
                </div>
              </div>
            </div>

            {/* B. CONSULTING DOCTOR LIST */}
            <div className="rounded-[28px] bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">
                  Consulting Doctor
                </h3>
                <button
                  onClick={() => navigate("/patient/teleconsult")}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                >
                  See all
                </button>
              </div>

              <div className="space-y-3">
                {CONSULTING_DOCTORS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50/80 hover:bg-sky-50/40 border border-slate-100 hover:border-sky-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {doc.name}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 truncate">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate("/patient/appointments")}
                      className="w-full h-8 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>Book Consultation</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* C. ACTIVE MEDICATION SHELF */}
            <div className="rounded-[28px] bg-white/80 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-[0_10px_35px_rgba(40,110,190,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">
                  Medication
                </h3>
                <button
                  onClick={() => navigate("/patient/prescription")}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                >
                  See all
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {ACTIVE_MEDICATIONS.slice(0, 2).map((med) => (
                  <div
                    key={med.id}
                    onClick={() => navigate("/patient/prescription")}
                    className="group p-3 rounded-2xl bg-slate-50/80 hover:bg-sky-50/50 border border-slate-100 hover:border-sky-200 transition-all cursor-pointer flex flex-col items-center text-center"
                  >
                    {/* Medicine bottle graphic */}
                    <div className="h-14 w-12 flex items-center justify-center my-1 group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 60 80" className="h-full w-full drop-shadow-sm">
                        <rect x="22" y="5" width="16" height="8" rx="2" fill="#94a3b8" />
                        <rect x="15" y="13" width="30" height="55" rx="8" fill={med.bottleColor} opacity="0.85" />
                        <rect x="18" y="25" width="24" height="30" rx="3" fill="#ffffff" />
                        <line x1="22" y1="33" x2="38" y2="33" stroke="#cbd5e1" strokeWidth="2" />
                        <line x1="22" y1="40" x2="34" y2="40" stroke="#cbd5e1" strokeWidth="2" />
                      </svg>
                    </div>

                    <h4 className="text-[11px] font-bold text-slate-900 truncate w-full mt-1">
                      {med.name}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400">
                      {med.dosage}
                    </p>
                  </div>
                ))}
              </div>
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
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
                <p className="text-[11px] text-slate-400">Supports PDF, PNG, JPG up to 10MB</p>
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

// -------------------------------------------------------------
// DEFAULT FALLBACK BIOMARKERS IF LAB REPORT NOT YET ATTACHED
// -------------------------------------------------------------
function getDefaultMockBiomarkers(organ: OrganSystemId): MetricAssessment[] {
  switch (organ) {
    case "heart":
      return [
        { key: "cholesterol", label: "Cholesterol", value: 165, unit: "mg/dL", range: "< 200", status: "normal", summary: "Optimal lipid balance" },
        { key: "triglycerides", label: "Triglycerides", value: 120, unit: "mg/dL", range: "< 150", status: "normal", summary: "Low cardiovascular risk" },
        { key: "ldl", label: "LDL Cholesterol", value: 92, unit: "mg/dL", range: "< 100", status: "normal", summary: "Optimal arterial index" },
        { key: "hdl", label: "HDL Cholesterol", value: 58, unit: "mg/dL", range: "> 45", status: "normal", summary: "Strong protective HDL" },
      ];
    case "blood":
      return [
        { key: "hemoglobin", label: "Hemoglobin", value: 14.8, unit: "g/dL", range: "13.5 - 17.5", status: "normal", summary: "Healthy oxygen carriage" },
        { key: "wbc", label: "White Blood Cells", value: 6.8, unit: "x10³/µL", range: "4.5 - 11.0", status: "normal", summary: "Stable immune count" },
        { key: "platelets", label: "Platelets", value: 245, unit: "x10³/µL", range: "150 - 450", status: "normal", summary: "Normal coagulation" },
        { key: "ferritin", label: "Ferritin", value: 110, unit: "ng/mL", range: "30 - 300", status: "normal", summary: "Sufficient iron storage" },
      ];
    case "lungs":
      return [
        { key: "eosinophils", label: "Eosinophils", value: 2.1, unit: "%", range: "1.0 - 5.0", status: "normal", summary: "Normal allergic profile" },
        { key: "ige", label: "IgE (Allergy)", value: 45, unit: "IU/mL", range: "< 100", status: "normal", summary: "Low respiratory reactivity" },
        { key: "lymphocytes", label: "Lymphocytes", value: 31, unit: "%", range: "20 - 40", status: "normal", summary: "Healthy pulmonary defense" },
        { key: "hscrp", label: "hs-CRP", value: 0.8, unit: "mg/L", range: "< 1.0", status: "normal", summary: "No active inflammation" },
      ];
    case "stomach":
      return [
        { key: "glucose", label: "Fasting Glucose", value: 88, unit: "mg/dL", range: "70 - 99", status: "normal", summary: "Healthy fasting metabolism" },
        { key: "hba1c", label: "Hemoglobin A1c", value: 5.2, unit: "%", range: "< 5.7", status: "normal", summary: "Normal long-term glucose" },
        { key: "alt", label: "ALT (Liver/Metabolic)", value: 22, unit: "U/L", range: "7 - 56", status: "normal", summary: "Normal enzymatic function" },
        { key: "ast", label: "AST", value: 20, unit: "U/L", range: "10 - 40", status: "normal", summary: "Healthy metabolic balance" },
      ];
    case "kidneys":
      return [
        { key: "creatinine", label: "Creatinine", value: 0.92, unit: "mg/dL", range: "0.7 - 1.3", status: "normal", summary: "Normal renal clearance" },
        { key: "egfr", label: "eGFR", value: 104, unit: "mL/min", range: "> 90", status: "normal", summary: "Optimal filtration rate" },
        { key: "bun", label: "BUN", value: 14, unit: "mg/dL", range: "7 - 20", status: "normal", summary: "Balanced waste filtration" },
        { key: "sodium", label: "Sodium", value: 140, unit: "mEq/L", range: "135 - 145", status: "normal", summary: "Balanced electrolyte index" },
      ];
    case "brain":
      return [
        { key: "b12", label: "Vitamin B12", value: 580, unit: "pg/mL", range: "200 - 900", status: "normal", summary: "Healthy neuro support" },
        { key: "folate", label: "Folate", value: 12.4, unit: "ng/mL", range: "> 4.0", status: "normal", summary: "Optimal neuro-synthesis" },
        { key: "tsh", label: "TSH", value: 1.85, unit: "mIU/L", range: "0.4 - 4.0", status: "normal", summary: "Normal endocrine balance" },
        { key: "calcium", label: "Calcium", value: 9.4, unit: "mg/dL", range: "8.5 - 10.5", status: "normal", summary: "Normal neuromuscular level" },
      ];
  }
}
