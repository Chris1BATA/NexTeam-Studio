import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { startLocalRailApiServer } from "../src/features/missioncontrol/services/localRailApiServer.js";
import { answerNexiOperatorQuestion } from "../src/server/nexiOperatorQueryService.js";

const DEFAULT_OPENCLAW_CONFIG = "C:\\Users\\Peyto\\.openclaw\\openclaw.json";
const CLAWDIA_BOT_BRAIN_SERVER_PATH = "C:\\Users\\Peyto\\clawdia-bot\\brainServer.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function readOpenClawGatewayToken() {
  if (!existsSync(DEFAULT_OPENCLAW_CONFIG)) {
    return "";
  }
  try {
    const parsed = JSON.parse(readFileSync(DEFAULT_OPENCLAW_CONFIG, "utf8"));
    return normalizeText(parsed?.gateway?.auth?.token);
  } catch {
    return "";
  }
}

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value;
  }
}

async function run() {
  loadLocalEnv();
  const localRailToken = normalizeText(process.env.RAIL_LOCAL_API_TOKEN) || readOpenClawGatewayToken();
  assert.ok(localRailToken, "A local rail token is required for the Nexi CompanyCam roundtrip test.");

  const railPort = 3211 + crypto.randomInt(0, 100);
  const brainPort = 8790 + crypto.randomInt(0, 100);
  process.env.RAIL_LOCAL_API_TOKEN = localRailToken;
  process.env.CLAWDIA_LOCAL_RAIL_API_URL = `http://127.0.0.1:${railPort}`;
  process.env.CLAWDIA_BRAIN_SHARED_SECRET = normalizeText(process.env.CLAWDIA_BRAIN_SHARED_SECRET) || localRailToken;
  process.env.CLAWDIA_BRAIN_PUBLIC_URL = `http://127.0.0.1:${brainPort}`;
  process.env.CLAWDIA_BRAIN_PORT = String(brainPort);
  process.env.CLAWDIA_CODEX_BRIDGE_PORT = String(brainPort + 1);
  delete process.env.CLAWDIA_CODEX_BRIDGE_URL;

  const { createClawdiaBrainServer } = await import(pathToFileURL(CLAWDIA_BOT_BRAIN_SERVER_PATH).href);
  const localRailServer = await startLocalRailApiServer({
    port: railPort,
  });
  const brain = createClawdiaBrainServer({
    port: brainPort,
    sharedSecret: process.env.CLAWDIA_BRAIN_SHARED_SECRET,
    logger: {
      log() {},
      warn() {},
      error() {},
    },
  });

  await brain.start();

  try {
    const result = await answerNexiOperatorQuestion({
      tenantId: "aquatrace",
      question: "What are the total pool gallons in the report for Camp Mikell in Toccoa GA?",
    });

    assert.equal(result.ok, true, "Nexi operator roundtrip should succeed.");
    assert.equal(result.handled, true, "Nexi operator roundtrip should be handled by Clawdia.");
    assert.match(result.response, /Camp Mikell/i, "response should identify the Camp Mikell project");
    assert.match(result.response, /101,000/i, "response should include the real gallons value");
    assert.match(result.response, /237 Camp Mikell Court/i, "response should include the real address");
    assert.equal(
      normalizeText(result.payload?.route?.kind),
      "companycam_job_data",
      "Clawdia should classify the request into the CompanyCam job-data lane"
    );

    const denied = await answerNexiOperatorQuestion({
      tenantId: "other-client",
      question: "What are the total pool gallons in the report for Camp Mikell in Toccoa GA?",
    });

    assert.equal(denied.ok, false, "A non-Aquatrace tenant should not be granted CompanyCam access.");
    assert.equal(denied.handled, true, "The denied request should still be handled deterministically.");
    assert.match(
      denied.response,
      /not approved|blocked/i,
      "The denied response should explain that CompanyCam tenant scope is blocked."
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          response: result.response,
          route: result.payload?.route || null,
          route_summary: result.payload?.route_summary || "",
          denied_tenant: {
            ok: denied.ok,
            response: denied.response,
            route: denied.payload?.route || null,
          },
        },
        null,
        2
      )
    );
  } finally {
    await brain.stop();
    await localRailServer.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
