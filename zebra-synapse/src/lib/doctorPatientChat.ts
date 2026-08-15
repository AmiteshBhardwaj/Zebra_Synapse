import { getSupabase, isSupabaseConfigured } from "./supabase";

export interface ChatAttachment {
  type: "image" | "document" | "prescription" | "lab_report";
  title: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface DoctorPatientMessage {
  id: string;
  doctor_id: string;
  patient_id: string;
  doctor_name?: string | null;
  patient_name?: string | null;
  sender_id: string;
  sender_role: "doctor" | "patient";
  content: string;
  attachments?: ChatAttachment[];
  is_read: boolean;
  created_at: string;
}

export interface ChatAccessRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  doctor_name?: string | null;
  patient_name?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

const GLOBAL_STORAGE_KEY = "zebra_global_doctor_patient_messages";
const REQUESTS_STORAGE_KEY = "zebra_chat_access_requests";
const CHAT_BROADCAST_CHANNEL = "zebra_doctor_patient_chat";

// Helper to broadcast changes across all browser tabs and windows
function broadcastChatEvent(type: "message" | "request" | "read", data: any) {
  if (typeof window !== "undefined") {
    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(CHAT_BROADCAST_CHANNEL);
        bc.postMessage({ type, data, timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // ignore in environments where BroadcastChannel is restricted
    }

    try {
      window.dispatchEvent(
        new CustomEvent("zebra_doctor_patient_sync", {
          detail: { type, data, timestamp: Date.now() },
        })
      );
    } catch {
      // ignore
    }
  }
}

export function getAllGlobalMessages(): DoctorPatientMessage[] {
  try {
    const raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGlobalMessages(msgs: DoctorPatientMessage[]) {
  try {
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // ignore quota errors
  }
}

export function getAllChatRequests(): ChatAccessRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChatRequests(requests: ChatAccessRequest[]) {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // ignore
  }
}

export function sendChatAccessRequest(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): ChatAccessRequest {
  const current = getAllChatRequests();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  const existing = current.find(
    (r) =>
      (r.doctor_id === doctorId || (normDocName && r.doctor_name && r.doctor_name.toLowerCase().includes(normDocName))) &&
      (r.patient_id === patientId || (normPatName && r.patient_name && r.patient_name.toLowerCase().includes(normPatName)))
  );
  if (existing) return existing;

  const newReq: ChatAccessRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    doctor_id: doctorId,
    patient_id: patientId,
    doctor_name: doctorName,
    patient_name: patientName,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  const updated = [...current, newReq];
  saveChatRequests(updated);
  broadcastChatEvent("request", newReq);

  // Sync to Supabase as system message if configured
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      void sb.from("doctor_patient_messages").insert({
        id: `reqmsg_${newReq.id}`,
        doctor_id: doctorId,
        patient_id: patientId,
        doctor_name: doctorName,
        patient_name: patientName,
        sender_id: patientId,
        sender_role: "patient",
        content: `[Chat Access Request] ${patientName || "Patient"} requested direct 2-way clinical chat access.`,
        is_read: false,
        created_at: newReq.created_at,
      });
    }
  }

  return newReq;
}

export function updateChatAccessRequestStatus(
  requestId: string,
  status: "accepted" | "declined"
) {
  const current = getAllChatRequests();
  const updated = current.map((r) => {
    if (r.id === requestId) {
      return { ...r, status };
    }
    return r;
  });
  saveChatRequests(updated);
  broadcastChatEvent("request", { requestId, status });
}

export function getRequestStatus(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): "none" | "pending" | "accepted" | "declined" {
  const current = getAllChatRequests();
  const normDocId = (doctorId || "").toLowerCase().trim();
  const normPatId = (patientId || "").toLowerCase().trim();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  const found = current.find((r) => {
    const rDocId = (r.doctor_id || "").toLowerCase().trim();
    const rPatId = (r.patient_id || "").toLowerCase().trim();
    const rDocName = (r.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
    const rPatName = (r.patient_name || "").toLowerCase().trim();

    const matchesDoc =
      rDocId === normDocId ||
      (normDocName && rDocName && (rDocName.includes(normDocName) || normDocName.includes(rDocName)));

    const matchesPat =
      rPatId === normPatId ||
      (normPatName && rPatName && (rPatName.includes(normPatName) || normPatName.includes(rPatName)));

    return matchesDoc && matchesPat;
  });

  return found ? found.status : "none";
}

/**
 * Filter messages matching a doctor and patient pair by ID or Name universally.
 */
export function filterConversationMessages(
  allMsgs: DoctorPatientMessage[],
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): DoctorPatientMessage[] {
  const normDocId = (doctorId || "").toLowerCase().trim();
  const normPatId = (patientId || "").toLowerCase().trim();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  // Determine if patient search refers to default demo / seed patient aliases
  const isDefaultPatientSearch =
    normPatId === "pat_maya_thompson" ||
    normPatId === "patient" ||
    normPatName.includes("maya") ||
    normPatName.includes("thompson") ||
    normPatName.includes("patient user") ||
    normPatName === "patient" ||
    normPatName === "user";

  const isDefaultDoctorSearch =
    normDocId === "doc_amelia_hart" ||
    normDocId === "doctor" ||
    normDocName.includes("amelia") ||
    normDocName.includes("hart") ||
    normDocName.includes("smith");

  return allMsgs.filter((m) => {
    const mDocId = (m.doctor_id || "").toLowerCase().trim();
    const mPatId = (m.patient_id || "").toLowerCase().trim();
    const mDocName = (m.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
    const mPatName = (m.patient_name || "").toLowerCase().trim();

    // 1. Match Doctor participant
    const matchesDoc =
      (normDocId && (mDocId === normDocId || mPatId === normDocId)) ||
      (normDocName && mDocName && (mDocName.includes(normDocName) || normDocName.includes(mDocName))) ||
      (isDefaultDoctorSearch && (mDocId.includes("amelia") || mDocName.includes("amelia") || mDocName.includes("hart")));

    if (!matchesDoc) return false;

    // 2. Match Patient participant
    const matchesPatDirect =
      (normPatId && (mPatId === normPatId || mDocId === normPatId)) ||
      (normPatName && mPatName && (mPatName.includes(normPatName) || normPatName.includes(mPatName)));

    if (matchesPatDirect) return true;

    // 3. Match Patient default/demo cross-link
    const isMessageDefaultPat =
      mPatId === "pat_maya_thompson" ||
      mPatId === "patient" ||
      mPatName.includes("maya") ||
      mPatName.includes("thompson") ||
      mPatName.includes("patient user") ||
      mPatName === "patient" ||
      mPatName === "user";

    if (isDefaultPatientSearch && isMessageDefaultPat) {
      return true;
    }

    return false;
  });
}

/**
 * Fetch all messages between a doctor and patient across remote devices and local state.
 */
export async function fetchDoctorPatientMessages(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): Promise<DoctorPatientMessage[]> {
  const globalLocal = getAllGlobalMessages();
  let filtered = filterConversationMessages(globalLocal, doctorId, patientId, doctorName, patientName);

  if (!isSupabaseConfigured()) {
    return filtered;
  }
  const sb = getSupabase();
  if (!sb) return filtered;

  try {
    // Fetch remote messages from Supabase
    const { data, error } = await sb
      .from("doctor_patient_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return filtered;
    }

    const fetched = (data as DoctorPatientMessage[]) || [];
    const mergedMap = new Map<string, DoctorPatientMessage>();

    globalLocal.forEach((m) => mergedMap.set(m.id, m));
    fetched.forEach((m) => mergedMap.set(m.id, m));

    const updatedGlobal = Array.from(mergedMap.values());
    saveGlobalMessages(updatedGlobal);

    return filterConversationMessages(updatedGlobal, doctorId, patientId, doctorName, patientName);
  } catch (err) {
    console.warn("[doctorPatientChat] Remote fetch exception:", err);
    return filtered;
  }
}

/**
 * Send a new message between doctor and patient universally.
 */
export async function sendDoctorPatientMessage(
  doctorId: string,
  patientId: string,
  senderId: string,
  senderRole: "doctor" | "patient",
  content: string,
  attachments: ChatAttachment[] = [],
  doctorName?: string | null,
  patientName?: string | null
): Promise<DoctorPatientMessage> {
  const newMessage: DoctorPatientMessage = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    doctor_id: doctorId,
    patient_id: patientId,
    doctor_name: doctorName,
    patient_name: patientName,
    sender_id: senderId,
    sender_role: senderRole,
    content: content.trim(),
    attachments,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Immediately save to universal local storage
  const currentGlobal = getAllGlobalMessages();
  const updatedGlobal = [...currentGlobal, newMessage];
  saveGlobalMessages(updatedGlobal);

  // 2. Broadcast across local tabs immediately
  broadcastChatEvent("message", newMessage);

  // 3. Persist to Supabase for multi-device sync
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from("doctor_patient_messages")
          .insert({
            id: newMessage.id,
            doctor_id: doctorId,
            patient_id: patientId,
            doctor_name: doctorName,
            patient_name: patientName,
            sender_id: senderId,
            sender_role: senderRole,
            content: newMessage.content,
            attachments: newMessage.attachments || [],
            is_read: false,
            created_at: newMessage.created_at,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          const serverMsg = data as DoctorPatientMessage;
          const idx = updatedGlobal.findIndex((m) => m.id === newMessage.id);
          if (idx !== -1) updatedGlobal[idx] = serverMsg;
          saveGlobalMessages(updatedGlobal);
          broadcastChatEvent("message", serverMsg);
          return serverMsg;
        }
      } catch (err) {
        console.warn("[doctorPatientChat] Remote Supabase insert exception:", err);
      }
    }
  }

  return newMessage;
}

/**
 * Mark unread messages sent to current user as read.
 */
export async function markDoctorPatientMessagesAsRead(
  doctorId: string,
  patientId: string,
  currentUserId: string,
  doctorName?: string | null,
  patientName?: string | null
): Promise<void> {
  const currentGlobal = getAllGlobalMessages();
  let updated = false;

  const updatedGlobal = currentGlobal.map((m) => {
    if (m.sender_id !== currentUserId && !m.is_read) {
      const isTargetConv = filterConversationMessages([m], doctorId, patientId, doctorName, patientName).length > 0;
      if (isTargetConv) {
        updated = true;
        return { ...m, is_read: true };
      }
    }
    return m;
  });

  if (updated) {
    saveGlobalMessages(updatedGlobal);
    broadcastChatEvent("read", { doctorId, patientId, currentUserId });
  }

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb
      .from("doctor_patient_messages")
      .update({ is_read: true })
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  } catch (err) {
    console.warn("[doctorPatientChat] Error marking messages as read:", err);
  }
}
