import { PDFParse } from "pdf-parse";

const DEFAULT_COMPANYCAM_TENANT_ID = "aquatrace";
const ALLOWED_COMPANYCAM_TENANT_IDS = new Set(["aquatrace", "aquatrace-case-study"]);
const TOTAL_GALLONS_LABEL = "Estimated Approximate Total Gallons";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCompanyCamTenantId(value) {
  return normalizeText(value || DEFAULT_COMPANYCAM_TENANT_ID).toLowerCase();
}

function createCompanyCamQuestionError(message, { status = 400, code = "COMPANYCAM_QUERY_ERROR", detail = "" } = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.detail = detail || "";
  return error;
}

function normalizeAnswerNumber(rawValue) {
  const digits = String(rawValue || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function tokenizeQuestion(question) {
  return Array.from(
    new Set(
      normalizeText(question)
        .toLowerCase()
        .match(/[a-z0-9]+/g) || []
    )
  ).filter((token) => token.length >= 3);
}

function buildProjectMatchText(project = {}) {
  return [
    project?.name,
    project?.address?.street_address_1,
    project?.address?.street_address_2,
    project?.address?.city,
    project?.address?.state,
    project?.address?.postal_code,
  ]
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function deriveProjectSearchText(question) {
  const normalizedQuestion = normalizeText(question);
  const normalizedLower = normalizedQuestion.toLowerCase();
  const forInMatch = normalizedQuestion.match(/\bfor\s+(.+?)\s+in\b/i);
  if (forInMatch?.[1]) {
    return normalizeText(forInMatch[1]);
  }

  if (normalizedLower.includes("camp mikell")) {
    return "Camp Mikell";
  }

  const usefulTokens = tokenizeQuestion(question).filter(
    (token) =>
      ![
        "what",
        "total",
        "pool",
        "gallons",
        "report",
        "checklist",
        "companycam",
        "question",
        "answer",
      ].includes(token)
  );

  return usefulTokens.slice(0, 4).join(" ");
}

function detectCompanyCamQuestionType(question) {
  const lower = normalizeText(question).toLowerCase();
  if (lower.includes("gallon")) {
    return "total_gallons";
  }

  throw createCompanyCamQuestionError(
    "Only total-gallons CompanyCam report questions are supported right now.",
    {
      status: 400,
      code: "COMPANYCAM_UNSUPPORTED_QUESTION",
    }
  );
}

async function extractPdfTextFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "NexTeam-Studio/CompanyCam-Report-Reader",
    },
  });

  if (!response.ok) {
    throw createCompanyCamQuestionError(
      `CompanyCam report download failed with status ${response.status}.`,
      {
        status: 502,
        code: "COMPANYCAM_REPORT_DOWNLOAD_FAILED",
      }
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: normalizeText(result?.text),
      byteLength: buffer.byteLength,
    };
  } finally {
    await parser.destroy();
  }
}

function pickNewestPdfDocument(documents = []) {
  return [...documents]
    .filter((document) => String(document?.content_type || "").toLowerCase().includes("pdf") && normalizeText(document?.url))
    .sort((left, right) => Number(right?.updated_at || right?.created_at || 0) - Number(left?.updated_at || left?.created_at || 0))[0] || null;
}

export function assertAquatraceCompanyCamTenantScope(tenantId) {
  const normalizedTenantId = normalizeCompanyCamTenantId(tenantId);
  if (!ALLOWED_COMPANYCAM_TENANT_IDS.has(normalizedTenantId)) {
    throw createCompanyCamQuestionError(
      `CompanyCam access is not approved for tenant "${normalizedTenantId}".`,
      {
        status: 403,
        code: "COMPANYCAM_TENANT_SCOPE_DENIED",
      }
    );
  }

  return normalizedTenantId;
}

export function scoreProjectAgainstQuestion(project, question) {
  const matchText = buildProjectMatchText(project);
  if (!matchText) {
    return 0;
  }

  return tokenizeQuestion(question).reduce((score, token) => {
    if (!matchText.includes(token)) {
      return score;
    }

    if (normalizeText(project?.name).toLowerCase().includes(token)) {
      return score + 5;
    }

    if (normalizeText(project?.address?.city).toLowerCase().includes(token)) {
      return score + 3;
    }

    if (normalizeText(project?.address?.street_address_1).toLowerCase().includes(token)) {
      return score + 2;
    }

    return score + 1;
  }, 0);
}

export function extractTotalGallonsFromText(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/Estimated Approximate Total Gallons\s*([\d,]+)\s*Gallons/i);
  if (!match?.[1]) {
    throw createCompanyCamQuestionError(
      `Could not find "${TOTAL_GALLONS_LABEL}" in the exported CompanyCam report.`,
      {
        status: 422,
        code: "COMPANYCAM_TOTAL_GALLONS_NOT_FOUND",
      }
    );
  }

  const rawValue = normalizeText(match[1]);
  const numericValue = normalizeAnswerNumber(rawValue);
  const evidenceIndex = normalized.toLowerCase().indexOf(TOTAL_GALLONS_LABEL.toLowerCase());
  const evidenceSnippet = evidenceIndex >= 0
    ? normalized.slice(Math.max(0, evidenceIndex - 120), evidenceIndex + 240)
    : `${TOTAL_GALLONS_LABEL} ${rawValue} Gallons`;

  return {
    fieldLabel: TOTAL_GALLONS_LABEL,
    rawValue,
    numericValue,
    unit: "Gallons",
    displayValue: `${rawValue} Gallons`,
    evidenceSnippet,
  };
}

export async function answerCompanyCamReportQuestion({
  companyCamRail,
  tenantId,
  question,
  projectQuery,
  projectId,
} = {}) {
  const scopedTenantId = assertAquatraceCompanyCamTenantScope(tenantId);
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    throw createCompanyCamQuestionError("A CompanyCam question is required.", {
      status: 400,
      code: "COMPANYCAM_QUESTION_REQUIRED",
    });
  }

  const questionType = detectCompanyCamQuestionType(normalizedQuestion);
  if (!companyCamRail) {
    throw createCompanyCamQuestionError("A CompanyCam rail instance is required.", {
      status: 500,
      code: "COMPANYCAM_RAIL_REQUIRED",
    });
  }

  let selectedProject = null;
  let projectMatches = [];

  if (normalizeText(projectId)) {
    selectedProject = await companyCamRail.getProject(normalizeText(projectId));
    projectMatches = [selectedProject];
  } else {
    const derivedQuery = normalizeText(projectQuery) || deriveProjectSearchText(normalizedQuestion);
    const projects = await companyCamRail.searchProjects({
      perPage: 10,
      query: derivedQuery || undefined,
    });
    projectMatches = [...projects]
      .map((project) => ({
        ...project,
        _score: scoreProjectAgainstQuestion(project, normalizedQuestion),
      }))
      .sort((left, right) => right._score - left._score);
    selectedProject = projectMatches[0] || null;
  }

  if (!selectedProject?.id) {
    throw createCompanyCamQuestionError(
      "No CompanyCam project matched that question.",
      {
        status: 404,
        code: "COMPANYCAM_PROJECT_NOT_FOUND",
      }
    );
  }

  const documents = await companyCamRail.listProjectDocuments(selectedProject.id);
  const sourceDocument = pickNewestPdfDocument(documents);
  if (!sourceDocument?.url) {
    throw createCompanyCamQuestionError(
      `No exported PDF report was found for CompanyCam project ${selectedProject.id}.`,
      {
        status: 404,
        code: "COMPANYCAM_PROJECT_PDF_NOT_FOUND",
      }
    );
  }

  const pdfTextResult = await extractPdfTextFromUrl(sourceDocument.url);
  const totalGallons = extractTotalGallonsFromText(pdfTextResult.text);

  return {
    ok: true,
    tenantId: scopedTenantId,
    question: normalizedQuestion,
    questionType,
    answer: totalGallons,
    project: {
      id: selectedProject.id,
      name: selectedProject.name,
      address: selectedProject.address || null,
      projectUrl: selectedProject.project_url || "",
      publicUrl: selectedProject.public_url || "",
    },
    alternativeProjects: projectMatches
      .slice(1, 3)
      .map((project) => ({
        id: project.id,
        name: project.name,
        address: project.address || null,
        score: project._score ?? scoreProjectAgainstQuestion(project, normalizedQuestion),
      })),
    sourceDocument: {
      id: sourceDocument.id,
      name: sourceDocument.name,
      contentType: sourceDocument.content_type,
      byteSize: sourceDocument.byte_size ?? null,
      updatedAt: sourceDocument.updated_at || sourceDocument.created_at || null,
    },
    source: {
      type: "companycam_exported_pdf",
      evidenceSnippet: totalGallons.evidenceSnippet,
      pdfBytes: pdfTextResult.byteLength,
    },
  };
}

export function formatCompanyCamReportAnswer(result = {}) {
  return [
    "COMPANYCAM JOB DATA",
    `- tenant: ${result.tenantId || DEFAULT_COMPANYCAM_TENANT_ID}`,
    `- project: ${result?.project?.name || "unknown"}`,
    `- address: ${[
      result?.project?.address?.street_address_1,
      result?.project?.address?.city,
      result?.project?.address?.state,
      result?.project?.address?.postal_code,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join(", ")}`,
    `- answer: ${result?.answer?.fieldLabel || TOTAL_GALLONS_LABEL} = ${result?.answer?.displayValue || "unknown"}`,
    `- source document: ${result?.sourceDocument?.name || "unknown"}`,
    `- evidence: ${normalizeText(result?.source?.evidenceSnippet) || "not available"}`,
    `- alternate project matches: ${
      Array.isArray(result?.alternativeProjects) && result.alternativeProjects.length > 0
        ? result.alternativeProjects.map((project) => `${project.name} (${project.id})`).join(" ; ")
        : "none"
    }`,
    "- CompanyCam mode: read-only",
  ].join("\n");
}

export const companyCamQuestionServiceInternals = {
  ALLOWED_COMPANYCAM_TENANT_IDS,
  DEFAULT_COMPANYCAM_TENANT_ID,
  TOTAL_GALLONS_LABEL,
  buildProjectMatchText,
  createCompanyCamQuestionError,
  deriveProjectSearchText,
  detectCompanyCamQuestionType,
  normalizeAnswerNumber,
  normalizeCompanyCamTenantId,
  tokenizeQuestion,
};
