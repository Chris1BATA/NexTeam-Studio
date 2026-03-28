import { EXTRACTOR_SYSTEM_PROMPT } from "../prompts/extractorSystemPrompt";
import { INTERVIEWER_SYSTEM_PROMPT } from "../prompts/interviewerSystemPrompt";

const ANTHROPIC_API_URL = "/api/anthropic/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// Retry config — rate limits only
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

// How many recent message pairs to keep for conversational continuity
const RECENT_TURNS_TO_KEEP = 4; // 2 user + 2 assistant

function buildHeaders() {
  return {
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseApiError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // body may not be JSON
  }
  const apiType = body?.error?.type || null;
  const isRateLimit =
    response.status === 429 ||
    response.status === 529 ||
    apiType === "rate_limit_error" ||
    apiType === "overloaded_error";
  return { isRateLimit, status: response.status };
}

function friendlyErrorMessage(parsed, retriesExhausted = false) {
  if (parsed.isRateLimit) {
    return retriesExhausted
      ? "Nexi is still handling a lot of conversations. Please wait a moment and try again."
      : "Nexi is handling a lot of conversations right now. Trying again shortly\u2026";
  }
  if (parsed.status >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return "Nexi had trouble responding. Please try again.";
}

async function fetchWithRetry(url, options) {
  let lastParsed = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`[architectApi] rate-limit retry ${attempt}/${MAX_RETRIES} — waiting ${delayMs}ms`);
      await sleep(delayMs);
    }
    let response;
    try {
      response = await fetch(url, options);
    } catch (networkErr) {
      console.error("[architectApi] network error:", networkErr.message);
      lastParsed = { isRateLimit: false, status: 0 };
      continue;
    }
    if (response.ok) return response;
    lastParsed = await parseApiError(response);
    if (!lastParsed.isRateLimit) {
      const err = new Error(friendlyErrorMessage(lastParsed));
      err.isFriendly = true;
      throw err;
    }
    if (attempt === MAX_RETRIES) break;
  }
  const err = new Error(friendlyErrorMessage(lastParsed, true));
  err.isFriendly = true;
  err.isRateLimit = true;
  throw err;
}

// ---------------------------------------------------------------------------
// Step 6-7: Build compact context — state summary + recent turns only
// Replaces full transcript replay. Reduces input tokens ~50-70% mid-interview.
// ---------------------------------------------------------------------------

function buildCompactMessages(fullMessages, draftPatch, currentStage) {
  // Serialize only non-empty patch fields for state summary
  const collectedFields = Object.entries(draftPatch || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("\n");

  const stateSummary = [
    `[Session state — do not repeat this to the user]`,
    `Current stage: ${currentStage || "business_name"}`,
    collectedFields ? `Already collected:\n${collectedFields}` : "Nothing collected yet.",
    `Continue the conversation from where it left off. Ask only the next needed question.`
  ].join("\n");

  // Keep only the last N messages for recent conversational context
  const recentMessages = fullMessages.slice(-RECENT_TURNS_TO_KEEP);

  // Inject state summary as a prefixed system note in the first user message,
  // or as a standalone assistant-acknowledged context block if no recent messages.
  if (recentMessages.length === 0) {
    return [{ role: "user", content: stateSummary }];
  }

  // Prepend state summary to the oldest kept message if it's a user turn,
  // otherwise insert it before the recent window.
  const first = recentMessages[0];
  if (first.role === "user") {
    return [
      { role: "user", content: `${stateSummary}\n\n---\n${first.content}` },
      ...recentMessages.slice(1)
    ];
  }

  // First kept message is assistant — insert state context before it
  return [
    { role: "user", content: stateSummary },
    ...recentMessages
  ];
}

// ---------------------------------------------------------------------------
// Interviewer turn — streaming, compact context
// ---------------------------------------------------------------------------

export async function streamInterviewerTurn(
  fullMessages,
  onDelta,
  onComplete,
  onError,
  draftPatch = {},
  currentStage = "business_name"
) {
  const compactMessages = buildCompactMessages(fullMessages, draftPatch, currentStage);

  // Step 4/8: lightweight token logging
  const fullSize = JSON.stringify(fullMessages).length;
  const compactSize = JSON.stringify(compactMessages).length;
  console.log(
    `[architectApi] turn | stage: ${currentStage} | full msgs: ${fullMessages.length} (${Math.round(fullSize / 4)} tok) | compact: ${compactMessages.length} msgs (${Math.round(compactSize / 4)} tok) | saved: ~${Math.round((fullSize - compactSize) / 4)} tok`
  );

  const requestBody = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    stream: true,
    system: INTERVIEWER_SYSTEM_PROMPT,
    messages: compactMessages,
    tools: [{ type: "web_search_20250305", name: "web_search" }]
  });

  let response;
  try {
    response = await fetchWithRetry(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: requestBody
    });
  } catch (err) {
    onError(err);
    return;
  }

  if (!response.body) {
    const err = new Error("Nexi had trouble responding. Please try again.");
    err.isFriendly = true;
    onError(err);
    return;
  }

  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventChunk of events) {
        if (!eventChunk.trim()) continue;
        const lines = eventChunk.split("\n");
        let eventName = "";
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        const rawData = dataLines.join("\n");
        if (!rawData || rawData === "[DONE]") continue;
        const payload = JSON.parse(rawData);
        if (eventName === "content_block_start" && payload.content_block?.type === "tool_use") continue;
        if (eventName === "content_block_delta" && payload.delta?.type === "text_delta") {
          onDelta(payload.delta.text || "");
        }
      }

      if (done) break;
    }
    onComplete();
  } catch (streamErr) {
    console.error("[architectApi] stream read error:", streamErr.message);
    const err = new Error("Nexi lost connection mid-reply. Please try again.");
    err.isFriendly = true;
    onError(err);
  }
}

// ---------------------------------------------------------------------------
// Extractor — compact: send only the last 6 messages + current draftPatch
// ---------------------------------------------------------------------------

export async function extractPatch(fullTranscript, draftPatch = {}) {
  // Only send recent turns + current patch state — not full history
  const recentTranscript = fullTranscript.slice(-6);
  const payload = {
    recentTranscript,
    currentPatch: draftPatch
  };
  const contextStr = JSON.stringify(payload);

  console.log(
    `[architectApi] extractor | recent msgs: ${recentTranscript.length}/${fullTranscript.length} | chars: ${contextStr.length} | est tokens: ~${Math.round(contextStr.length / 4)}`
  );

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        stream: false,
        system: EXTRACTOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: contextStr }]
      })
    });

    if (!response.ok) {
      console.warn(`[architectApi] extractPatch non-ok: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data?.content?.find((item) => item.type === "text")?.text || "";
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    console.error("[architectApi] extractPatch error:", err.message);
    return null;
  }
}
