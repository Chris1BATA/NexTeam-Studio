import express from "express";
import { createServer } from "http";
import { createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4173;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

app.use(express.json({ limit: "2mb" }));

// Anthropic proxy — POST /api/anthropic/v1/messages
app.post("/api/anthropic/v1/messages", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Anthropic API key not configured." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(req.body)
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      // Forward content-type so the client can handle SSE or JSON correctly
      if (key.toLowerCase() === "content-type") res.setHeader(key, value);
    });

    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();
    const pump = async () => {
      const { value, done } = await reader.read();
      if (done) return res.end();
      res.write(value);
      return pump();
    };
    await pump();
  } catch (err) {
    console.error("[proxy/anthropic] error:", err.message);
    res.status(502).json({ error: "Upstream Anthropic request failed." });
  }
});

// ElevenLabs proxy — POST /elevenlabs/v1/text-to-speech/:voiceId/stream
app.post("/elevenlabs/v1/text-to-speech/:voiceId/stream", async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ElevenLabs API key not configured." });
  }

  const { voiceId } = req.params;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (["content-type", "transfer-encoding"].includes(lower)) {
        res.setHeader(key, value);
      }
    });

    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();
    const pump = async () => {
      const { value, done } = await reader.read();
      if (done) return res.end();
      res.write(value);
      return pump();
    };
    await pump();
  } catch (err) {
    console.error("[proxy/elevenlabs] error:", err.message);
    res.status(502).json({ error: "Upstream ElevenLabs request failed." });
  }
});

// Serve built Vite app
app.use(express.static(join(__dirname, "dist")));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

createServer(app).listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
