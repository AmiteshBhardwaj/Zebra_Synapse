import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FilePlus2,
  FileText,
  Mic,
  MicOff,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { usePatientLabReportExtractions } from "../../../hooks/usePatientLabReportExtractions";
import { getMetricAssessments } from "../../../lib/labInsights";
import {
  clearQueriesForReport,
  fetchPatientAllQueries,
  fetchQueriesForReport,
  generateLabReportAiAnswer,
  submitLabReportQuery,
  type LabReportQueryRow,
} from "../../../lib/labReportChat";
import { getSupabase } from "../../../lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ChatSessionSidebar } from "../../components/patient/ChatSessionSidebar";
import { toast } from "sonner";

/**
 * 3D-styled Cute Glowing Robot Mascot Component
 */
function RobotMascot() {
  return (
    <div className="relative flex flex-col items-center justify-center group select-none">
      {/* Soft Ambient Cyan Glow Aura */}
      <div className="absolute -inset-10 bg-cyan-500/25 rounded-full blur-3xl opacity-80 animate-pulse pointer-events-none" />

      {/* 3D Robot Container with Hover & Floating animation */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 transition-transform duration-500 hover:scale-105 hover:-translate-y-1">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_15px_35px_rgba(6,182,212,0.4)]"
        >
          <defs>
            {/* Robot Outer Case Gradient */}
            <linearGradient id="robotBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            {/* Bezel Gradient */}
            <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#083344" />
              <stop offset="100%" stopColor="#021f2d" />
            </linearGradient>
            {/* Screen Gradient */}
            <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="100%" stopColor="#021422" />
            </linearGradient>
            {/* Screen Inner Glow */}
            <radialGradient id="screenGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </radialGradient>
            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Antennas */}
          <line x1="75" y1="52" x2="60" y2="28" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="58" cy="25" r="7" fill="#67e8f9" filter="url(#neonGlow)" />

          <line x1="125" y1="52" x2="140" y2="28" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="142" cy="25" r="7" fill="#67e8f9" filter="url(#neonGlow)" />

          {/* Top Handle */}
          <path
            d="M 82 48 Q 100 32 118 48"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Outer TV Shell (Rounded Box) */}
          <rect
            x="36"
            y="48"
            width="128"
            height="106"
            rx="28"
            fill="url(#robotBody)"
            stroke="#67e8f9"
            strokeWidth="3"
          />

          {/* Side Screws & Details */}
          <circle cx="46" cy="62" r="3" fill="#a5f3fc" />
          <circle cx="154" cy="62" r="3" fill="#a5f3fc" />
          <circle cx="46" cy="140" r="3" fill="#a5f3fc" />
          <circle cx="154" cy="140" r="3" fill="#a5f3fc" />

          {/* Screen Inner Bezel */}
          <rect
            x="48"
            y="58"
            width="104"
            height="86"
            rx="18"
            fill="url(#bezelGrad)"
            stroke="#0e7490"
            strokeWidth="2"
          />

          {/* Digital CRT Monitor Screen */}
          <rect
            x="52"
            y="62"
            width="96"
            height="78"
            rx="14"
            fill="url(#screenGrad)"
          />
          <rect
            x="52"
            y="62"
            width="96"
            height="78"
            rx="14"
            fill="url(#screenGlow)"
          />

          {/* Screen Scanlines Overlay */}
          <line x1="56" y1="74" x2="144" y2="74" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.2" />
          <line x1="56" y1="88" x2="144" y2="88" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.2" />
          <line x1="56" y1="102" x2="144" y2="102" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.2" />
          <line x1="56" y1="116" x2="144" y2="116" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.2" />
          <line x1="56" y1="130" x2="144" y2="130" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.2" />

          {/* Expressive Glowing Eyes (Happy Arcs) */}
          <path
            d="M 68 88 Q 78 74 88 88"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="5.5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />
          <path
            d="M 112 88 Q 122 74 132 88"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="5.5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {/* Cute Rosy Cheek Accents */}
          <circle cx="66" cy="104" r="5" fill="#f43f5e" fillOpacity="0.75" filter="url(#neonGlow)" />
          <circle cx="134" cy="104" r="5" fill="#f43f5e" fillOpacity="0.75" filter="url(#neonGlow)" />

          {/* Cute Smiling Mouth */}
          <path
            d="M 88 108 Q 100 124 112 108"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {/* Little Bottom Stand Feet */}
          <rect x="68" y="154" width="18" height="14" rx="6" fill="#0891b2" stroke="#67e8f9" strokeWidth="2" />
          <rect x="114" y="154" width="18" height="14" rx="6" fill="#0891b2" stroke="#67e8f9" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

const QUICK_PROMPT_PILLS = [
  { emoji: "🤔", text: "What can you do?", query: "What can you help me with regarding my lab report and health?" },
  { emoji: "🧠", text: "Why am I weak & tired?", query: "I feel weak and tired, what does my lab report say about why?" },
  { emoji: "👋", text: "Why do I feel dizzy?", query: "Why do I feel dizzy or lightheaded based on my lab results?" },
  { emoji: "🩸", text: "Check blood sugar & HbA1c", query: "Are my fasting glucose and HbA1c in the safe normal range?" },
];

export default function PatientLabChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { uploads } = usePatientLabReports();
  const { panels } = usePatientLabPanels();
  const { extractions } = usePatientLabReportExtractions();

  // Query parameter support: ?reportId=...
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialReportId = queryParams.get("reportId");

  const [selectedReportId, setSelectedReportId] = useState<string>(initialReportId || "none");
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LabReportQueryRow[]>([]);
  const [allQueries, setAllQueries] = useState<LabReportQueryRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [connectedDoctor, setConnectedDoctor] = useState<{ id: string; name: string } | null>(null);

  // Retractable Sidebar State (persisted to localStorage, default closed/retracted)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("zebra_chat_sidebar_open");
    return saved !== null ? saved === "true" : false;
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Custom Session Titles Map (persisted to localStorage)
  const [sessionTitles, setSessionTitles] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("zebra_chat_session_titles");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("zebra_chat_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Save custom session titles to localStorage
  useEffect(() => {
    localStorage.setItem("zebra_chat_session_titles", JSON.stringify(sessionTitles));
  }, [sessionTitles]);

  // Automatically select first available report as background clinical context for new queries
  useEffect(() => {
    if (selectedReportId === "none" && uploads.length > 0) {
      if (initialReportId && uploads.some((u) => u.id === initialReportId)) {
        setSelectedReportId(initialReportId);
      } else {
        setSelectedReportId(uploads[0].id);
      }
    }
  }, [uploads, initialReportId, selectedReportId]);


  // Fetch connected doctor for the patient
  useEffect(() => {
    async function loadDoctor() {
      if (!user) return;
      const sb = getSupabase();
      if (!sb) return;

      const { data } = await sb
        .from("care_relationships")
        .select("doctor_id, doctor:profiles!care_relationships_doctor_id_fkey ( full_name )")
        .eq("patient_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data && data.doctor_id) {
        const docName = (data.doctor as any)?.full_name || "Assigned Physician";
        setConnectedDoctor({ id: data.doctor_id, name: docName });
      }
    }
    void loadDoctor();
  }, [user]);

  // Active Report Details
  const activeReport = useMemo(() => {
    return uploads.find((u) => u.id === selectedReportId) || null;
  }, [uploads, selectedReportId]);

  const activePanel = useMemo(() => {
    return panels.find((p) => p.upload_id === selectedReportId) || null;
  }, [panels, selectedReportId]);

  const activeExtraction = useMemo(() => {
    return extractions.find((e) => e.upload_id === selectedReportId) || null;
  }, [extractions, selectedReportId]);

  const activeMetrics = useMemo(() => {
    if (!activePanel) return [];
    return getMetricAssessments(activePanel);
  }, [activePanel]);

  // Load all queries across all reports for sidebar badges & previews
  const loadAllPatientQueries = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchPatientAllQueries(user.id);
      setAllQueries(rows);
    } catch (e) {
      console.error("Failed to load all patient queries", e);
    }
  }, [user]);

  useEffect(() => {
    void loadAllPatientQueries();
  }, [loadAllPatientQueries]);

  // Load chat messages for a specific report/session when explicitly selected from history
  const loadChatHistory = useCallback(async (reportId: string) => {
    if (!reportId || reportId === "none") {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const rows = await fetchQueriesForReport(reportId);
      setMessages(rows);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load chat queries for this report");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Keyboard shortcut (Ctrl+B or Cmd+B to toggle sidebar, Alt+N for new chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setIsMobileDrawerOpen((prev) => !prev);
        } else {
          setIsSidebarOpen((prev) => !prev);
        }
      } else if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputQuery]);

  // Toggle Sidebar
  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  // Select Report / Session from Sidebar (loads conversation history)
  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setLoadedSessionId(reportId);
    navigate(`/patient/ai-chat?reportId=${reportId}`, { replace: true });
    void loadChatHistory(reportId);
  };

  // Select Target Lab Report Context from top dropdown (switches context for new chat)
  const handleSelectReportContext = (reportId: string) => {
    setSelectedReportId(reportId);
    if (!loadedSessionId || messages.length === 0) {
      setLoadedSessionId(null);
      setMessages([]);
    } else {
      handleSelectReport(reportId);
    }
  };

  // Rename Session Custom Title
  const handleRenameSession = (reportId: string, newTitle: string) => {
    setSessionTitles((prev) => ({
      ...prev,
      [reportId]: newTitle,
    }));
    toast.success("Session renamed");
  };

  // Delete / Clear Session History
  const handleClearSessionHistory = async (reportId: string) => {
    try {
      await clearQueriesForReport(reportId);
      
      const remainingQueries = allQueries.filter((q) => q.upload_id !== reportId);
      setAllQueries(remainingQueries);

      // Clean up session custom title in localStorage
      setSessionTitles((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });

      // If the cleared report was currently active in view:
      if (loadedSessionId === reportId || (selectedReportId === reportId && messages.length > 0)) {
        setMessages([]);
        setLoadedSessionId(null);
        navigate("/patient/ai-chat", { replace: true });
      }

      toast.success("Conversation deleted");
    } catch (e: any) {
      console.error("[PatientLabChat] Failed to delete conversation:", e);
      toast.error(e?.message || "Failed to delete conversation");
    }
  };


  // Voice Recognition Handler (Dictation)
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... speak your question now");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Copy answer to clipboard
  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied clinical response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Query
  const handleSendMessage = async (queryTextToSubmit?: string) => {
    const query = (queryTextToSubmit || inputQuery).trim();
    if (!query) return;
    if (!user) {
      toast.error("You must be logged in as a patient");
      return;
    }
    if (!activeReport) {
      toast.error("Please select a lab report first");
      return;
    }

    setSending(true);
    setInputQuery("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // 1. Generate clinically grounded AI response
      const reportName = activeReport.original_filename || "Lab Report";
      const aiAnswer = await generateLabReportAiAnswer(query, {
        reportName,
        recordedAt: activePanel?.recorded_at,
        biomarkers: activeExtraction?.biomarkers_json || activePanel?.biomarkers || null,
        metrics: activeMetrics,
        rawSnippet: activeExtraction?.ocr_text || activeExtraction?.raw_text || null,
      });

      // 2. Persist to database with status: 'pending_review'
      const inserted = await submitLabReportQuery({
        uploadId: activeReport.id,
        patientId: user.id,
        doctorId: connectedDoctor?.id || null,
        userQuery: query,
        aiResponse: aiAnswer,
      });

      if (inserted) {
        setMessages((prev) => [...prev, inserted]);
        setLoadedSessionId(activeReport.id);
        setAllQueries((prev) => [inserted, ...prev]);
        toast.success("Response generated & queued for doctor review!");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to submit query");
    } finally {
      setSending(false);
    }
  };

  // Start a new chat (resets to fresh empty conversation state)
  const handleNewChat = () => {
    setMessages([]);
    setLoadedSessionId(null);
    setInputQuery("");
    navigate("/patient/ai-chat", { replace: true });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    toast.info("Started new chat session");
  };


  const hasMessages = messages.length > 0;
  const currentSessionDisplayName =
    sessionTitles[selectedReportId] || activeReport?.original_filename || "Select Lab Report";

  return (
    <div className="flex h-full w-full bg-[#07090e] text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/25 selection:text-cyan-200 relative">
      {/* Retractable Chat Session Sidebar */}
      <ChatSessionSidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        uploads={uploads}
        selectedReportId={selectedReportId}
        activeSessionId={loadedSessionId}
        onSelectReport={handleSelectReport}
        onNewChat={handleNewChat}
        onClearSessionHistory={handleClearSessionHistory}
        connectedDoctor={connectedDoctor}
        panels={panels}
        allQueries={allQueries}
        sessionTitles={sessionTitles}
        onRenameSession={handleRenameSession}
        isMobileDrawerOpen={isMobileDrawerOpen}
        setIsMobileDrawerOpen={setIsMobileDrawerOpen}
      />

      {/* Main Conversation Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#07090e]">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-slate-800/90 bg-[#0c101a] px-4 sm:px-6 lg:px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            {/* Retract / Expand Sidebar Toggle Button & Brand Header */}
            <button
              type="button"
              onClick={handleToggleSidebar}
              title={
                isSidebarOpen
                  ? "Collapse chat sessions (Ctrl+B)"
                  : "Open chat sessions (Ctrl+B)"
              }
              className="flex items-center gap-2.5 px-2.5 py-1.5 -ml-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-cyan-500/30 text-zinc-300 hover:text-white transition-all group active:scale-95 cursor-pointer shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                )}
              </div>
              <span className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5 select-none">
                Synapse Chat
              </span>
            </button>

            {/* Target Lab Document Picker Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-200 font-medium transition-all group outline-none max-w-[170px] sm:max-w-[260px]">
                <FileText className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">{currentSessionDisplayName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-80 bg-[#16171d] border border-white/10 text-slate-200 shadow-2xl rounded-2xl p-2 z-50">
                <DropdownMenuLabel className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1.5">
                  Target Lab Report
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10 my-1" />

                {uploads.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No lab reports uploaded yet.
                  </div>
                ) : (
                  uploads.map((u) => {
                    const isSelected = u.id === selectedReportId;
                    const customTitle = sessionTitles[u.id];
                    return (
                      <DropdownMenuItem
                        key={u.id}
                        onClick={() => handleSelectReportContext(u.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/15 text-cyan-300 font-medium"
                            : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <span className="truncate max-w-[220px]">
                          {customTitle || u.original_filename}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })
                )}

                <DropdownMenuSeparator className="bg-white/10 my-1" />
                <DropdownMenuItem
                  onClick={() => navigate("/patient/medical-records")}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-cyan-400 hover:bg-cyan-500/10 cursor-pointer font-medium"
                >
                  <FilePlus2 className="h-4 w-4" />
                  <span>Upload New Lab Report</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {activeMetrics.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 shrink-0">
                <Zap className="h-3 w-3 text-cyan-400" />
                {activeMetrics.length} Biomarkers
              </span>
            )}
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={handleNewChat}
              title="Start new chat (Alt+N)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 hover:text-white transition-all font-medium active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New chat</span>
            </button>

            <button
              onClick={() => {
                setMessages([]);
                setInputQuery("");
                toast.success("Chat cleared");
              }}
              title="Clear current view"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition-all active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear view</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-400" />
              <span>Doctor Verified</span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between relative px-4 sm:px-8 py-6 [scrollbar-width:thin]">
          {/* STATE A: Initial Empty Screen with Robot Mascot */}
          {!hasMessages && !loadingMessages && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full py-4 animate-in fade-in zoom-in-95 duration-300">
              {/* Mascot */}
              <div className="mb-6">
                <RobotMascot />
              </div>

              {/* Bold Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
                Your smart AI buddy
                <span className="block text-slate-200 font-semibold mt-1">
                  for all things digital & health
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm text-zinc-400 mb-8 max-w-md">
                Ask, analyze, explore — with Synapse
              </p>

              {/* Suggestion Interactive Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl">
                {QUICK_PROMPT_PILLS.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => void handleSendMessage(pill.query)}
                    disabled={sending}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#17181e] hover:bg-[#20222a] border border-white/10 hover:border-cyan-500/40 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="text-base">{pill.emoji}</span>
                    <span>{pill.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATE B: Active Conversation Stream */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
              {messages.map((item) => (
                <div key={item.id} className="space-y-4">
                  {/* User Message Bubble */}
                  <div className="flex justify-end items-start gap-3">
                    <div className="max-w-[85%] sm:max-w-xl bg-[#202228] border border-white/10 rounded-2xl rounded-tr-none px-4 py-3 text-slate-100 text-sm shadow-md">
                      <p className="whitespace-pre-wrap leading-relaxed">{item.user_query}</p>
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="flex justify-start items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-sm mt-1">
                      {item.status === "rejected_and_replaced" ? (
                        <Stethoscope className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Bot className="h-5 w-5 text-cyan-400" />
                      )}
                    </div>

                    <div className="max-w-[92%] sm:max-w-2xl w-full space-y-2.5">
                      {/* Status Pill Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.status === "pending_review" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                            <Clock className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                            Pending Doctor Verification
                          </span>
                        )}

                        {item.status === "verified" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Verified by{" "}
                            {item.reviewer_profile?.full_name
                              ? `Dr. ${item.reviewer_profile.full_name}`
                              : "Physician"}
                          </span>
                        )}

                        {item.status === "rejected_and_replaced" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                            <Stethoscope className="h-3.5 w-3.5 text-cyan-400" />
                            Doctor's Clinical Guidance
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-zinc-500 ml-auto">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Content Card */}
                      <div className="rounded-2xl bg-[#14151a] border border-white/10 p-4 sm:p-5 text-slate-200 text-sm leading-relaxed space-y-3 shadow-lg">
                        {item.status === "rejected_and_replaced" ? (
                          <div>
                            <div className="mb-2 pb-2 border-b border-white/10 flex items-center justify-between text-xs text-emerald-400 font-medium">
                              <span>
                                Clinical Guidance from{" "}
                                {item.reviewer_profile?.full_name
                                  ? `Dr. ${item.reviewer_profile.full_name}`
                                  : "Your Doctor"}
                                :
                              </span>
                              {item.reviewed_at && (
                                <span className="text-[10px] text-slate-500">
                                  {new Date(item.reviewed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="whitespace-pre-wrap text-slate-100 font-sans">
                              {item.doctor_response}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="whitespace-pre-wrap text-slate-100">
                              {item.ai_response}
                            </p>
                            {item.doctor_notes && (
                              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                                <strong>Doctor's Note:</strong> {item.doctor_notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions (Copy) */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5 text-xs text-zinc-400">
                          <button
                            onClick={() =>
                              handleCopy(
                                item.status === "rejected_and_replaced"
                                  ? item.doctor_response || ""
                                  : item.ai_response,
                                item.id
                              )
                            }
                            className="flex items-center gap-1 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Sending Skeleton */}
              {sending && (
                <div className="flex justify-start items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 animate-pulse">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="max-w-xl w-full bg-[#14151a] border border-cyan-500/30 rounded-2xl p-4 text-sm text-slate-300 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Analyzing relevant biomarkers for clinical precision...
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full w-3/4 animate-pulse" />
                    <div className="h-2.5 bg-white/10 rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}

          {/* Bottom Floating Input Bar */}
          <div className="w-full max-w-3xl mx-auto pt-2 shrink-0">
            <div className="rounded-2xl sm:rounded-3xl bg-[#121318] border border-white/10 hover:border-white/20 focus-within:border-cyan-500/40 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-2xl p-2 sm:p-2.5 flex items-center gap-2 transition-all">
              {/* Left 1: Document / Attachment Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Attach or select lab report"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors outline-none"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-[#18191f] border border-white/10 text-slate-200 shadow-2xl rounded-2xl p-2 z-50">
                  <DropdownMenuItem
                    onClick={() => navigate("/patient/medical-records")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
                  >
                    <FilePlus2 className="h-4 w-4 text-cyan-400" />
                    <span>Upload New Lab Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/patient/medical-records")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
                  >
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>View Biomarkers & Insights</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Left 2: Voice / Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Input Textarea */}
              <textarea
                ref={textareaRef}
                value={inputQuery}
                rows={1}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Type a thought or symptom... Synapse responds with clinical precision."
                disabled={sending || uploads.length === 0}
                className="bg-transparent border-0 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 text-xs sm:text-sm flex-1 px-2 py-1.5 resize-none max-h-36 min-h-[26px] leading-relaxed font-sans"
              />

              {/* Right Send Button (Glowing Turquoise/Teal) */}
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !inputQuery.trim() || uploads.length === 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00e5a3] hover:bg-[#00c98f] text-slate-950 shadow-[0_0_18px_rgba(0,229,163,0.35)] disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 hover:scale-105"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
