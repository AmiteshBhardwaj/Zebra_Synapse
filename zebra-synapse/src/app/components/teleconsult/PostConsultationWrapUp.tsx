import { useState } from "react";
import { useNavigate } from "react-router";
import {
  FileEdit,
  Sparkles,
  CheckCircle2,
  Users,
  Clock,
  Send,
  Calendar,
  ArrowRight,
  Stethoscope,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Radio,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";
import { sendDoctorPatientMessage } from "../../../lib/doctorPatientChat";

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

const CLINICAL_TEMPLATES = [
  {
    label: "SOAP Format",
    content:
      "Subjective: Patient reports episodic symptoms and recent health status.\nObjective: Video consultation screen performed; vital signs reviewed.\nAssessment: Clinical status stable; follow-up indicated.\nPlan: Prescribed supportive care protocol and follow-up in 2 weeks.",
  },
  {
    label: "Hypermobility & POTS Review",
    content:
      "Subjective: Patient reports joint hypermobility and orthostatic dizziness.\nObjective: Signs consistent with hypermobility spectrum.\nAssessment: Stable baseline with mild orthostatic intolerance.\nPlan: Increased electrolyte hydration, physical therapy exercises, and biometrics tracking.",
  },
  {
    label: "Routine Telehealth Review",
    content:
      "Subjective: Routine symptoms and medication tolerance check-in.\nObjective: Standard vitals within expected limits.\nAssessment: Stable clinical baseline.\nPlan: Continue current regimen; re-evaluate in 30 days.",
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
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [clinicalNotes, setClinicalNotes] = useState(initialNotes);
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentMessagePreview, setSentMessagePreview] = useState("");

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const handleApplyTemplate = (templateContent: string) => {
    setClinicalNotes((prev) => {
      if (!prev.trim()) return templateContent;
      return `${prev.trim()}\n\n---\n${templateContent}`;
    });
    toast.success("Clinical template applied.");
  };

  const handleAiPolish = async () => {
    setIsAiPolishing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const draftText =
      clinicalNotes.trim() ||
      "Patient attended encrypted virtual teleconsultation for clinical evaluation and follow-up guidance.";

    const formattedNote = `[CLINICAL TELECONSULTATION SUMMARY]
Encounter: Encrypted Virtual Teleconsultation (${formatDuration(callDurationSec)})
Patient: ${patientName || "Patient"}
Session ID: #${consultationId}

Clinical Findings & Assessment:
${draftText}

Doctor Advice & Next Steps:
• Continue prescribed routine and maintain active vitals logging in your patient portal.
• Follow up if symptoms worsen or upon completion of next laboratory panel.`;

    setClinicalNotes(formattedNote);
    setIsAiPolishing(false);
    toast.success("AI formatted clinical note ready!");
  };

  const handleSendNote = async () => {
    const noteText = clinicalNotes.trim();
    if (!noteText) {
      toast.error("Please write a consultation note before sending.");
      return;
    }

    setIsSending(true);

    const docId = user?.id || "c887c92e-c384-4078-8e7e-047176611af9";
    const docName = profile?.full_name || "Dr. Amelia Hart";
    const patId = patientId || "cfa35490-81c9-433e-a535-13a235cbe43c";
    const patName = patientName || "Maya Thompson";

    // Format final message content delivered to Patient Messages section
    const formattedContent = `📋 TELECONSULTATION CLINICAL NOTE
Session: #${consultationId}
Duration: ${formatDuration(callDurationSec)}
Consulting Doctor: ${docName}

${noteText}`;

    try {
      // 1. Send directly to patient messages thread
      await sendDoctorPatientMessage(
        docId,
        patId,
        docId,
        "doctor",
        formattedContent,
        [
          {
            type: "document",
            title: "Teleconsultation Note",
            metadata: {
              type: "teleconsultation_note",
              consultationId,
              callDurationSec,
              doctorName: docName,
              patientName: patName,
              createdAt: new Date().toISOString(),
            },
          },
        ],
        docName,
        patName
      );

      // 2. Persist to consultation storage
      try {
        localStorage.setItem(`zebra_consultation_notes_${consultationId}`, noteText);
        localStorage.setItem(
          `zebra_consultation_summary_${consultationId}`,
          JSON.stringify({
            consultationId,
            patientId: patId,
            patientName: patName,
            doctorId: docId,
            doctorName: docName,
            durationSec: callDurationSec,
            notes: noteText,
            completedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.warn("Storage write error:", err);
      }

      // 3. Broadcast via BroadcastChannel
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel(`zebra-notes-${consultationId}`);
          bc.postMessage({
            note: noteText,
            type: "consultation-finalized",
          });
          bc.close();
        }
      } catch {
        // ignore
      }

      // 4. Broadcast via Supabase Realtime
      const sb = getSupabase();
      if (sb) {
        try {
          const channel = sb.channel(`consultation-${consultationId}`);
          await channel.send({
            type: "broadcast",
            event: "consultation-finalized",
            payload: {
              consultationId,
              patientId: patId,
              patientName: patName,
              notes: noteText,
              durationSec: callDurationSec,
            },
          });
        } catch {
          // ignore
        }
      }

      setSentMessagePreview(formattedContent);
      setIsSent(true);
      toast.success(`Teleconsultation note sent directly to ${patName}'s messages!`);
    } catch (err: any) {
      console.error("Failed to send teleconsultation note:", err);
      toast.error(err?.message || "Failed to send teleconsultation note.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Session Recap Header */}
      <div className="rounded-[26px] bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] p-6 md:p-8 text-white shadow-xl shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-48 h-48 bg-[#A8DEF7]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Call Concluded
            </span>
            <span className="rounded-full bg-emerald-400 text-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Note Writing Mode
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-['Manrope']">
            Teleconsultation Note for {patientName || "Patient"}
          </h1>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed font-medium">
            Session #{consultationId} • Complete your consultation note below. Once sent, it will be immediately delivered to the patient's messages section.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 px-4 py-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A8DEF7]" />
              <div>
                <span className="text-[10px] text-white/70 block">Call Duration</span>
                <span className="font-bold text-white text-xs">{formatDuration(callDurationSec)}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-300" />
              <div>
                <span className="text-[10px] text-white/70 block">Waiting Queue</span>
                <span className="font-bold text-white text-xs">
                  {waitingQueueCount > 0 ? `${waitingQueueCount} Waiting` : "Queue Ready"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!isSent ? (
        /* Dedicated Note Writing Workstation */
        <div className="rounded-[26px] bg-white border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3E36B0]/10 text-[#3E36B0]">
                <FileEdit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#111111] font-['Manrope']">
                  Write Teleconsultation Note
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Document clinical observations, diagnosis, dietary advice, or prescription notes for the patient.
                </p>
              </div>
            </div>

            {/* AI Polish Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAiPolish}
              disabled={isAiPolishing}
              className="h-9 px-3.5 rounded-xl border-[#3E36B0]/30 bg-[#F4F6FC] text-[#3E36B0] hover:bg-[#D8D9FF] text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiPolishing ? "animate-spin text-amber-500" : "text-[#3E36B0]"}`} />
              <span>{isAiPolishing ? "Structuring Note..." : "AI Format Clinical Note"}</span>
            </Button>
          </div>

          {/* 1-Click Quick Templates */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Quick Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CLINICAL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.content)}
                    className="text-xs px-3 py-1 rounded-xl border border-slate-200 bg-[#FAFBFD] hover:border-[#3E36B0] hover:bg-[#F4F6FC] text-slate-700 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-[#3E36B0]" />
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical Note Textarea */}
          <div className="space-y-2">
            <textarea
              autoFocus
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Type your teleconsultation note here... (e.g. Diagnosis, physical observations, prescription recommendations, dietary adjustments, follow-up plan)"
              className="w-full h-64 sm:h-72 rounded-2xl border border-slate-200 bg-[#F4F6FC] p-4 text-xs sm:text-sm text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-2 focus:ring-[#3E36B0]/15 outline-none resize-none leading-relaxed font-mono"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Supports multi-line clinical text, bullet points, and SOAP format</span>
              <span>{clinicalNotes.length} characters</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              type="button"
              onClick={handleSendNote}
              disabled={isSending || !clinicalNotes.trim()}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] hover:from-[#312B91] hover:to-[#554CD8] text-white font-extrabold text-sm shadow-lg shadow-[#3E36B0]/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#A8DEF7]" />
              <span>{isSending ? "Sending Note to Patient..." : "Send Note to Patient Messages"}</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Sent Confirmation State */
        <div className="rounded-[26px] bg-white border border-slate-200/80 p-8 text-center space-y-6 shadow-sm animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
              Teleconsultation Note Delivered
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Manrope']">
              Note Sent to {patientName || "Patient"}&apos;s Messages
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Your clinical note has been safely delivered to {patientName || "the patient"}&apos;s Messages section. They can review it and refer back to your recommendations at any time.
            </p>
          </div>

          {/* Sent Note Preview Box */}
          <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-[#F4F6FC] p-4 text-left text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">
            {sentMessagePreview}
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              onClick={onContinueTeleconsult}
              className="w-full sm:w-auto h-11 px-7 rounded-2xl bg-[#3E36B0] hover:bg-[#312B91] text-white font-bold text-xs shadow-md shadow-[#3E36B0]/20 cursor-pointer flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-[#A8DEF7]" />
              <span>Return to Live Waiting Queue</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/doctor/chat?patientId=${patientId || "pat_maya_thompson"}`)}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:text-[#3E36B0] hover:bg-slate-50 cursor-pointer flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-[#3E36B0]" />
              <span>Open Patient Messages</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onReturnToDashboard}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Doctor Dashboard</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
