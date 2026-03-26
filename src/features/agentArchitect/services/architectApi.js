import { EXTRACTOR_SYSTEM_PROMPT } from "../prompts/extractorSystemPrompt";
import { INTERVIEWER_SYSTEM_PROMPT } from "../prompts/interviewerSystemPrompt";

const ANTHROPIC_API_URL = "/api/anthropic/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

function buildHeaders() {
  return {
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "anthropic-dangerous-direct-browser-access": "true"
  };
}

export async function streamInterviewerTurn(messages, onDelta, onComplete, onError) {
  try {
    console.log("streamInterviewerTurn messages", messages);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        stream: true,
        system: INTERVIEWER_SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(errorText || "Anthropic streaming request failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventChunk of events) {
        if (!eventChunk.trim()) {
          continue;
        }

        const lines = eventChunk.split("\n");
        let eventName = "";
        const dataLines = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          }

          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const rawData = dataLines.join("\n");

        if (!rawData || rawData === "[DONE]") {
          continue;
        }

        const payload = JSON.parse(rawData);

        if (eventName === "content_block_delta" && payload.delta?.type === "text_delta") {
          onDelta(payload.delta.text || "");
        }
      }

      if (done) {
        break;
      }
    }

    onComplete();
  } catch (error) {
    onError(error);
  }
}

export async function extractPatch(transcript) {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        stream: false,
        system: EXTRACTOR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify(transcript)
          }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const text = payload?.content?.find((item) => item.type === "text")?.text || "";

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
