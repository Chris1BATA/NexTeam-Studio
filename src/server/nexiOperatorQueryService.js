const DEFAULT_CLAWDIA_PUBLIC_URL = "http://127.0.0.1:8788";

function normalizeText(value) {
  return String(value || "").trim();
}

export function isNexiCompanyCamOperatorQuestion(question) {
  const lower = normalizeText(question).toLowerCase();
  if (!lower) {
    return false;
  }

  return (
    lower.includes("companycam") ||
    lower.includes("camp mikell") ||
    (lower.includes("gallon") && (lower.includes("report") || lower.includes("checklist"))) ||
    (lower.includes("job data") && (lower.includes("project") || lower.includes("report")))
  );
}

function getClawdiaPublicUrl() {
  return normalizeText(process.env.CLAWDIA_BRAIN_PUBLIC_URL || DEFAULT_CLAWDIA_PUBLIC_URL);
}

function buildClawdiaOperatorQuestion(question, tenantId = "aquatrace") {
  return `Clawdia, answer this ${tenantId} CompanyCam job-data question: ${normalizeText(question)}`;
}

export async function answerNexiOperatorQuestion({ question, tenantId = "aquatrace" } = {}) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    const error = new Error("question is required.");
    error.status = 400;
    throw error;
  }

  if (!isNexiCompanyCamOperatorQuestion(normalizedQuestion)) {
    return {
      ok: false,
      handled: false,
      reason: "unsupported_question",
    };
  }

  const response = await fetch(`${getClawdiaPublicUrl()}/public/operator/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: buildClawdiaOperatorQuestion(normalizedQuestion, tenantId),
      tenantId,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    if (payload?.handled) {
      return {
        ok: false,
        handled: true,
        response: normalizeText(payload?.response || payload?.message || payload?.error),
        payload,
        status: response.status,
      };
    }

    const error = new Error(
      normalizeText(payload?.error || payload?.message || "Clawdia operator query failed.")
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return {
    ok: payload?.ok !== false,
    handled: Boolean(payload?.handled),
    response: normalizeText(payload?.response || payload?.message),
    payload,
  };
}

export const nexiOperatorQueryServiceInternals = {
  DEFAULT_CLAWDIA_PUBLIC_URL,
  buildClawdiaOperatorQuestion,
  getClawdiaPublicUrl,
};
