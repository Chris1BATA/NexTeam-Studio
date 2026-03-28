/**
 * Tenant Subagent Service
 *
 * Manages per-client subagent configuration in Firestore.
 *
 * Firestore paths:
 *   tenants/{tenantId}                    — tenant config document
 *   tenants/{tenantId}/subagents/{id}     — per-subagent config for this tenant
 *
 * This is the groundwork for per-client Nexi instances backed by their
 * configured subagent set. Right now it writes the initial config;
 * runtime activation (actually routing work to subagents) is a future step.
 */

import { db } from "../../../firebase.js";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { getDefaultSubagents } from "../config/subagentRoster.js";

/**
 * Initialize a new tenant with their default subagent set.
 * Creates the tenant doc and a subagent config doc for each enabled subagent.
 *
 * Safe to call on existing tenants — uses merge so it won't overwrite
 * manually customized subagent configs.
 *
 * @param {string} tenantId
 * @param {Object} tenantMeta - { brandName, avatarName, industry, accentColor }
 * @param {string[]} [subagentIds] - subagent ids to enable (defaults to recommended 5)
 */
export async function initializeTenantSubagents(tenantId, tenantMeta = {}, subagentIds = null) {
  if (!tenantId) throw new Error("tenantId is required");

  const subagents = getDefaultSubagents();
  const enabledIds = subagentIds ?? subagents.map((s) => s.id);
  const enabledSet = new Set(enabledIds);

  // Write tenant root document
  const tenantRef = doc(db, "tenants", tenantId);
  await setDoc(
    tenantRef,
    {
      tenantId,
      brandName: tenantMeta.brandName || "NexTeam-Studio",
      avatarName: tenantMeta.avatarName || "Nexi",
      industry: tenantMeta.industry || "field-service",
      accentColor: tenantMeta.accentColor || "#4F46E5",
      activeSubagentIds: enabledIds,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  // Write each subagent config document
  for (const subagent of subagents) {
    const subRef = doc(db, "tenants", tenantId, "subagents", subagent.id);
    await setDoc(
      subRef,
      {
        id: subagent.id,
        name: subagent.name,
        role: subagent.role,
        enabled: enabledSet.has(subagent.id),
        customInstructions: null, // operator can set tenant-specific instructions here
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  console.log(`[tenantSubagentService] ✅ initialized tenant: ${tenantId} with ${enabledIds.length} subagents`);
}

/**
 * Fetch the active subagent configs for a tenant.
 *
 * @param {string} tenantId
 * @returns {Promise<Array>}
 */
export async function getTenantSubagents(tenantId) {
  if (!tenantId) return [];

  const subRef = collection(db, "tenants", tenantId, "subagents");
  const snapshot = await getDocs(subRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
