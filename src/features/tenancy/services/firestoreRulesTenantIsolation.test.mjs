import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const rulesPath = join(process.cwd(), "firestore.rules");
const rules = readFileSync(rulesPath, "utf8");

test("firestore rules use tenant-scoped auth instead of tenant allow-lists for tenant foundation collections", () => {
  assert.doesNotMatch(rules, /return tenantId in \[/);
  assert.match(rules, /function canAccessTenant\(tenantId\)/);
  assert.match(rules, /request\.auth\.token\.tenantId == tenantId/);
});

test("firestore rules include dedicated paths for intake, config, runtime summary, and subagents", () => {
  assert.match(rules, /match \/tenants\/\{tenantId\}\/intakePackets\/\{packetId\}/);
  assert.match(rules, /match \/tenants\/\{tenantId\}\/config\/\{configId\}/);
  assert.match(rules, /match \/tenants\/\{tenantId\}\/runtimeSummary\/\{summaryId\}/);
  assert.match(rules, /match \/tenants\/\{tenantId\}\/subagents\/\{subagentId\}/);
});
