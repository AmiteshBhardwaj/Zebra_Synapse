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
  doctor_name?: string;
  patient_name?: string;
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
  doctor_name?: string;
  patient_name?: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

const GLOBAL_STORAGE_KEY = "zebra_global_doctor_patient_messages";
const REQUESTS_STORAGE_KEY = "zebra_chat_access_requests";

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
  doctorName?: string,
  patientName?: string
): ChatAccessRequest {
  const current = getAllChatRequests();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
  const normPatName = (patientName || "").toLowerCase();

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
}

export function getRequestStatus(
  doctorId: string,
  patientId: string,
  doctorName?: string,
  patientName?: string
): "none" | "pending" | "accepted" | "declined" {
  const current = getAllChatRequests();
  const normDocId = (doctorId || "").toLowerCase();
  const normPatId = (patientId || "").toLowerCase();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
  const normPatName = (patientName || "").toLowerCase();

  const found = current.find((r) => {
    const rDocId = (r.doctor_id || "").toLowerCase();
    const rPatId = (r.patient_id || "").toLowerCase();
    const rDocName = (r.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
    const rPatName = (r.patient_name || "").toLowerCase();

    const matchesDoc = rDocId === normDocId || (normDocName && rDocName && (rDocName.includes(normDocName) || normDocName.includes(rDocName)));
    const matchesPat = rPatId === normPatId || (normPatName && rPatName && (rPatName.includes(normPatName) || normPatName.includes(rPatName)));
    return matchesDoc && matchesPat;
  });

  return found ? found.status : "none";
}

/**
 * Filter messages matching a doctor and patient pair by ID or Name
 */
export function filterConversationMessages(
  allMsgs: DoctorPatientMessage[],
  doctorId: string,
  patientId: string,
  doctorName?: string,
  patientName?: string
): DoctorPatientMessage[] {
  const normDocId = (doctorId || "").toLowerCase();
  const normPatId = (patientId || "").toLowerCase();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
  const normPatName = (patientName || "").toLowerCase();

  return allMsgs.filter((m) => {
    const mDocId = (m.doctor_id || "").toLowerCase();
    const mPatId = (m.patient_id || "").toLowerCase();
    const mDocName = (m.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "");
    const mPatName = (m.patient_name || "").toLowerCase();

    // Match Doctor participant
    const matchesDoc =
      mDocId === normDocId ||
      (normDocId && mPatId === normDocId) ||
      (normDocName && mDocName && (mDocName.includes(normDocName) || normDocName.includes(mDocName)));

    // Match Patient participant
    const matchesPat =
      mPatId === normPatId ||
      (normPatId && mDocId === normPatId) ||
      (normPatName && mPatName && (mPatName.includes(normPatName) || normPatName.includes(mPatName)));

    return matchesDoc && matchesPat;
  });
}

/**
 * Fetch all messages between a doctor and patient.
 */
export async function fetchDoctorPatientMessages(
  doctorId: string,
  patientId: string,
  doctorName?: string,
  patientName?: string
): Promise<DoctorPatientMessage[]> {
  const globalLocal = getAllGlobalMessages();
  let filteredLocal = filterConversationMessages(globalLocal, doctorId, patientId, doctorName, patientName);

  if (!isSupabaseConfigured()) {
    return filteredLocal;
  }
  const sb = getSupabase();
  if (!sb) return filteredLocal;

  try {
    const { data, error } = await sb
      .from("doctor_patient_messages")
      .select("*")
      .or(`doctor_id.eq.${doctorId},patient_id.eq.${patientId}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[doctorPatientChat] Supabase fetch error, using local fallback:", error.message);
      return filteredLocal;
    }

    const fetched = (data as DoctorPatientMessage[]) || [];
    const mergedMap = new Map<string, DoctorPatientMessage>();

    globalLocal.forEach((m) => mergedMap.set(m.id, m));
    fetched.forEach((m) => mergedMap.set(m.id, m));

    const updatedGlobal = Array.from(mergedMap.values());
    saveGlobalMessages(updatedGlobal);

    return filterConversationMessages(updatedGlobal, doctorId, patientId, doctorName, patientName);
  } catch (err) {
    console.warn("[doctorPatientChat] Exception fetching messages:", err);
    return filteredLocal;
  }
}

/**
 * Send a new message between doctor and patient.
 */
export async function sendDoctorPatientMessage(
  doctorId: string,
  patientId: string,
  senderId: string,
  senderRole: "doctor" | "patient",
  content: string,
  attachments: ChatAttachment[] = [],
  doctorName?: string,
  patientName?: string
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

  const currentGlobal = getAllGlobalMessages();
  const updatedGlobal = [...currentGlobal, newMessage];
  saveGlobalMessages(updatedGlobal);

  if (!isSupabaseConfigured()) {
    return newMessage;
  }
  const sb = getSupabase();
  if (!sb) return newMessage;

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
        attachments: newMessage.attachments,
        is_read: false,
        created_at: newMessage.created_at,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[doctorPatientChat] Supabase insert warning:", error.message);
      return newMessage;
    }

    if (data) {
      const serverMsg = data as DoctorPatientMessage;
      const idx = updatedGlobal.findIndex((m) => m.id === newMessage.id);
      if (idx !== -1) updatedGlobal[idx] = serverMsg;
      saveGlobalMessages(updatedGlobal);
      return serverMsg;
    }
  } catch (err) {
    console.warn("[doctorPatientChat] Supabase insert exception:", err);
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
  doctorName?: string,
  patientName?: string
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
  }

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb
      .from("doctor_patient_messages")
      .update({ is_read: true })
      .or(`doctor_id.eq.${doctorId},patient_id.eq.${patientId}`)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  } catch (err) {
    console.warn("[doctorPatientChat] Error marking messages as read:", err);
  }
}
