import { useEffect, useState } from "react";
import { Info, FileText } from "lucide-react";
import { getSupabase } from "../../../lib/supabase";

interface RealtimeNoteProps {
  consultationId: string;
  initialNote?: string | null;
}

export default function RealtimeNote({ consultationId, initialNote }: RealtimeNoteProps) {
  const [note, setNote] = useState<string | null>(initialNote || null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase.channel(`consultation-${consultationId}`);

    channel
      .on(
        "broadcast",
        { event: "note-updated" },
        (payload: { payload: { note: string } }) => {
          if (payload?.payload?.note !== undefined) {
            setNote(payload.payload.note);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  if (note) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 mb-3 text-cyan-400">
          <FileText className="h-5 w-5" />
          <h4 className="font-semibold text-sm tracking-wide uppercase font-mono">Doctor's Clinical Notes</h4>
        </div>
        <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed font-sans">
          {note}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-950/30 p-5 backdrop-blur-xl flex items-start space-x-3.5 text-cyan-300">
      <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-cyan-400" />
      <p className="text-sm font-medium leading-relaxed">
        The doctor has not finalized clinical notes for this consultation session yet. Notes will stream here in real time as the doctor updates them.
      </p>
    </div>
  );
}
