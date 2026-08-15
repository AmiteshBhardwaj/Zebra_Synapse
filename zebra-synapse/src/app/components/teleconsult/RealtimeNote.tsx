import { useEffect, useState } from "react";
import { Info, FileText, CheckCircle2 } from "lucide-react";
import { getSupabase } from "../../../lib/supabase";

interface RealtimeNoteProps {
  consultationId: string;
  initialNote?: string | null;
}

export default function RealtimeNote({ consultationId, initialNote }: RealtimeNoteProps) {
  const [note, setNote] = useState<string | null>(initialNote || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial check from localStorage
    try {
      const stored = localStorage.getItem(`zebra_consultation_notes_${consultationId}`);
      if (stored) {
        setNote(stored);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch {
      // ignore
    }

    // 2. BroadcastChannel listener (instant local cross-tab sync)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(`zebra-notes-${consultationId}`);
        bc.onmessage = (event) => {
          if (event.data?.note !== undefined) {
            setNote(event.data.note);
            setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        };
      }
    } catch {
      // ignore
    }

    // 3. Storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `zebra_consultation_notes_${consultationId}` && e.newValue !== null) {
        setNote(e.newValue);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Supabase Realtime channel listener (cross-device sync)
    const supabase = getSupabase();
    let channel: any = null;
    if (supabase) {
      channel = supabase.channel(`consultation-${consultationId}`);
      channel
        .on(
          "broadcast",
          { event: "note-updated" },
          (payload: { payload: { note: string } }) => {
            if (payload?.payload?.note !== undefined) {
              setNote(payload.payload.note);
              setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [consultationId]);

  if (note) {
    return (
      <div className="rounded-[24px] border border-cyan-500/25 bg-[#0b1021]/80 p-6 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-slate-100 space-y-3">
        <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <FileText className="h-4 w-4" />
            <h4 className="font-bold text-xs tracking-wider uppercase">Doctor's Clinical Notes</h4>
          </div>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-300/70 font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Updated at {lastUpdated}
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap text-slate-200 text-xs sm:text-sm leading-relaxed font-sans bg-slate-950/60 p-4 rounded-xl border border-white/5">
          {note}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-950/20 p-5 backdrop-blur-xl flex items-start space-x-3.5 text-cyan-300">
      <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-cyan-400" />
      <p className="text-xs sm:text-sm font-medium leading-relaxed">
        The doctor has not published clinical notes for this consultation session yet. Notes will stream here in real time as the doctor updates them.
      </p>
    </div>
  );
}
