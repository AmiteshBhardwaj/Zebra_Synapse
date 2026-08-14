import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Video, ArrowLeft, Send, Users, FileEdit, CheckCircle, Radio, Clock, UserCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import VideoCall from "../../components/teleconsult/VideoCall";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthContext";

type WaitingPatient = {
  consultationId: string;
  patientId: string;
  patientName: string;
  condition: string;
  requestedAt: string;
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
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([
    {
      consultationId: "demo-consult-101",
      patientId: "d0000000-0000-0000-0000-000000000001",
      patientName: "Maya Thompson",
      condition: "Hypertension / Elevated BP Follow-up",
      requestedAt: "2 mins ago",
    },
    {
      consultationId: "demo-consult-102",
      patientId: "d0000000-0000-0000-0000-000000000003",
      patientName: "Sofia Bennett",
      condition: "Type 2 Diabetes / Glucose Review",
      requestedAt: "5 mins ago",
    },
    {
      consultationId: "demo-consult-103",
      patientId: "d0000000-0000-0000-0000-000000000010",
      patientName: "Lucas Reed",
      condition: "Acute Migraine & Symptoms",
      requestedAt: "8 mins ago",
    },
  ]);

  // Subscribe to real-time teleconsultation requests from patients
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb.channel("teleconsult-queue", {
      config: { broadcast: { self: true } },
    });

    channel.subscribe();

    channel.on("broadcast", { event: "patient-seeking-consult" }, (event) => {
      const data = event.payload as WaitingPatient;
      if (data && data.consultationId) {
        setWaitingPatients((prev) => {
          if (prev.some((p) => p.consultationId === data.consultationId)) return prev;
          return [data, ...prev];
        });
        toast.info(`New patient request: ${data.patientName || "A patient"} is seeking teleconsultation!`);
      }
    });

    return () => {
      void sb.removeChannel(channel);
    };
  }, []);

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
      // Patient might already be linked, ignore duplicate error silently
    }
  };

  // Doctor clicks "Connect in Video Call" for a patient in the queue
  const handleConnectPatient = async (patient: WaitingPatient) => {
    setActiveConsultationId(patient.consultationId);
    setActivePatientName(patient.patientName);
    setActivePatientId(patient.patientId);
    setCallActive(true);

    // Remove patient from waiting list
    setWaitingPatients((prev) => prev.filter((p) => p.consultationId !== patient.consultationId));

    // Broadcast acceptance signal to patient
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

  return (
    <div className="min-h-full text-slate-800 p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto font-sans space-y-6 bg-[#f6f8f5]">
      {/* Page Header */}
      <div className="rounded-[24px] bg-white border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-['Manrope']">Doctor Teleconsultation Portal</h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-lime-800">
                {callActive ? "Live Call Active" : "Waiting Queue Ready"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {callActive
                ? `Active Session with ${activePatientName} • Session ID: ${activeConsultationId}`
                : "Monitor patients seeking instant video consultation and connect in 1 click."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl h-10 px-4 transition-all shadow-sm"
          onClick={() => navigate("/doctor")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients List
        </Button>
      </div>

      {!callActive ? (
        <section className="space-y-6">
          {/* Patients Seeking Teleconsultation Queue Section */}
          <div className="rounded-[24px] bg-white border border-slate-100 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                  <Radio className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-['Manrope']">Patients Seeking Teleconsultation</h2>
                  <p className="text-xs text-slate-500">
                    Live waiting list of patients requesting on-demand video consultations
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-bold text-lime-800">
                {waitingPatients.length} Waiting
              </span>
            </div>

            {waitingPatients.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {waitingPatients.map((patient) => (
                  <article
                    key={patient.consultationId}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-slate-800 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-500/15 text-lime-800 font-bold text-xs">
                            {patient.patientName.slice(0, 2).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">{patient.patientName}</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {patient.requestedAt}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-700">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Condition / Note</p>
                        <p className="mt-0.5 font-medium text-slate-800">{patient.condition}</p>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs h-10 rounded-xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                      onClick={() => void handleConnectPatient(patient)}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Connect in Video Call
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-8 text-center text-xs text-slate-500 space-y-2">
                <UserCheck className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">No patients currently in the waiting queue.</p>
                <p>Stay on this page—new patient consultation requests will pop up automatically in real-time.</p>
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
            <div className="rounded-[24px] bg-white border border-slate-100 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-lime-800 font-bold text-xs tracking-wider uppercase">
                <FileEdit className="h-4 w-4" />
                <span>Real-time Clinical Notes</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Type diagnosis, prescription advice, or follow-up notes. Patient will see live updates in real time.
              </p>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type notes here (e.g. Patient presents with mild arrhythmia. Recommend daily BP monitoring and 100mg Aspirin...)"
                className="w-full h-44 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:ring-1 focus:ring-lime-500/20 outline-none resize-none"
              />

              <Button
                className="w-full bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs h-10 rounded-xl shadow-sm"
                onClick={handleBroadcastNote}
                disabled={!noteText.trim() || isPublishing}
              >
                <Send className="mr-2 h-4 w-4" />
                {isPublishing ? "Publishing..." : "Sync Live Note to Patient"}
              </Button>
            </div>

            <div className="rounded-[24px] bg-white border border-slate-100 p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-lime-800 font-bold text-xs tracking-wider uppercase">
                <Users className="h-4 w-4" />
                <span>Active Consultation Details</span>
              </div>
              <div className="text-xs text-slate-700 space-y-2 pt-1">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-slate-900">{activePatientName}</span>
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
                    <CheckCircle className="h-3.5 w-3.5" /> DTLS / SRTP
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
