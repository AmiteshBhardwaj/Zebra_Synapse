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
const DELETED_CONVERSATIONS_KEY = "zebra_deleted_conversations";
const CHAT_BROADCAST_CHANNEL = "zebra_doctor_patient_chat";

export function getDeletedConversations(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DELETED_CONVERSATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const sanitized: Record<string, number> = {};
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === "string" && k.includes("_") && typeof v === "number") {
          sanitized[k] = v;
        }
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

function getConversationPairKeys(
  doctorId?: string | null,
  patientId?: string | null,
  doctorName?: string | null,
  patientName?: string | null
): string[] {
  const keys: string[] = [];
  const doc = (doctorId || "").trim();
  const pat = (patientId || "").trim();
  const normDoc = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPat = (patientName || "").toLowerCase().trim();

  if (doc && pat) {
    keys.push(`${doc}_${pat}`);
    keys.push(`${pat}_${doc}`);
  }
  if (normDoc && normPat) {
    keys.push(`${normDoc}_${normPat}`);
    keys.push(`${normPat}_${normDoc}`);
  }
  return keys;
}

export function isConversationDeletedLocally(
  doctorId?: string | null,
  patientId?: string | null,
  doctorName?: string | null,
  patientName?: string | null
): boolean {
  if (!doctorId && !patientId && !doctorName && !patientName) return false;
  const deletedMap = getDeletedConversations();
  const keys = getConversationPairKeys(doctorId, patientId, doctorName, patientName);
  return keys.some((k) => Boolean(deletedMap[k]));
}

export function trackDeletedConversationLocally(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
) {
  try {
    const deletedMap = getDeletedConversations();
    const keys = getConversationPairKeys(doctorId, patientId, doctorName, patientName);
    const now = Date.now();
    keys.forEach((k) => {
      deletedMap[k] = now;
    });
    localStorage.setItem(DELETED_CONVERSATIONS_KEY, JSON.stringify(deletedMap));
  } catch {
    // ignore
  }
}

export function untrackDeletedConversationLocally(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
) {
  try {
    const deletedMap = getDeletedConversations();
    const keys = getConversationPairKeys(doctorId, patientId, doctorName, patientName);
    let changed = false;
    keys.forEach((k) => {
      if (deletedMap[k]) {
        delete deletedMap[k];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(DELETED_CONVERSATIONS_KEY, JSON.stringify(deletedMap));
    }
  } catch {
    // ignore
  }
}

// Helper to broadcast changes across all browser tabs and windows
function broadcastChatEvent(type: "message" | "request" | "read" | "delete", data: any) {
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

  // Broadcast to other windows
  broadcastChatEvent("request", newReq);
  return newReq;
}

export function updateChatAccessRequestStatus(
  requestId: string,
  status: "accepted" | "declined"
): ChatAccessRequest | null {
  const current = getAllChatRequests();
  let updatedReq: ChatAccessRequest | null = null;

  const updated = current.map((r) => {
    if (r.id === requestId) {
      updatedReq = { ...r, status };
      return updatedReq;
    }
    return r;
  });

  if (updatedReq) {
    saveChatRequests(updated);
    broadcastChatEvent("request", updatedReq);
  }

  return updatedReq;
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

export function filterConversationMessages(
  messages: DoctorPatientMessage[],
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): DoctorPatientMessage[] {
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  // Match flags
  const isDefaultPatientSearch =
    patientId === "pat_maya_thompson" ||
    patientId === "patient" ||
    normPatName.includes("maya") ||
    normPatName.includes("thompson") ||
    normPatName.includes("patient user") ||
    normPatName === "patient" ||
    normPatName === "user";

  const isDefaultDoctorSearch =
    doctorId === "doc_amelia_hart" ||
    doctorId === "doctor" ||
    normDocName.includes("amelia") ||
    normDocName.includes("hart") ||
    normDocName.includes("dr. alex smith") ||
    normDocName === "doctor" ||
    normDocName === "alex smith";

  return messages.filter((m) => {
    // 0. Filter out deleted conversations
    if (isConversationDeletedLocally(m.doctor_id, m.patient_id, m.doctor_name, m.patient_name)) {
      return false;
    }

    const mDocId = m.doctor_id || "";
    const mPatId = m.patient_id || "";
    const mDocName = (m.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
    const mPatName = (m.patient_name || "").toLowerCase().trim();

    // 1. Direct ID match
    if (
      (mDocId === doctorId && mPatId === patientId) ||
      (mDocId === patientId && mPatId === doctorId)
    ) {
      return true;
    }

    // 2. Name-based match
    if (
      normDocName &&
      normPatName &&
      (mDocName.includes(normDocName) || normDocName.includes(mDocName)) &&
      (mPatName.includes(normPatName) || normPatName.includes(mPatName))
    ) {
      return true;
    }

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

    // 4. Match Doctor default/demo cross-link
    const isMessageDefaultDoc =
      mDocId === "doc_amelia_hart" ||
      mDocId === "doctor" ||
      mDocName.includes("amelia") ||
      mDocName.includes("hart") ||
      mDocName.includes("dr. alex smith");

    if (isDefaultDoctorSearch && isMessageDefaultDoc) {
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

  if (isConversationDeletedLocally(doctorId, patientId, doctorName, patientName)) {
    return [];
  }

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
    const activeFetched = fetched.filter(
      (m) => !isConversationDeletedLocally(m.doctor_id, m.patient_id, m.doctor_name, m.patient_name)
    );

    const mergedMap = new Map<string, DoctorPatientMessage>();

    globalLocal.forEach((m) => {
      if (!isConversationDeletedLocally(m.doctor_id, m.patient_id, m.doctor_name, m.patient_name)) {
        mergedMap.set(m.id, m);
      }
    });
    activeFetched.forEach((m) => mergedMap.set(m.id, m));

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
  // Untrack deleted conversation if a new message is sent
  untrackDeletedConversationLocally(doctorId, patientId, doctorName, patientName);

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

/**
 * Permanently delete all messages in a conversation between doctor and patient.
 */
export async function deleteConversationMessages(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): Promise<void> {
  const currentGlobal = getAllGlobalMessages();
  const targetConvMsgs = filterConversationMessages(currentGlobal, doctorId, patientId, doctorName, patientName);
  const targetIds = new Set(targetConvMsgs.map((m) => m.id));

  // 1. Instantly clear from local universal storage
  const updatedGlobal = currentGlobal.filter((m) => {
    const isTargetConv = filterConversationMessages([m], doctorId, patientId, doctorName, patientName).length > 0;
    return !isTargetConv && !targetIds.has(m.id);
  });
  saveGlobalMessages(updatedGlobal);

  // 2. Track deleted conversation locally so remote fetch won't re-add old messages
  trackDeletedConversationLocally(doctorId, patientId, doctorName, patientName);

  // 3. Broadcast deletion event across tabs & windows
  broadcastChatEvent("delete", { doctorId, patientId });

  // 4. Persist deletion in Supabase database
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    // Perform clean, robust individual delete queries
    await sb
      .from("doctor_patient_messages")
      .delete()
      .eq("doctor_id", doctorId)
      .eq("patient_id", patientId);

    await sb
      .from("doctor_patient_messages")
      .delete()
      .eq("doctor_id", patientId)
      .eq("patient_id", doctorId);

    if (doctorName || patientName) {
      const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
      const normPatName = (patientName || "").toLowerCase().trim();

      if (normDocName) {
        await sb.from("doctor_patient_messages").delete().ilike("doctor_name", `%${normDocName}%`);
      }
      if (normPatName) {
        await sb.from("doctor_patient_messages").delete().ilike("patient_name", `%${normPatName}%`);
      }
    }

    if (targetIds.size > 0) {
      await sb.from("doctor_patient_messages").delete().in("id", Array.from(targetIds));
    }
  } catch (err) {
    console.warn("[doctorPatientChat] Exception deleting conversation messages:", err);
  }
}

