import { aquatraceBragiModeBClientProfile } from "../../clients/aquatrace/bragiModeBClientProfile.js";

const bragiModeBClientConfigs = new Map([["aquatrace", aquatraceBragiModeBClientProfile]]);

export function registerBragiModeBClientConfig(clientId, config) {
  if (!clientId || typeof clientId !== "string") {
    throw new Error("clientId is required to register a Bragi Mode B client config.");
  }
  if (!config || typeof config !== "object") {
    throw new Error(`Invalid Bragi Mode B client config for "${clientId}".`);
  }
  bragiModeBClientConfigs.set(clientId, config);
}

export function getBragiModeBClientConfig(clientId) {
  if (!clientId || typeof clientId !== "string") {
    throw new Error("clientId is required to load a Bragi Mode B client config.");
  }
  const config = bragiModeBClientConfigs.get(clientId);
  if (!config) {
    throw new Error(`Unsupported Bragi Mode B client config: ${clientId}`);
  }
  return config;
}

export function normalizeBragiModeBLocation(locationInput, config) {
  if (!config) {
    throw new Error("A Bragi Mode B client config is required to normalize locations.");
  }

  const raw = String(locationInput || "").trim();
  if (!raw) {
    throw new Error("Location is required.");
  }

  if (config.locations[raw]) {
    return config.locations[raw];
  }

  const normalized = raw.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
  const hit = Object.values(config.locations).find((location) => {
    const label = location.label.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
    const display = location.display.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
    return normalized === label || normalized === display;
  });

  if (!hit) {
    throw new Error(`Unsupported Bragi Mode B location: ${raw}`);
  }

  return hit;
}

export function getBragiModeBTopicProfile(topic, config) {
  if (!config) {
    throw new Error("A Bragi Mode B client config is required to resolve topic profiles.");
  }

  const value = String(topic || "");
  return config.topicProfiles.find((profile) => profile.matchers.some((pattern) => pattern.test(value))) || config.topicProfiles.at(-1);
}

export function buildBragiModeBLinkPlan({ topic, location, config }) {
  if (!config) {
    throw new Error("A Bragi Mode B client config is required to build a link plan.");
  }

  const selected = [];

  for (const link of config.internalLinks) {
    if (link.stateFilter && !link.stateFilter.includes(location.state)) {
      continue;
    }
    if (link.topicMatchers && !link.topicMatchers.some((pattern) => pattern.test(topic))) {
      continue;
    }
    selected.push(link);
  }

  const requiredUrls = new Set([
    "https://aquatraceleak.com/services/pool-leaks/",
    "https://aquatraceleak.com/service-request/",
  ]);

  for (const link of config.internalLinks) {
    if (requiredUrls.has(link.url) && !selected.find((entry) => entry.url === link.url)) {
      selected.push(link);
    }
  }

  const external = config.externalLinks.filter((link) =>
    !link.topicMatchers || link.topicMatchers.some((pattern) => pattern.test(topic))
  );

  return {
    internalLinks: selected.slice(0, 5),
    externalLinks: external.slice(0, 1),
  };
}

export const bragiModeBClientConfigRegistry = {
  registerBragiModeBClientConfig,
  getBragiModeBClientConfig,
};
