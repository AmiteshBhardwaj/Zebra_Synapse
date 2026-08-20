import { FormattedMarkdown } from "../../components/ui/FormattedMarkdown";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Apple,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Mic,
  MicOff,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  Sparkles,
  Stethoscope,
  Utensils,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import {
  createDietSession,
  deleteDietSession,
  fetchDietSessionMessages,
  fetchDietSessions,
  generateDietitianAiAnswer,
  renameDietSession,
  saveDietMessage,
  type DietChatMessage,
  type DietChatSession,
} from "../../../lib/dietChat";
import { DietChatSessionSidebar } from "../../components/patient/DietChatSessionSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from "sonner";

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
            <linearGradient id="dietRobotBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            {/* Bezel Gradient */}
            <linearGradient id="dietBezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#083344" />
              <stop offset="100%" stopColor="#021f2d" />
            </linearGradient>
            {/* Screen Gradient */}
            <linearGradient id="dietScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="100%" stopColor="#021422" />
            </linearGradient>
            {/* Screen Inner Glow */}
            <radialGradient id="dietScreenGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </radialGradient>
            {/* Glow Filter */}
            <filter id="dietNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Antennas */}
          <line x1="75" y1="52" x2="60" y2="28" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="58" cy="25" r="7" fill="#67e8f9" filter="url(#dietNeonGlow)" />

          <line x1="125" y1="52" x2="140" y2="28" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="142" cy="25" r="7" fill="#67e8f9" filter="url(#dietNeonGlow)" />

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
            fill="url(#dietRobotBody)"
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
            fill="url(#dietBezelGrad)"
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
            fill="url(#dietScreenGrad)"
          />
          <rect
            x="52"
            y="62"
            width="96"
            height="78"
            rx="14"
            fill="url(#dietScreenGlow)"
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
            filter="url(#dietNeonGlow)"
          />
          <path
            d="M 112 88 Q 122 74 132 88"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="5.5"
            strokeLinecap="round"
            filter="url(#dietNeonGlow)"
          />

          {/* Cute Rosy Cheek Accents */}
          <circle cx="66" cy="104" r="5" fill="#f43f5e" fillOpacity="0.75" filter="url(#dietNeonGlow)" />
          <circle cx="134" cy="104" r="5" fill="#f43f5e" fillOpacity="0.75" filter="url(#dietNeonGlow)" />

          {/* Cute Smiling Mouth */}
          <path
            d="M 88 108 Q 100 124 112 108"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#dietNeonGlow)"
          />

          {/* Little Bottom Stand Feet */}
          <rect x="68" y="154" width="18" height="14" rx="6" fill="#0891b2" stroke="#67e8f9" strokeWidth="2" />
          <rect x="114" y="154" width="18" height="14" rx="6" fill="#0891b2" stroke="#67e8f9" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

const DIET_QUICK_PROMPT_PILLS = [
  {
    emoji: "🤔",
    text: "What can you do?",
    query: "What can you help me with regarding my diet, meal plans, macro targets, and healthy recipes?",
  },
  {
    emoji: "🥑",
    text: "High-protein dinner ideas",
    query: "Can you suggest some delicious, high-protein dinner recipes with macro estimates?",
  },
  {
    emoji: "🥗",
    text: "Foods to reduce inflammation",
    query: "What foods and ingredients are scientifically proven to help reduce inflammation?",
  },
  {
    emoji: "🍎",
    text: "7-day low-glycemic plan",
    query: "Can you create a balanced 7-day diabetes-friendly, low-glycemic meal plan for me?",
  },
  {
    emoji: "⚡",
    text: "Healthy snacks under 200 kcal",
    query: "What are the best healthy, high-satiety post-workout snacks under 200 calories?",
  },
  {
    emoji: "💧",
    text: "Calculate hydration & water",
    query: "How much water and electrolytes should I drink daily for optimal cellular hydration?",
  },
];

type PatientDietChatProps = {
  embedded?: boolean;
  initialPrompt?: string;
};

export default function PatientDietChat({ embedded = false, initialPrompt = "" }: PatientDietChatProps) {
  const { user, profile } = useAuth();
  const patientId = user?.id || "guest";

  const [sessions, setSessions] = useState<DietChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DietChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>(initialPrompt);
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    if (initialPrompt) {
      setInputQuery(initialPrompt);
    }
  }, [initialPrompt]);

  // Retractable Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("zebra_diet_chat_sidebar_open");
    return saved !== null ? saved === "true" : true;
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem("zebra_diet_chat_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    const list = await fetchDietSessions(patientId);
    setSessions(list);
    return list;
  }, [patientId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // Load messages when activeSessionId changes
  useEffect(() => {
    async function loadActiveMessages() {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      try {
        const msgs = await fetchDietSessionMessages(activeSessionId);
        setMessages(msgs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMessages(false);
      }
    }
    void loadActiveMessages();
  }, [activeSessionId]);

  // Keyboard shortcut (Ctrl+B for sidebar toggle, Alt+N for new chat)
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

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInputQuery("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    toast.info("Started new diet chat session");
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    await renameDietSession(sessionId, patientId, newTitle);
    await loadSessions();
    toast.success("Session renamed");
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteDietSession(sessionId, patientId);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await loadSessions();
    toast.success("Conversation deleted");
  };

  // Voice Recognition Handler (Dictation)
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        toast.info("Listening... speak your diet question now");
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
    toast.success("Copied nutritionist response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Query
  const handleSendMessage = async (queryTextToSubmit?: string) => {
    const query = (queryTextToSubmit || inputQuery).trim();
    if (!query) return;

    setSending(true);
    setInputQuery("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const newSession = await createDietSession(patientId, query.substring(0, 32));
        currentSessionId = newSession.id;
        setActiveSessionId(currentSessionId);
      }

      // 1. Optimistically save & show User Message
      const userMsg = await saveDietMessage(currentSessionId, patientId, {
        sender: "user",
        text: query,
      });
      setMessages((prev) => [...prev, userMsg]);

      // 2. Generate personalized AI answer (without requiring lab reports!)
      const aiText = await generateDietitianAiAnswer(query, {
        patientName: profile?.full_name || "Friend",
        heightCm: profile?.height_cm,
        weightKg: profile?.weight_kg,
        dietaryPreference: profile?.dietary_preference,
        foodAllergies: profile?.food_allergies,
        dietaryConditions: profile?.dietary_conditions,
        dietaryNotes: profile?.dietary_notes,
      });

      // 3. Save AI Message
      const aiMsg = await saveDietMessage(currentSessionId, patientId, {
        sender: "ai",
        text: aiText,
        status: "verified",
      });

      setMessages((prev) => [...prev, aiMsg]);
      await loadSessions();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate response");
    } finally {
      setSending(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className={`flex w-full bg-[#f6f8f5] text-slate-800 overflow-hidden font-sans selection:bg-lime-500/20 selection:text-lime-900 relative ${
        embedded ? "h-[calc(100vh-10rem)] min-h-[480px] max-h-[700px] rounded-[28px] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]" : "h-full"
      }`}
    >
      {/* Retractable Chat Session Sidebar */}
      <DietChatSessionSidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isMobileDrawerOpen={isMobileDrawerOpen}
        setIsMobileDrawerOpen={setIsMobileDrawerOpen}
      />

      {/* Main Conversation Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#f6f8f5]">
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-slate-100 bg-white px-4 sm:px-6 flex items-center justify-between z-20">
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
              className="flex items-center gap-2 px-2.5 py-1.5 -ml-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all group active:scale-95 cursor-pointer shadow-xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500/15 group-hover:bg-lime-500/25 text-lime-700 transition-all">
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4 text-lime-700 group-hover:scale-110 transition-transform" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-lime-700 group-hover:scale-110 transition-transform" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 select-none font-['Manrope']">
                Synapse Dietitian
              </span>
            </button>

            {/* Nutrition Focus Pill */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-lime-800 bg-lime-50 border border-lime-200 shrink-0">
              <Apple className="h-3 w-3 text-lime-600" />
              Evidence-Based Nutrition
            </span>
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={handleNewChat}
              title="Start new chat (Alt+N)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition-all font-semibold active:scale-95 cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-500 hover:text-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear view</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
              <span>Dietitian Verified</span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between relative px-3 sm:px-6 py-2 sm:py-3 [scrollbar-width:thin]">
          {/* STATE A: Initial Empty Screen with Robot Mascot */}
          {!hasMessages && !loadingMessages && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full py-1 sm:py-2 animate-in fade-in zoom-in-95 duration-300 my-auto">
              {/* Mascot */}
              <div className="mb-2 sm:mb-2.5">
                <RobotMascot />
              </div>

              {/* Bold Title */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-1 font-['Manrope']">
                Your smart AI dietitian
                <span className="block text-lime-700 font-semibold mt-0.5">
                  for personalized nutrition & meal plans
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-[13px] text-slate-500 mb-3 sm:mb-4 max-w-md">
                Ask, plan, nourish — with Synapse
              </p>

              {/* Suggestion Interactive Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-2xl">
                {DIET_QUICK_PROMPT_PILLS.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => void handleSendMessage(pill.query)}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-lime-50/60 border border-slate-200/80 hover:border-lime-300 text-[11px] sm:text-xs font-semibold text-slate-800 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{pill.emoji}</span>
                    <span>{pill.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATE B: Active Conversation Stream */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto w-full space-y-5 pb-6">
              {messages.map((item) => (
                <div key={item.id} className="space-y-3">
                  {item.sender === "user" ? (
                    /* User Message Bubble */
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[85%] sm:max-w-xl bg-lime-500 text-slate-950 rounded-2xl rounded-tr-none px-4 py-3 text-sm font-medium shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ) : (
                    /* AI Dietitian Response Card */
                    <div className="flex justify-start items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 shadow-sm mt-1">
                        <Bot className="h-5 w-5 text-lime-700" />
                      </div>

                      <div className="max-w-[92%] sm:max-w-2xl w-full space-y-2">
                        {/* Status Pill Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Clinical Nutrition Guidance
                          </span>

                          <span className="text-[11px] text-slate-400 ml-auto">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Content Card */}
                        <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 text-slate-800 text-sm leading-relaxed space-y-3 shadow-sm">
                            <FormattedMarkdown content={item.text} />

                          {/* Actions (Copy) */}
                          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 text-xs text-slate-400">
                            <button
                              onClick={() => handleCopy(item.text, item.id)}
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
                  )}
                </div>
              ))}

              {/* Sending Skeleton */}
              {sending && (
                <div className="flex justify-start items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 animate-pulse">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="max-w-xl w-full bg-white border border-lime-200 rounded-2xl p-4 text-sm text-slate-700 space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-lime-700">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Formulating personalized meal recommendations & macros...
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
              {/* Left 1: Quick Actions / Attachment Tool Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Nutrition tools & profile presets"
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors outline-none cursor-pointer"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white border border-slate-100 text-slate-800 shadow-xl rounded-2xl p-2 z-50">
                  <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Quick Nutrition Tools
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  <DropdownMenuItem
                    onClick={() =>
                      void handleSendMessage(
                        "Calculate my exact BMR, TDEE, and daily macronutrient split for my target weight."
                      )
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <Scale className="h-4 w-4 text-lime-600" />
                    <span>Calculate My Macro Split</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      void handleSendMessage(
                        "Suggest a complete 1-day meal plan (breakfast, lunch, dinner, snack) tailored to my diet preference."
                      )
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <Utensils className="h-4 w-4 text-amber-500" />
                    <span>Generate 1-Day Meal Plan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      void handleSendMessage(
                        "What healthy ingredient swaps can I use to cut out excess sodium and refined sugars?"
                      )
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span>Sodium & Sugar Swaps</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Left 2: Voice / Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  isListening
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
                placeholder="Type a food question, recipe idea, or diet goal... Synapse responds with clinical precision."
                disabled={sending}
                className="bg-transparent border-0 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-xs sm:text-sm flex-1 px-2 py-1.5 resize-none max-h-32 min-h-[24px] leading-relaxed font-sans"
              />

              {/* Right Send Button */}
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending || !inputQuery.trim()}
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
