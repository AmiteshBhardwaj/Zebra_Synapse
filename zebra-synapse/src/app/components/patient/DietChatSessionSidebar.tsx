import { useMemo, useState } from "react";
import {
  Apple,
  Check,
  Clock,
  Edit2,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { DietChatSession } from "../../../lib/dietChat";

export interface DietChatSessionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: DietChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

type GroupedSessions = {
  today: DietChatSession[];
  yesterday: DietChatSession[];
  previousWeek: DietChatSession[];
  older: DietChatSession[];
};

export function DietChatSessionSidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
}: DietChatSessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.latestMessage && s.latestMessage.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  // Group chronologically
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

    filteredSessions.forEach((item) => {
      const time = new Date(item.updatedAt || item.createdAt).getTime();
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

  const handleStartRename = (session: DietChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingText(session.title);
  };

  const handleSaveRename = (sessionId: string) => {
    if (editingText.trim()) {
      onRenameSession(sessionId, editingText.trim());
    }
    setEditingSessionId(null);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename(sessionId);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  // Render a single session item card
  const renderSessionItem = (item: DietChatSession) => {
    const isActive = item.id === activeSessionId;
    const isEditing = editingSessionId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (!isEditing) {
            onSelectSession(item.id);
            setIsMobileDrawerOpen(false);
          }
        }}
        className={`group relative flex flex-col gap-1 p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
          isActive
            ? "bg-lime-50/80 border-lime-300 text-slate-900 shadow-sm"
            : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleSaveRename(item.id)}
                onKeyDown={(e) => handleKeyDownRename(e, item.id)}
                className="w-full h-7 px-2 text-xs font-semibold rounded-lg bg-white border border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-slate-900"
              />
              <button
                type="button"
                onClick={() => handleSaveRename(item.id)}
                className="h-7 w-7 shrink-0 rounded-lg bg-lime-500 text-white flex items-center justify-center hover:bg-lime-600"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "bg-lime-500 text-slate-950" : "bg-slate-100 text-slate-500 group-hover:text-lime-700"
                  }`}
                >
                  <UtensilsCrossed className="h-3 w-3" />
                </div>
                <span
                  className={`text-xs truncate font-medium ${
                    isActive ? "font-bold text-slate-950" : "text-slate-800"
                  }`}
                >
                  {item.title}
                </span>
              </div>

              {/* Action buttons (Rename, Delete) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  title="Rename chat"
                  onClick={(e) => handleStartRename(item, e)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this conversation?")) {
                      onDeleteSession(item.id);
                    }
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Latest message preview */}
        {item.latestMessage && !isEditing && (
          <p className="text-[11px] text-slate-400 truncate pl-8 leading-snug">
            {item.latestMessage}
          </p>
        )}

        {/* Footer timestamp & count */}
        {!isEditing && (
          <div className="flex items-center justify-between pl-8 pt-1 text-[10px] text-slate-400">
            <span>
              {new Date(item.updatedAt || item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {item.messagesCount > 0 && (
              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold">
                {item.messagesCount} {item.messagesCount === 1 ? "msg" : "msgs"}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Content of the sidebar
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full w-full bg-white border-r border-slate-200/80 text-slate-800 select-none overflow-hidden shadow-sm">
      {/* 1. Header Toolbar */}
      <div className="h-16 shrink-0 px-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700 shadow-sm">
            <Apple className="h-4 w-4 stroke-[2.2]" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight truncate font-['Manrope']">
              Dietitian Chats
            </h3>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
            </p>
          </div>
        </div>

        {/* Retract / Collapse Button */}
        <button
          type="button"
          onClick={onToggle}
          title="Collapse sidebar (Ctrl+B)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
              ? "bg-lime-50 border border-lime-200 text-lime-900 font-bold shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                !activeSessionId
                  ? "bg-lime-500 text-slate-950"
                  : "bg-slate-200 text-slate-600 group-hover:text-lime-700"
              }`}
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <span>New Diet Chat</span>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              !activeSessionId
                ? "text-lime-800 bg-lime-100/70 border-lime-300"
                : "text-slate-400 bg-white border-slate-200"
            }`}
          >
            Alt+N
          </span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-lime-500 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-lime-500/20 transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Session List by Time Group */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 [scrollbar-width:thin]">
        {filteredSessions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
            <p>{searchQuery ? "No conversations found" : "No diet chats yet"}</p>
            <button
              type="button"
              onClick={() => {
                onNewChat();
                setIsMobileDrawerOpen(false);
              }}
              className="text-lime-700 hover:underline font-semibold text-xs"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <>
            {/* Today */}
            {groupedSessions.today.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Today
                </div>
                {groupedSessions.today.map(renderSessionItem)}
              </div>
            )}

            {/* Yesterday */}
            {groupedSessions.yesterday.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Yesterday
                </div>
                {groupedSessions.yesterday.map(renderSessionItem)}
              </div>
            )}

            {/* Previous 7 Days */}
            {groupedSessions.previousWeek.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Previous 7 Days
                </div>
                {groupedSessions.previousWeek.map(renderSessionItem)}
              </div>
            )}

            {/* Older */}
            {groupedSessions.older.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Older
                </div>
                {groupedSessions.older.map(renderSessionItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Footer Quick Tip */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/50 flex items-center gap-2 shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-lime-600 shrink-0" />
        <span className="truncate">Press Ctrl+B to toggle sidebar</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Transition with width) */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-full overflow-hidden ${
          isOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        {renderSidebarContent()}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
