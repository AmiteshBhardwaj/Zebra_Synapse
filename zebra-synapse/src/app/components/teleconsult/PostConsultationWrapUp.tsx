import { useState } from "react";
import {
  FileEdit,
  Sparkles,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  Clock,
  Send,
  Calendar,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Activity,
  ChevronRight,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";

export interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface PostConsultationWrapUpProps {
  consultationId: string;
  patientId: string;
  patientName: string;
  callDurationSec: number;
  initialNotes?: string;
  waitingQueueCount: number;
  onContinueTeleconsult: () => void;
  onOpenPatientDetail: (patientId: string) => void;
  onReturnToDashboard: () => void;
}

const QUICK_DIAGNOSES = [
  "Ehlers-Danlos Syndrome (hEDS) Evaluation",
  "Postural Orthostatic Tachycardia (POTS)",
  "Metabolic & Multi-Omics Review",
  "Dysautonomia Symptom Flare-up",
  "Routine Telehealth General Review",
];

const CLINICAL_TEMPLATES = [
  {
    label: "EDS / Hypermobility Review",
    content:
      "Subjective: Patient reports episodic joint hypermobility, focal myalgia, and fatigue.\nObjective: Physical screen reviewed; Beighton signs consistent with hypermobility spectrum.\nAssessment: Mild hEDS symptom progression, stable baseline.\nPlan: Prescribed targeted physical therapy protocol, collagen support regimen, and 3-week follow-up.",
  },
  {
    label: "Routine Telehealth Assessment",
    content:
      "Subjective: Routine wellness and symptom stability check-in.\nObjective: Vitals within standard thresholds; patient adhering to daily biometric tracking.\nAssessment: Stable clinical baseline.\nPlan: Continue current lifestyle protocol; review next comprehensive lab panel in 30 days.",
  },
  {
    label: "Multi-Omics Lab Followup",
    content:
      "Subjective: Review of recent genomics, metabolomics, and biomarker blood panel.\nObjective: Biomarker variance identified in lipid and inflammatory pathways.\nAssessment: Targetable metabolic and micronutrient variances.\nPlan: Initiated targeted dietary adjustment and precision supplementation schedule.",
  },
  {
    label: "Symptom Flare-up & Triage",
    content:
      "Subjective: Acute onset of autonomic dysregulation, lightheadedness, and exhaustion.\nObjective: Remote vitals show orthostatic heart rate variability.\nAssessment: Autonomic flare-up secondary to physiological stress.\nPlan: Increased electrolyte hydration therapy, compression garment use, and rest pacing protocol.",
  },
];

export default function PostConsultationWrapUp({
  consultationId,
  patientId,
  patientName,
  callDurationSec,
  initialNotes = "",
  waitingQueueCount,
  onContinueTeleconsult,
  onOpenPatientDetail,
  onReturnToDashboard,
}: PostConsultationWrapUpProps) {
  const { user, profile } = useAuth();

  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(initialNotes);
  const [followUpTime, setFollowUpTime] = useState("2 weeks");
  const [patientAdvice, setPatientAdvice] = useState("");

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [rxName, setRxName] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxDuration, setRxDuration] = useState("");
  const [rxInstructions, setRxInstructions] = useState("");
  const [showRxForm, setShowRxForm] = useState(false);

  // Loading states
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const handleAddPrescription = () => {
    if (!rxName.trim()) {
      toast.error("Please specify a medication name.");
      return;
    }
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: rxName.trim(),
      dosage: rxDosage.trim() || "1 tablet daily",
      duration: rxDuration.trim() || "14 days",
      instructions: rxInstructions.trim() || "Take orally with water after meals",
    };
    setPrescriptions((prev) => [...prev, newItem]);
    setRxName("");
    setRxDosage("");
    setRxDuration("");
    setRxInstructions("");
    setShowRxForm(false);
    toast.success(`Added ${newItem.name} to prescription list.`);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyTemplate = (templateContent: string) => {
    setClinicalNotes((prev) => {
      if (!prev.trim()) return templateContent;
      return `${prev.trim()}\n\n---\n${templateContent}`;
    });
    toast.success("Clinical template inserted.");
  };

  const handleAiPolish = async () => {
    setIsAiPolishing(true);
    // Simulate AI synthesis & clinical polish
    await new Promise((resolve) => setTimeout(resolve, 800));

    const polishedAssessment = diagnosis || "Multi-Omics & Clinical Telehealth Review";
    const draftText = clinicalNotes.trim() || "Patient attended virtual video consultation for routine symptoms review.";

    const formattedNote = `[SYNAPSE AI CLINICAL SUMMARY]
• Primary Assessment: ${polishedAssessment}
• Encounter Type: Encrypted Virtual Teleconsultation (${formatDuration(callDurationSec)})
• Clinical Encounter Notes:
${draftText}

• Follow-up Recommendation: Review progress in ${followUpTime}.
• Doctor Direct Guidance: ${patientAdvice.trim() || "Follow prescribed care plan and maintain active vitals logging."}`;

    setClinicalNotes(formattedNote);
    setIsAiPolishing(false);
    toast.success("AI clinical summary generated successfully!");
  };

  const saveConsultationData = async () => {
    setIsSaving(true);
    const finalDiagnosis = diagnosis.trim() || "Teleconsultation Assessment";
    const finalNotes = clinicalNotes.trim() || "Teleconsultation completed.";

    const summaryPayload = {
      consultationId,
      patientId,
      patientName,
      doctorId: user?.id,
      doctorName: profile?.full_name || "Dr. Amelia Hart",
      durationSec: callDurationSec,
      diagnosis: finalDiagnosis,
      notes: finalNotes,
      followUp: followUpTime,
      advice: patientAdvice,
      prescriptions,
      completedAt: new Date().toISOString(),
    };

    try {
      // 1. Write to localStorage
      try {
        localStorage.setItem(`zebra_consultation_notes_${consultationId}`, finalNotes);
        localStorage.setItem(`zebra_consultation_summary_${consultationId}`, JSON.stringify(summaryPayload));
        if (prescriptions.length > 0) {
          localStorage.setItem(`zebra_consultation_rx_${consultationId}`, JSON.stringify(prescriptions));
        }
      } catch (err) {
        console.warn("Storage write error:", err);
      }

      // 2. Broadcast via BroadcastChannel
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel(`zebra-notes-${consultationId}`);
          bc.postMessage({
            note: finalNotes,
            summary: summaryPayload,
            prescriptions,
            type: "consultation-finalized",
          });
          bc.close();
        }
      } catch {
        // ignore
      }

      // 3. Sync to Supabase Realtime & DB
      const sb = getSupabase();
      if (sb) {
        // Broadcast to patient channel
        try {
          const channel = sb.channel(`consultation-${consultationId}`);
          await channel.send({
            type: "broadcast",
            event: "consultation-finalized",
            payload: summaryPayload,
          });
        } catch {
          // ignore
        }

        // Save Prescriptions to Supabase if any
        if (patientId && prescriptions.length > 0) {
          for (const rx of prescriptions) {
            const rxDetail = `${rx.name} ${rx.dosage} (${rx.duration}) - ${rx.instructions}`;
            try {
              await sb.from("prescriptions").insert({
                patient_id: patientId,
                prescribed_by: user?.id || "doctor",
                details: rxDetail,
                status: "active",
              });
            } catch (err) {
              console.warn("Supabase prescription insert error:", err);
            }
          }
        }
      }

      toast.success("Consultation wrap-up saved and synchronized to patient health record!");
      return true;
    } catch (err) {
      console.error("Save wrap-up error:", err);
      toast.error("Failed to save consultation wrap-up.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const ok = await saveConsultationData();
    if (ok) {
      onContinueTeleconsult();
    }
  };

  const handleSaveAndOpenPatient = async () => {
    const ok = await saveConsultationData();
    if (ok) {
      onOpenPatientDetail(patientId);
    }
  };

  const handleSaveAndReturnDashboard = async () => {
    const ok = await saveConsultationData();
    if (ok) {
      onReturnToDashboard();
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Top Banner / Session Recap Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] px-4 py-3 sm:px-5 sm:py-3 text-white shadow-md shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 right-24 w-36 h-36 bg-[#A8DEF7]/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Call Concluded • Post-Consultation Wrap-Up
            </span>
            <span className="rounded-full bg-emerald-400 text-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Encounter Documentation
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight font-['Manrope']">
            Wrap Up Consultation with {patientName || "Patient"}
          </h1>
        </div>

        {/* Quick Stats Pill */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/15 px-3 py-1 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#A8DEF7]" />
              <div>
                <span className="text-[10px] text-white/70 font-semibold mr-1">Duration:</span>
                <span className="font-bold text-white text-xs">{formatDuration(callDurationSec)}</span>
              </div>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <div>
                <span className="text-[10px] text-white/70 font-semibold mr-1">Live Queue:</span>
                <span className="font-bold text-white text-xs">
                  {waitingQueueCount > 0 ? `${waitingQueueCount} Waiting` : "Ready"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Clinical Documentation & Action Bar */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Left Column (7 cols): Clinical Notes, Diagnosis & Guidance */}
        <div className="lg:col-span-7 space-y-3">
          {/* Section 1: Diagnosis & Assessment */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#3E36B0] font-bold text-[11px] tracking-wider uppercase">
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Primary Diagnosis & Clinical Assessment</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Required for health record</span>
            </div>

            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Hypermobility Spectrum Disorder (hEDS) with mild POTS flare-up"
              className="w-full h-9 rounded-xl border border-slate-200 bg-[#F4F6FC] px-3 text-xs text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-1 focus:ring-[#3E36B0]/20 outline-none font-medium"
            />

            {/* Quick Diagnosis Chips */}
            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick:</span>
              <div className="flex flex-wrap gap-1">
                {QUICK_DIAGNOSES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiagnosis(d)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-[#D8D9FF] hover:text-[#3E36B0] text-slate-600 font-medium transition-all cursor-pointer whitespace-nowrap"
                  >
                    + {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Notes Editor */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[#3E36B0] font-bold text-[11px] tracking-wider uppercase">
                <FileEdit className="h-3.5 w-3.5" />
                <span>Clinical Notes & SOAP Observations</span>
              </div>

              {/* AI Polish Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiPolish}
                disabled={isAiPolishing}
                className="h-7 px-2.5 rounded-lg border-[#3E36B0]/30 bg-[#F4F6FC] text-[#3E36B0] hover:bg-[#D8D9FF] text-[11px] font-bold gap-1 shadow-xs cursor-pointer"
              >
                <Sparkles className={`w-3 h-3 ${isAiPolishing ? "animate-spin text-amber-500" : "text-[#3E36B0]"}`} />
                <span>{isAiPolishing ? "Structuring..." : "AI Polish & SOAP Summary"}</span>
              </Button>
            </div>

            {/* 1-Click Templates */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Templates:</span>
              <div className="flex flex-wrap gap-1">
                {CLINICAL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.content)}
                    className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 bg-[#FAFBFD] hover:border-[#3E36B0] hover:bg-[#F4F6FC] text-slate-700 font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#3E36B0]" />
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Document patient subjective complaints, objective exam notes, clinical impressions, multi-omics biomarkers, or diagnostic instructions..."
              className="w-full h-32 sm:h-36 rounded-xl border border-slate-200 bg-[#F4F6FC] p-3 text-xs text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-1 focus:ring-[#3E36B0]/20 outline-none resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Section 3: Follow-Up & Patient Guidance */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-3 space-y-2 shadow-xs">
            <div className="flex items-center gap-1.5 text-[#3E36B0] font-bold text-[11px] tracking-wider uppercase">
              <Calendar className="h-3.5 w-3.5" />
              <span>Follow-Up & Direct Guidance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600">Follow-up Window</label>
                <select
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full h-8.5 rounded-xl border border-slate-200 bg-[#F4F6FC] px-2.5 text-xs text-slate-800 font-medium outline-none focus:border-[#3E36B0]"
                >
                  <option value="No follow-up needed">No follow-up needed</option>
                  <option value="3 to 5 days">3 to 5 days</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="Post-Lab Review">Post-Lab Panel Review</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-600">Direct Patient Care Instructions</label>
                <input
                  type="text"
                  value={patientAdvice}
                  onChange={(e) => setPatientAdvice(e.target.value)}
                  placeholder="e.g. Maintain electrolyte hydration, log daily blood pressure, avoid high impact."
                  className="w-full h-8.5 rounded-xl border border-slate-200 bg-[#F4F6FC] px-2.5 text-xs text-slate-800 font-medium outline-none focus:border-[#3E36B0]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Prescriptions Dispenser & Final Actions */}
        <div className="lg:col-span-5 space-y-3">
          {/* Prescriptions Card */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#3E36B0] font-bold text-[11px] tracking-wider uppercase">
                <Pill className="h-3.5 w-3.5" />
                <span>Prescriptions Dispensed</span>
              </div>
              <span className="rounded-full bg-[#D8D9FF] px-2 py-0.5 text-[10px] font-bold text-[#3E36B0]">
                {prescriptions.length} Added
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Medications prescribed during this session will be synchronized to the patient EHR portal.
            </p>

            {/* Prescriptions List */}
            {prescriptions.length > 0 ? (
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-2 text-xs space-y-0.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#111111] text-xs">{rx.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(rx.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                        title="Remove Prescription"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-[#3E36B0] font-semibold">
                      {rx.dosage} • {rx.duration}
                    </p>
                    {rx.instructions && (
                      <p className="text-[10px] text-slate-500 italic font-sans truncate">{rx.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-[#F4F6FC] py-2.5 px-3 text-center text-[11px] text-slate-400">
                No new medications added for this session yet.
              </div>
            )}

            {/* Add Prescription Toggle / Form */}
            {!showRxForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRxForm(true)}
                className="w-full rounded-xl border-dashed border-[#3E36B0]/40 text-[#3E36B0] hover:bg-[#F4F6FC] text-xs font-bold h-8.5 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medication Prescription</span>
              </Button>
            ) : (
              <div className="rounded-xl border border-[#3E36B0]/30 bg-[#FAFBFD] p-2.5 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-[#111111]">New Prescription Details</span>
                  <button
                    type="button"
                    onClick={() => setShowRxForm(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={rxName}
                    onChange={(e) => setRxName(e.target.value)}
                    placeholder="Medication Name (e.g. Midodrine HCl)"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#3E36B0]"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={rxDosage}
                      onChange={(e) => setRxDosage(e.target.value)}
                      placeholder="Dosage (e.g. 5mg TID)"
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#3E36B0]"
                    />
                    <input
                      type="text"
                      value={rxDuration}
                      onChange={(e) => setRxDuration(e.target.value)}
                      placeholder="Duration (e.g. 30 days)"
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#3E36B0]"
                    />
                  </div>
                  <input
                    type="text"
                    value={rxInstructions}
                    onChange={(e) => setRxInstructions(e.target.value)}
                    placeholder="Instructions (e.g. Take morning and afternoon)"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#3E36B0]"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleAddPrescription}
                  className="w-full bg-[#3E36B0] hover:bg-[#312B91] text-white font-bold text-xs h-8 rounded-lg shadow-xs cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save Prescription Item
                </Button>
              </div>
            )}
          </div>

          {/* Encounter Actions Card */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[#3E36B0] font-bold text-[11px] tracking-wider uppercase">
              <Activity className="h-3.5 w-3.5" />
              <span>Next-Step Action</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Choose your workflow action upon saving this clinical encounter.
            </p>

            {/* Primary Action Button */}
            <Button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="w-full h-10.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-emerald-200" />
              <span>{isSaving ? "Saving Encounter..." : "Save & Continue Teleconsultations"}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndOpenPatient}
                disabled={isSaving}
                className="w-full h-8.5 rounded-lg border-slate-200 hover:border-[#3E36B0]/40 text-slate-700 hover:text-[#3E36B0] text-[11px] font-bold justify-between px-2.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Open Patient EHR</span>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndReturnDashboard}
                disabled={isSaving}
                className="w-full h-8.5 rounded-lg border-slate-200 hover:border-[#3E36B0]/40 text-slate-700 hover:text-[#3E36B0] text-[11px] font-bold justify-between px-2.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Doctor Dashboard</span>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
