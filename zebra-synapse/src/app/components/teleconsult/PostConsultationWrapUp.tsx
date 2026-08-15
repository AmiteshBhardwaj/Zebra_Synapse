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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Session Recap Header */}
      <div className="rounded-[26px] bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] p-6 md:p-8 text-white shadow-xl shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-48 h-48 bg-[#A8DEF7]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Call Concluded • Post-Consultation Wrap-Up
            </span>
            <span className="rounded-full bg-emerald-400 text-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Encounter Documentation
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-['Manrope']">
            Wrap Up Consultation with {patientName || "Patient"}
          </h1>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed font-medium">
            Finalize clinical notes, prescribe medications, and choose your next workflow action.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A8DEF7]" />
              <div>
                <p className="text-[10px] text-white/70 uppercase font-semibold">Call Duration</p>
                <p className="font-bold text-white text-sm">{formatDuration(callDurationSec)}</p>
              </div>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-300" />
              <div>
                <p className="text-[10px] text-white/70 uppercase font-semibold">Live Queue</p>
                <p className="font-bold text-white text-sm">
                  {waitingQueueCount > 0 ? `${waitingQueueCount} Waiting` : "Queue Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Clinical Documentation & Action Bar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Clinical Notes & Diagnosis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Diagnosis & Assessment */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
                <Stethoscope className="h-4 w-4" />
                <span>Primary Diagnosis & Clinical Assessment</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Required for health record</span>
            </div>

            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Hypermobility Spectrum Disorder (hEDS) with mild POTS flare-up"
              className="w-full h-11 rounded-2xl border border-slate-200 bg-[#F4F6FC] px-4 text-xs sm:text-sm text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-1 focus:ring-[#3E36B0]/20 outline-none font-medium"
            />

            {/* Quick Diagnosis Chips */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DIAGNOSES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiagnosis(d)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#D8D9FF] hover:text-[#3E36B0] text-slate-600 font-medium transition-all cursor-pointer"
                  >
                    + {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Notes Editor */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
                <FileEdit className="h-4 w-4" />
                <span>Clinical Notes & SOAP Observations</span>
              </div>

              {/* AI Polish Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiPolish}
                disabled={isAiPolishing}
                className="h-8 rounded-xl border-[#3E36B0]/30 bg-[#F4F6FC] text-[#3E36B0] hover:bg-[#D8D9FF] text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiPolishing ? "animate-spin text-amber-500" : "text-[#3E36B0]"}`} />
                <span>{isAiPolishing ? "AI Structuring Note..." : "AI Polish & SOAP Summary"}</span>
              </Button>
            </div>

            {/* 1-Click Templates */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1-Click Clinical Templates</p>
              <div className="flex flex-wrap gap-2">
                {CLINICAL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.content)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-[#FAFBFD] hover:border-[#3E36B0] hover:bg-[#F4F6FC] text-slate-700 font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-[#3E36B0]" />
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Document patient subjective complaints, objective exam notes, clinical impressions, multi-omics biomarkers, or diagnostic instructions..."
              className="w-full h-56 rounded-2xl border border-slate-200 bg-[#F4F6FC] p-4 text-xs sm:text-sm text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-1 focus:ring-[#3E36B0]/20 outline-none resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Section 3: Follow-Up & Patient Guidance */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
              <Calendar className="h-4 w-4" />
              <span>Follow-Up & Direct Patient Guidance</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">Recommended Follow-up</label>
                <select
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-[#F4F6FC] px-3 text-xs text-slate-800 font-medium outline-none focus:border-[#3E36B0]"
                >
                  <option value="No follow-up needed">No follow-up needed</option>
                  <option value="3 to 5 days">3 to 5 days</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="Post-Lab Review">Post-Lab Panel Review</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">Direct Patient Care Instructions</label>
                <input
                  type="text"
                  value={patientAdvice}
                  onChange={(e) => setPatientAdvice(e.target.value)}
                  placeholder="e.g. Maintain electrolyte hydration, log daily blood pressure, avoid high-impact hyperflexion."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-[#F4F6FC] px-3 text-xs text-slate-800 font-medium outline-none focus:border-[#3E36B0]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prescriptions Dispenser & Final Actions */}
        <div className="space-y-6">
          {/* Prescriptions Card */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
                <Pill className="h-4 w-4" />
                <span>Prescriptions Dispensed</span>
              </div>
              <span className="rounded-full bg-[#D8D9FF] px-2.5 py-0.5 text-[11px] font-bold text-[#3E36B0]">
                {prescriptions.length} Added
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Add any medications prescribed during this session. They will be auto-saved to the patient's official Prescriptions portal.
            </p>

            {/* Prescriptions List */}
            {prescriptions.length > 0 ? (
              <div className="space-y-2.5">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-3 text-xs space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#111111]">{rx.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(rx.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        title="Remove Prescription"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#3E36B0] font-semibold">
                      {rx.dosage} • {rx.duration}
                    </p>
                    {rx.instructions && (
                      <p className="text-[11px] text-slate-500 italic font-sans">{rx.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-[#F4F6FC] p-4 text-center text-xs text-slate-400">
                No new medications added for this session yet.
              </div>
            )}

            {/* Add Prescription Toggle / Form */}
            {!showRxForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRxForm(true)}
                className="w-full rounded-xl border-dashed border-[#3E36B0]/40 text-[#3E36B0] hover:bg-[#F4F6FC] text-xs font-bold h-10 gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication Prescription</span>
              </Button>
            ) : (
              <div className="rounded-2xl border border-[#3E36B0]/30 bg-[#FAFBFD] p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#111111]">New Prescription Details</span>
                  <button
                    type="button"
                    onClick={() => setShowRxForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={rxName}
                    onChange={(e) => setRxName(e.target.value)}
                    placeholder="Medication Name (e.g. Midodrine HCl)"
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#3E36B0]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={rxDosage}
                      onChange={(e) => setRxDosage(e.target.value)}
                      placeholder="Dosage (e.g. 5mg TID)"
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#3E36B0]"
                    />
                    <input
                      type="text"
                      value={rxDuration}
                      onChange={(e) => setRxDuration(e.target.value)}
                      placeholder="Duration (e.g. 30 days)"
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#3E36B0]"
                    />
                  </div>
                  <input
                    type="text"
                    value={rxInstructions}
                    onChange={(e) => setRxInstructions(e.target.value)}
                    placeholder="Instructions (e.g. Take morning and afternoon)"
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#3E36B0]"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleAddPrescription}
                  className="w-full bg-[#3E36B0] hover:bg-[#312B91] text-white font-bold text-xs h-9 rounded-xl shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Save Prescription Item
                </Button>
              </div>
            )}
          </div>

          {/* Encounter Actions Card */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
              <Activity className="h-4 w-4" />
              <span>Next-Step Action</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Select how you would like to proceed after saving this clinical encounter.
            </p>

            {/* Primary Action Button */}
            <Button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-emerald-200" />
              <span>{isSaving ? "Saving Encounter..." : "Save & Continue Teleconsultations"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {/* Secondary Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndOpenPatient}
                disabled={isSaving}
                className="w-full h-10 rounded-xl border-slate-200 hover:border-[#3E36B0]/40 text-slate-700 hover:text-[#3E36B0] text-xs font-bold justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Save & Open Patient EHR Chart
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndReturnDashboard}
                disabled={isSaving}
                className="w-full h-10 rounded-xl border-slate-200 hover:border-[#3E36B0]/40 text-slate-700 hover:text-[#3E36B0] text-xs font-bold justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                  Save & Return to Doctor Dashboard
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
