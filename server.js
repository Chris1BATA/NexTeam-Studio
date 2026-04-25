import express from "express";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { createServer } from "http";
import { createReadStream, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { executeBragiWordpressDraft } from "./src/features/missioncontrol/services/bragiWordpressService.js";
import {
  attachTelegramMessageToDraft,
  buildDraftApprovalMessage,
  getBragiApprovalStatePath,
  handleTelegramApproval,
  loadApprovalState,
  registerPendingDraft,
  sendTelegramMessage,
} from "./src/features/missioncontrol/services/bragiTelegramApprovalService.js";
import {
  approveVgbCampaign,
  buildVgbDryRun,
  getVgbCampaignStatePath,
  loadVgbCampaignState,
  logVgbSendResult,
  verifyControlledSendProtection,
} from "./src/features/missioncontrol/services/vgbControlledCampaignService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadLocalEnv();
const app = express();
const PORT = process.env.PORT || 3001;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Chris Sears ? Aquatrace Swimming Pool Leak Detection";
const GOOGLE_OAUTH_CREDENTIALS_PATH = join(__dirname, "credentials", "nexteam-gmail-oauth.json");
const googleOAuthSettings = loadGoogleOAuthSettings();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || googleOAuthSettings.clientId;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || googleOAuthSettings.clientSecret;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || googleOAuthSettings.redirectUri;
const GMAIL_SEND_FROM = process.env.GMAIL_SEND_FROM;
const GMAIL_SEND_AS_NAME = process.env.GMAIL_SEND_AS_NAME || "Chris Sears ? Aquatrace Swimming Pool Leak Detection";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CLAWDIA_REFERENCE_MANIFEST_PATH = join(__dirname, "docs", "internal", "clawdia", "reference-files.json");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHRIS_CHAT_ID = process.env.TELEGRAM_CHRIS_CHAT_ID;
const BRAGI_TELEGRAM_WEBHOOK_SECRET = process.env.BRAGI_TELEGRAM_WEBHOOK_SECRET || "";
const GMAIL_ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);
const GMAIL_ATTACHMENT_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

app.use(express.json({ limit: "15mb" }));

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

// Njord test-email endpoint — POST /api/njord/send-test-email
// Sends a single test/review email to the configured test address.
// ONLY used for case-study operator review — never sends to the full list.
app.post("/api/njord/send-test-email", async (req, res) => {
  if (!RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: "RESEND_API_KEY not configured on the server." });
  }

  const { campaignId, subject, html, toAddress } = req.body || {};

  if (!campaignId || !subject || !html || !toAddress) {
    return res.status(400).json({ ok: false, error: "Missing required fields: campaignId, subject, html, toAddress." });
  }

  // Safety: this endpoint may only send to the configured test email.
  // Reject any attempt to send to a different address via this route.
  const allowedTo = process.env.VITE_NJORD_TEST_EMAIL || "";
  if (!allowedTo) {
    return res.status(500).json({ ok: false, error: "VITE_NJORD_TEST_EMAIL not configured. Set it in Railway env vars." });
  }
  if (toAddress.toLowerCase().trim() !== allowedTo.toLowerCase().trim()) {
    return res.status(403).json({
      ok: false,
      error: `Test email may only be sent to the configured test address. Received: ${toAddress}`
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [toAddress],
        subject: `[Njord Test Review] ${subject}`,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[njord/send-test-email] Resend error:", data);
      return res.status(502).json({ ok: false, error: data?.message || "Resend API error.", detail: data });
    }

    console.log(`[njord/send-test-email] ✅ test email sent — campaignId: ${campaignId} to: ${toAddress} resendId: ${data.id}`);
    return res.json({ ok: true, resendId: data.id, to: toAddress });
  } catch (err) {
    console.error("[njord/send-test-email] fetch error:", err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
});

app.post("/api/bragi/wordpress/execute", async (req, res) => {
  try {
    const body = req.body || {};
    const articlePackage = body.articlePackage || body;
    const credentials = body.credentials || getAquatraceWordpressCredentials();

    const result = await executeBragiWordpressDraft({
      postId: articlePackage.postId,
      title: articlePackage.title,
      content: articlePackage.contentHtml,
      slug: articlePackage.slug,
      excerpt: articlePackage.excerpt,
      commentStatus: articlePackage.commentStatus || "closed",
      pingStatus: articlePackage.pingStatus || "closed",
      yoast: articlePackage.yoast,
      credentials,
    });

    if (body.notifyTelegram && result?.postId) {
      const pendingDraft = registerPendingDraft({
        postId: result.postId,
        title: result.wordpress?.title || articlePackage.title || "Bragi Draft",
        draftUrl: result.draftUrl,
        status: result.wordpress?.status || "draft",
        focusKeyphrase: result.yoast?.focusKeyphrase || articlePackage.yoast?.focusKeyphrase || "",
        summary: articlePackage.summary || articlePackage.excerpt || result.wordpress?.title || "",
      });

      const telegramResult = await sendTelegramMessage({
        botToken: TELEGRAM_BOT_TOKEN,
        chatId: TELEGRAM_CHRIS_CHAT_ID,
        text: buildDraftApprovalMessage(pendingDraft),
      });

      attachTelegramMessageToDraft({
        postId: pendingDraft.postId,
        messageId: telegramResult.message_id,
        chatId: TELEGRAM_CHRIS_CHAT_ID,
      });
    }

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("[bragi/wordpress/execute] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/bragi/telegram/notify-draft", async (req, res) => {
  try {
    const { postId, title, draftUrl, status, focusKeyphrase, summary } = req.body || {};
    if (!postId || !title || !draftUrl) {
      return res.status(400).json({ ok: false, error: "Missing required fields: postId, title, draftUrl." });
    }

    const pendingDraft = registerPendingDraft({
      postId,
      title,
      draftUrl,
      status: status || "draft",
      focusKeyphrase: focusKeyphrase || "",
      summary: summary || "",
    });

    const telegramResult = await sendTelegramMessage({
      botToken: TELEGRAM_BOT_TOKEN,
      chatId: TELEGRAM_CHRIS_CHAT_ID,
      text: buildDraftApprovalMessage(pendingDraft),
    });

    const storedDraft = attachTelegramMessageToDraft({
      postId: pendingDraft.postId,
      messageId: telegramResult.message_id,
      chatId: TELEGRAM_CHRIS_CHAT_ID,
    });

    return res.json({
      ok: true,
      postId: storedDraft.postId,
      telegramMessageId: storedDraft.telegramMessageId,
      statePath: getBragiApprovalStatePath(),
    });
  } catch (err) {
    console.error("[bragi/telegram/notify-draft] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/bragi/telegram/webhook", async (req, res) => {
  try {
    if (BRAGI_TELEGRAM_WEBHOOK_SECRET) {
      const providedSecret = req.get("x-telegram-bot-api-secret-token") || "";
      if (providedSecret !== BRAGI_TELEGRAM_WEBHOOK_SECRET) {
        return res.status(403).json({ ok: false, error: "Invalid Telegram webhook secret." });
      }
    }

    const result = await handleTelegramApproval({
      message: req.body?.message,
      botToken: TELEGRAM_BOT_TOKEN,
      expectedChatId: TELEGRAM_CHRIS_CHAT_ID,
      credentials: getAquatraceWordpressCredentials(),
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("[bragi/telegram/webhook] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/bragi/telegram/test-command", async (req, res) => {
  try {
    const state = loadApprovalState();
    const latestPending = [...state.pendingDrafts]
      .filter((entry) => entry.approvalStatus === "pending" && entry.telegramMessageId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latestPending) {
      return res.status(400).json({ ok: false, error: "No pending Bragi draft with a Telegram message ID is available for testing." });
    }

    const text = req.body?.text || "REVISE tighten the opening paragraph";
    const result = await handleTelegramApproval({
      message: {
        message_id: Date.now(),
        text,
        chat: { id: TELEGRAM_CHRIS_CHAT_ID },
        reply_to_message: { message_id: latestPending.telegramMessageId },
      },
      botToken: TELEGRAM_BOT_TOKEN,
      expectedChatId: TELEGRAM_CHRIS_CHAT_ID,
      credentials: getAquatraceWordpressCredentials(),
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("[bragi/telegram/test-command] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/auth/google/start", (_req, res) => {
  try {
    const client = createGoogleOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.send"],
    });
    return res.redirect(url);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const client = createGoogleOAuthClient();
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing authorization code.");
    const { tokens } = await client.getToken(code);
    return res.send(
      '<html><body style="font-family:sans-serif;padding:24px;background:#08111F;color:#E2E8F0"><h2>Google authorization complete</h2><p>Set this as GOOGLE_REFRESH_TOKEN:</p><pre style="white-space:pre-wrap;background:#111827;padding:16px;border-radius:12px">' + (tokens.refresh_token || 'NO_REFRESH_TOKEN_RETURNED') + '</pre></body></html>'
    );
  } catch (err) {
    return res.status(500).send('OAuth callback failed: ' + err.message);
  }
});

app.get("/api/vgb/campaign/state", (_req, res) => {
  return res.json({ ok: true, state: loadVgbCampaignState(), statePath: getVgbCampaignStatePath() });
});

app.post("/api/vgb/campaign/dry-run", (req, res) => {
  try {
    const { contacts = [], subject = "", bodyPreview = "" } = req.body || {};
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ ok: false, error: "contacts must be an array." });
    }

    const result = buildVgbDryRun({ contacts, subject, bodyPreview });
    return res.json({ ok: true, result, statePath: getVgbCampaignStatePath() });
  } catch (err) {
    console.error("[vgb/campaign/dry-run] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/vgb/campaign/approve", (req, res) => {
  try {
    const { approvedBy = "Chris" } = req.body || {};
    const state = approveVgbCampaign({ approvedBy });
    return res.json({ ok: true, approvedByChris: state.approvedByChris, approvedAt: state.approvedAt });
  } catch (err) {
    console.error("[vgb/campaign/approve] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/vgb/send-email", async (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !GMAIL_SEND_FROM || !GOOGLE_REFRESH_TOKEN) {
    return res.status(500).json({ ok: false, error: "Google email settings are not configured on the server." });
  }

  const { toAddress, subject, body, propertyName, attachments, campaignMode = "single-test", contactId, controlledBatchCount = 1 } = req.body || {};
  if (!toAddress || !subject || !body) {
    return res.status(400).json({ ok: false, error: "Missing required email fields." });
  }

  if (campaignMode === "controlled-send") {
    const protection = verifyControlledSendProtection({ requestedCount: Number(controlledBatchCount || 1) });
    if (!protection.ok) {
      return res.status(403).json({ ok: false, error: protection.reason });
    }
  }

  try {
    const client = createGoogleOAuthClient();
    client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    const gmail = google.gmail({ version: "v1", auth: client });
    const safeAttachments = sanitizeEmailAttachments(attachments);
    const raw = buildGmailRawMessage({
      fromName: GMAIL_SEND_AS_NAME,
      fromAddress: GMAIL_SEND_FROM,
      toAddress,
      subject,
      body,
      attachments: safeAttachments,
    });
    const response = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    if (campaignMode === "controlled-send") {
      logVgbSendResult({
        contactId: contactId || toAddress,
        email: toAddress,
        propertyName,
        messageId: response.data.id,
        sentAt: new Date().toISOString(),
        subject,
      });
    }
    return res.json({
      ok: true,
      messageId: response.data.id,
      propertyName: propertyName || null,
      sentAt: new Date().toISOString(),
      attachmentCount: safeAttachments.length,
    });
  } catch (err) {
    console.error("[vgb/send-email] error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

function loadClawdiaReferenceManifest() {
  return JSON.parse(readFileSync(CLAWDIA_REFERENCE_MANIFEST_PATH, "utf8"));
}

function sanitizeEmailAttachments(attachments) {
  if (!attachments) {
    return [];
  }
  if (!Array.isArray(attachments)) {
    throw new Error("Attachments must be an array.");
  }

  return attachments.map((attachment, index) => {
    const filename = String(attachment?.filename || "").trim();
    const mimeType = String(attachment?.mimeType || "").trim().toLowerCase();
    const contentBase64 = String(attachment?.contentBase64 || "").trim();

    if (!filename || !mimeType || !contentBase64) {
      throw new Error(`Attachment ${index + 1} is missing filename, mimeType, or contentBase64.`);
    }

    if (!GMAIL_ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
      throw new Error(`Attachment ${filename} has an unsupported MIME type.`);
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (!buffer.length) {
      throw new Error(`Attachment ${filename} is empty.`);
    }

    if (buffer.byteLength > GMAIL_ATTACHMENT_SIZE_LIMIT_BYTES) {
      throw new Error(`Attachment ${filename} exceeds the ${GMAIL_ATTACHMENT_SIZE_LIMIT_BYTES} byte limit.`);
    }

    return {
      filename,
      mimeType,
      contentBase64: buffer.toString("base64"),
    };
  });
}

function buildGmailRawMessage({ fromName, fromAddress, toAddress, subject, body, attachments = [] }) {
  if (!attachments.length) {
    const lines = [
      `From: ${fromName} <${fromAddress}>`,
      `To: ${toAddress}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ];

    return Buffer.from(lines.join("\r\n")).toString("base64url");
  }

  const boundary = `nexteam-${Date.now().toString(36)}`;
  const lines = [
    `From: ${fromName} <${fromAddress}>`,
    `To: ${toAddress}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ];

  for (const attachment of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachment.contentBase64.match(/.{1,76}/g)?.join("\r\n") || attachment.contentBase64
    );
  }

  lines.push(`--${boundary}--`, "");
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

function loadLocalEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = value;
  }
}

function getReferenceText(relativePath) {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

function loadGoogleOAuthSettings() {
  if (!existsSync(GOOGLE_OAUTH_CREDENTIALS_PATH)) {
    return { clientId: "", clientSecret: "", redirectUri: "" };
  }

  try {
    const parsed = JSON.parse(readFileSync(GOOGLE_OAUTH_CREDENTIALS_PATH, "utf8"));
    const credentials = parsed.web || parsed.installed || {};

    return {
      clientId: credentials.client_id || "",
      clientSecret: credentials.client_secret || "",
      redirectUri: credentials.redirect_uris?.[0] || "",
    };
  } catch (error) {
    console.error("[google-oauth] credentials file load error:", error.message);
    return { clientId: "", clientSecret: "", redirectUri: "" };
  }
}

function createGoogleOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth settings are not configured.");
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function getAquatraceWordpressCredentials() {
  const appPasswordRaw = getReferenceText("docs/internal/clawdia/reference/aquatrace/aquatrace-wordpress-application-password.txt");
  const editorLoginRaw = getReferenceText("docs/internal/clawdia/reference/aquatrace/aquatrace-wordpress-editor-login.txt");

  const apiPassword = appPasswordRaw.match(/Password\s*\r?\n([^\r\n]+)/i)?.[1]?.trim();
  const editorUsername = editorLoginRaw.match(/Username\s*\r?\n([^\r\n]+)/i)?.[1]?.trim();
  const editorPassword = editorLoginRaw.match(/Password\s*\r?\n([^\r\n]+)/i)?.[1]?.trim();

  if (!apiPassword || !editorUsername || !editorPassword) {
    throw new Error("Aquatrace WordPress credentials are incomplete.");
  }

  return {
    siteUrl: "https://aquatraceleak.com",
    apiUsername: editorUsername,
    apiPassword,
    editorUsername,
    editorPassword,
  };
}

app.get("/api/internal/clawdia/reference-files", (_req, res) => {
  try {
    res.json(loadClawdiaReferenceManifest());
  } catch (err) {
    console.error("[clawdia/reference-files] manifest error:", err.message);
    res.status(500).json({ error: "Clawdia reference manifest is unavailable." });
  }
});

app.get("/api/internal/clawdia/reference-files/:fileId", (req, res) => {
  try {
    const manifest = loadClawdiaReferenceManifest();
    const file = manifest.files.find((entry) => entry.id === req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: "Reference file not found." });
    }

    const absolutePath = join(__dirname, file.relativePath);
    res.setHeader("Content-Type", file.type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
    createReadStream(absolutePath).pipe(res);
  } catch (err) {
    console.error("[clawdia/reference-files] file error:", err.message);
    res.status(500).json({ error: "Clawdia reference file is unavailable." });
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
