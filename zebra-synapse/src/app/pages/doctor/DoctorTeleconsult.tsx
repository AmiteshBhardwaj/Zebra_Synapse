import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Video, ArrowLeft, Send, Users, FileEdit, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import VideoCall from "../../components/teleconsult/VideoCall";
import { getSupabase } from "../../../lib/supabase";

export default function DoctorTeleconsult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const consultationId = searchParams.get("id") || "demo-consult-123";
  const patientName = searchParams.get("patient") || "Alex Morgan";

  const [callActive, setCallActive] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const handleBroadcastNote = async () => {
    if (!noteText.trim()) return;

    setIsPublishing(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const channel = supabase.channel(`consultation-${consultationId}`);
        await channel.send({
          type: "broadcast",
          event: "note-updated",
          payload: { note: noteText },
        });
      }
      toast.success("Clinical note broadcasted to patient successfully!");
    } catch (err) {
      console.error("Failed to broadcast note:", err);
      toast.error("Failed to broadcast note.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-full text-slate-100 p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto font-sans">
      <div className="flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="rounded-[24px] bg-[#060813]/80 border border-cyan-500/25 p-6 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Doctor Teleconsultation Portal</h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase text-emerald-300">
                  Live Session
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Consultation with <strong className="text-white">{patientName}</strong> • Session ID: {consultationId}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-slate-800 bg-slate-900/60 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-900/90 text-xs font-semibold rounded-xl h-10 px-4"
            onClick={() => navigate("/doctor")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients List
          </Button>
        </div>

        {callActive ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Video Call Area */}
            <div className="lg:col-span-2">
              <VideoCall
                consultationId={consultationId}
                role="DOCTOR"
                onLeave={() => setCallActive(false)}
              />
            </div>

            {/* Doctor Controls & Realtime Note Publisher */}
            <div className="space-y-6">
              <div className="rounded-[24px] bg-[#060813]/70 border border-cyan-500/20 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm tracking-wide uppercase font-mono">
                  <FileEdit className="h-4 w-4" />
                  <span>Real-time Clinical Notes</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Type diagnosis, prescription advice, or follow-up notes. Patient will see live updates in real time.
                </p>

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type notes here (e.g. Patient presents with mild arrhythmia. Recommend daily BP monitoring and 100mg Aspirin...)"
                  className="w-full h-44 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none resize-none backdrop-blur-md"
                />

                <Button
                  className="w-full border-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-semibold text-xs h-10 rounded-xl"
                  onClick={handleBroadcastNote}
                  disabled={!noteText.trim() || isPublishing}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isPublishing ? "Publishing..." : "Sync Live Note to Patient"}
                </Button>
              </div>

              <div className="rounded-[24px] bg-[#060813]/70 border border-cyan-500/20 p-6 backdrop-blur-xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm tracking-wide uppercase font-mono">
                  <Users className="h-4 w-4" />
                  <span>Active Consultation Details</span>
                </div>
                <div className="text-xs text-slate-300 space-y-2 pt-1">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Patient:</span>
                    <span className="font-semibold text-white">{patientName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Connection Mode:</span>
                    <span className="text-cyan-300 font-mono">PeerJS WebRTC</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Encryption:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> DTLS / SRTP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] bg-[#060813]/80 border border-cyan-500/25 p-10 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Call Ended</h2>
            <p className="text-sm text-slate-300">
              The teleconsultation session with {patientName} has been completed.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Button
                className="border-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-semibold"
                onClick={() => navigate("/doctor")}
              >
                Return to Patient Directory
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
