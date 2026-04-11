/**
 * Njord Intent Classifier — Stub
 *
 * Classifies inbound user messages into intent tags.
 * Used by the Njord session handler to route requests to the
 * correct Norse subagent (Heimdall, Thor, Mimir, Freyja, Bragi).
 *
 * Current state: keyword-based stub.
 * Future state: replace with LLM-backed classification call via server.js.
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {string}   intent      - Primary intent tag
 * @property {number}   confidence  - 0.0–1.0 (stub always returns 0.7)
 * @property {string[]} candidates  - All matched intent candidates
 * @property {string}   method      - "keyword-stub" | "llm"
 */

/** Keyword → intent mapping (stub implementation) */
const INTENT_KEYWORDS = {
  intake: ["new", "sign up", "register", "add", "contact"],
  validation: ["check", "verify", "valid", "confirm"],
  routing: ["route", "send to", "forward", "assign"],
  campaign: ["campaign", "blast", "send", "email", "outreach", "sequence"],
  "email-send": ["send email", "email out", "deliver", "dispatch email"],
  "follow-up": ["follow up", "followup", "remind", "nudge", "check in"],
  lookup: ["look up", "find", "search", "who is", "show me", "get"],
  research: ["research", "investigate", "background", "history"],
  "record-fetch": ["fetch record", "pull record", "retrieve", "load"],
  relationship: ["relationship", "connect", "how are they", "engagement"],
  sentiment: ["sentiment", "feel", "mood", "happy", "unhappy", "upset"],
  nurture: ["nurture", "drip", "warm up", "stay in touch"],
  content: ["write", "draft", "create content", "template", "copy"],
  "subject-line": ["subject", "headline", "title"],
  "message-draft": ["draft message", "write email", "compose"],
};

/**
 * Classifies an input string into the most likely intent tag.
 *
 * @param {string} input - Raw user message
 * @returns {ClassificationResult}
 */
export function classifyIntent(input) {
  if (!input || typeof input !== "string") {
    return {
      intent: "intake",
      confidence: 0.5,
      candidates: ["intake"],
      method: "keyword-stub",
    };
  }

  const lower = input.toLowerCase();
  const matched = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(intent);
    }
  }

  if (matched.length === 0) {
    return {
      intent: "intake",
      confidence: 0.5,
      candidates: ["intake"],
      method: "keyword-stub",
    };
  }

  return {
    intent: matched[0],
    confidence: 0.7,
    candidates: matched,
    method: "keyword-stub",
  };
}
