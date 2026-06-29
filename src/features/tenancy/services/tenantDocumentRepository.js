import { assertValidRawIntakePacket } from "../schemas/clientIntakePacketSchema.js";
import { assertValidTenantClientConfig } from "../schemas/clientConfigSchema.js";
import { assertValidTenantRuntimeSummary } from "../schemas/runtimeSummarySchema.js";
import { assertTenantAccess } from "./tenantAccessPolicy.js";
import {
  tenantConfigDocPath,
  tenantIntakePacketDocPath,
  tenantRuntimeSummaryDocPath,
} from "./tenantPathUtils.js";

function assertTenantMatch(documentTenantId, expectedTenantId, label) {
  if (documentTenantId !== expectedTenantId) {
    throw new Error(`${label} tenantId "${documentTenantId}" does not match target tenant "${expectedTenantId}".`);
  }
}

export function prepareRawIntakePacketWrite({ actorScope, tenantId, packet }) {
  assertTenantAccess({ actorScope, targetTenantId: tenantId, action: "write intake packet for" });
  assertValidRawIntakePacket(packet);
  assertTenantMatch(packet.tenantId, tenantId, "Intake packet");

  return {
    path: tenantIntakePacketDocPath(tenantId, packet.packetId),
    data: packet,
  };
}

export function prepareTenantClientConfigWrite({ actorScope, tenantId, config }) {
  assertTenantAccess({ actorScope, targetTenantId: tenantId, action: "write config for" });
  assertValidTenantClientConfig(config);
  assertTenantMatch(config.tenantId, tenantId, "Tenant config");

  return {
    path: tenantConfigDocPath(tenantId, "current"),
    data: config,
  };
}

export function prepareTenantRuntimeSummaryWrite({ actorScope, tenantId, summary }) {
  assertTenantAccess({ actorScope, targetTenantId: tenantId, action: "write runtime summary for" });
  assertValidTenantRuntimeSummary(summary);
  assertTenantMatch(summary.tenantId, tenantId, "Runtime summary");

  return {
    path: tenantRuntimeSummaryDocPath(tenantId, "current"),
    data: summary,
  };
}
