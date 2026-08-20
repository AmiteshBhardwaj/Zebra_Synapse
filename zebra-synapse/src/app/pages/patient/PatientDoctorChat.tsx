import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  Paperclip,
  Pill,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Video,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import { useDoctorPatientChat } from "../../../hooks/useDoctorPatientChat";
import {
  getAllChatRequests,
  getRequestStatus,
  sendChatAccessRequest,
} from "../../../lib/doctorPatientChat";
import {
  PatientPortalPage,
} from "../../components/patient/PortalTheme";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

export type RelationshipType = "linked" | "teleconsult" | "unlinked";

export interface DoctorMeta {
  id: string;
  name: string;
  specialty: string;
  relationshipType: RelationshipType;
}

// Full seed roster of registered database doctors
const SEED_DOCTORS: DoctorMeta[] = [
  { id: "doc_amelia_hart", name: "Dr. Amelia Hart", specialty: "Cardiology & Internal Medicine", relationshipType: "linked" },
  { id: "doc_benjamin_ortiz", name: "Dr. Benjamin Ortiz", specialty: "Endocrinology & Metabolic Health", relationshipType: "teleconsult" },
  { id: "doc_chloe_menon", name: "Dr. Chloe Menon", specialty: "Gastroenterology & Hepatology", relationshipType: "teleconsult" },
  { id: "doc_daniel_kim", name: "Dr. Daniel Kim", specialty: "Pulmonology & Respiratory Medicine", relationshipType: "unlinked" },
  { id: "doc_evelyn_brooks", name: "Dr. Evelyn Brooks", specialty: "Nephrology & Renal Care", relationshipType: "unlinked" },
  { id: "doc_farah_siddiqui", name: "Dr. Farah Siddiqui", specialty: "Neurology & Neuro-Endocrine", relationshipType: "unlinked" },
  { id: "doc_gabriel_chen", name: "Dr. Gabriel Chen", specialty: "Hematology & Immune Resiliency", relationshipType: "unlinked" },
  { id: "doc_hannah_patel", name: "Dr. Hannah Patel", specialty: "Preventive Medicine & Health Optimization", relationshipType: "unlinked" },
  { id: "doc_isaac_romero", name: "Dr. Isaac Romero", specialty: "Clinical Nutrition & Dietary Medicine", relationshipType: "unlinked" },
  { id: "doc_julia_nguyen", name: "Dr. Julia Nguyen", specialty: "General Practice & Telehealth", relationshipType: "unlinked" },
];

interface PatientDoctorChatProps {
  embedded?: boolean;
}

export default function PatientDoctorChat({ embedded = false }: PatientDoctorChatProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [doctorsList, setDoctorsList] = useState<DoctorMeta[]>(SEED_DOCTORS);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my_doctors" | "discover">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [requestTick, setRequestTick] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse target doctor ID from URL search params (e.g., /patient/messages?doctorId=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetDocId = params.get("doctorId");
    if (targetDocId) {
      setSelectedDoctorId(targetDocId);
    }
  }, [location.search]);

  // Load real registered doctors from Supabase + Seed doctors fallback
  useEffect(() => {
    async function loadDoctors(isInitial = false) {
      if (isInitial) setLoadingDoctors(true);
      const docsMap = new Map<string, DoctorMeta>();

      SEED_DOCTORS.forEach((d) => docsMap.set(d.id, d));

      const linkedDocIds = new Set<string>();
      const messageDocIds = new Set<string>();

      const sb = getSupabase();
      if (sb && user?.id) {
        try {
          const { data: rels } = await sb
            .from("care_relationships")
            .select("doctor_id")
            .eq("patient_id", user.id);

          (rels || []).forEach((r) => {
            if (r.doctor_id) linkedDocIds.add(r.doctor_id);
          });

          const { data: msgRows } = await sb
            .from("doctor_patient_messages")
            .select("doctor_id")
            .eq("patient_id", user.id);

          (msgRows || []).forEach((m) => {
            if (m.doctor_id) messageDocIds.add(m.doctor_id);
          });

          const { data: doctorProfiles } = await sb
            .from("profiles")
            .select("id, full_name, role, license_number")
            .eq("role", "doctor");

          if (doctorProfiles && doctorProfiles.length > 0) {
            doctorProfiles.forEach((p) => {
              let relType: RelationshipType = "unlinked";
              if (linkedDocIds.has(p.id)) {
                relType = "linked";
              } else if (messageDocIds.has(p.id)) {
                relType = "teleconsult";
              }

              docsMap.set(p.id, {
                id: p.id,
                name: p.full_name || "Dr. Clinical Specialist",
                specialty: p.license_number ? `Specialist (${p.license_number})` : "Clinical Specialist",
                relationshipType: relType,
              });
            });
          }
        } catch (err) {
          console.warn("[PatientDoctorChat] Error querying doctors:", err);
        }
      }

      const list = Array.from(docsMap.values());
      setDoctorsList(list);

      if (list.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(list[0].id);
      }
      setLoadingDoctors(false);
    }

    void loadDoctors(doctorsList.length === 0);

    // Listen to live cross-tab/multi-device sync events
    const handleSync = () => {
      setRequestTick((t) => t + 1);
      void loadDoctors(false);
    };
    window.addEventListener("zebra_doctor_patient_sync", handleSync);
    window.addEventListener("storage", handleSync);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("zebra_doctor_patient_chat");
        bc.onmessage = () => handleSync();
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("zebra_doctor_patient_sync", handleSync);
      window.removeEventListener("storage", handleSync);
      if (bc) bc.close();
    };
  }, [user?.id]);

  const filteredDoctors = useMemo(() => {
    let result = doctorsList;

    if (activeTab === "my_doctors") {
      result = result.filter((d) => {
        const reqStatus = getRequestStatus(d.id, user?.id || "patient", d.name, profile?.full_name);
        return d.relationshipType === "linked" || d.relationshipType === "teleconsult" || reqStatus === "accepted" || reqStatus === "pending";
      });
    } else if (activeTab === "discover") {
      result = result.filter((d) => {
        const reqStatus = getRequestStatus(d.id, user?.id || "patient", d.name, profile?.full_name);
        return d.relationshipType === "unlinked" && reqStatus === "none";
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
      );
    }

    return result;
  }, [doctorsList, activeTab, searchQuery, user?.id, profile?.full_name, requestTick]);

  const activeDoctor = useMemo(() => {
    const found = doctorsList.find((d) => d.id === selectedDoctorId);
    return found || (doctorsList.length > 0 ? doctorsList[0] : SEED_DOCTORS[0]);
  }, [doctorsList, selectedDoctorId]);

  const currentReqStatus = useMemo(() => {
    if (!activeDoctor) return "none";
    return getRequestStatus(
      activeDoctor.id,
      user?.id || "patient",
      activeDoctor.name,
      profile?.full_name
    );
  }, [activeDoctor, user?.id, profile?.full_name, requestTick]);

  const { messages, loading, sending, sendMessage, deleteConversation } = useDoctorPatientChat(
    selectedDoctorId,
    user?.id,
    activeDoctor?.name,
    profile?.full_name || "Patient"
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConversation = async () => {
    if (!activeDoctor) return;
    setDeleting(true);
    try {
      await deleteConversation();
      toast.success(`Deleted chat conversation with ${activeDoctor.name}`);
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete chat conversation");
    } finally {
      setDeleting(false);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (overrideContent?: string) => {
    const textToSend = (overrideContent || inputContent).trim();
    if (!textToSend || sending) return;

    if (!overrideContent) setInputContent("");

    try {
      await sendMessage(textToSend);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
      if (!overrideContent) setInputContent(textToSend);
    }
  };

  const handleRequestChatAccess = async () => {
    if (!activeDoctor) return;
    sendChatAccessRequest(
      activeDoctor.id,
      user?.id || "patient",
      activeDoctor.name,
      profile?.full_name || "Patient User"
    );
    setRequestTick((t) => t + 1);
    toast.success(`Chat request sent to ${activeDoctor.name}! Awaiting doctor acceptance.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const sendQuickChip = (text: string) => {
    setInputContent(text);
  };

  // Chat is unlocked if Doctor is linked, has teleconsult history, or request is accepted!
  const isChatUnlocked =
    Boolean(activeDoctor) &&
    (activeDoctor?.relationshipType === "linked" ||
      activeDoctor?.relationshipType === "teleconsult" ||
      currentReqStatus === "accepted" ||
      messages.length > 0);

  const bodyContent = (
    <div className="w-full">
      {/* Executive Header Bar matching Teleconsult Hub Theme (Omitted if embedded) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8e8] text-[#4d8629] border border-[#d2ecb8] shadow-sm">
            <MessageSquare className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Doctor Chat Hub
              </h1>
              <span className="rounded-full border border-[#d2ecb8] bg-[#eef8e8] px-2.5 py-0.5 text-[10px] font-bold text-[#4d8629] uppercase tracking-wider">
                Direct Messaging
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              Message your linked care physicians, teleconsultation specialists, or request chat access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/patient/teleconsult")}
            className="h-10 px-5 rounded-2xl bg-[#84cc16] hover:bg-[#73b512] text-white font-bold text-xs shadow-sm hover:shadow-md hover:shadow-lime-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Video className="h-4 w-4" />
            <span>Join Teleconsult</span>
          </Button>
        </div>
      </div>
    )}

      {/* Main Chat Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-210px)] min-h-[560px]">
        {/* Left Column: Doctor Selection Sidebar (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-[26px] bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden h-full">
          {/* Roster Header & Search */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-['Manrope']">
                Doctors Roster ({filteredDoctors.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor or specialty…"
                className="pl-9 h-8 rounded-xl border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus-visible:border-lime-500 focus-visible:ring-lime-500/20"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("my_doctors")}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  activeTab === "my_doctors"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Doctors
              </button>
              <button
                onClick={() => setActiveTab("discover")}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  activeTab === "discover"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          {/* Doctor Roster List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:none]">
            {loadingDoctors ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                <Activity className="h-5 w-5 animate-spin text-[#84cc16]" />
                <span>Loading clinical doctors roster…</span>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600">No doctors match your filter</p>
                <p>Try searching another keyword or switching tabs.</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => {
                const isSelected = doc.id === selectedDoctorId;
                const initials = doc.name
                  .replace(/^(Dr\.|Prof\.)\s*/i, "")
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isLinked = doc.relationshipType === "linked";
                const isTeleconsult = doc.relationshipType === "teleconsult";
                const reqStatus = getRequestStatus(doc.id, user?.id || "patient", doc.name, profile?.full_name);

                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoctorId(doc.id)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-[#84cc16] text-white shadow-md shadow-lime-500/20"
                        : "bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-100"
                    }`}
                  >
                    <div
                      className={`h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? "bg-white/20 text-white ring-2 ring-white/40"
                          : "bg-[#eef8e8] text-[#4d8629] border border-[#d2ecb8]"
                      }`}
                    >
                      {initials || "DR"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {doc.name}
                        </h4>
                      </div>

                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? "text-lime-100 font-medium" : "text-slate-500"
                        }`}
                      >
                        {doc.specialty}
                      </p>

                      {/* Relationship Status Pill */}
                      <div className="mt-1.5 flex items-center gap-1">
                        {isLinked && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/25 text-white"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            Linked Physician
                          </span>
                        )}
                        {isTeleconsult && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/25 text-white"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            Teleconsult History
                          </span>
                        )}
                        {!isLinked && !isTeleconsult && reqStatus === "pending" && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/25 text-white"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            Request Pending
                          </span>
                        )}
                        {!isLinked && !isTeleconsult && reqStatus === "accepted" && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/25 text-white"
                                : "bg-lime-100 text-lime-800 border border-lime-200"
                            }`}
                          >
                            Accepted
                          </span>
                        )}
                        {!isLinked && !isTeleconsult && reqStatus === "none" && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/25 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            Request Chat Option
                          </span>
                        )}
                      </div>
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

        {/* Right Column: Chat Stream & Request Access Panel (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-[26px] bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden h-full">
          {!activeDoctor ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs p-6 text-center">
              <Stethoscope className="h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No Doctor Selected</p>
              <p>Select a doctor from the roster to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Active Doctor Header */}
              <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#eef8e8] text-[#4d8629] border border-[#d2ecb8] flex items-center justify-center font-bold text-xs shadow-sm">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 font-['Manrope']">
                        {activeDoctor.name}
                      </h2>

                      {activeDoctor.relationshipType === "linked" && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold py-0 px-2">
                          Linked Physician
                        </Badge>
                      )}
                      {activeDoctor.relationshipType === "teleconsult" && (
                        <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold py-0 px-2">
                          Teleconsult History
                        </Badge>
                      )}
                      {currentReqStatus === "pending" && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold py-0 px-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Request Pending Acceptance
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{activeDoctor.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/patient/appointments?doctor=${encodeURIComponent(activeDoctor.name)}`)
                    }
                    className="h-8 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#84cc16] mr-1" />
                    Book Appt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-8 rounded-xl border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                    title="Delete Selected Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Delete Chat</span>
                  </Button>
                </div>
              </div>

              {/* If Chat is Not Unlocked, show Request or Pending Acceptance Card */}
              {!isChatUnlocked ? (
                currentReqStatus === "pending" ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f6f8f5] space-y-4">
                    <div className="h-16 w-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm">
                      <Clock className="h-8 w-8 stroke-[1.8] animate-pulse" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Manrope']">
                        Chat Access Request Pending
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Your request to chat with {activeDoctor.name} has been sent. Messaging will be unlocked once {activeDoctor.name} accepts your request.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                      Awaiting Doctor Approval
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f6f8f5] space-y-4">
                    <div className="h-16 w-16 rounded-3xl bg-[#eef8e8] border border-[#d2ecb8] text-[#4d8629] flex items-center justify-center shadow-sm">
                      <UserPlus className="h-8 w-8 stroke-[1.8]" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Manrope']">
                        Request Chat Access with {activeDoctor.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        You have not conducted a teleconsultation or linked with {activeDoctor.name} yet. Send a chat request to enable direct 2-way clinical messaging.
                      </p>
                    </div>

                    <Button
                      onClick={() => void handleRequestChatAccess()}
                      disabled={sending}
                      className="h-11 px-6 rounded-2xl bg-[#84cc16] hover:bg-[#73b512] text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Send Chat Request</span>
                    </Button>
                  </div>
                )
              ) : (
                <>
                  {/* Quick Response Suggestion Chips */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ml-1">
                      Quick Prompts:
                    </span>
                    <button
                      onClick={() => sendQuickChip("Sharing my latest lab report results for your review.")}
                      className="text-[11px] font-medium bg-white hover:bg-lime-50 text-slate-700 hover:text-lime-800 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                    >
                      📄 Share Lab Report
                    </button>
                    <button
                      onClick={() => sendQuickChip("I have a question about my current prescription dosage.")}
                      className="text-[11px] font-medium bg-white hover:bg-lime-50 text-slate-700 hover:text-lime-800 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                    >
                      💊 Prescription Query
                    </button>
                    <button
                      onClick={() => sendQuickChip("Requesting a teleconsultation follow-up slot.")}
                      className="text-[11px] font-medium bg-white hover:bg-lime-50 text-slate-700 hover:text-lime-800 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                    >
                      📅 Request Follow-up
                    </button>
                  </div>

                  {/* Messages Feed Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f6f8f5]">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                        <Activity className="h-5 w-5 animate-spin text-[#84cc16]" />
                        <span>Loading secure clinical messages…</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-[#eef8e8] text-[#4d8629] flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 font-['Manrope']">Start Conversation</h4>
                          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                            Send a message to {activeDoctor.name} regarding medical questions, prescription advice, or health follow-ups.
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isPatientSender = msg.sender_role === "patient" || msg.sender_id === user?.id;
                        const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2.5 ${
                              isPatientSender ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!isPatientSender && (
                              <div className="h-8 w-8 rounded-xl bg-[#eef8e8] border border-[#d2ecb8] text-[#4d8629] flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                                DR
                              </div>
                            )}

                            <div
                              className={`max-w-[78%] p-3.5 rounded-2xl text-xs sm:text-sm space-y-1.5 shadow-sm ${
                                isPatientSender
                                  ? "bg-[#84cc16] text-white rounded-br-none"
                                  : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                              }`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                              <div
                                className={`flex items-center justify-end gap-1 text-[10px] font-mono ${
                                  isPatientSender ? "text-lime-100" : "text-slate-400"
                                }`}
                              >
                                <span>{formattedTime}</span>
                                {isPatientSender && (
                                  <CheckCheck className={`h-3 w-3 ${msg.is_read ? "text-lime-200" : "text-white/60"}`} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Composer Input Bar */}
                  <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                    <textarea
                      rows={1}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeDoctor.name}… (Press Enter to send)`}
                      className="flex-1 resize-none bg-slate-50 border border-slate-200 focus:border-[#84cc16] focus:bg-white focus:outline-none rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all max-h-24"
                    />

                    <Button
                      onClick={() => void handleSend()}
                      disabled={!inputContent.trim() || sending}
                      className="h-10 px-4 rounded-xl bg-[#84cc16] hover:bg-[#73b512] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && activeDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Manrope']">Delete Chat Conversation?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will permanently remove all messages with <span className="font-semibold text-slate-800">{activeDoctor.name}</span>.
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200/80 leading-relaxed font-medium">
              ⚠️ Warning: This action cannot be undone. Message history will be cleared across all devices and database records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="h-9 px-4 rounded-xl text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleDeleteConversation()}
                disabled={deleting}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-md shadow-rose-600/20"
              >
                {deleting ? "Deleting…" : "Yes, Delete Chat"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return <PatientPortalPage>{bodyContent}</PatientPortalPage>;
}
