import { validateBragiModeBArticle } from "./bragiModeBGuardrails.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.BRAGI_MODE_B_MODEL || "claude-sonnet-4-20250514";

function requireAnthropicKey() {
  const key = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  return key;
}

function parseJsonBlock(raw) {
  const fenced = String(raw || "").match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse((fenced ? fenced[1] : raw).trim());
}

function summarizeLinks(linkPlan) {
  return [
    "Internal links you may use:",
    ...linkPlan.internalLinks.map((link) => `- ${link.url} | ${link.purpose} | anchors: ${link.anchors.join(", ")}`),
    ...(linkPlan.externalLinks.length
      ? ["External links allowed only if directly relevant:", ...linkPlan.externalLinks.map((link) => `- ${link.url} | ${link.label}`)]
      : []),
  ].join("\n");
}

function buildPrompt({ topic, location, config, linkPlan, topicProfile, retryNotes = "" }) {
  return `You are Bragi, the Aquatrace Mode B article brain.

Write one long-form WordPress article draft for Aquatrace.

Target input:
- Topic: ${topic}
- Location: ${location.display}
- Region cues: ${location.regionTerms.join(", ")}
- Topic intent: ${topicProfile.intent}
- Focus keyword hint: ${topicProfile.focusKeywordHint}

Voice rules:
- ${config.brandVoice.join("\n- ")}

Hard guardrails:
- No phone numbers anywhere in the article body, excerpt, or metadata.
- Aquatrace is diagnostics-first. Do not present Aquatrace as the repair crew.
- No guaranteed-results or overpromise language.
- If VGB or drain-cover topics appear, clearly state that the expiration detail is on the underside and confirmable only through underwater documentation or underwater photo evidence.
- Keep wording plain, human, and useful. No filler.
- Use real HTML for WordPress: one H1, strong H2 structure, optional H3s, paragraphs, and lists where useful.
- Add 3 to 5 internal links naturally with absolute URLs from the approved link list.
- You may include at most one external official link, and only from the approved external list.

SEO rules:
- Put the location and core keyword naturally near the start.
- Write a click-worthy SEO title and meta description.
- Keep the excerpt under 200 characters.
- Make the CTA point to Aquatrace without using a phone number.

${summarizeLinks(linkPlan)}

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "focusKeyword": "string",
  "seoTitle": "string",
  "metaDescription": "string",
  "categoryNames": ["string"],
  "tagNames": ["string"],
  "contentHtml": "<h1>...</h1>...",
  "imageMeta": {
    "filename": "string",
    "title": "string",
    "altText": "string",
    "caption": "string",
    "description": "string"
  }
}

${retryNotes ? `Fix these issues from the previous attempt:\n${retryNotes}\n` : ""}`;
}

function slugify(value) {
  return String(value || "aquatrace-article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function buildLink(url, label) {
  return `<a href="${url}">${label}</a>`;
}

function chooseAnchor(link, fallback) {
  return link?.anchors?.[0] || fallback;
}

function findLink(linkPlan, matcher) {
  return linkPlan.internalLinks.find((link) => matcher.test(link.url)) || null;
}

function buildFallbackContent({ topic, location, linkPlan, topicProfile }) {
  const serviceLink = findLink(linkPlan, /services\/pool-leaks/i);
  const symptomLink = findLink(linkPlan, /do-you-have-a-leak/i);
  const requestLink = findLink(linkPlan, /service-request/i);
  const commercialLink = findLink(linkPlan, /commercial-pool-services/i);
  const underwaterLink = findLink(linkPlan, /underwater-pool-inspection/i);
  const stateLink = linkPlan.internalLinks.find((link) => /locations/i.test(link.url) && link.url.includes(location.state.toLowerCase())) || null;

  if (topicProfile.key === "commercial-vgb") {
    return [
      `<h1>${location.display} Commercial Pool VGB Drain Cover Documentation</h1>`,
      `<p>When a commercial pool operator in ${location.display} needs a straight answer about a main drain cover, guesswork is the expensive option. The problem is not always that something looks obviously wrong. A lot of the time, the real problem is that nobody can clearly document what is installed, what markings are visible, or what the next conversation should be based on.</p>`,
      `<p>Aquatrace stays in the diagnostics lane. That means underwater documentation, clear observations, and practical field evidence before anybody starts acting like a deck-side glance settled the question. If you need broader background first, start with ${buildLink(serviceLink?.url, chooseAnchor(serviceLink, "swimming pool leak detection"))} or ${buildLink(commercialLink?.url, chooseAnchor(commercialLink, "commercial pool leak detection services"))}.</p>`,
      `<h2>Why VGB Questions Get Stuck</h2>`,
      `<p>Commercial pool drain covers can create a paperwork problem long before they create a visible emergency. Operators may have old records, contractor notes, or photos from years ago, but still not have what they need when an owner, inspector, or contractor asks a simple question: what is actually installed right now?</p>`,
      `<p>That is where bad assumptions creep in. Two covers can look similar from above the water and still not carry the same markings, rating, or history. The expiration detail that matters is on the underside, so it is only confirmable through underwater documentation or underwater photo evidence.</p>`,
      `<h2>What Aquatrace Documents</h2>`,
      `<p>Aquatrace does not certify compliance, write legal opinions, or promise that one site visit solves every question. What Aquatrace can do is document the visible field facts: drain cover condition, visible markings, surrounding conditions, and the kind of underwater detail that helps the next contractor, owner, or operator conversation move faster.</p>`,
      `<p>${underwaterLink ? `That is why ${buildLink(underwaterLink.url, chooseAnchor(underwaterLink, "underwater pool inspection"))} matters so much on commercial sites.` : "That is why underwater inspection matters so much on commercial sites."} It gives people something better than memory and guesswork to work from.</p>`,
      `<h2>Why a Pool May Not Need to Be Drained First</h2>`,
      `<p>A lot of operators assume the first step is a full drain. Sometimes it is. Sometimes it is not. A pool may not need to be drained just to start gathering answers when water clarity, access, and safety conditions allow a proper underwater documentation visit.</p>`,
      `<p>That matters because downtime costs money. A diagnostics-first visit helps narrow the problem before the site commits to the wrong disruption.</p>`,
      `<h2>How This Helps the Next Decision</h2>`,
      `<p>Good records make the next conversation easier. Instead of arguing from incomplete notes, the property team can work from recent field photos, organized observations, and a clearer picture of what is actually in the water. ${stateLink ? `For broader regional context, see ${buildLink(stateLink.url, chooseAnchor(stateLink, `${location.stateName} pool leak detection`))}.` : ""}</p>`,
      `<h2>Start With Evidence, Not Guesswork</h2>`,
      `<p>If your team is trying to sort out a commercial drain-cover question in ${location.display}, the smartest first move is usually better documentation, not louder opinions. Aquatrace helps pool operators get clearer field evidence so the next step is based on what is real.</p>`,
      `<p>${requestLink ? `If you are ready to move, ${buildLink(requestLink.url, chooseAnchor(requestLink, "schedule a diagnostic visit"))}.` : "If you are ready to move, start with a diagnostic visit request."}</p>`,
    ].join("");
  }

  return [
    `<h1>${location.display} Pool Leak Detection Before You Chase the Wrong Fix</h1>`,
    `<p>If you are watching the water line drop in ${location.display}, you do not need more noise. You need a cleaner way to tell the difference between normal evaporation and a real leak. That is exactly where Aquatrace is strongest: diagnostics first, clear next steps second, and no pressure to start with the wrong repair idea.</p>`,
    `<p>Pool owners usually start in the same place. The water looks low. The weather is hot. The bill feels wrong. The problem is that suspicious water loss can look ordinary right up until it gets expensive. Aquatrace helps people sort that out with ${buildLink(serviceLink?.url, chooseAnchor(serviceLink, "pool leak detection"))} that is built around evidence instead of guesswork.</p>`,
    `<h2>Why This Question Costs People Money</h2>`,
    `<p>When pool owners are not sure what they are seeing, they tend to do one of two things: ignore it too long or spend money too early. Both are expensive. Waiting can mean more water loss, higher chemical costs, and more damage. Jumping straight to a repair theory can send money toward the wrong fix.</p>`,
    `<p>That is why Aquatrace keeps the first step focused on diagnosis. ${symptomLink ? `If you are still not sure whether the symptoms point to a real leak, start with ${buildLink(symptomLink.url, chooseAnchor(symptomLink, "do you have a leak"))}.` : "If you are still not sure whether the symptoms point to a real leak, start with the symptom check instead of guessing."}</p>`,
    `<h2>Evaporation or Leak?</h2>`,
    `<p>Heat, wind, and pool use can all move the water level. But a pattern that keeps showing up, especially when it starts affecting your bill or your routine, deserves a closer look. The goal is not to panic. The goal is to separate a normal seasonal swing from water that is leaving the pool somewhere it should not.</p>`,
    `<p>The bucket-test idea is useful, but most owners do not actually want a science project. They want a straight answer. Aquatrace gives them a better path to that answer when the numbers or symptoms stop making sense.</p>`,
    `<h2>What Aquatrace Looks For</h2>`,
    `<p>Diagnostics-first work means looking at the places water loss likes to hide: fittings, plumbing, structure transitions, and underwater details that get missed when everybody is working from the deck. Aquatrace uses non-invasive methods, careful testing, and plain-language reporting so the next move is based on what the pool is actually doing.</p>`,
    `<p>${underwaterLink ? `That is why ${buildLink(underwaterLink.url, chooseAnchor(underwaterLink, "underwater pool inspection"))} can be part of the conversation when the symptoms call for it.` : "That is why underwater inspection can be part of the conversation when the symptoms call for it."}</p>`,
    `<h2>Why Local Context Matters in ${location.display}</h2>`,
    `<p>${location.regionTerms[0]} conditions can make worried pool owners second-guess themselves. Warm weather, heavy use, and long stretches of sun all make it easier to talk yourself into believing the water loss is probably normal. Sometimes it is. Sometimes it is not. The only way to stop wasting money is to narrow that down with real testing.</p>`,
    ...(stateLink
      ? [`<p>Aquatrace also connects this local question back to the broader ${buildLink(stateLink.url, chooseAnchor(stateLink, `${location.stateName} pool leak detection`))} footprint, so homeowners are not stuck wondering whether they are outside the service conversation.</p>`]
      : []),
    `<h2>Start With a Clearer Answer</h2>`,
    `<p>If your pool in ${location.display} keeps dropping and you are tired of wondering whether it is just heat or something more expensive, start with a real diagnostic path. Aquatrace is built for pool owners who want to protect the pool, the budget, and the next decision at the same time.</p>`,
    `<p>${requestLink ? `When you are ready, ${buildLink(requestLink.url, chooseAnchor(requestLink, "start with a service request"))}.` : "When you are ready, start with a service request."}</p>`,
  ].join("");
}

function buildFallbackArticlePackage({ topic, location, linkPlan, topicProfile }) {
  const title = topicProfile.key === "commercial-vgb"
    ? `${location.display} Commercial Pool VGB Drain Cover Documentation`
    : `${location.display} Pool Leak Detection Before You Chase the Wrong Fix`;
  const focusKeyword = topicProfile.key === "commercial-vgb"
    ? "commercial pool VGB drain cover documentation"
    : `${location.city} pool leak detection`;
  const excerpt = topicProfile.key === "commercial-vgb"
    ? `Aquatrace helps ${location.display} commercial pool operators document drain-cover details underwater before guesswork slows the next step.`
    : `Aquatrace helps pool owners in ${location.display} separate suspicious water loss from normal evaporation before money goes to the wrong fix.`;

  return {
    title,
    slug: slugify(`${location.label} ${topic}`),
    excerpt,
    focusKeyword,
    seoTitle: `${title} | Aquatrace`,
    metaDescription: excerpt,
    categoryNames: topicProfile.categoryNames,
    tagNames: topicProfile.tagNames,
    contentHtml: buildFallbackContent({ topic, location, linkPlan, topicProfile }),
    imageMeta: {
      filename: slugify(`${location.label} ${topic}`),
      title,
      altText: `${location.display} pool leak detection photo selected by Aquatrace`,
      caption: "A real field photo helps tie the article back to the work itself.",
      description: `CompanyCam field photo selected for a ${location.display} Aquatrace article about ${topic}.`,
    },
  };
}

export async function generateBragiModeBArticle({ topic, location, config, linkPlan, topicProfile }) {
  const key = requireAnthropicKey();
  let retryNotes = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 3200,
        temperature: 0.6,
        system: "Return JSON only. No markdown fences unless absolutely necessary for valid JSON extraction.",
        messages: [{ role: "user", content: buildPrompt({ topic, location, config, linkPlan, topicProfile, retryNotes }) }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (attempt === 1) {
        const articlePackage = buildFallbackArticlePackage({ topic, location, linkPlan, topicProfile });
        const validation = validateBragiModeBArticle({
          articlePackage,
          topic,
          location,
          config,
        });
        if (!validation.valid) {
          const error = new Error(data?.error?.message || `Anthropic request failed with status ${response.status}.`);
          error.validation = validation;
          throw error;
        }
        return {
          articlePackage,
          validation,
          rawModelResponse: `fallback:${data?.error?.message || response.status}`,
          usedFallbackTemplate: true,
        };
      }
      throw new Error(data?.error?.message || `Anthropic request failed with status ${response.status}.`);
    }

    const raw = (data?.content || []).map((item) => item?.text || "").join("\n").trim();
    const parsed = parseJsonBlock(raw);
    const articlePackage = {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      focusKeyword: parsed.focusKeyword,
      seoTitle: parsed.seoTitle,
      metaDescription: parsed.metaDescription,
      categoryNames: parsed.categoryNames,
      tagNames: parsed.tagNames,
      contentHtml: parsed.contentHtml,
      imageMeta: parsed.imageMeta || {},
    };

    const validation = validateBragiModeBArticle({
      articlePackage,
      topic,
      location,
      config,
    });

    if (validation.valid) {
      return {
        articlePackage,
        validation,
        rawModelResponse: raw,
      };
    }

    retryNotes = validation.errors.concat(validation.warnings).map((line) => `- ${line}`).join("\n");
    if (attempt === 2) {
      const error = new Error("Generated article did not pass Bragi Mode B guardrails.");
      error.validation = validation;
      error.articlePackage = articlePackage;
      throw error;
    }
  }

  throw new Error("Article generation failed unexpectedly.");
}
