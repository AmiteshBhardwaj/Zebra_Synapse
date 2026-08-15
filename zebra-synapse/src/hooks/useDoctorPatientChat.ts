import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  type ChatAttachment,
  type DoctorPatientMessage,
  fetchDoctorPatientMessages,
  markDoctorPatientMessagesAsRead,
  sendDoctorPatientMessage,
} from "../lib/doctorPatientChat";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function useDoctorPatientChat(
  doctorId?: string | null,
  patientId?: string | null,
  doctorName?: string | null,
  patientName?: string | null
) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const activeDoctorId = doctorId || (profile?.role === "doctor" ? user?.id : null);
  const activePatientId = patientId || (profile?.role === "patient" ? user?.id : null);
  const activeDoctorName = doctorName || (profile?.role === "doctor" ? profile.full_name : undefined);
  const activePatientName = patientName || (profile?.role === "patient" ? profile.full_name : undefined);

  const loadMessages = useCallback(async () => {
    if (!activeDoctorId || !activePatientId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const msgs = await fetchDoctorPatientMessages(
      activeDoctorId,
      activePatientId,
      activeDoctorName,
      activePatientName
    );
    setMessages(msgs);
    setLoading(false);

    if (user?.id) {
      void markDoctorPatientMessagesAsRead(
        activeDoctorId,
        activePatientId,
        user.id,
        activeDoctorName,
        activePatientName
      );
    }
  }, [activeDoctorId, activePatientId, activeDoctorName, activePatientName, user?.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Set up Multi-Layer Real-Time Synchronization:
  // 1. Supabase Realtime Subscription (cross-device)
  // 2. BroadcastChannel (cross-tab zero latency)
  // 3. Local Storage + CustomEvent listener
  // 4. Safety polling interval (1s)
  useEffect(() => {
    if (!activeDoctorId || !activePatientId) return;

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      if (sb) {
        channel = sb
          .channel(`chat_realtime_${activeDoctorId}_${activePatientId}_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "doctor_patient_messages",
            },
            () => {
              void loadMessages();
            }
          )
          .subscribe();
      }
    }

    // 2. BroadcastChannel listener for immediate local cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("zebra_doctor_patient_chat");
        bc.onmessage = () => {
          void loadMessages();
        };
      }
    } catch {
      // ignore
    }

    // 3. Custom window sync listener
    const handleSyncEvent = () => {
      void loadMessages();
    };
    window.addEventListener("zebra_doctor_patient_sync", handleSyncEvent);
    window.addEventListener("storage", handleSyncEvent);

    // 4. Rapid interval polling (1000ms) for rock-solid sync
    const interval = setInterval(() => {
      void fetchDoctorPatientMessages(
        activeDoctorId,
        activePatientId,
        activeDoctorName,
        activePatientName
      ).then((latest) => {
        setMessages((prev) => {
          if (
            latest.length !== prev.length ||
            (latest.length > 0 && latest[latest.length - 1].id !== prev[prev.length - 1]?.id)
          ) {
            return latest;
          }
          return prev;
        });
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("zebra_doctor_patient_sync", handleSyncEvent);
      window.removeEventListener("storage", handleSyncEvent);
      if (bc) {
        bc.close();
      }
      if (channel && isSupabaseConfigured()) {
        const sb = getSupabase();
        sb?.removeChannel(channel);
      }
    };
  }, [activeDoctorId, activePatientId, activeDoctorName, activePatientName, loadMessages]);

  const sendMessage = useCallback(
    async (content: string, attachments: ChatAttachment[] = []) => {
      if (!activeDoctorId || !activePatientId || !user?.id || !profile) {
        throw new Error("Missing active chat participants or authentication");
      }
      setSending(true);
      try {
        const senderRole = profile.role === "doctor" ? "doctor" : "patient";
        const sent = await sendDoctorPatientMessage(
          activeDoctorId,
          activePatientId,
          user.id,
          senderRole,
          content,
          attachments,
          activeDoctorName,
          activePatientName
        );
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
        return sent;
      } finally {
        setSending(false);
      }
    },
    [activeDoctorId, activePatientId, activeDoctorName, activePatientName, user?.id, profile]
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: loadMessages,
  };
}
