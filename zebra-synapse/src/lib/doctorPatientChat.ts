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

export const KNOWN_PARTICIPANT_ID_MAP: Record<string, string> = {
  // Doctor legacy slugs -> Supabase UUIDs
  "doc_amelia_hart": "c887c92e-c384-4078-8e7e-047176611af9",
  "doc_benjamin_ortiz": "622defb1-60a8-4f6c-a7d4-163d97696131",
  "doc_chloe_menon": "72122a75-5ae8-4e3a-887b-b4c09f39a38d",
  "doc_daniel_kim": "d2cd69f1-1654-4ec7-a251-b0f2b20a03a7",
  "doc_evelyn_brooks": "7da29924-f9d7-44cb-a67e-2720b439cdaf",
  "doc_farah_siddiqui": "2fe0fd7d-d558-4693-8687-36e42ffa6aa9",
  "doc_gabriel_chen": "57d6636a-ed9f-4790-ad3e-175db63bfb5b",
  "doc_hannah_patel": "497721f2-8b8f-42fd-972f-a5f9830874a7",
  "doc_isaac_romero": "c2603d90-d728-487d-ae5e-dd26c32dffa9",
  "doc_julia_nguyen": "0eb87b8f-3cc1-416f-bd00-75559890bd72",

  // Patient legacy slugs -> Supabase UUIDs
  "pat_maya_thompson": "cfa35490-81c9-433e-a535-13a235cbe43c",
  "pat_liam_carter": "8b15af6f-8915-4d75-8165-216236a88470",
  "pat_sofia_bennett": "ca38ed48-ac17-4207-afdf-bda44f027fdb",
  "pat_noah_patel": "0967e582-b4d5-4586-bbf3-3a4212c28139",
  "pat_ava_richardson": "aaea86ac-ea98-4966-9295-dd08919b629f",
  "pat_ethan_brooks": "280ee68d-36a9-4f9f-bb83-fbda186a5e92",
};

export function normalizeParticipantId(id?: string | null): string {
  if (!id) return "";
  const trimmed = id.trim();
  const lower = trimmed.toLowerCase();
  return KNOWN_PARTICIPANT_ID_MAP[lower] || trimmed;
}

export function doIdsMatch(idA?: string | null, idB?: string | null): boolean {
  if (!idA || !idB) return false;
  const a = idA.trim().toLowerCase();
  const b = idB.trim().toLowerCase();
  if (a === b) return true;
  const normA = normalizeParticipantId(a).toLowerCase();
  const normB = normalizeParticipantId(b).toLowerCase();
  if (normA === normB) return true;
  return false;
}

function getConversationPairKeys(
  doctorId?: string | null,
  patientId?: string | null,
  doctorName?: string | null,
  patientName?: string | null
): string[] {
  const keys: string[] = [];
  const doc = normalizeParticipantId(doctorId);
  const pat = normalizeParticipantId(patientId);
  const rawDoc = (doctorId || "").trim();
  const rawPat = (patientId || "").trim();
  const normDoc = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPat = (patientName || "").toLowerCase().trim();

  if (doc && pat) {
    keys.push(`${doc}_${pat}`);
    keys.push(`${pat}_${doc}`);
  }
  if (rawDoc && rawPat && (rawDoc !== doc || rawPat !== pat)) {
    keys.push(`${rawDoc}_${rawPat}`);
    keys.push(`${rawPat}_${rawDoc}`);
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

/**
 * Fetch remote chat access requests from Supabase and synchronize with local cache.
 */
export async function fetchChatAccessRequests(): Promise<ChatAccessRequest[]> {
  const localReqs = getAllChatRequests();
  if (!isSupabaseConfigured()) return localReqs;
  const sb = getSupabase();
  if (!sb) return localReqs;

  try {
    const { data, error } = await sb
      .from("chat_access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mergedMap = new Map<string, ChatAccessRequest>();
      localReqs.forEach((r) => mergedMap.set(r.id, r));
      (data as ChatAccessRequest[]).forEach((r) => mergedMap.set(r.id, r));
      const merged = Array.from(mergedMap.values());
      saveChatRequests(merged);
      return merged;
    }
  } catch (err) {
    console.warn("[doctorPatientChat] Error fetching remote chat requests:", err);
  }
  return localReqs;
}

export async function sendChatAccessRequest(
  doctorId: string,
  patientId: string,
  doctorName?: string | null,
  patientName?: string | null
): Promise<ChatAccessRequest> {
  const canonicalDocId = normalizeParticipantId(doctorId);
  const canonicalPatId = normalizeParticipantId(patientId);

  const current = await fetchChatAccessRequests();
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  const existing = current.find(
    (r) =>
      (doIdsMatch(r.doctor_id, canonicalDocId) || (normDocName && r.doctor_name && r.doctor_name.toLowerCase().includes(normDocName))) &&
      (doIdsMatch(r.patient_id, canonicalPatId) || (normPatName && r.patient_name && r.patient_name.toLowerCase().includes(normPatName)))
  );
  if (existing) return existing;

  const newReq: ChatAccessRequest = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    doctor_id: canonicalDocId,
    patient_id: canonicalPatId,
    doctor_name: doctorName,
    patient_name: patientName,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  const updated = [newReq, ...current];
  saveChatRequests(updated);

  // Broadcast to other local windows
  broadcastChatEvent("request", newReq);

  // Persist to Supabase for multi-device sync
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from("chat_access_requests").insert({
          id: newReq.id,
          doctor_id: newReq.doctor_id,
          patient_id: newReq.patient_id,
          doctor_name: newReq.doctor_name,
          patient_name: newReq.patient_name,
          status: newReq.status,
          created_at: newReq.created_at,
        });
        if (error) {
          console.error("[doctorPatientChat] Error persisting chat request to Supabase:", error);
        }
      } catch (err) {
        console.warn("[doctorPatientChat] Supabase chat request insert exception:", err);
      }
    }
  }

  return newReq;
}

export async function updateChatAccessRequestStatus(
  requestId: string,
  status: "accepted" | "declined"
): Promise<ChatAccessRequest | null> {
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

    // Update in Supabase
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      if (sb) {
        try {
          const { error } = await sb
            .from("chat_access_requests")
            .update({ status })
            .eq("id", requestId);
          if (error) {
            console.error("[doctorPatientChat] Error updating chat request in Supabase:", error);
          }
        } catch (err) {
          console.warn("[doctorPatientChat] Supabase chat request update exception:", err);
        }
      }
    }
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
  const normDocId = normalizeParticipantId(doctorId);
  const normPatId = normalizeParticipantId(patientId);
  const normDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normPatName = (patientName || "").toLowerCase().trim();

  const found = current.find((r) => {
    const rDocName = (r.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
    const rPatName = (r.patient_name || "").toLowerCase().trim();

    const matchesDoc =
      doIdsMatch(r.doctor_id, normDocId) ||
      (normDocName && rDocName && (rDocName.includes(normDocName) || normDocName.includes(rDocName)));

    const matchesPat =
      doIdsMatch(r.patient_id, normPatId) ||
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
  const normTargetDocId = normalizeParticipantId(doctorId);
  const normTargetPatId = normalizeParticipantId(patientId);
  const normTargetDocName = (doctorName || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
  const normTargetPatName = (patientName || "").toLowerCase().trim();

  if (!normTargetDocId && !normTargetDocName) return [];
  if (!normTargetPatId && !normTargetPatName) return [];

  return messages.filter((m) => {
    // 0. Exclude locally deleted conversations
    if (isConversationDeletedLocally(m.doctor_id, m.patient_id, m.doctor_name, m.patient_name)) {
      return false;
    }

    const mDocName = (m.doctor_name || "").toLowerCase().replace(/^(dr\.|prof\.)\s*/i, "").trim();
    const mPatName = (m.patient_name || "").toLowerCase().trim();

    // Check Doctor match
    let doctorMatches = false;
    if (doIdsMatch(m.doctor_id, normTargetDocId)) {
      doctorMatches = true;
    } else if (normTargetDocName && mDocName) {
      doctorMatches = mDocName.includes(normTargetDocName) || normTargetDocName.includes(mDocName);
    } else if (!m.doctor_id && !normTargetDocId) {
      doctorMatches = true;
    }

    if (!doctorMatches) return false;

    // Check Patient match
    let patientMatches = false;
    if (doIdsMatch(m.patient_id, normTargetPatId)) {
      patientMatches = true;
    } else if (normTargetPatName && mPatName) {
      patientMatches = mPatName.includes(normTargetPatName) || normTargetPatName.includes(mPatName);
    } else if (!m.patient_id && !normTargetPatId) {
      patientMatches = true;
    }

    return patientMatches;
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
  const canonicalDocId = normalizeParticipantId(doctorId);
  const canonicalPatId = normalizeParticipantId(patientId);

  const globalLocal = getAllGlobalMessages();
  let filtered = filterConversationMessages(globalLocal, canonicalDocId, canonicalPatId, doctorName, patientName);

  if (isConversationDeletedLocally(canonicalDocId, canonicalPatId, doctorName, patientName)) {
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
      console.error("[doctorPatientChat] Error fetching remote messages:", error);
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

    return filterConversationMessages(updatedGlobal, canonicalDocId, canonicalPatId, doctorName, patientName);
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
  const canonicalDocId = normalizeParticipantId(doctorId);
  const canonicalPatId = normalizeParticipantId(patientId);
  const canonicalSenderId = normalizeParticipantId(senderId);

  // Untrack deleted conversation if a new message is sent
  untrackDeletedConversationLocally(canonicalDocId, canonicalPatId, doctorName, patientName);
  untrackDeletedConversationLocally(doctorId, patientId, doctorName, patientName);

  const newMessage: DoctorPatientMessage = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    doctor_id: canonicalDocId,
    patient_id: canonicalPatId,
    doctor_name: doctorName,
    patient_name: patientName,
    sender_id: canonicalSenderId,
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
            doctor_id: canonicalDocId,
            patient_id: canonicalPatId,
            doctor_name: doctorName,
            patient_name: patientName,
            sender_id: canonicalSenderId,
            sender_role: senderRole,
            content: newMessage.content,
            attachments: newMessage.attachments || [],
            is_read: false,
            created_at: newMessage.created_at,
          })
          .select()
          .maybeSingle();

        if (error) {
          console.error("[doctorPatientChat] Remote Supabase insert error:", error);
        } else if (data) {
          const serverMsg = data as DoctorPatientMessage;
          const idx = updatedGlobal.findIndex((m) => m.id === newMessage.id);
          if (idx !== -1) updatedGlobal[idx] = serverMsg;
          saveGlobalMessages(updatedGlobal);
          broadcastChatEvent("message", serverMsg);
          return serverMsg;
        }
      } catch (err) {
        console.error("[doctorPatientChat] Remote Supabase insert exception:", err);
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
  const canonicalDocId = normalizeParticipantId(doctorId);
  const canonicalPatId = normalizeParticipantId(patientId);
  const canonicalUserId = normalizeParticipantId(currentUserId);

  const currentGlobal = getAllGlobalMessages();
  let updated = false;

  const updatedGlobal = currentGlobal.map((m) => {
    if (normalizeParticipantId(m.sender_id) !== canonicalUserId && !m.is_read) {
      const isTargetConv = filterConversationMessages([m], canonicalDocId, canonicalPatId, doctorName, patientName).length > 0;
      if (isTargetConv) {
        updated = true;
        return { ...m, is_read: true };
      }
    }
    return m;
  });

  if (updated) {
    saveGlobalMessages(updatedGlobal);
    broadcastChatEvent("read", { doctorId: canonicalDocId, patientId: canonicalPatId, currentUserId: canonicalUserId });
  }

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb
      .from("doctor_patient_messages")
      .update({ is_read: true })
      .neq("sender_id", canonicalUserId)
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
  const canonicalDocId = normalizeParticipantId(doctorId);
  const canonicalPatId = normalizeParticipantId(patientId);

  const currentGlobal = getAllGlobalMessages();
  const targetConvMsgs = filterConversationMessages(currentGlobal, canonicalDocId, canonicalPatId, doctorName, patientName);
  const targetIds = new Set(targetConvMsgs.map((m) => m.id));

  // 1. Instantly clear from local universal storage
  const updatedGlobal = currentGlobal.filter((m) => {
    const isTargetConv = filterConversationMessages([m], canonicalDocId, canonicalPatId, doctorName, patientName).length > 0;
    return !isTargetConv && !targetIds.has(m.id);
  });
  saveGlobalMessages(updatedGlobal);

  // 2. Track deleted conversation locally so remote fetch won't re-add old messages
  trackDeletedConversationLocally(canonicalDocId, canonicalPatId, doctorName, patientName);
  trackDeletedConversationLocally(doctorId, patientId, doctorName, patientName);

  // 3. Broadcast deletion event across tabs & windows
  broadcastChatEvent("delete", { doctorId: canonicalDocId, patientId: canonicalPatId });

  // 4. Persist deletion in Supabase database
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    // Perform clean, robust individual delete queries
    await sb
      .from("doctor_patient_messages")
      .delete()
      .or(`doctor_id.eq.${canonicalDocId},doctor_id.eq.${doctorId}`)
      .or(`patient_id.eq.${canonicalPatId},patient_id.eq.${patientId}`);

    await sb
      .from("doctor_patient_messages")
      .delete()
      .or(`doctor_id.eq.${canonicalPatId},doctor_id.eq.${patientId}`)
      .or(`patient_id.eq.${canonicalDocId},patient_id.eq.${doctorId}`);

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

