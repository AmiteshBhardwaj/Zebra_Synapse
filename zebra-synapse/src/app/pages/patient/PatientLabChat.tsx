import { FormattedMarkdown } from "../../components/ui/FormattedMarkdown";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FilePlus2,
  FileText,
  FlaskConical,
  Mic,
  MicOff,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Video,
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
  isMedicalClinicalQuery,
  submitLabReportQuery,
  type LabReportQueryRow,
} from "../../../lib/labReportChat";
import { assemblePatientPortalContext } from "../../../lib/patientPortalContext";
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
 * Extracts [ACTION:navigate:<path>:<label>] tags from raw markdown
 * and provides cleaned markdown text + structured actions.
 */
function extractActionTags(rawText: string): {
  cleanText: string;
  actions: Array<{ path: string; label: string }>;
} {
  const actions: Array<{ path: string; label: string }> = [];
  const actionRegex = /\[ACTION:navigate:([^:]+):([^\]]+)\]/g;

  let match;
  while ((match = actionRegex.exec(rawText)) !== null) {
    actions.push({ path: match[1].trim(), label: match[2].trim() });
  }

  const cleanText = rawText.replace(actionRegex, "").trim();
  return { cleanText, actions };
}

interface PromptCategory {
  id: string;
  categoryName: string;
  categoryIcon: any;
  accent: string;
  chips: Array<{ emoji: string; text: string; query: string }>;
}

const CATEGORIZED_PROMPT_PILLS: PromptCategory[] = [
  {
    id: "labs",
    categoryName: "Lab Insights",
    categoryIcon: Sparkles,
    accent: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80",
    chips: [
      {
        emoji: "🧠",
        text: "Why am I weak & tired?",
        query: "I feel weak and tired, what does my lab report say about why?",
      },
      {
        emoji: "🩸",
        text: "Check Blood Sugar & HbA1c",
        query: "Are my fasting glucose and HbA1c in the safe normal range?",
      },
    ],
  },
  {
    id: "meds",
    categoryName: "Prescriptions",
    categoryIcon: Pill,
    accent: "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/80",
    chips: [
      {
        emoji: "💊",
        text: "What medications am I taking?",
        query: "What active medications and prescriptions are on my file?",
      },
      {
        emoji: "⏰",
        text: "When do I take my doses?",
        query: "When should I take my daily doses and are there specific instructions?",
      },
    ],
  },
  {
    id: "appointments",
    categoryName: "Appointments",
    categoryIcon: Calendar,
    accent: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/80",
    chips: [
      {
        emoji: "📅",
        text: "When is my next appointment?",
        query: "When is my next scheduled doctor appointment and who is the physician?",
      },
      {
        emoji: "🏥",
        text: "How to book a specialist visit?",
        query: "How do I book a consultation with a specialist in the portal?",
      },
    ],
  },
  {
    id: "diet",
    categoryName: "Diet & Fitness",
    categoryIcon: UtensilsCrossed,
    accent: "bg-lime-50 text-lime-800 border-lime-200 hover:bg-lime-100/80",
    chips: [
      {
        emoji: "🥗",
        text: "Today's meal & workout plan",
        query: "What is my personalized meal plan and exercise routine for today?",
      },
      {
        emoji: "💧",
        text: "Water & macro targets",
        query: "What are my daily water, calorie, and protein intake targets?",
      },
    ],
  },
];

/**
 * 3D-styled Cute Glowing Robot Mascot Component
 */
function RobotMascot() {
  return (
    <div className="relative flex flex-col items-center justify-center group select-none">
      {/* Soft Ambient Cyan Glow Aura */}
      <div className="absolute -inset-6 bg-cyan-500/20 rounded-full blur-2xl opacity-75 animate-pulse pointer-events-none" />

      {/* 3D Robot Container with Hover & Floating animation */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 transition-transform duration-500 hover:scale-105 hover:-translate-y-0.5">
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
            <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" stopColor="#083344" />
              <stop offset="100%" stopColor="#021f2d" />
            </linearGradient>
            {/* Screen Gradient */}
            <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%">
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

export default function PatientLabChat() {
  const { user, profile } = useAuth();
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

    setSending(true);
    setInputQuery("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Assemble full real-time patient context across all tabs
      const portalData = assemblePatientPortalContext({
        profile,
        panels,
        activePanel,
        uploads,
        selectedReportId,
      });

      const isClinical = isMedicalClinicalQuery(query);
      const reportName = activeReport?.original_filename || "Active Health Profile";
      const uploadId = activeReport?.id || "omni-portal";

      // 1. Generate clinically grounded & omni-portal AI response
      const aiAnswer = await generateLabReportAiAnswer(query, {
        reportName,
        recordedAt: activePanel?.recorded_at,
        biomarkers: activeExtraction?.biomarkers_json || activePanel?.biomarkers || null,
        metrics: activeMetrics,
        rawSnippet: activeExtraction?.ocr_text || activeExtraction?.raw_text || null,
        dietaryPreference: profile?.dietary_preference,
        foodAllergies: profile?.food_allergies,
        dietaryConditions: profile?.dietary_conditions,
        dietaryNotes: profile?.dietary_notes,
        heightCm: profile?.height_cm,
        weightKg: profile?.weight_kg,
        portalData,
      });

      // 2. Persist to database with intelligent status
      const inserted = await submitLabReportQuery({
        uploadId,
        patientId: user.id,
        doctorId: connectedDoctor?.id || null,
        userQuery: query,
        aiResponse: aiAnswer,
        status: isClinical ? "pending_review" : "verified",
      });

      if (inserted) {
        setMessages((prev) => [...prev, inserted]);
        setLoadedSessionId(uploadId);
        setAllQueries((prev) => [inserted, ...prev]);
        if (isClinical) {
          toast.success("Clinical analysis generated & queued for doctor review!");
        } else {
          toast.success("Response generated & verified!");
        }
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
    <div className="flex h-full w-full bg-[#f6f8f5] text-slate-800 overflow-hidden font-sans selection:bg-lime-500/20 selection:text-lime-900 relative">
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#f6f8f5]">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-slate-100 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between z-20">
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
              className="flex items-center gap-2 px-2.5 py-1.5 -ml-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all group active:scale-95 cursor-pointer shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500/15 group-hover:bg-lime-500/25 text-lime-700 transition-all">
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4 text-lime-700 group-hover:scale-110 transition-transform" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-lime-700 group-hover:scale-110 transition-transform" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 select-none font-['Manrope']">
                Zebra Chat
              </span>
            </button>

            {/* Target Lab Document Picker Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 font-semibold transition-all group outline-none max-w-[170px] sm:max-w-[260px]">
                <FileText className="h-3.5 w-3.5 text-lime-600 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">{currentSessionDisplayName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-80 bg-white border border-slate-100 text-slate-800 shadow-xl rounded-2xl p-2 z-50">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1.5">
                  Target Lab Report
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 my-1" />

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
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer ${isSelected
                            ? "bg-lime-50 text-lime-950 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <span className="truncate max-w-[220px]">
                          {customTitle || u.original_filename}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-lime-600 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })
                )}

                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                <DropdownMenuItem
                  onClick={() => navigate("/patient/medical-records")}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-lime-700 hover:bg-lime-50 cursor-pointer font-bold"
                >
                  <FilePlus2 className="h-4 w-4" />
                  <span>Upload New Lab Report</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {activeMetrics.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-lime-800 bg-lime-50 border border-lime-200 shrink-0">
                <Zap className="h-3 w-3 text-lime-600" />
                {activeMetrics.length} Biomarkers
              </span>
            )}
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={handleNewChat}
              title="Start new chat (Alt+N)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition-all font-semibold active:scale-95"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-500 hover:text-slate-700 transition-all active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear view</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
              <span>Doctor Verified</span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between relative px-3 sm:px-6 py-2 sm:py-3 [scrollbar-width:thin]">
          {/* STATE A: Initial Empty Screen with Robot Mascot & Multi-Category Starter Chips */}
          {!hasMessages && !loadingMessages && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full py-4 sm:py-6 animate-in fade-in zoom-in-95 duration-300 my-auto">
              {/* Mascot */}
              <div className="mb-2 sm:mb-3">
                <RobotMascot />
              </div>

              {/* Bold Title */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-1 font-['Manrope']">
                Your smart AI health buddy
                <span className="block text-lime-700 font-semibold mt-0.5">
                  for all things digital, clinical & portal
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-[13px] text-slate-500 mb-5 max-w-lg">
                Ask about your lab reports, prescriptions, appointments, or wellness plan.
              </p>

              {/* Multi-Category Suggestion Chips Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full text-left max-w-2xl">
                {CATEGORIZED_PROMPT_PILLS.map((cat) => {
                  const CatIcon = cat.categoryIcon;
                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 sm:p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-slate-500">
                        <CatIcon className="h-3.5 w-3.5 text-lime-600 shrink-0" />
                        <span>{cat.categoryName}</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {cat.chips.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => void handleSendMessage(chip.query)}
                            disabled={sending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50/80 hover:bg-lime-50/70 border border-slate-100 hover:border-lime-300 text-[11px] font-medium text-slate-800 transition-all text-left group hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                          >
                            <span className="text-sm shrink-0">{chip.emoji}</span>
                            <span className="line-clamp-1 group-hover:text-lime-900">{chip.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE B: Active Conversation Stream */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto w-full space-y-5 pb-6">
              {messages.map((item) => {
                const rawContent =
                  item.status === "rejected_and_replaced"
                    ? item.doctor_response || ""
                    : item.ai_response;
                const { cleanText, actions } = extractActionTags(rawContent);

                return (
                  <div key={item.id} className="space-y-3">
                    {/* User Message Bubble */}
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[85%] sm:max-w-xl bg-lime-500 text-slate-950 rounded-2xl rounded-tr-none px-4 py-3 text-sm font-medium shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{item.user_query}</p>
                      </div>
                    </div>

                    {/* AI Response Card */}
                    <div className="flex justify-start items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 shadow-sm mt-1">
                        {item.status === "rejected_and_replaced" ? (
                          <Stethoscope className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Bot className="h-5 w-5 text-lime-700" />
                        )}
                      </div>

                      <div className="max-w-[92%] sm:max-w-2xl w-full space-y-2">
                        {/* Status Pill Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          {item.status === "pending_review" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                              Pending Doctor Verification
                            </span>
                          )}

                          {item.status === "verified" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {item.reviewed_by === "ai-verified"
                                ? "Synapse Assistant Verified"
                                : item.reviewer_profile?.full_name
                                ? `Verified by Dr. ${item.reviewer_profile.full_name}`
                                : "Doctor Verified"}
                            </span>
                          )}

                          {item.status === "rejected_and_replaced" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                              Doctor's Clinical Guidance
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 ml-auto">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Content Card */}
                        <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 text-slate-800 text-sm leading-relaxed space-y-3 shadow-sm">
                          {item.status === "rejected_and_replaced" ? (
                            <div>
                              <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold">
                                <span>
                                  Clinical Guidance from{" "}
                                  {item.reviewer_profile?.full_name
                                    ? `Dr. ${item.reviewer_profile.full_name}`
                                    : "Your Doctor"}
                                  :
                                </span>
                                {item.reviewed_at && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {new Date(item.reviewed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <FormattedMarkdown content={cleanText} />
                            </div>
                          ) : (
                            <div>
                              <FormattedMarkdown content={cleanText} />
                              {item.doctor_notes && (
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                                  <strong>Doctor's Note:</strong> {item.doctor_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deep-link Action Shortcut Buttons */}
                          {actions.length > 0 && (
                            <div className="pt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 mt-2">
                              {actions.map((act, i) => (
                                <button
                                  key={i}
                                  onClick={() => navigate(act.path)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                  <span>{act.label}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Actions (Copy) */}
                          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 text-xs text-slate-400">
                            <button
                              onClick={() => handleCopy(cleanText, item.id)}
                              className="flex items-center gap-1 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-semibold">Copied</span>
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
                );
              })}

              {/* Sending Skeleton */}
              {sending && (
                <div className="flex justify-start items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 animate-pulse">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="max-w-xl w-full bg-white border border-lime-200 rounded-2xl p-4 text-sm text-slate-700 space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-lime-700">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Analyzing relevant biomarkers for clinical precision...
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                    <div className="h-2 bg-slate-100 rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}

          {/* Bottom Floating Input Bar */}
          <div className="w-full max-w-3xl mx-auto pt-1 sm:pt-1.5 pb-0.5 shrink-0">
            <div className="rounded-[20px] sm:rounded-[24px] bg-white border border-slate-200 hover:border-slate-300 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-500/20 shadow-md p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 transition-all">
              {/* Left 1: Document / Attachment Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Attach or select lab report"
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors outline-none cursor-pointer"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white border border-slate-100 text-slate-800 shadow-xl rounded-2xl p-2 z-50">
                  <DropdownMenuItem
                    onClick={() => navigate("/patient/medical-records")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <FilePlus2 className="h-4 w-4 text-lime-600" />
                    <span>Upload New Lab Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/patient/medical-records")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>View Biomarkers & Insights</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Left 2: Voice / Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
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
                className="bg-transparent border-0 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-xs sm:text-sm flex-1 px-2 py-1.5 resize-none max-h-32 min-h-[24px] leading-relaxed font-sans"
              />

              {/* Right Send Button */}
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !inputQuery.trim() || uploads.length === 0}
                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 hover:scale-105 cursor-pointer"
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
