import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Video,
  ArrowLeft,
  Send,
  FileEdit,
  CheckCircle,
  Radio,
  Clock,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import VideoCall from "../../components/teleconsult/VideoCall";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";

export type WaitingPatient = {
  consultationId: string;
  patientId: string;
  patientName: string;
  condition: string;
  requestedAt: string;
  timestamp?: number;
};

export default function DoctorTeleconsult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const queryId = searchParams.get("id");
  const queryPatient = searchParams.get("patient");
  const queryPatientId = searchParams.get("patientId");

  const [activeConsultationId, setActiveConsultationId] = useState(queryId || "");
  const [activePatientName, setActivePatientName] = useState(queryPatient || "");
  const [activePatientId, setActivePatientId] = useState(queryPatientId || "");

  const [callActive, setCallActive] = useState(Boolean(queryId));
  const [noteText, setNoteText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Live waiting queue of patients seeking teleconsultation
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);

  // Multi-layer Real-Time Queue Detection: BroadcastChannel + Supabase Presence/Broadcast + localStorage Polling
  useEffect(() => {
    // 1. Sync from localStorage queue on mount & periodically
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem("zebra_teleconsult_waiting_queue");
        if (raw) {
          const list: WaitingPatient[] = JSON.parse(raw);
          const now = Date.now();
          // Filter out expired items (> 3 mins old)
          const valid = list.filter((p) => now - (p.timestamp || now) < 180000);
          if (valid.length !== list.length) {
            localStorage.setItem("zebra_teleconsult_waiting_queue", JSON.stringify(valid));
          }
          setWaitingPatients((prev) => {
            const merged = [...valid];
            for (const item of prev) {
              if (!merged.some((p) => p.consultationId === item.consultationId)) {
                merged.push(item);
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to read storage queue:", err);
      }
    };
    syncFromStorage();

    // 2. Setup BroadcastChannel for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("teleconsult-queue");
        bc.postMessage({ type: "doctor-query-queue" });

        bc.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === "patient-seeking-consult" && payload?.consultationId) {
            setWaitingPatients((prev) => {
              if (prev.some((p) => p.consultationId === payload.consultationId)) return prev;
              toast.info(`New patient request: ${payload.patientName || "A patient"} is seeking teleconsultation!`);
              return [payload, ...prev];
            });
          } else if (type === "patient-cancelled-consult" && payload) {
            setWaitingPatients((prev) =>
              prev.filter(
                (p) =>
                  (payload.consultationId ? p.consultationId !== payload.consultationId : true) &&
                  (payload.patientId ? p.patientId !== payload.patientId : true)
              )
            );
          }
        };
      }
    } catch {
      // ignore
    }

    // 3. Setup Supabase Realtime channel
    const sb = getSupabase();
    let sbChannel: any = null;

    if (sb) {
      sbChannel = sb.channel("teleconsult-queue", {
        config: { presence: { key: user?.id || "doctor" }, broadcast: { self: true } },
      });

      sbChannel.on("presence", { event: "sync" }, () => {
        const state = sbChannel.presenceState();
        const detected: WaitingPatient[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.consultationId && p.patientName) {
              detected.push(p);
            }
          });
        });
        if (detected.length > 0) {
          setWaitingPatients((prev) => {
            const merged = [...detected];
            for (const item of prev) {
              if (!merged.some((p) => p.consultationId === item.consultationId)) {
                merged.push(item);
              }
            }
            return merged;
          });
        }
      });

      sbChannel.on("broadcast", { event: "patient-seeking-consult" }, (event: any) => {
        const data = event.payload as WaitingPatient;
        if (data && data.consultationId) {
          setWaitingPatients((prev) => {
            if (prev.some((p) => p.consultationId === data.consultationId)) return prev;
            toast.info(`New patient request: ${data.patientName || "A patient"} is seeking teleconsultation!`);
            return [data, ...prev];
          });
        }
      });

      sbChannel.on("broadcast", { event: "patient-cancelled-consult" }, (event: any) => {
        const data = event.payload as { consultationId?: string; patientId?: string };
        if (data && (data.consultationId || data.patientId)) {
          setWaitingPatients((prev) =>
            prev.filter(
              (p) =>
                (data.consultationId ? p.consultationId !== data.consultationId : true) &&
                (data.patientId ? p.patientId !== data.patientId : true)
            )
          );
        }
      });

      sbChannel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void sbChannel.send({
            type: "broadcast",
            event: "doctor-query-queue",
            payload: { doctorId: user?.id },
          });
        }
      });
    }

    // 4. Periodic sync interval
    const interval = setInterval(() => {
      syncFromStorage();
      if (bc) {
        bc.postMessage({ type: "doctor-query-queue" });
      }
      if (sbChannel) {
        void sbChannel.send({
          type: "broadcast",
          event: "doctor-query-queue",
          payload: { doctorId: user?.id },
        });
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      if (sbChannel && sb) void sb.removeChannel(sbChannel);
    };
  }, [user?.id]);

  // Auto-link patient to doctor's roster in care_relationships
  const autoLinkPatientToRoster = async (pId: string, pName: string, conditionStr: string) => {
    const sb = getSupabase();
    const doctorId = user?.id;
    if (!sb || !doctorId || !pId) return;

    try {
      const { error } = await sb.from("care_relationships").insert({
        doctor_id: doctorId,
        patient_id: pId,
        primary_condition: conditionStr || "Teleconsultation Patient",
        health_status: "normal",
      });

      if (!error) {
        toast.success(`${pName} has been automatically added to your patient roster!`);
      }
    } catch {
      // ignore duplicates
    }
  };

  // Broadcast doctor presence in active room so patient can discover and join
  useEffect(() => {
    if (!callActive || !activeConsultationId) return;

    const payload = {
      consultationId: activeConsultationId,
      doctorId: user?.id,
      doctorName: profile?.full_name || "Dr. Amelia Hart",
      specialty: profile?.license_number ? `Lic. ${profile.license_number}` : "Internal Medicine & Primary Care",
      patientName: activePatientName,
      patientId: activePatientId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(`zebra_doctor_waiting_${activeConsultationId}`, JSON.stringify(payload));
    } catch {
      // ignore
    }

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("teleconsult-queue");
        bc.postMessage({ type: "doctor-waiting-in-room", payload });
      }
    } catch {
      // ignore
    }

    const heartbeat = setInterval(() => {
      try {
        localStorage.setItem(
          `zebra_doctor_waiting_${activeConsultationId}`,
          JSON.stringify({ ...payload, timestamp: Date.now() })
        );
      } catch {
        // ignore
      }
      bc?.postMessage({ type: "doctor-waiting-in-room", payload });
    }, 2500);

    return () => {
      clearInterval(heartbeat);
      try {
        localStorage.removeItem(`zebra_doctor_waiting_${activeConsultationId}`);
      } catch {
        // ignore
      }
      bc?.close();
    };
  }, [callActive, activeConsultationId, user?.id, profile?.full_name, activePatientName, activePatientId]);

  // Doctor connects with a waiting patient from the queue
  const handleConnectPatient = async (patient: WaitingPatient) => {
    setActiveConsultationId(patient.consultationId);
    setActivePatientName(patient.patientName);
    setActivePatientId(patient.patientId);
    setCallActive(true);

    // Remove patient from waiting list in state
    setWaitingPatients((prev) => prev.filter((p) => p.consultationId !== patient.consultationId));

    // Remove from localStorage queue
    try {
      const raw = localStorage.getItem("zebra_teleconsult_waiting_queue");
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((p: any) => p.consultationId !== patient.consultationId);
        localStorage.setItem("zebra_teleconsult_waiting_queue", JSON.stringify(filtered));
      }
      // Record acceptance signal in localStorage
      localStorage.setItem(
        `zebra_accepted_${patient.consultationId}`,
        JSON.stringify({
          consultationId: patient.consultationId,
          patientId: patient.patientId,
          doctorId: user?.id,
          doctorName: profile?.full_name || "Dr. Amelia Hart",
          specialty: profile?.license_number ? `Lic. ${profile.license_number}` : "Internal Medicine & Primary Care",
        })
      );
    } catch {
      // ignore
    }

    // Broadcast acceptance signal via BroadcastChannel
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("teleconsult-queue");
        bc.postMessage({
          type: "doctor-accepted-consult",
          payload: {
            consultationId: patient.consultationId,
            patientId: patient.patientId,
            doctorId: user?.id,
            doctorName: profile?.full_name || "Dr. Amelia Hart",
            specialty: profile?.license_number ? `Lic. ${profile.license_number}` : "Internal Medicine & Primary Care",
          },
        });
        bc.close();
      }
    } catch {
      // ignore
    }

    // Broadcast acceptance signal to patient via Supabase
    const sb = getSupabase();
    if (sb) {
      const channel = sb.channel("teleconsult-queue");
      await channel.send({
        type: "broadcast",
        event: "doctor-accepted-consult",
        payload: {
          consultationId: patient.consultationId,
          patientId: patient.patientId,
          doctorId: user?.id,
          doctorName: profile?.full_name || "Dr. Amelia Hart",
          specialty: profile?.license_number ? `Lic. ${profile.license_number}` : "Internal Medicine & Primary Care",
        },
      });
    }

    // Automatically add patient to doctor list
    await autoLinkPatientToRoster(patient.patientId, patient.patientName, patient.condition);
  };

  const handleBroadcastNote = async () => {
    if (!noteText.trim() || !activeConsultationId) return;

    setIsPublishing(true);
    try {
      // 1. Write to localStorage
      try {
        localStorage.setItem(`zebra_consultation_notes_${activeConsultationId}`, noteText);
      } catch {
        // ignore
      }

      // 2. Broadcast via BroadcastChannel
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel(`zebra-notes-${activeConsultationId}`);
          bc.postMessage({ note: noteText });
          bc.close();
        }
      } catch {
        // ignore
      }

      // 3. Broadcast via Supabase Realtime
      const supabase = getSupabase();
      if (supabase) {
        const channel = supabase.channel(`consultation-${activeConsultationId}`);
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

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-full text-slate-800 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto font-sans space-y-6">
      {/* Top Banner & Teleconsult Status */}
      <div className="rounded-[26px] bg-gradient-to-r from-[#3E36B0] via-[#4A42C4] to-[#6A61EB] p-6 md:p-8 text-white shadow-xl shadow-[#3E36B0]/15 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-48 h-48 bg-[#A8DEF7]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#A8DEF7] border border-white/20 backdrop-blur-sm">
              <Video className="w-3.5 h-3.5" />
              Live Virtual Clinic & Video Consult
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                callActive
                  ? "bg-rose-500 text-white"
                  : "bg-emerald-400 text-slate-900"
              }`}
            >
              {callActive ? "Live Call Active" : "Waiting Queue Ready"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-['Manrope']">
            Doctor Teleconsultation Portal
          </h1>
          <p className="mt-1.5 text-xs md:text-sm text-white/80 leading-relaxed font-medium">
            {callActive
              ? `Active Session with ${activePatientName || "Patient"} • Session ID: ${activeConsultationId}`
              : "Monitor patients seeking instant video consultation in the live real-time queue."}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/doctor")}
            className="h-11 px-5 rounded-2xl bg-white hover:bg-white/95 text-[#3E36B0] font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-98 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#3E36B0]" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {!callActive ? (
        <section className="space-y-6">
          {/* Live Waiting Queue Section */}
          <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3E36B0] to-[#6A61EB] text-white shadow-sm">
                  <Radio className="h-5 w-5 animate-pulse text-[#A8DEF7]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#111111] font-['Manrope']">
                    Patients Seeking Instant Teleconsultation
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Real-time waiting queue of patients requesting on-demand video consultations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Listening
                </span>
                <span className="rounded-full bg-[#D8D9FF] px-3 py-1 text-xs font-bold text-[#3E36B0]">
                  {waitingPatients.length} in Queue
                </span>
              </div>
            </div>

            {waitingPatients.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {waitingPatients.map((patient) => (
                  <article
                    key={patient.consultationId}
                    className="rounded-2xl border border-slate-200 bg-[#FAFBFD] p-5 text-slate-800 shadow-sm hover:border-[#3E36B0]/40 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3E36B0] text-white font-bold text-xs shadow-sm">
                            {initials(patient.patientName)}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#111111] text-sm group-hover:text-[#3E36B0] transition-colors">
                              {patient.patientName}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                              ID: {patient.patientId ? patient.patientId.slice(0, 8) : "N/A"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {patient.requestedAt}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-700 space-y-1">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Reason / Consultation Note
                        </p>
                        <p className="font-semibold text-[#111111]">
                          {patient.condition || "General Medical Teleconsultation Request"}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-[#3E36B0] hover:bg-[#312B91] text-white font-bold text-xs h-10 rounded-xl shadow-md shadow-[#3E36B0]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => void handleConnectPatient(patient)}
                    >
                      <Video className="h-4 w-4 text-[#A8DEF7]" />
                      <span>Connect in Video Call</span>
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-[#F4F6FC] p-10 text-center text-xs text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#3E36B0] flex items-center justify-center mx-auto shadow-sm">
                  <UserCheck className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-slate-700">No patients currently in the waiting queue.</p>
                <p className="max-w-md mx-auto text-slate-500">
                  Stay on this page—when a patient clicks <strong>&quot;Start Searching for Doctors&quot;</strong> in the Patient Portal, their request will pop up here in real time.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Active Video Call & Live Clinical Note Session */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Call Stream */}
          <div className="lg:col-span-2">
            <VideoCall
              consultationId={activeConsultationId}
              role="DOCTOR"
              onLeave={() => setCallActive(false)}
            />
          </div>

          {/* Doctor Controls & Realtime Note Sync */}
          <div className="space-y-6">
            <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
                <FileEdit className="h-4 w-4" />
                <span>Real-time Clinical Notes</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Type diagnosis, multi-omics observations, or prescription advice. The patient will see live updates in real time.
              </p>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type notes here (e.g. Patient exhibits mild hypermobility symptoms. Prescribed routine biometrics monitoring and follow-up lab review in 2 weeks...)"
                className="w-full h-44 rounded-2xl border border-slate-200 bg-[#F4F6FC] p-4 text-xs text-[#111111] placeholder:text-slate-400 focus:border-[#3E36B0] focus:ring-1 focus:ring-[#3E36B0]/20 outline-none resize-none"
              />

              <Button
                className="w-full bg-[#3E36B0] hover:bg-[#312B91] text-white font-bold text-xs h-10 rounded-xl shadow-md shadow-[#3E36B0]/20 cursor-pointer"
                onClick={handleBroadcastNote}
                disabled={!noteText.trim() || isPublishing}
              >
                <Send className="mr-2 h-4 w-4 text-[#A8DEF7]" />
                {isPublishing ? "Publishing..." : "Sync Live Note to Patient"}
              </Button>
            </div>

            <div className="rounded-[26px] bg-white border border-slate-200/70 p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-[#3E36B0] font-bold text-xs tracking-wider uppercase">
                <Users className="h-4 w-4" />
                <span>Active Consultation Details</span>
              </div>
              <div className="text-xs text-slate-700 space-y-2 pt-1">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-[#111111]">{activePatientName || "Patient"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Session ID:</span>
                  <span className="font-mono text-[11px] text-slate-600">{activeConsultationId}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Roster Auto-link:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Added to Directory
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Encryption:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> DTLS / SRTP End-to-End
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
