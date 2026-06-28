const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;

export function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateBragiModeBArticle({ articlePackage, topic, location, config }) {
  const errors = [];
  const warnings = [];
  const title = String(articlePackage?.title || "").trim();
  const excerpt = String(articlePackage?.excerpt || "").trim();
  const contentHtml = String(articlePackage?.contentHtml || "").trim();
  const plainText = stripHtml(contentHtml);

  if (!title) {
    errors.push("Article title is empty.");
  }
  if (!excerpt) {
    errors.push("Article excerpt is empty.");
  }
  if (!contentHtml) {
    errors.push("Article HTML body is empty.");
  }
  if ((contentHtml.match(/<h1\b/gi) || []).length !== 1) {
    errors.push("Article must contain exactly one H1.");
  }
  if ((contentHtml.match(/<h2\b/gi) || []).length < 3) {
    errors.push("Article must contain at least three H2 sections.");
  }
  if (!plainText.toLowerCase().includes(location.display.toLowerCase())) {
    errors.push(`Article must mention the target location: ${location.display}`);
  }

  const phoneMatches = plainText.match(PHONE_PATTERN) || [];
  if (phoneMatches.length) {
    errors.push(`Phone number detected: ${phoneMatches[0]}`);
  }

  for (const pattern of config.guardrails.blockedScopePatterns || []) {
    if (pattern.test(plainText)) {
      errors.push(`Blocked claim detected: ${pattern}`);
      break;
    }
  }

  if (!/\bdiagnostic|diagnostics|document|inspection|pressure test|acoustic|hydrophone|underwater\b/i.test(plainText)) {
    warnings.push("Article does not mention a strong diagnostic proof point.");
  }

  if (/\b(vgb|virginia graeme baker|drain cover|main drain)\b/i.test(`${topic} ${plainText}`)) {
    if (!/\bunderside\b/i.test(plainText)) {
      errors.push("VGB article is missing the required underside detail.");
    }
    if (!/\bund(er)?water documentation\b/i.test(plainText) && !/\bund(er)?water photo\b/i.test(plainText)) {
      errors.push("VGB article must mention underwater documentation or underwater photo confirmation.");
    }
    if (/\b(confirmed|visible|checked) from (above water|the deck)\b/i.test(plainText)) {
      errors.push("VGB article implies above-water confirmation, which is not allowed.");
    }
  }

  if (excerpt.length > 220) {
    warnings.push(`Excerpt is long at ${excerpt.length} characters.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    plainText,
  };
}
