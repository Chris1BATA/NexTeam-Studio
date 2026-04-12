import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase.js";
import { NJORD_CONFIG } from "../config/njordConfig.js";

function normalizeDate(value) {
  return value?.toDate?.()?.toISOString?.() ?? null;
}

function mapTenantDoc(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    tenantId: data.tenantId || docSnap.id,
    brandName: data.brandName || docSnap.id,
    avatarName: data.avatarName || "Nexi",
    industry: data.industry || "field-service",
    accentColor: data.accentColor || "#4F46E5",
    missionControlEnabled: data.missionControlEnabled === true,
    registryVisible: data.registryVisible !== false,
    hostAgent: data.hostAgent || null,
    caseStudyMode: data.caseStudyMode === true,
    updatedAt: normalizeDate(data.updatedAt)
  };
}

export async function fetchMissionControlClients(maxResults = 50) {
  const q = query(collection(db, "tenants"), orderBy("updatedAt", "desc"), limit(maxResults));
  const snapshot = await getDocs(q);

  const liveClients = snapshot.docs
    .map(mapTenantDoc)
    .filter((client) => client.registryVisible && client.missionControlEnabled);

  const hasNjordCaseStudy = liveClients.some((client) => client.tenantId === NJORD_CONFIG.tenantId);

  if (!hasNjordCaseStudy) {
    liveClients.unshift({
      id: NJORD_CONFIG.tenantId,
      tenantId: NJORD_CONFIG.tenantId,
      brandName: NJORD_CONFIG.brandName,
      avatarName: NJORD_CONFIG.agentName,
      industry: NJORD_CONFIG.industry,
      accentColor: NJORD_CONFIG.accentColor,
      missionControlEnabled: true,
      registryVisible: true,
      hostAgent: NJORD_CONFIG.agentName,
      caseStudyMode: true,
      updatedAt: null,
      route: "/mission-control/aquatrace/workspace"
    });
  }

  return liveClients.map((client) => ({
    ...client,
    route: client.route || `/mission-control/${client.tenantId}`
  }));
}
