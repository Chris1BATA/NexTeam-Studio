/**
 * firestorePaths.js — Centralized, normalized Firestore path construction
 * for all mission control collections.
 *
 * WHY THIS FILE EXISTS:
 *   Collection paths were previously built inline via template literals using
 *   raw config values. This file centralizes all path construction, enforces
 *   tenant ID allow-listing, and strips any path-injection characters before
 *   they reach Firestore.
 *
 * RULES:
 *   - All collection paths MUST go through these helpers.
 *   - Never call `collection(db, \`tenants/${someId}/...\`)` directly.
 *   - Tenant IDs must pass isSafeTenantId() — reject unknown tenants early.
 */

/** Allowed tenant IDs. Must match isKnownTenant() in firestore.rules. */
const KNOWN_TENANT_IDS = new Set([
  "aquatrace-case-study",
  "nexteam-studio"
]);

/**
 * Strip characters that could be used to escape collection paths.
 * Firestore paths cannot contain '/' in a segment, but we also strip null bytes
 * and other control characters for defence-in-depth.
 *
 * @param {string} segment
 * @returns {string}
 */
function sanitizeSegment(segment) {
  if (typeof segment !== "string") return "";
  return segment
    .replace(/[/\x00-\x1F\x7F]/g, "") // remove slashes, control chars
    .trim()
    .slice(0, 128); // hard cap on length
}

/**
 * Returns true if the given tenantId is on the explicit allow-list.
 *
 * @param {string} tenantId
 * @returns {boolean}
 */
export function isSafeTenantId(tenantId) {
  return typeof tenantId === "string" && KNOWN_TENANT_IDS.has(tenantId);
}

/**
 * Assert a tenant ID is safe. Throws if not, so callers fail loudly in dev.
 *
 * @param {string} tenantId
 * @throws {Error}
 */
export function assertSafeTenantId(tenantId) {
  if (!isSafeTenantId(tenantId)) {
    throw new Error(`[firestorePaths] Rejected unknown tenantId: "${tenantId}"`);
  }
}

// ── collection path constants ────────────────────────────────────────────────

/**
 * Tenant-scoped SOP collection path.
 * @param {string} tenantId
 * @returns {string}
 */
export function sopCollectionPath(tenantId) {
  assertSafeTenantId(tenantId);
  return `tenants/${tenantId}/sops`;
}

/**
 * Tenant-scoped Blueprint collection path.
 * @param {string} tenantId
 * @returns {string}
 */
export function blueprintCollectionPath(tenantId) {
  assertSafeTenantId(tenantId);
  return `tenants/${tenantId}/blueprints`;
}

/**
 * Tenant-scoped OnboardingSessions collection path.
 * @param {string} tenantId
 * @returns {string}
 */
export function onboardingSessionCollectionPath(tenantId) {
  assertSafeTenantId(tenantId);
  return `tenants/${tenantId}/onboardingSessions`;
}

/**
 * Individual onboarding session document path.
 * @param {string} tenantId
 * @param {string} sessionId
 * @returns {string}
 */
export function onboardingSessionDocPath(tenantId, sessionId) {
  assertSafeTenantId(tenantId);
  const safeSessionId = sanitizeSegment(sessionId);
  if (!safeSessionId) throw new Error("[firestorePaths] Invalid sessionId");
  return `tenants/${tenantId}/onboardingSessions/${safeSessionId}`;
}

/**
 * Individual SOP document path.
 * @param {string} tenantId
 * @param {string} sopId
 * @returns {string}
 */
export function sopDocPath(tenantId, sopId) {
  assertSafeTenantId(tenantId);
  const safeSopId = sanitizeSegment(sopId);
  if (!safeSopId) throw new Error("[firestorePaths] Invalid sopId");
  return `tenants/${tenantId}/sops/${safeSopId}`;
}

/**
 * Individual Blueprint document path.
 * @param {string} tenantId
 * @param {string} blueprintId
 * @returns {string}
 */
export function blueprintDocPath(tenantId, blueprintId) {
  assertSafeTenantId(tenantId);
  const safeBlueprintId = sanitizeSegment(blueprintId);
  if (!safeBlueprintId) throw new Error("[firestorePaths] Invalid blueprintId");
  return `tenants/${tenantId}/blueprints/${safeBlueprintId}`;
}

/**
 * AgentSessions document path with sanitized sessionId.
 * @param {string} sessionId
 * @returns {string}
 */
export function agentSessionDocPath(sessionId) {
  const safeId = sanitizeSegment(sessionId);
  if (!safeId) throw new Error("[firestorePaths] Invalid agentSession sessionId");
  return `agentSessions/${safeId}`;
}

/**
 * ClientOrganizations document path.
 * @param {string} clientId
 * @returns {string}
 */
export function clientOrgDocPath(clientId) {
  const safeId = sanitizeSegment(clientId);
  if (!safeId) throw new Error("[firestorePaths] Invalid clientId");
  return `clientOrganizations/${safeId}`;
}

/**
 * Portal member document path (subcollection).
 * @param {string} clientId
 * @param {string} userId
 * @returns {string}
 */
export function portalMemberDocPath(clientId, userId) {
  const safeClientId = sanitizeSegment(clientId);
  const safeUserId = sanitizeSegment(userId);
  if (!safeClientId || !safeUserId) throw new Error("[firestorePaths] Invalid clientId or userId");
  return `clientOrganizations/${safeClientId}/members/${safeUserId}`;
}
