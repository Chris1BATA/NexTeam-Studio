import { db } from "../../../firebase.js";

export async function applyAgentPatch(agentId, sessionId, patch, stage, missingFields) {
  console.log("TODO: implement applyAgentPatch", { db, agentId, sessionId, patch, stage, missingFields });
  return null;
}

export async function completeAgent(agentId, sessionId) {
  console.log("TODO: implement completeAgent", { db, agentId, sessionId });
  return null;
}
