import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock,
  Edit2,
  FilePlus2,
  FileText,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router";
import type { LabReportUploadRow } from "../../../lib/labReportAnalysis";
import type { LabPanelRow } from "../../../lib/labPanels";
import type { LabReportQueryRow } from "../../../lib/labReportChat";
import { getMetricAssessments } from "../../../lib/labInsights";

export interface ChatSessionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  uploads: LabReportUploadRow[];
  selectedReportId: string;
  activeSessionId?: string | null;
  onSelectReport: (reportId: string) => void;
  onNewChat: () => void;
  onClearSessionHistory: (reportId: string) => void;
  connectedDoctor: { id: string; name: string } | null;
  panels: LabPanelRow[];
  allQueries: LabReportQueryRow[];
  sessionTitles: Record<string, string>;
  onRenameSession: (reportId: string, title: string) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

type GroupedSessions = {
  today: SessionItem[];
  yesterday: SessionItem[];
  previousWeek: SessionItem[];
  older: SessionItem[];
};

type SessionItem = {
  uploadId: string;
  reportName: string;
  displayName: string;
  createdAt: Date;
  lastActivityAt: Date;
  queriesCount: number;
  latestQueryText: string | null;
  biomarkerCount: number;
  hasVerified: boolean;
  hasPending: boolean;
  hasRejected: boolean;
};

export function ChatSessionSidebar({
  isOpen,
  onToggle,
  uploads,
  selectedReportId,
  activeSessionId,
  onSelectReport,
  onNewChat,
  onClearSessionHistory,
  connectedDoctor,
  panels,
  allQueries,
  sessionTitles,
  onRenameSession,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
}: ChatSessionSidebarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Map panels & queries by uploadId for quick lookup
  const panelMap = useMemo(() => {
    const map = new Map<string, LabPanelRow>();
    panels.forEach((p) => {
      if (p.upload_id) map.set(p.upload_id, p);
    });
    return map;
  }, [panels]);

  const queriesMap = useMemo(() => {
    const map = new Map<string, LabReportQueryRow[]>();
    allQueries.forEach((q) => {
      const list = map.get(q.upload_id) || [];
      list.push(q);
      map.set(q.upload_id, list);
    });
    return map;
  }, [allQueries]);

  // Build structured session items - include reports with actual past queries or the currently loaded session
  const sessionItems: SessionItem[] = useMemo(() => {
    const activeUploads = uploads.filter((u) => {
      const queries = queriesMap.get(u.id) || [];
      return queries.length > 0 || (activeSessionId && u.id === activeSessionId);
    });

    return activeUploads.map((u) => {
      const panel = panelMap.get(u.id);
      const metrics = panel ? getMetricAssessments(panel) : [];
      const queries = queriesMap.get(u.id) || [];

      const latestQuery = queries.length > 0 ? queries[queries.length - 1] : null;
      const reportDate = new Date(u.created_at || Date.now());
      const lastActivityAt = latestQuery ? new Date(latestQuery.created_at) : reportDate;

      const hasVerified = queries.some((q) => q.status === "verified");
      const hasPending = queries.some((q) => q.status === "pending_review");
      const hasRejected = queries.some((q) => q.status === "rejected_and_replaced");

      const customName = sessionTitles[u.id];
      const displayName = customName?.trim() || u.original_filename || "Lab Session";

      return {
        uploadId: u.id,
        reportName: u.original_filename || "Lab Report",
        displayName,
        createdAt: reportDate,
        lastActivityAt,
        queriesCount: queries.length,
        latestQueryText: latestQuery?.user_query || null,
        biomarkerCount: metrics.length,
        hasVerified,
        hasPending,
        hasRejected,
      };
    });
  }, [uploads, panelMap, queriesMap, sessionTitles, selectedReportId]);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessionItems;
    const q = searchQuery.toLowerCase().trim();
    return sessionItems.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.reportName.toLowerCase().includes(q) ||
        (s.latestQueryText && s.latestQueryText.toLowerCase().includes(q))
    );
  }, [sessionItems, searchQuery]);

  // Group filtered sessions chronologically
  const groupedSessions: GroupedSessions = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayMidnight = todayMidnight - oneDayMs;
    const sevenDaysAgo = todayMidnight - 7 * oneDayMs;

    const groups: GroupedSessions = {
      today: [],
      yesterday: [],
      previousWeek: [],
      older: [],
    };

    // Sort by most recent activity first
    const sorted = [...filteredSessions].sort(
      (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
    );

    sorted.forEach((item) => {
      const time = item.lastActivityAt.getTime();
      if (time >= todayMidnight) {
        groups.today.push(item);
      } else if (time >= yesterdayMidnight) {
        groups.yesterday.push(item);
      } else if (time >= sevenDaysAgo) {
        groups.previousWeek.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, [filteredSessions]);

  const handleStartRename = (item: SessionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReportId(item.uploadId);
    setEditingText(item.displayName);
  };

  const handleSaveRename = (uploadId: string) => {
    if (editingText.trim()) {
      onRenameSession(uploadId, editingText.trim());
    }
    setEditingReportId(null);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, uploadId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename(uploadId);
    } else if (e.key === "Escape") {
      setEditingReportId(null);
    }
  };

  const actualConversationCount = filteredSessions.filter((s) => s.queriesCount > 0).length;

  // Content of the sidebar
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full w-full bg-[#0c0d14]/95 backdrop-blur-2xl border-r border-white/[0.08] text-slate-200 select-none overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="h-16 shrink-0 px-4 border-b border-white/[0.08] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <MessageSquare className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-semibold text-white tracking-wide truncate">
              Chat Sessions
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              {actualConversationCount} {actualConversationCount === 1 ? "Conversation" : "Conversations"}
            </p>
          </div>
        </div>

        {/* Retract / Collapse Button */}
        <button
          type="button"
          onClick={onToggle}
          title="Collapse sidebar (Ctrl+B)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>


      {/* 2. Top Action: + New Chat Button */}
      <div className="p-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            setIsMobileDrawerOpen(false);
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all group active:scale-[0.98] ${
            !activeSessionId
              ? "bg-gradient-to-r from-cyan-500/25 to-sky-500/20 border border-cyan-400/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                !activeSessionId
                  ? "bg-cyan-400/30 text-cyan-200"
                  : "bg-white/10 text-zinc-400 group-hover:text-cyan-300"
              }`}
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <span>New Chat</span>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              !activeSessionId
                ? "text-cyan-300 bg-cyan-950/70 border-cyan-500/30"
                : "text-zinc-400 bg-white/5 border-white/10"
            }`}
          >
            Alt+N
          </span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-8 pl-8 pr-7 rounded-lg bg-[#141620] border border-white/10 hover:border-white/20 focus:border-cyan-500/50 text-xs text-slate-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Scrollable Session List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 [scrollbar-width:thin] scrollbar-thumb-white/10">
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-500">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">No lab reports found</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Upload a report to begin clinical AI chat</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/patient/medical-records")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs text-cyan-300 font-medium transition-all"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Upload PDF</span>
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            No conversations matching "{searchQuery}"
          </div>
        ) : (
          <>
            {renderSessionGroup("Today", groupedSessions.today)}
            {renderSessionGroup("Yesterday", groupedSessions.yesterday)}
            {renderSessionGroup("Previous 7 Days", groupedSessions.previousWeek)}
            {renderSessionGroup("Older", groupedSessions.older)}
          </>
        )}
      </div>

      {/* 5. Footer Doctor & Upload Bar */}
      <div className="shrink-0 p-3 border-t border-white/[0.08] bg-[#0e0f17]/90 flex flex-col gap-2">
        {/* Doctor Status Card */}
        {connectedDoctor && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Stethoscope className="h-3.5 w-3.5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-emerald-200 truncate">
                Dr. {connectedDoctor.name.replace(/^Dr\.\s*/i, "")}
              </p>
              <p className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-wider truncate">
                Assigned Reviewer
              </p>
            </div>
          </div>
        )}

        {/* Upload Lab Report CTA */}
        <button
          type="button"
          onClick={() => navigate("/patient/medical-records")}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 hover:text-white transition-all group font-medium"
        >
          <FilePlus2 className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Upload Lab Report</span>
        </button>
      </div>
    </div>
  );

  function renderSessionGroup(title: string, items: SessionItem[]) {
    if (!items || items.length === 0) return null;

    return (
      <div className="space-y-1">
        <h4 className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          {title}
        </h4>
        <div className="space-y-1">
          {items.map((item) => {
            const isSelected = Boolean(activeSessionId && item.uploadId === activeSessionId);
            const isEditing = editingReportId === item.uploadId;

            return (
              <div
                key={item.uploadId}
                onClick={() => {
                  if (!isEditing) {
                    onSelectReport(item.uploadId);
                    setIsMobileDrawerOpen(false);
                  }
                }}
                className={`group relative flex flex-col gap-1 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                    : "hover:bg-white/[0.06] border border-transparent text-slate-300"
                }`}
              >
                {/* Active Indicator Left Glow Strip */}
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                )}

                {/* Main Session Title Line */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    <FileText
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isSelected ? "text-cyan-400" : "text-zinc-400 group-hover:text-cyan-400"
                      }`}
                    />

                    {isEditing ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => handleSaveRename(item.uploadId)}
                        onKeyDown={(e) => handleKeyDownRename(e, item.uploadId)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#141620] border border-cyan-500 text-xs text-white px-1.5 py-0.5 rounded outline-none w-full"
                      />
                    ) : (
                      <span className="text-xs font-medium truncate">{item.displayName}</span>
                    )}
                  </div>

                  {/* Actions on Hover / Selected */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(item, e)}
                        title="Rename conversation"
                        className="p-1 hover:text-cyan-300 rounded hover:bg-white/10 text-zinc-400"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSessionHistory(item.uploadId);
                        }}
                        title="Delete conversation"
                        className="p-1 hover:text-rose-400 rounded hover:bg-rose-500/15 text-zinc-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>


                {/* Subtitle Line (Latest Query / Info) */}
                {item.latestQueryText ? (
                  <p className="text-[11px] text-zinc-400 line-clamp-1 pl-5">
                    {item.latestQueryText}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic pl-5">No queries yet</p>
                )}

                {/* Badges / Metrics Row */}
                <div className="flex items-center gap-2 pl-5 pt-0.5 text-[10px]">
                  {item.biomarkerCount > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-cyan-400/90">
                      <Zap className="h-2.5 w-2.5" />
                      {item.biomarkerCount} bm
                    </span>
                  )}

                  {item.queriesCount > 0 && (
                    <span className="font-mono text-zinc-500">
                      {item.queriesCount} {item.queriesCount === 1 ? "query" : "queries"}
                    </span>
                  )}

                  {item.hasVerified && (
                    <span
                      title="Doctor verified clinical guidance included"
                      className="inline-flex items-center gap-0.5 text-emerald-400 font-medium ml-auto"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified</span>
                    </span>
                  )}

                  {!item.hasVerified && item.hasPending && (
                    <span
                      title="Awaiting physician verification"
                      className="inline-flex items-center gap-0.5 text-amber-400/90 font-mono ml-auto"
                    >
                      <Clock className="h-2.5 w-2.5 animate-pulse" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Collapsible Container */}
      <aside
        className={`hidden lg:flex flex-col h-full shrink-0 border-r border-white/[0.06] transition-[width,opacity] duration-300 ease-in-out overflow-hidden z-20 ${
          isOpen ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none border-r-0"
        }`}
      >
        <div className="w-80 h-full flex flex-col">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile / Tablet Drawer (Slide-over with Backdrop) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Frosted Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250 ease-out flex flex-col">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
