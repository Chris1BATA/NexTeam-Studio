import { db } from "../../../firebase.js";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

/**
 * Fetches agent sessions from Firestore for the operator view.
 * Returns sessions ordered by most recent update first.
 *
 * Firestore path: agentSessions/{sessionId}
 */
export async function fetchAgentSessions(maxResults = 50) {
  const q = query(
    collection(db, "agentSessions"),
    orderBy("updatedAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    // Convert Firestore Timestamps to ISO strings for display
    createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    completedAt: docSnap.data().completedAt?.toDate?.()?.toISOString() ?? null
  }));
}
