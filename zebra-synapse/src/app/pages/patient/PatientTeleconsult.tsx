import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Video, ArrowLeft, ShieldCheck, Clock, UserCheck, Search, Radio, Loader2, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import VideoCall from "../../components/teleconsult/VideoCall";
import RealtimeNote from "../../components/teleconsult/RealtimeNote";
import {
  PatientPortalPage,
  PatientPageHero,
  portalPanelClass,
  portalSecondaryButtonClass,
  portalPrimaryButtonClass,
  StatusPill,
} from "../../components/patient/PortalTheme";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import { toast } from "sonner";

export default function PatientTeleconsult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const queryId = searchParams.get("id");
  const queryDoctor = searchParams.get("doctor");
  const querySpecialty = searchParams.get("specialty");

  // Status modes: "idle" | "searching" | "connected" | "completed"
  const [mode, setMode] = useState<"idle" | "searching" | "connected" | "completed">(
    queryId ? "connected" : "idle"
  );

  const [activeDoctorName, setActiveDoctorName] = useState(queryDoctor || "Dr. Amelia Hart");
  const [activeSpecialty, setActiveSpecialty] = useState(querySpecialty || "Internal Medicine & Primary Care");
  const [activeConsultationId, setActiveConsultationId] = useState(
    queryId || `teleconsult-${Date.now().toString().slice(-6)}`
  );

  // Broadcast search request to online doctors via Supabase Realtime
  useEffect(() => {
    if (mode !== "searching") return;

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb.channel("teleconsult-queue", {
      config: { broadcast: { self: true } },
    });

    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const payload = {
            consultationId: activeConsultationId,
            patientId: user?.id || "demo-patient-1",
            patientName: profile?.full_name || "Maya Thompson",
            condition: "General Teleconsultation Request",
            requestedAt: new Date().toISOString(),
          };

          await channel.send({
            type: "broadcast",
            event: "patient-seeking-consult",
            payload,
          });
        }
      });

    // Listen for doctor accepting the request
    channel.on("broadcast", { event: "doctor-accepted-consult" }, (event) => {
      const data = event.payload;
      if (data && (data.consultationId === activeConsultationId || data.patientId === user?.id)) {
        setActiveDoctorName(data.doctorName || "Dr. Amelia Hart");
        setActiveSpecialty(data.specialty || "Physician Specialist");
        setMode("connected");
        toast.success(`Connected! ${data.doctorName || "Your doctor"} has accepted your teleconsultation.`);
      }
    });

    return () => {
      void sb.removeChannel(channel);
    };
  }, [mode, activeConsultationId, user?.id, profile?.full_name]);

  const handleStartSearching = () => {
    const newConsultId = `consult-${Date.now().toString().slice(-6)}`;
    setActiveConsultationId(newConsultId);
    setMode("searching");
    toast.info("Broadcasting teleconsultation request to online doctors...");
  };

  const handleCancelSearch = () => {
    setMode("idle");
    toast.info("Cancelled search for doctors.");
  };

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Virtual Care Hub"
        title={
          mode === "connected"
            ? `Teleconsultation with ${activeDoctorName}`
            : "Instant Teleconsultation Matching"
        }
        description="Connect with online physicians via encrypted end-to-end HD video call. Seek instant medical advice or consult with your care team."
        icon={Video}
        actions={
          <Button
            variant="outline"
            className={portalSecondaryButtonClass}
            onClick={() => navigate("/patient/appointments")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Button>
        }
        meta={[
          { label: "Provider", value: mode === "connected" ? activeDoctorName : "Searching Queue" },
          { label: "Specialty", value: mode === "connected" ? activeSpecialty : "On-Demand Care" },
          {
            label: "Status",
            value: (
              <StatusPill
                status={
                  mode === "searching"
                    ? "Searching"
                    : mode === "connected"
                    ? "In-Progress"
                    : mode === "completed"
                    ? "Completed"
                    : "Idle"
                }
              />
            ),
          },
          {
            label: "Security",
            value: (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Peer-to-Peer Encrypted
              </span>
            ),
          },
        ]}
      />

      {mode === "idle" && (
        <section className="space-y-6 max-w-4xl mx-auto my-4">
          <div className="rounded-[2rem] border border-cyan-500/30 bg-gradient-to-b from-[#0e1726]/90 via-[#0a111c]/95 to-[#060a12]/98 p-8 text-white shadow-[0_24px_70px_rgba(6,182,212,0.18)] backdrop-blur-2xl text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_12px_36px_rgba(6,182,212,0.4)] mx-auto">
              <Video className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Instant Physician Match</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Request Live Teleconsultation
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Click below to broadcast your consultation request to active doctors on duty. Once an available doctor accepts your request, your encrypted HD video call will launch automatically.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                className={`h-12 px-8 text-sm font-bold shadow-[0_0_30px_rgba(56,189,248,0.5)] ${portalPrimaryButtonClass}`}
                onClick={handleStartSearching}
              >
                <Search className="mr-2 h-5 w-5" />
                Start Searching for Doctors
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-left text-xs text-slate-300">
              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <Radio className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Live Broadcast Queue</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Notifies online doctors in real-time</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <UserCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Automatic Roster Addition</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Auto-links records with accepting doctor</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">End-to-End HD Video</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Encrypted WebRTC peer-to-peer stream</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {mode === "searching" && (
        <section className="space-y-6 max-w-2xl mx-auto my-8">
          <div className="rounded-[2rem] border border-cyan-400/40 bg-gradient-to-b from-[#0a1526]/95 to-[#060b14]/98 p-10 text-center space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-2xl relative overflow-hidden">
            {/* Animated Pulsing Radar Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="h-72 w-72 rounded-full border border-cyan-400 animate-ping" />
              <div className="h-96 w-96 rounded-full border border-sky-400 animate-pulse absolute" />
            </div>

            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 mx-auto">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            </div>

            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider">
                <Radio className="h-4 w-4 animate-pulse text-cyan-400" />
                <span>Live Searching Queue Active</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Searching for Available Doctors...</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Your request has been broadcasted to doctors currently in the Teleconsultation portal. Please stay on this screen.
              </p>
            </div>

            <div className="relative z-10 pt-2 flex justify-center">
              <Button
                variant="outline"
                className="border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/50 hover:border-rose-500/60 text-xs font-semibold rounded-xl h-11 px-6"
                onClick={handleCancelSearch}
              >
                Cancel Search Request
              </Button>
            </div>
          </div>
        </section>
      )}

      {mode === "connected" && (
        <section className="space-y-6">
          <VideoCall
            consultationId={activeConsultationId}
            role="PATIENT"
            onLeave={() => setMode("completed")}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RealtimeNote consultationId={activeConsultationId} />
            </div>

            <div className={`${portalPanelClass} p-6 space-y-4`}>
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm tracking-wide uppercase font-mono">
                <Clock className="h-4 w-4" />
                <span>Session Guidelines</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Ensure your camera and microphone are enabled in your browser settings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Use headphones to prevent audio echo during the consultation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Your doctor can update clinical notes live during or after the call.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {mode === "completed" && (
        <div className={`${portalPanelClass} p-10 text-center space-y-5 max-w-xl mx-auto my-8`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto">
            <UserCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Consultation Completed</h2>
          <p className="text-sm text-slate-300">
            Thank you for attending your video consultation with {activeDoctorName}. Your appointment and care records have been saved.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Button
              className="border-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-semibold"
              onClick={() => navigate("/patient/appointments")}
            >
              Return to Appointments
            </Button>
          </div>
        </div>
      )}
    </PatientPortalPage>
  );
}
