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

  // Broadcast search request to online doctors via Supabase Realtime, BroadcastChannel, and localStorage
  useEffect(() => {
    if (mode !== "searching") return;

    const payload = {
      consultationId: activeConsultationId,
      patientId: user?.id || "demo-patient-1",
      patientName: profile?.full_name || "Maya Thompson",
      condition: "General Teleconsultation Request",
      requestedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
    };

    // 1. Write to localStorage queue for instant cross-tab discovery
    const saveToLocalStorage = () => {
      try {
        const raw = localStorage.getItem("zebra_teleconsult_waiting_queue");
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(
          (p: any) => p.consultationId !== activeConsultationId && Date.now() - (p.timestamp || 0) < 180000
        );
        filtered.unshift({ ...payload, timestamp: Date.now() });
        localStorage.setItem("zebra_teleconsult_waiting_queue", JSON.stringify(filtered));
      } catch (err) {
        console.error("Failed to update teleconsult queue in storage:", err);
      }
    };
    saveToLocalStorage();

    // 2. Setup BroadcastChannel (instant zero-latency cross-tab communication)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("teleconsult-queue");
        bc.postMessage({ type: "patient-seeking-consult", payload });

        bc.onmessage = (event) => {
          const { type, payload: msgData } = event.data || {};
          if (
            type === "doctor-accepted-consult" &&
            msgData &&
            (msgData.consultationId === activeConsultationId || msgData.patientId === user?.id)
          ) {
            setActiveDoctorName(msgData.doctorName || "Dr. Amelia Hart");
            setActiveSpecialty(msgData.specialty || "Physician Specialist");
            setMode("connected");
            toast.success(`Connected! ${msgData.doctorName || "Your doctor"} has accepted your teleconsultation.`);
          } else if (type === "doctor-query-queue") {
            // Doctor just entered the portal; reply with our active request
            bc?.postMessage({ type: "patient-seeking-consult", payload });
          }
        };
      }
    } catch {
      // ignore BroadcastChannel errors in restrictive environments
    }

    // 3. Setup Supabase Realtime channel with Presence & Broadcast
    const sb = getSupabase();
    let sbChannel: any = null;

    if (sb) {
      sbChannel = sb.channel("teleconsult-queue", {
        config: { presence: { key: activeConsultationId }, broadcast: { self: true } },
      });

      sbChannel
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await sbChannel.track(payload);
            await sbChannel.send({
              type: "broadcast",
              event: "patient-seeking-consult",
              payload,
            });
          }
        });

      // Listen for doctor accepting
      sbChannel.on("broadcast", { event: "doctor-accepted-consult" }, (event: any) => {
        const data = event.payload;
        if (data && (data.consultationId === activeConsultationId || data.patientId === user?.id)) {
          setActiveDoctorName(data.doctorName || "Dr. Amelia Hart");
          setActiveSpecialty(data.specialty || "Physician Specialist");
          setMode("connected");
          toast.success(`Connected! ${data.doctorName || "Your doctor"} has accepted your teleconsultation.`);
        }
      });

      // Listen for doctor query
      sbChannel.on("broadcast", { event: "doctor-query-queue" }, async () => {
        if (sbChannel) {
          await sbChannel.send({
            type: "broadcast",
            event: "patient-seeking-consult",
            payload,
          });
        }
      });
    }

    // 4. Heartbeat interval: keep presence and storage fresh every 2.5 seconds
    const heartbeat = setInterval(() => {
      saveToLocalStorage();
      if (bc) {
        bc.postMessage({ type: "patient-seeking-consult", payload });
      }
      if (sbChannel) {
        void sbChannel.send({
          type: "broadcast",
          event: "patient-seeking-consult",
          payload,
        });
      }

      // Check if accepted in localStorage
      try {
        const acceptedRaw = localStorage.getItem(`zebra_accepted_${activeConsultationId}`);
        if (acceptedRaw) {
          const acceptedData = JSON.parse(acceptedRaw);
          setActiveDoctorName(acceptedData.doctorName || "Dr. Amelia Hart");
          setActiveSpecialty(acceptedData.specialty || "Physician Specialist");
          setMode("connected");
          localStorage.removeItem(`zebra_accepted_${activeConsultationId}`);
          toast.success(`Connected! ${acceptedData.doctorName || "Your doctor"} has accepted your teleconsultation.`);
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      clearInterval(heartbeat);

      // Clean up localStorage queue
      try {
        const raw = localStorage.getItem("zebra_teleconsult_waiting_queue");
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((p: any) => p.consultationId !== activeConsultationId);
          localStorage.setItem("zebra_teleconsult_waiting_queue", JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }

      if (bc) {
        bc.postMessage({
          type: "patient-cancelled-consult",
          payload: { consultationId: activeConsultationId, patientId: user?.id },
        });
        bc.close();
      }

      if (sbChannel && sb) {
        void sbChannel.untrack();
        void sbChannel.send({
          type: "broadcast",
          event: "patient-cancelled-consult",
          payload: {
            consultationId: activeConsultationId,
            patientId: user?.id,
          },
        });
        void sb.removeChannel(sbChannel);
      }
    };
  }, [mode, activeConsultationId, user?.id, profile?.full_name]);

  const handleStartSearching = () => {
    const newConsultId = `consult-${Date.now().toString().slice(-6)}`;
    setActiveConsultationId(newConsultId);
    setMode("searching");
    toast.info("Broadcasting teleconsultation request to online doctors...");
  };

  const handleCancelSearch = async () => {
    // Clean up storage
    try {
      const raw = localStorage.getItem("zebra_teleconsult_waiting_queue");
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((p: any) => p.consultationId !== activeConsultationId);
        localStorage.setItem("zebra_teleconsult_waiting_queue", JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("teleconsult-queue");
        bc.postMessage({
          type: "patient-cancelled-consult",
          payload: { consultationId: activeConsultationId, patientId: user?.id },
        });
        bc.close();
      }
    } catch {
      // ignore
    }

    const sb = getSupabase();
    if (sb) {
      const channel = sb.channel("teleconsult-queue");
      await channel.send({
        type: "broadcast",
        event: "patient-cancelled-consult",
        payload: {
          consultationId: activeConsultationId,
          patientId: user?.id,
        },
      });
    }
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
          <div className="rounded-[24px] border border-slate-100 bg-white p-8 text-slate-800 shadow-sm text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm mx-auto">
              <Video className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-3.5 py-1 text-xs font-semibold text-lime-800">
                <Sparkles className="h-3.5 w-3.5 text-lime-600" />
                <span>Instant Physician Match</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-['Manrope']">
                Request Live Teleconsultation
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Click below to broadcast your consultation request to active doctors on duty. Once an available doctor accepts your request, your encrypted HD video call will launch automatically.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                className={`h-11 px-8 text-xs sm:text-sm font-bold shadow-sm ${portalPrimaryButtonClass}`}
                onClick={handleStartSearching}
              >
                <Search className="mr-2 h-4 w-4" />
                Start Searching for Doctors
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3.5 pt-6 border-t border-slate-100 text-left text-xs text-slate-600">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <Radio className="h-4 w-4 text-lime-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Live Broadcast Queue</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Notifies online doctors in real-time</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <UserCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Automatic Roster Addition</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Auto-links records with accepting doctor</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">End-to-End HD Video</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Encrypted WebRTC peer-to-peer stream</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {mode === "searching" && (
        <section className="space-y-6 max-w-2xl mx-auto my-8">
          <div className="rounded-[24px] border border-lime-200 bg-white p-10 text-center space-y-6 shadow-sm relative overflow-hidden">
            {/* Animated Pulsing Radar Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="h-64 w-64 rounded-full border border-lime-400 animate-ping" />
            </div>

            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-50 text-lime-700 mx-auto">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-2 text-lime-700 text-xs font-semibold uppercase tracking-wider">
                <Radio className="h-4 w-4 animate-pulse" />
                <span>Live Searching Queue Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Manrope']">Searching for Available Doctors...</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Your request has been broadcasted to doctors currently in the Teleconsultation portal. Please stay on this screen.
              </p>
            </div>

            <div className="relative z-10 pt-2 flex justify-center">
              <Button
                variant="outline"
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl h-10 px-6"
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
              <div className="flex items-center gap-2 text-lime-800 font-bold text-xs tracking-wider uppercase">
                <Clock className="h-4 w-4" />
                <span>Session Guidelines</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-lime-600 font-bold">•</span>
                  <span>Ensure your camera and microphone are enabled in your browser settings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lime-600 font-bold">•</span>
                  <span>Use headphones to prevent audio echo during the consultation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lime-600 font-bold">•</span>
                  <span>Your doctor can update clinical notes live during or after the call.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {mode === "completed" && (
        <div className={`${portalPanelClass} p-10 text-center space-y-4 max-w-xl mx-auto my-8`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 mx-auto">
            <UserCheck className="h-7 w-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Manrope']">Consultation Completed</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Thank you for attending your video consultation with {activeDoctorName}. Your appointment and care records have been saved.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Button
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl shadow-sm"
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
