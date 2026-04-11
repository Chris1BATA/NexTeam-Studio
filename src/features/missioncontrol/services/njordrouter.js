/**
 * Njord Router — Route Stubs for Norse Subagents
 *
 * Takes a classified intent and routes it to the appropriate
 * Norse subagent handler stub. Each handler logs the event
 * and returns a structured stub response.
 *
 * Expansion path:
 *   Replace each handler body with a real LLM call or tool invocation.
 */

import { getNorseAgentsForIntent } from "../config/norseRoster.js";
import { logNjordTurn } from "./njordSessionLogger.js";

/**
 * @typedef {Object} RouteResult
 * @property {string}   routedTo     - Agent id that handled the request
 * @property {string}   agentName    - Display name of the agent
 * @property {string}   response     - Response text (stub or real)
 * @property {boolean}  stub         - True if this is a scaffold stub response
 */

/**
 * Routes a classified intent to the correct Norse subagent and
 * returns a stub response. Logs the routing event to Firestore.
 *
 * @param {string} sessionId
 * @param {string} intent         - Classified intent tag
 * @param {string} userMessage    - Original user input
 * @returns {Promise<RouteResult>}
 */
export async function routeToNorseAgent(sessionId, intent, userMessage) {
  const [agent] = getNorseAgentsForIntent(intent);

  const stubResponse = buildStubResponse(agent, intent, userMessage);

  // Log the routing event
  await logNjordTurn(sessionId, "agent", stubResponse, {
    routedTo: agent.id,
    agentName: agent.name,
    intent,
    stub: true,
  });

  return {
    routedTo: agent.id,
    agentName: agent.name,
    response: stubResponse,
    stub: true,
  };
}

/**
 * Builds a readable stub response for a given agent and intent.
 *
 * @param {import('../config/norseRoster.js').NorseAgent} agent
 * @param {string} intent
 * @param {string} userMessage
 * @returns {string}
 */
function buildStubResponse(agent, intent, userMessage) {
  const stubs = {
    heimdall: `[Heimdall stub] Received: "${userMessage}". Intake recorded. Ready to validate and route.`,
    thor: `[Thor stub] Campaign request logged: "${userMessage}". Awaiting approval before any send action.`,
    mimir: `[Mimir stub] Lookup request: "${userMessage}". Record retrieval not yet implemented — stub only.`,
    freyja: `[Freyja stub] Relationship/engagement note: "${userMessage}". Sentiment tracking not yet active.`,
    bragi: `[Bragi stub] Content request: "${userMessage}". Draft generation not yet implemented — stub only.`,
  };

  return stubs[agent.id] || `[${agent.name} stub] Request received: "${userMessage}".`;
}
