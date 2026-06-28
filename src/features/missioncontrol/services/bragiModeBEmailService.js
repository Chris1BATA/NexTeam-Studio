import { existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import { join } from "path";

const REPO_ROOT = process.cwd();
const OAUTH_PATH = join(REPO_ROOT, "credentials", "nexteam-gmail-oauth.json");
const DEFAULT_TO_ADDRESS = "aquatraceleak@gmail.com";
const DEFAULT_FROM_NAME = "Chris Sears - Aquatrace Swimming Pool Leak Detection";

function loadGoogleOAuthSettings() {
  if (!existsSync(OAUTH_PATH)) {
    return { clientId: "", clientSecret: "", redirectUri: "" };
  }

  try {
    const parsed = JSON.parse(readFileSync(OAUTH_PATH, "utf8"));
    const credentials = parsed.web || parsed.installed || {};
    return {
      clientId: credentials.client_id || "",
      clientSecret: credentials.client_secret || "",
      redirectUri: credentials.redirect_uris?.[0] || "",
    };
  } catch {
    return { clientId: "", clientSecret: "", redirectUri: "" };
  }
}

function buildRawMessage({ fromName, fromAddress, toAddress, subject, body }) {
  return Buffer.from([
    `From: "${String(fromName || DEFAULT_FROM_NAME).replace(/"/g, "").trim()}" <${fromAddress}>`,
    `To: <${toAddress}>`,
    `Subject: ${String(subject || "").replace(/\r?\n/g, " ").trim()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    String(body || "").replace(/\r?\n/g, "\r\n"),
  ].join("\r\n")).toString("base64url");
}

export function buildBragiModeBReviewEmail({ topic, location, articlePackage, draftResult, photoSelection, linkPlan }) {
  const subject = `[Bragi Mode B Draft Review] ${location.display} | ${topic}`;
  const body = [
    "Chris,",
    "",
    "Bragi created a new Aquatrace WordPress draft for review.",
    "",
    `Topic: ${topic}`,
    `Location: ${location.display}`,
    `Title: ${articlePackage.title}`,
    `Draft URL: ${draftResult.url}`,
    `Edit URL: ${draftResult.editUrl}`,
    `Post ID: ${draftResult.postId}`,
    `WordPress status: ${draftResult.status}`,
    "Published: no",
    "Scheduled: no",
    "",
    `Focus keyword: ${articlePackage.focusKeyword}`,
    `SEO title: ${articlePackage.seoTitle}`,
    `Meta description: ${articlePackage.metaDescription}`,
    "",
    "Featured photo selection:",
    `- CompanyCam photo ID: ${photoSelection?.selected?.photo?.id || "n/a"}`,
    `- Score: ${photoSelection?.selected?.score ?? "n/a"}`,
    `- Distance from target area: ${photoSelection?.selected?.distanceMiles ?? "n/a"} miles`,
    `- Description: ${photoSelection?.selected?.photo?.description || "No CompanyCam description on file"}`,
    "",
    "Internal links used / intended:",
    ...linkPlan.internalLinks.map((link) => `- ${link.url} (${link.purpose})`),
    ...(linkPlan.externalLinks.length ? ["", "External link allowed:", ...linkPlan.externalLinks.map((link) => `- ${link.url} (${link.label})`)] : []),
    "",
    "Nothing was published automatically.",
  ].join("\n");

  return { subject, body };
}

export async function sendBragiModeBReviewEmail({ subject, body, toAddress = DEFAULT_TO_ADDRESS }) {
  const oauth = loadGoogleOAuthSettings();
  const clientId = process.env.GOOGLE_CLIENT_ID || oauth.clientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || oauth.clientSecret;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || oauth.redirectUri;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || "";
  const fromAddress = process.env.GMAIL_SEND_FROM || "";

  if (!clientId || !clientSecret || !redirectUri || !refreshToken || !fromAddress) {
    throw new Error("Google Gmail sender settings are not configured.");
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth: client });
  const raw = buildRawMessage({
    fromName: DEFAULT_FROM_NAME,
    fromAddress,
    toAddress,
    subject,
    body,
  });

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return {
    toAddress,
    messageId: response.data.id,
    sentAt: new Date().toISOString(),
  };
}
