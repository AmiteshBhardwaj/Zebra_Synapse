import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Video,
  ArrowLeft,
  ShieldCheck,
  Clock,
  UserCheck,
  Search,
  Radio,
  Loader2,
  Sparkles,
  Calendar,
  PhoneCall,
  Stethoscope,
} from "lucide-react";
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

interface DoctorWaitingInfo {
  consultationId: string;
  doctorName: string;
  specialty: string;
  timestamp: number;
}

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

  // Detected doctor waiting in an active room
  const [waitingDoctor, setWaitingDoctor] = useState<DoctorWaitingInfo | null>(null);

  // Check for active waiting doctors periodically
  useEffect(() => {
    if (mode === "connected") return;

    const checkDoctorPresence = () => {
      try {
        // Scan localStorage for any zebra_doctor_waiting_*
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("zebra_doctor_waiting_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              if (Date.now() - (data.timestamp || 0) < 30000) {
                setWaitingDoctor(data);
                return;
              }
            }
          }
        }
        setWaitingDoctor(null);
      } catch {
        // ignore
      }
    };

    checkDoctorPresence();
    const interval = setInterval(checkDoctorPresence, 2000);

    // Listen on BroadcastChannel for doctor presence
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("teleconsult-queue");
        bc.onmessage = (e) => {
          if (e.data?.type === "doctor-waiting-in-room" && e.data?.payload) {
            setWaitingDoctor(e.data.payload);
          }
        };
      }
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [mode]);

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
            setActiveConsultationId(msgData.consultationId || activeConsultationId);
            setMode("connected");
            toast.success(`Connected! ${msgData.doctorName || "Your doctor"} has accepted your teleconsultation.`);
          } else if (type === "doctor-query-queue") {
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

      sbChannel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await sbChannel.track(payload);
          await sbChannel.send({
            type: "broadcast",
            event: "patient-seeking-consult",
            payload,
          });
        }
      });

      sbChannel.on("broadcast", { event: "doctor-accepted-consult" }, (event: any) => {
        const data = event.payload;
        if (data && (data.consultationId === activeConsultationId || data.patientId === user?.id)) {
          setActiveDoctorName(data.doctorName || "Dr. Amelia Hart");
          setActiveSpecialty(data.specialty || "Physician Specialist");
          setActiveConsultationId(data.consultationId || activeConsultationId);
          setMode("connected");
          toast.success(`Connected! ${data.doctorName || "Your doctor"} has accepted your teleconsultation.`);
        }
      });

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
          setActiveConsultationId(acceptedData.consultationId || activeConsultationId);
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

  const handleJoinDoctorRoom = (doctorInfo: DoctorWaitingInfo) => {
    setActiveConsultationId(doctorInfo.consultationId);
    setActiveDoctorName(doctorInfo.doctorName || "Dr. Amelia Hart");
    setActiveSpecialty(doctorInfo.specialty || "Internal Medicine & Primary Care");
    setMode("connected");
    toast.success(`Joining ${doctorInfo.doctorName}'s teleconsultation room!`);
  };

  const handleCancelSearch = async () => {
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

      {/* Active Doctor Room Notification Banner */}
      {mode === "idle" && waitingDoctor && (
        <div className="max-w-4xl mx-auto my-3 p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 border border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5 text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm relative">
              <PhoneCall className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{waitingDoctor.doctorName}</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                  Ready in Room
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Your doctor is currently waiting in Consultation Room #{waitingDoctor.consultationId}.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_4px_16px_rgba(6,182,212,0.35)] cursor-pointer active:scale-[0.98]"
            onClick={() => handleJoinDoctorRoom(waitingDoctor)}
          >
            <Video className="mr-2 h-4 w-4" />
            Join Consultation Now
          </Button>
        </div>
      )}

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
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Manrope']">
                Searching for Available Doctors...
              </h2>
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
        <section className="max-w-xl mx-auto my-12 text-center space-y-6 bg-white p-8 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">Teleconsultation Completed</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Your consultation session has ended. Clinical notes and prescriptions will be saved to your health record.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              className="h-11 px-6 rounded-2xl bg-[#0099ff] hover:bg-[#0088e6] text-white font-bold text-xs"
              onClick={() => navigate("/patient/appointments")}
            >
              View Appointments
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-2xl text-xs font-semibold"
              onClick={() => setMode("idle")}
            >
              Start New Consult
            </Button>
          </div>
        </section>
      )}
    </PatientPortalPage>
  );
}
