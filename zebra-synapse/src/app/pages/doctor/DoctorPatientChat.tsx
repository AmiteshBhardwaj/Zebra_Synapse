import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Paperclip,
  Pill,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import { useDoctorPatientChat } from "../../../hooks/useDoctorPatientChat";
import {
  type ChatAccessRequest,
  getAllChatRequests,
  updateChatAccessRequestStatus,
} from "../../../lib/doctorPatientChat";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

interface PatientMeta {
  id: string;
  name: string;
  age?: number | string;
  gender?: string;
  condition?: string;
  isLinkedOrTeleconsult: boolean;
}

// Full seed roster of clinical patients
const SEED_PATIENTS: PatientMeta[] = [
  { id: "pat_maya_thompson", name: "Maya Thompson", age: 34, gender: "Female", condition: "Hypertension & BP Surveillance", isLinkedOrTeleconsult: true },
  { id: "pat_liam_carter", name: "Liam Carter", age: 42, gender: "Male", condition: "Hyperlipidemia & Lipid Profile", isLinkedOrTeleconsult: true },
  { id: "pat_sofia_bennett", name: "Sofia Bennett", age: 38, gender: "Female", condition: "Type 2 Diabetes Glycemic Review", isLinkedOrTeleconsult: true },
  { id: "pat_noah_patel", name: "Noah Patel", age: 29, gender: "Male", condition: "Asthma & Respiratory Management", isLinkedOrTeleconsult: false },
  { id: "pat_ava_richardson", name: "Ava Richardson", age: 31, gender: "Female", condition: "GERD & Gastric Protocol", isLinkedOrTeleconsult: false },
  { id: "pat_ethan_brooks", name: "Ethan Brooks", age: 45, gender: "Male", condition: "Hypothyroidism & Thyroid Markers", isLinkedOrTeleconsult: false },
];

export default function DoctorPatientChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientsList, setPatientsList] = useState<PatientMeta[]>(SEED_PATIENTS);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [requestTick, setRequestTick] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse target patient ID from URL search params (e.g. /doctor/messages?patientId=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetPatId = params.get("patientId");
    if (targetPatId) {
      setSelectedPatientId(targetPatId);
    }
  }, [location.search]);

  // Load patient list (Filtered to ONLY Linked, Teleconsulted, or Accepted Request Patients)
  useEffect(() => {
    async function loadPatients() {
      setLoadingPatients(true);
      const patsMap = new Map<string, PatientMeta>();
      const linkedConditionsMap = new Map<string, string>();

      // Seed linked patients default map
      SEED_PATIENTS.forEach((p) => patsMap.set(p.id, p));

      const sb = getSupabase();
      if (sb && user?.id) {
        try {
          // Fetch care relationships linked to this doctor
          const { data: rels } = await sb
            .from("care_relationships")
            .select("patient_id, primary_condition")
            .eq("doctor_id", user.id);

          (rels || []).forEach((r) => {
            if (r.patient_id) {
              linkedConditionsMap.set(r.patient_id, r.primary_condition || "Linked Clinical Care");
            }
          });

          // Fetch existing chat conversation patient IDs
          const { data: msgRows } = await sb
            .from("doctor_patient_messages")
            .select("patient_id")
            .eq("doctor_id", user.id);

          const messagePatientIds = new Set((msgRows || []).map((m) => m.patient_id).filter(Boolean));
          const targetIds = Array.from(new Set([...Array.from(linkedConditionsMap.keys()), ...Array.from(messagePatientIds)]));

          if (targetIds.length > 0) {
            const { data: matchedProfiles } = await sb
              .from("profiles")
              .select("id, full_name, age, gender")
              .in("id", targetIds);

            (matchedProfiles || []).forEach((p) => {
              patsMap.set(p.id, {
                id: p.id,
                name: p.full_name || "Patient Record",
                age: p.age || 35,
                gender: p.gender || "Patient",
                condition: linkedConditionsMap.get(p.id) || "Direct Clinical Care",
                isLinkedOrTeleconsult: true,
              });
            });
          }
        } catch (err) {
          console.warn("[DoctorPatientChat] Error loading patients:", err);
        }
      }

      const list = Array.from(patsMap.values());
      setPatientsList(list);

      setLoadingPatients(false);
    }

    void loadPatients();
  }, [user?.id]);

  // Retrieve pending and accepted chat access requests
  const { pendingRequests, acceptedPatientIds } = useMemo(() => {
    const allReqs = getAllChatRequests();
    const docNameNorm = (profile?.full_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
    const docIdNorm = (user?.id || "").toLowerCase();

    const forThisDoctor = allReqs.filter((r) => {
      const rDocId = (r.doctor_id || "").toLowerCase();
      const rDocName = (r.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
      return rDocId === docIdNorm || (docNameNorm && rDocName && (rDocName.includes(docNameNorm) || docNameNorm.includes(rDocName)));
    });

    const pending = forThisDoctor.filter((r) => r.status === "pending");
    const acceptedIds = new Set(forThisDoctor.filter((r) => r.status === "accepted").map((r) => r.patient_id));
    const acceptedNames = new Set(forThisDoctor.filter((r) => r.status === "accepted").map((r) => (r.patient_name || "").toLowerCase()));

    return { pendingRequests: pending, acceptedPatientIds: acceptedIds, acceptedPatientNames: acceptedNames };
  }, [profile?.full_name, user?.id, requestTick]);

  // Filter roster strictly to ONLY linked, teleconsulted, or accepted patients
  const activeRoster = useMemo(() => {
    let result = patientsList.filter((p) => {
      if (p.isLinkedOrTeleconsult) return true;
      if (acceptedPatientIds.has(p.id)) return true;
      return false;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.condition && p.condition.toLowerCase().includes(q))
      );
    }

    return result;
  }, [patientsList, acceptedPatientIds, searchQuery]);

  // Set default selected patient if not set
  useEffect(() => {
    if (activeRoster.length > 0 && !selectedPatientId) {
      setSelectedPatientId(activeRoster[0].id);
    }
  }, [activeRoster, selectedPatientId]);

  const activePatient = useMemo(() => {
    const found = activeRoster.find((p) => p.id === selectedPatientId);
    return found || (activeRoster.length > 0 ? activeRoster[0] : null);
  }, [activeRoster, selectedPatientId]);

  const { messages, loading, sending, sendMessage } = useDoctorPatientChat(
    user?.id,
    selectedPatientId,
    profile?.full_name || "Dr. Medical Specialist",
    activePatient?.name
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleAcceptRequest = (req: ChatAccessRequest) => {
    updateChatAccessRequestStatus(req.id, "accepted");
    setRequestTick((t) => t + 1);

    // If patient not in patientsList yet, add them
    setPatientsList((prev) => {
      if (prev.some((p) => p.id === req.patient_id || p.name.toLowerCase() === (req.patient_name || "").toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: req.patient_id,
          name: req.patient_name || "Patient Record",
          age: 32,
          gender: "Patient",
          condition: "Chat Request Accepted",
          isLinkedOrTeleconsult: false,
        },
      ];
    });

    setSelectedPatientId(req.patient_id);
    toast.success(`Accepted chat request from ${req.patient_name || "Patient"}!`);
  };

  const handleDeclineRequest = (req: ChatAccessRequest) => {
    updateChatAccessRequestStatus(req.id, "declined");
    setRequestTick((t) => t + 1);
    toast.info(`Declined chat request from ${req.patient_name || "Patient"}.`);
  };

  const handleSend = async () => {
    if (!inputContent.trim() || sending) return;
    const text = inputContent.trim();
    setInputContent("");
    try {
      await sendMessage(text);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send clinical message.");
      setInputContent(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const sendClinicalChip = (text: string) => {
    setInputContent(text);
  };

  return (
    <div className="min-h-screen w-full bg-[#E5ECF9] font-poppins text-[#111111] p-3 sm:p-5 select-none overflow-x-hidden">
      <div className="max-w-[1650px] mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E36B0] text-white shadow-md shadow-[#3E36B0]/20">
              <MessageSquare className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope',sans-serif]">
                  Patient Messaging
                </h1>
                <span className="rounded-full border border-[#3E36B0]/30 bg-[#3E36B0]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#3E36B0] uppercase tracking-wider">
                  Clinical Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                Direct 2-way consultation chat with linked patients, teleconsultations, and accepted requests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/doctor/teleconsult")}
              className="h-9 px-4 rounded-xl bg-[#3E36B0] hover:bg-[#322a94] text-white font-bold text-xs shadow-md shadow-[#3E36B0]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="h-4 w-4" />
              <span>Launch Teleconsult</span>
            </Button>
          </div>
        </div>

        {/* Pending Chat Requests Banner if any exist */}
        {pendingRequests.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-['Manrope']">
                  {pendingRequests.length} Pending Patient Chat Request{pendingRequests.length > 1 ? "s" : ""}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  {pendingRequests[0].patient_name || "A patient"} has requested chat access to initiate direct clinical messaging.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-800 px-2">{req.patient_name}</span>
                  <button
                    onClick={() => handleAcceptRequest(req)}
                    className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req)}
                    className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-210px)] min-h-[580px]">
          {/* Left Column: Linked / Accepted Patient Roster Sidebar (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col rounded-[26px] bg-white border border-slate-200/80 shadow-sm overflow-hidden h-full">
            {/* Search Input */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-['Manrope']">
                  Linked Patients ({activeRoster.length})
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search linked patients…"
                  className="pl-10 h-9 rounded-xl border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#3E36B0]"
                />
              </div>
            </div>

            {/* Patients Roster List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 [scrollbar-width:none]">
              {loadingPatients ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                  <Activity className="h-5 w-5 animate-spin text-[#3E36B0]" />
                  <span>Loading patient roster…</span>
                </div>
              ) : activeRoster.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">No linked or accepted patients</p>
                  <p className="max-w-xs mx-auto text-slate-400">
                    Only patients linked via care relationships, teleconsultations, or accepted chat requests appear here.
                  </p>
                </div>
              ) : (
                activeRoster.map((pat) => {
                  const isSelected = pat.id === selectedPatientId;
                  const initials = pat.name
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <button
                      key={pat.id}
                      onClick={() => setSelectedPatientId(pat.id)}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-[#3E36B0] text-white shadow-md shadow-[#3E36B0]/20"
                          : "bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-100"
                      }`}
                    >
                      <div
                        className={`h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-white/20 text-white ring-2 ring-white/30"
                            : "bg-[#3E36B0]/10 text-[#3E36B0]"
                        }`}
                      >
                        {initials || "PT"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {pat.name}
                          </h4>
                          {pat.age && (
                            <span
                              className={`text-[10px] font-mono ${
                                isSelected ? "text-white/80" : "text-slate-400"
                              }`}
                            >
                              {pat.age}y
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {pat.condition || "Clinical Care"}
                        </p>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-white" : "text-slate-400"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Messages Stream & Composer (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col rounded-[26px] bg-white border border-slate-200/80 shadow-sm overflow-hidden h-full">
            {!activePatient ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-6 text-center space-y-2">
                <User className="h-10 w-10 text-slate-300" />
                <p className="font-semibold text-slate-600">No Patient Selected</p>
                <p className="text-slate-500 max-w-sm">
                  Select a linked or accepted patient from the left roster to view messages.
                </p>
              </div>
            ) : (
              <>
                {/* Active Patient Header */}
                <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#3E36B0]/10 text-[#3E36B0] flex items-center justify-center font-bold text-xs">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 font-['Manrope',sans-serif]">
                          {activePatient.name}
                        </h2>
                        <Badge className="bg-[#3E36B0]/10 text-[#3E36B0] border-[#3E36B0]/20 text-[10px] font-semibold px-2 py-0.5">
                          {activePatient.age ? `${activePatient.age}y` : "Patient"} • {activePatient.gender || "Active"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{activePatient.condition}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/doctor/patient/${activePatient.id}`)}
                      className="h-8 rounded-xl border-slate-200 hover:bg-[#3E36B0]/5 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5 text-[#3E36B0] mr-1" />
                      View Profile
                    </Button>
                  </div>
                </div>

                {/* Quick Clinical Response Presets */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 ml-1">
                    Clinical Presets:
                  </span>
                  <button
                    onClick={() => sendClinicalChip("Prescription updated. Please check your Prescription vault.")}
                    className="text-[11px] font-medium bg-white hover:bg-[#3E36B0]/10 text-[#3E36B0] px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                  >
                    💊 Prescription Updated
                  </button>
                  <button
                    onClick={() => sendClinicalChip("Please share your latest blood pressure and blood glucose vitals.")}
                    className="text-[11px] font-medium bg-white hover:bg-[#3E36B0]/10 text-[#3E36B0] px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                  >
                    📊 Request Latest Vitals
                  </button>
                  <button
                    onClick={() => sendClinicalChip("I have scheduled your follow-up consultation slot.")}
                    className="text-[11px] font-medium bg-white hover:bg-[#3E36B0]/10 text-[#3E36B0] px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                  >
                    📅 Schedule Follow-up
                  </button>
                </div>

                {/* Messages Feed Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F7FC]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                      <Activity className="h-5 w-5 animate-spin text-[#3E36B0]" />
                      <span>Syncing conversation history…</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-[#3E36B0]/10 text-[#3E36B0] flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 font-['Manrope']">Start Conversation</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                          Send a message to {activePatient.name} regarding clinical instructions, prescription updates, or follow-up status.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isDoctorSender = msg.sender_role === "doctor" || msg.sender_id === user?.id;
                      const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2.5 ${
                            isDoctorSender ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isDoctorSender && (
                            <div className="h-8 w-8 rounded-xl bg-slate-200 text-[#3E36B0] flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                              PT
                            </div>
                          )}

                          <div
                            className={`max-w-[78%] p-3.5 rounded-2xl text-xs sm:text-sm space-y-1.5 shadow-sm ${
                              isDoctorSender
                                ? "bg-[#3E36B0] text-white rounded-br-none"
                                : "bg-white border border-slate-200/80 text-slate-900 rounded-bl-none"
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] font-mono ${
                                isDoctorSender ? "text-white/80" : "text-slate-400"
                              }`}
                            >
                              <span>{formattedTime}</span>
                              {isDoctorSender && (
                                <CheckCheck className={`h-3 w-3 ${msg.is_read ? "text-sky-200" : "text-white/60"}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer Bar */}
                <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <textarea
                    rows={1}
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Reply to ${activePatient.name}… (Press Enter to send)`}
                    className="flex-1 resize-none bg-slate-50 border border-slate-200 focus:border-[#3E36B0] focus:bg-white focus:outline-none rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all max-h-24"
                  />

                  <Button
                    onClick={() => void handleSend()}
                    disabled={!inputContent.trim() || sending}
                    className="h-10 px-4 rounded-xl bg-[#3E36B0] hover:bg-[#322a94] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
