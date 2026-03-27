import { EXTRACTOR_SYSTEM_PROMPT } from "../prompts/extractorSystemPrompt";
import { INTERVIEWER_SYSTEM_PROMPT } from "../prompts/interviewerSystemPrompt";

const ANTHROPIC_API_URL = "/api/anthropic/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

// Retry config — rate limits only
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function buildHeaders() {
  return {
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse a non-ok response body into a structured error descriptor.
// Consumes the response body — do not read it again after this.
async function parseApiError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // body may not be JSON (e.g. gateway timeout HTML)
  }

  const apiType = body?.error?.type || null;
  const isRateLimit =
    response.status === 429 ||
    response.status === 529 ||
    apiType === "rate_limit_error" ||
    apiType === "overloaded_error";

  return { isRateLimit, status: response.status };
}

// Convert a parsed error into a user-safe message string.
function friendlyErrorMessage(parsed, retriesExhausted = false) {
  if (parsed.isRateLimit) {
    return retriesExhausted
      ? "Nexi is still handling a lot of conversations. Please wait a moment and try again."
      : "Nexi is handling a lot of conversations right now. Trying again shortly…";
  }
  if (parsed.status >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return "Nexi had trouble responding. Please try again.";
}

// fetch() wrapper with exponential backoff for rate-limit responses.
// Throws a user-safe Error (with isFriendly=true) on unrecoverable failure.
async function fetchWithRetry(url, options) {
  let lastParsed = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.warn(`[architectApi] rate-limit retry ${attempt}/${MAX_RETRIES} — waiting ${delayMs}ms`);
      await sleep(delayMs);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (networkErr) {
      // Network failure — retry
      console.error("[architectApi] network error:", networkErr.message);
      lastParsed = { isRateLimit: false, status: 0 };
      continue;
    }

    if (response.ok) return response;

    lastParsed = await parseApiError(response);

    if (!lastParsed.isRateLimit) {
      // Non-retryable API error
      const err = new Error(friendlyErrorMessage(lastParsed));
      err.isFriendly = true;
      throw err;
    }

    if (attempt === MAX_RETRIES) break; // fall through to exhausted error
    // else loop and retry
  }

  // Retries exhausted
  const err = new Error(friendlyErrorMessage(lastParsed, true));
  err.isFriendly = true;
  err.isRateLimit = true;
  throw err;
}

// ---------------------------------------------------------------------------
// Interviewer turn — streaming
// ---------------------------------------------------------------------------

export async function streamInterviewerTurn(messages, onDelta, onComplete, onError) {
  // Lightweight token footprint logging (step 4)
  const contextSize = JSON.stringify(messages).length;
  console.log(
    `[architectApi] turn | msgs: ${messages.length} | context chars: ${contextSize} | est tokens: ~${Math.round(contextSize / 4)}`
  );

  const requestBody = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 600, // was 1000 — interviewer asks one question at a time
    stream: true,
    system: INTERVIEWER_SYSTEM_PROMPT,
    messages,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search"
      }
    ]
  });

  let response;
  try {
    response = await fetchWithRetry(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: requestBody
    });
  } catch (err) {
    onError(err); // already user-safe
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
// Extractor — non-streaming, no retry (silent failure is safe here)
// ---------------------------------------------------------------------------

export async function extractPatch(transcript) {
  const contextStr = JSON.stringify(transcript);
  console.log(
    `[architectApi] extractor | msgs: ${transcript.length} | chars: ${contextStr.length} | est tokens: ~${Math.round(contextStr.length / 4)}`
  );

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600, // was 1000 — pure JSON output, never needs 1000
        stream: false,
        system: EXTRACTOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: contextStr }]
      })
    });

    if (!response.ok) {
      console.warn(`[architectApi] extractPatch non-ok: ${response.status}`);
      return null;
    }

    const payload = await response.json();
    const text = payload?.content?.find((item) => item.type === "text")?.text || "";

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
