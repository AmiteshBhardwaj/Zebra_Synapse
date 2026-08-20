import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
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
  Pill,
  FileText,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import VideoCall from "../../components/teleconsult/VideoCall";
import RealtimeNote from "../../components/teleconsult/RealtimeNote";
import PatientDoctorChat from "./PatientDoctorChat";
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
  const location = useLocation();
  const { user, profile } = useAuth();

  const queryId = searchParams.get("id");
  const queryDoctor = searchParams.get("doctor");
  const querySpecialty = searchParams.get("specialty");
  const queryTab = searchParams.get("tab");

  const isMessagesRoute = location.pathname.includes("/messages") || location.pathname.includes("/chat");
  const [activeHubTab, setActiveHubTab] = useState<"video" | "messages">(
    queryTab === "messages" || isMessagesRoute ? "messages" : "video"
  );

  useEffect(() => {
    if (queryTab === "messages" || isMessagesRoute) {
      setActiveHubTab("messages");
    } else if (queryTab === "video") {
      setActiveHubTab("video");
    }
  }, [queryTab, isMessagesRoute]);

  // Status modes: "idle" | "searching" | "connected" | "completed"
  const [mode, setMode] = useState<"idle" | "searching" | "connected" | "completed">(
    queryId ? "connected" : "idle"
  );

  const [activeDoctorName, setActiveDoctorName] = useState(queryDoctor || "Dr. Amelia Hart");
  const [activeSpecialty, setActiveSpecialty] = useState(querySpecialty || "Internal Medicine & Primary Care");
  const [activeConsultationId, setActiveConsultationId] = useState(
    queryId || `teleconsult-${Date.now().toString().slice(-6)}`
  );

  // Completed consultation summary state
  const [completedSummary, setCompletedSummary] = useState<any>(null);
  const [completedNotes, setCompletedNotes] = useState<string>("");
  const [completedPrescriptions, setCompletedPrescriptions] = useState<any[]>([]);

  // Detected doctor waiting in an active room
  const [waitingDoctor, setWaitingDoctor] = useState<DoctorWaitingInfo | null>(null);

  // Sync completed consultation data in real-time
  useEffect(() => {
    if (mode !== "completed" || !activeConsultationId) return;

    const loadSummaryFromStorage = () => {
      try {
        const rawSummary = localStorage.getItem(`zebra_consultation_summary_${activeConsultationId}`);
        if (rawSummary) {
          const parsed = JSON.parse(rawSummary);
          setCompletedSummary(parsed);
          if (parsed.notes) setCompletedNotes(parsed.notes);
          if (parsed.prescriptions) setCompletedPrescriptions(parsed.prescriptions);
        }
        const rawNotes = localStorage.getItem(`zebra_consultation_notes_${activeConsultationId}`);
        if (rawNotes) {
          setCompletedNotes(rawNotes);
        }
        const rawRx = localStorage.getItem(`zebra_consultation_rx_${activeConsultationId}`);
        if (rawRx) {
          setCompletedPrescriptions(JSON.parse(rawRx));
        }
      } catch (err) {
        console.warn("Error reading storage summary:", err);
      }
    };

    loadSummaryFromStorage();
    const interval = setInterval(loadSummaryFromStorage, 1500);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(`zebra-notes-${activeConsultationId}`);
        bc.onmessage = (e) => {
          if (e.data?.summary) {
            setCompletedSummary(e.data.summary);
          }
          if (e.data?.note) {
            setCompletedNotes(e.data.note);
          }
          if (e.data?.prescriptions) {
            setCompletedPrescriptions(e.data.prescriptions);
          }
        };
      }
    } catch {
      // ignore
    }

    const sb = getSupabase();
    let sbChannel: any = null;
    if (sb) {
      sbChannel = sb.channel(`consultation-${activeConsultationId}`);
      sbChannel.on("broadcast", { event: "consultation-finalized" }, (event: any) => {
        if (event.payload) {
          setCompletedSummary(event.payload);
          if (event.payload.notes) setCompletedNotes(event.payload.notes);
          if (event.payload.prescriptions) setCompletedPrescriptions(event.payload.prescriptions);
        }
      });
      sbChannel.on("broadcast", { event: "note-updated" }, (event: any) => {
        if (event.payload?.note) {
          setCompletedNotes(event.payload.note);
        }
      });
      sbChannel.subscribe();
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      if (sbChannel && sb) void sb.removeChannel(sbChannel);
    };
  }, [mode, activeConsultationId]);

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
      {/* Sub-Navigation Hub Tabs (Video Consultation vs Messages) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-white rounded-full border border-slate-200 shadow-2xs">
          <button
            onClick={() => {
              setActiveHubTab("video");
              navigate("/patient/teleconsult?tab=video", { replace: true });
            }}
            className={`px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeHubTab === "video"
                ? "bg-[#f0f9eb] text-slate-900 border border-[#84cc16] shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium"
            }`}
          >
            <Video className={`h-4 w-4 ${activeHubTab === "video" ? "text-[#65a30d]" : "text-slate-400"}`} />
            <span>Video Consultation</span>
          </button>
          <button
            onClick={() => {
              setActiveHubTab("messages");
              navigate("/patient/teleconsult?tab=messages", { replace: true });
            }}
            className={`px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeHubTab === "messages"
                ? "bg-[#f0f9eb] text-slate-900 border border-[#84cc16] shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium"
            }`}
          >
            <MessageSquare className={`h-4 w-4 ${activeHubTab === "messages" ? "text-[#65a30d]" : "text-slate-400"}`} />
            <span>Messages</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium max-w-md leading-relaxed">
          Choose how you want to connect with your doctor. Start a video consultation or send a secure message.
        </p>
      </div>

      {activeHubTab === "messages" ? (
        <PatientDoctorChat embedded={true} />
      ) : (
        <div className="space-y-6">
          {/* Active Doctor Room Notification Banner */}
          {mode === "idle" && waitingDoctor && (
            <div className="max-w-5xl mx-auto p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-blue-950/90 border border-cyan-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 backdrop-blur-xl animate-in fade-in duration-200">
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 relative">
                  <PhoneCall className="h-4.5 w-4.5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-white truncate">{waitingDoctor.doctorName}</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.2 border border-emerald-500/30 shrink-0">
                      Ready in Room
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Your doctor is waiting in Room #{waitingDoctor.consultationId}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto h-8.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-sm cursor-pointer shrink-0 active:scale-[0.98]"
                onClick={() => handleJoinDoctorRoom(waitingDoctor)}
              >
                <Video className="mr-1.5 h-3.5 w-3.5" />
                Join Room Now
              </Button>
            </div>
          )}

          {/* IDLE / SEARCHING VIEW (UNIFIED 2-COLUMN HUB CARD) */}
          {(mode === "idle" || mode === "searching") && (
            <div className="rounded-[26px] bg-white border border-slate-200/80 p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col gap-6">
              {/* TOP HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-[#0284c7]">
                      VIRTUAL CARE HUB
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-[#0099ff]">
                      <Video className="h-3.5 w-3.5 stroke-[2.2]" />
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                    Instant Teleconsultation Matching
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
                    Connect with online physicians via encrypted end-to-end HD video call. Seek instant medical advice or consult with your care team.
                  </p>
                </div>
              </div>

              {/* 2-COLUMN MAIN CONTENT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
                {/* LEFT SECTION: ACTION & CALL-TO-ACTION CARD */}
                <div className="lg:col-span-7 flex flex-col justify-center rounded-2xl bg-gradient-to-br from-sky-50/40 via-slate-50/50 to-white border border-slate-200/80 p-6 sm:p-8 shadow-2xs">
                  {mode === "idle" ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-[#0099ff] shadow-xs">
                          <Video className="h-5.5 w-5.5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Manrope']">
                            Request Live Teleconsultation
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-md">
                            Broadcast your request to active on-duty doctors for instant connection.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          className="w-full sm:w-auto h-11 px-7 text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                          onClick={handleStartSearching}
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Start Searching for Doctors
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 max-w-md mx-auto">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-[#0099ff] shadow-sm">
                        <Loader2 className="h-7 w-7 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-[#0099ff] text-[11px] font-bold uppercase tracking-wider">
                          <Radio className="h-3.5 w-3.5 animate-pulse" />
                          <span>Searching Active Doctor Queue</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-['Manrope']">
                          Broadcasting to Online Doctors...
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Please stay on this screen while an available doctor accepts your visit request.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl h-9 px-5 cursor-pointer"
                        onClick={handleCancelSearch}
                      >
                        Cancel Search Request
                      </Button>
                    </div>
                  )}
                </div>

                {/* RIGHT SECTION: 3D HERO ILLUSTRATION & CARE GUIDELINES */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-gradient-to-br from-slate-50/90 via-[#f8fafd] to-sky-50/30 rounded-2xl p-4 sm:p-5 border border-slate-200/70">
                  {/* 3D Illustration */}
                  <div className="flex-1 flex items-center justify-center relative overflow-hidden py-1">
                    <img
                      src="/teleconsult_hero_3d.jpg"
                      alt="Teleconsultation Doctor Illustration"
                      className="max-h-40 sm:max-h-44 w-auto object-contain rounded-2xl transition-transform duration-300 hover:scale-[1.02] drop-shadow-sm"
                    />
                  </div>

                  {/* Quick Guidelines Box */}
                  <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 shrink-0 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-[#0099ff]" />
                      <span>Quick Consultation Tips</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      • Have your medical history &amp; recent lab reports accessible.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      • Use headphones in a quiet room for crystal clear audio.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      • Ensure camera &amp; microphone permissions are enabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
        <section className="max-w-3xl mx-auto my-8 space-y-6 animate-in fade-in duration-300">
          {/* Header Card */}
          <div className="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    Encounter Completed
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-['Manrope']">
                    Consultation with {activeDoctorName}
                  </h2>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-slate-300 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Session #{activeConsultationId.slice(-8)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
              <span className="bg-white/10 px-3 py-1 rounded-xl">{activeSpecialty}</span>
              <span className="bg-white/10 px-3 py-1 rounded-xl flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> DTLS/SRTP Encrypted
              </span>
              {completedSummary?.followUp && (
                <span className="bg-lime-500/20 text-lime-300 border border-lime-500/30 px-3 py-1 rounded-xl font-semibold">
                  Follow-up: {completedSummary.followUp}
                </span>
              )}
            </div>
          </div>

          {/* Doctor's Final Clinical Notes */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 sm:p-7 text-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm font-['Manrope']">
                <FileText className="h-4 w-4 text-[#0099ff]" />
                <span>Doctor's Clinical Notes & Assessment</span>
              </div>
              {completedSummary?.diagnosis && (
                <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-xs font-bold text-blue-700">
                  {completedSummary.diagnosis}
                </span>
              )}
            </div>

            {completedNotes ? (
              <div className="rounded-2xl border border-slate-200/80 bg-[#F4F6FC] p-4 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
                {completedNotes}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
                <p className="font-semibold text-slate-700">Your doctor is finalizing the encounter notes...</p>
                <p className="text-[11px] text-slate-400">
                  This card will automatically sync as soon as the doctor saves their clinical wrap-up.
                </p>
              </div>
            )}

            {completedSummary?.advice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-[10px] uppercase tracking-wider text-emerald-700">
                  Direct Guidance & Instructions
                </p>
                <p className="font-medium">{completedSummary.advice}</p>
              </div>
            )}
          </div>

          {/* Prescriptions Dispensed Section */}
          {completedPrescriptions.length > 0 && (
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 sm:p-7 text-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm font-['Manrope']">
                  <Pill className="h-4 w-4 text-emerald-600" />
                  <span>Prescriptions Dispensed</span>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  {completedPrescriptions.length} Active Medication{completedPrescriptions.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {completedPrescriptions.map((rx: any) => (
                  <div
                    key={rx.id || rx.name}
                    className="rounded-2xl border border-slate-200 bg-[#FAFBFD] p-4 text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{rx.name}</h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {rx.duration || "Active"}
                      </span>
                    </div>
                    <p className="font-semibold text-[#0099ff]">{rx.dosage}</p>
                    {rx.instructions && (
                      <p className="text-[11px] text-slate-500 italic">{rx.instructions}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl text-xs font-bold text-slate-700 hover:text-[#0099ff] gap-1.5"
                  onClick={() => navigate("/patient/prescription")}
                >
                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View All Prescriptions & Refills</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="w-full sm:w-auto h-11 px-7 rounded-2xl bg-[#0099ff] hover:bg-[#0088e6] text-white font-bold text-xs shadow-md shadow-[#0099ff]/20 cursor-pointer"
              onClick={() => navigate("/patient/appointments")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              View Appointments & Follow-ups
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
              onClick={() => setMode("idle")}
            >
              Start New Teleconsultation
            </Button>
          </div>
        </section>
      )}
    </div>
  )}
</PatientPortalPage>
);
}
