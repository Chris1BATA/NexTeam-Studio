import { db } from "../../../firebase.js";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

// Track sessions that have already had their initial doc created this browser session
// so we only set createdAt once per sessionId
const _initializedSessions = new Set();

/**
 * Called after each interviewer turn to incrementally persist the extracted spec patch.
 * Creates the agentSessions doc on first call, merges on subsequent calls.
 *
 * Firestore path: agentSessions/{sessionId}
 */
export async function applyAgentPatch(agentId, sessionId, patch, stage, missingFields) {
  if (!agentId || !sessionId) return null;

  try {
    const ref = doc(db, "agentSessions", sessionId);
    const isNew = !_initializedSessions.has(sessionId);

    const data = {
      agentId,
      sessionId,
      stage: stage || "unknown",
      missingFields: missingFields || [],
      ...patch,
      status: "in_progress",
      updatedAt: serverTimestamp()
    };

    if (isNew) {
      data.createdAt = serverTimestamp();
      _initializedSessions.add(sessionId);
    }

    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error("[firestoreSession] applyAgentPatch error:", err.message);
  }

  return null;
}

/**
 * Called when the conversation is complete and the spec is confirmed.
 * Marks the session as completed and records the completion timestamp.
 *
 * Firestore path: agentSessions/{sessionId}
 */
export async function completeAgent(agentId, sessionId) {
  if (!agentId || !sessionId) return null;

  try {
    const ref = doc(db, "agentSessions", sessionId);
    await updateDoc(ref, {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("[firestoreSession] completeAgent error:", err.message);
  }

  return null;
}
